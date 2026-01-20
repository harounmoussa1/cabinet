import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { google } from 'googleapis';
import { app, Notification, shell, ipcMain } from 'electron';
import http from 'http';
import url from 'url';
import { backupDatabase, dbPath, closeDB } from './database';

const BACKUP_DIR_NAME = 'DentalCab_Backups';
const MAX_BACKUPS = 7;
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

interface BackupConfig {
    lastBackup: string | null;
}

export class BackupService {
    private static instance: BackupService;
    private configPath: string;
    private config: BackupConfig;
    private isProd: boolean;
    private tokenPath: string;
    private credentialsPath: string;

    private constructor() {
        this.isProd = app.isPackaged;
        const userDataPath = app.getPath('userData');
        this.configPath = path.join(userDataPath, 'backup-config.json');
        this.tokenPath = path.join(userDataPath, 'token.json');

        this.credentialsPath = this.findCredentialsFile();
        this.config = this.loadConfig();
    }

    public static getInstance(): BackupService {
        if (!BackupService.instance) {
            BackupService.instance = new BackupService();
        }
        return BackupService.instance;
    }

    private findCredentialsFile(): string {
        const fileName = 'client_secret_563280144828-jr8o0jt5u3r4ju8nrt9hcl56qfr78td4.apps.googleusercontent.com.json';
        const possiblePaths = [
            path.join(process.cwd(), fileName),
            path.join(app.getAppPath(), fileName),
            path.join(app.getAppPath(), '..', fileName),
            path.join(app.getPath('userData'), 'credentials.json')
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) return p;
        }
        return path.join(app.getPath('userData'), 'credentials.json');
    }

    private loadConfig(): BackupConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
            }
        } catch (error) {
            console.error('Failed to load backup config:', error);
        }
        return { lastBackup: null };
    }

    private saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('Failed to save backup config:', error);
        }
    }

    public async init() {
        ipcMain.handle('backup-now', async () => await this.performBackupManually());
        ipcMain.handle('list-backups', async () => await this.listBackups());
        ipcMain.handle('restore-backup', async (_, fileId: string) => await this.restoreBackup(fileId));

        setTimeout(() => {
            if (fs.existsSync(this.credentialsPath)) {
                this.checkAndPerformBackup();
            }
        }, 1000 * 30);
    }

    private async checkAndPerformBackup() {
        const now = new Date();
        const lastBackupStr = this.config.lastBackup;
        let shouldBackup = true;
        if (lastBackupStr) {
            const lastBackupDate = new Date(lastBackupStr);
            const diffHours = (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60);
            if (diffHours < 24) shouldBackup = false;
        }

        if (shouldBackup) {
            try {
                await this.performBackup();
                this.config.lastBackup = new Date().toISOString();
                this.saveConfig();
            } catch (error) {
                console.error('Auto-backup failed:', error);
            }
        }
    }

    private async performBackupManually() {
        try {
            await this.performBackup();
            this.config.lastBackup = new Date().toISOString();
            this.saveConfig();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async performBackup() {
        const tempDir = app.getPath('temp');
        const timestamp = new Date().getTime();
        const tempDbPath = path.join(tempDir, `backup_${timestamp}.db`);
        const zipPath = path.join(tempDir, `backup_${timestamp}.zip`);
        const encPath = path.join(tempDir, `backup_${timestamp}.zip.enc`);

        try {
            // 1. Better Backup (consistent state)
            await backupDatabase(tempDbPath);

            // 2. Zip
            await this.createZip(tempDbPath, zipPath);

            // 3. Encrypt
            const password = process.env.BACKUP_PASSWORD || 'admin-dental-secret-123';
            await this.encryptFile(zipPath, encPath, password);

            // 4. Upload
            const dateStr = new Date().toISOString().split('T')[0];
            await this.uploadToDrive(encPath, `backup_${dateStr}.zip.enc`);

            new Notification({ title: 'Backup Réussi', body: 'Base de données sauvegardée dans le Cloud.' }).show();
        } finally {
            [tempDbPath, zipPath, encPath].forEach(p => fs.existsSync(p) && fs.unlinkSync(p));
        }
    }

    private createZip(sourceFile: string, destZip: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(destZip);
            const archive = archiver('zip', { zlib: { level: 9 } });
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            archive.file(sourceFile, { name: 'dental_cabinet.db' });
            archive.finalize();
        });
    }

    private encryptFile(inputPath: string, outputPath: string, password: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const algorithm = 'aes-256-cbc';
            const salt = crypto.randomBytes(16);
            const key = crypto.scryptSync(password, salt, 32);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(algorithm, key, iv);
            const input = fs.createReadStream(inputPath);
            const output = fs.createWriteStream(outputPath);
            output.write(salt);
            output.write(iv);
            input.pipe(cipher).pipe(output);
            output.on('finish', resolve);
            output.on('error', reject);
        });
    }

    private async authenticate(): Promise<any> {
        const content = fs.readFileSync(this.credentialsPath, 'utf8');
        const credentials = JSON.parse(content);
        const creds = credentials.installed || credentials.web;
        const { client_secret, client_id, redirect_uris } = creds;
        const redirectUri = redirect_uris[0];
        const port = new URL(redirectUri).port || 80;

        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

        if (fs.existsSync(this.tokenPath)) {
            oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(this.tokenPath, 'utf8')));
            return oAuth2Client;
        }

        const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
        shell.openExternal(authUrl);

        return new Promise((resolve, reject) => {
            const server = http.createServer(async (req, res) => {
                try {
                    const query = url.parse(req.url || '', true).query;
                    if (query.code) {
                        res.end('Auth Success!');
                        server.close();
                        const { tokens } = await oAuth2Client.getToken(query.code as string);
                        oAuth2Client.setCredentials(tokens);
                        fs.writeFileSync(this.tokenPath, JSON.stringify(tokens));
                        resolve(oAuth2Client);
                    }
                } catch (e) { reject(e); }
            }).listen(port);
            setTimeout(() => { server.close(); reject(new Error('Timeout')); }, 60000);
        });
    }

    private async getDriveClient() {
        const auth = await this.authenticate();
        return google.drive({ version: 'v3', auth });
    }

    private async uploadToDrive(filePath: string, fileName: string) {
        const drive = await this.getDriveClient();
        const folderId = await this.getOrCreateFolder(drive);

        await drive.files.create({
            requestBody: { name: fileName, parents: [folderId] },
            media: { mimeType: 'application/octet-stream', body: fs.createReadStream(filePath) },
        });

        await this.rotateBackups(drive, folderId);
    }

    private async getOrCreateFolder(drive: any): Promise<string> {
        const q = `mimeType='application/vnd.google-apps.folder' and name='${BACKUP_DIR_NAME}' and trashed=false`;
        const res = await drive.files.list({ q });
        if (res.data.files && res.data.files.length > 0) return res.data.files[0].id;

        const folder = await drive.files.create({
            requestBody: { name: BACKUP_DIR_NAME, mimeType: 'application/vnd.google-apps.folder' }
        });
        return folder.data.id;
    }

    private async listBackups() {
        try {
            const drive = await this.getDriveClient();
            const folderId = await this.getOrCreateFolder(drive);
            const res = await drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                orderBy: 'createdTime desc',
                fields: 'files(id, name, createdTime, size)',
            });
            return res.data.files || [];
        } catch (error) { return []; }
    }

    private async rotateBackups(drive: any, folderId: string) {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            orderBy: 'createdTime desc',
            fields: 'files(id)',
        });
        const files = res.data.files || [];
        if (files.length > MAX_BACKUPS) {
            for (const file of files.slice(MAX_BACKUPS)) {
                await drive.files.delete({ fileId: file.id });
            }
        }
    }

    public async restoreBackup(fileId: string): Promise<boolean> {
        const drive = await this.getDriveClient();
        const tempDir = app.getPath('temp');
        const encPath = path.join(tempDir, 'restore.zip.enc');
        const zipPath = path.join(tempDir, 'restore.zip');
        const extractPath = path.join(tempDir, 'restore_extract');

        try {
            // 1. Download
            const dest = fs.createWriteStream(encPath);
            const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
            await new Promise((resolve, reject) => {
                res.data.on('end', resolve).on('error', reject).pipe(dest);
            });

            // 2. Decrypt
            const password = process.env.BACKUP_PASSWORD || 'admin-dental-secret-123';
            await this.decryptFile(encPath, zipPath, password);

            // 3. Unzip
            if (!fs.existsSync(extractPath)) fs.mkdirSync(extractPath);
            new AdmZip(zipPath).extractAllTo(extractPath, true);

            const restoredDb = path.join(extractPath, 'dental_cabinet.db');
            if (!fs.existsSync(restoredDb)) throw new Error('DB missing in Zip');

            // 4. Close DB connection before file swap
            closeDB();

            // 5. Swap files (with retry to handle locks)
            await this.safeReplace(restoredDb, dbPath);

            new Notification({ title: 'Restauration Réussie', body: 'L\'application va redémarrer.' }).show();
            setTimeout(() => { app.relaunch(); app.quit(); }, 1500);
            return true;
        } catch (error) {
            console.error('Restore error:', error);
            throw error;
        } finally {
            [encPath, zipPath].forEach(p => fs.existsSync(p) && fs.unlinkSync(p));
            if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
        }
    }

    private async safeReplace(src: string, dest: string, retries = 5) {
        for (let i = 0; i < retries; i++) {
            try {
                if (fs.existsSync(dest)) fs.renameSync(dest, dest + '.bak');
                fs.copyFileSync(src, dest);
                // Also clean up wal/shm if they exist
                ['.db-wal', '.db-shm'].forEach(suffix => {
                    const p = dest + suffix;
                    if (fs.existsSync(p)) fs.unlinkSync(p);
                });
                return;
            } catch (e) {
                console.warn(`Replace attempt ${i + 1} failed. Retrying...`);
                await new Promise(r => setTimeout(r, 500));
            }
        }
        throw new Error('Could not replace DB file (locked).');
    }

    private decryptFile(inputPath: string, outputPath: string, password: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const fd = fs.openSync(inputPath, 'r');
            const salt = Buffer.alloc(16), iv = Buffer.alloc(16);
            fs.readSync(fd, salt, 0, 16, 0);
            fs.readSync(fd, iv, 0, 16, 16);
            fs.closeSync(fd);
            const key = crypto.scryptSync(password, salt, 32);
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            const input = fs.createReadStream(inputPath, { start: 32 });
            const output = fs.createWriteStream(outputPath);
            input.pipe(decipher).pipe(output).on('finish', resolve).on('error', reject);
        });
    }
}
