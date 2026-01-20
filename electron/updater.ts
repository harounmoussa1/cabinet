import { app, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

// Compare version strings (returns 1 if a > b, -1 if a < b, 0 if equal)
function compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const numA = partsA[i] || 0;
        const numB = partsB[i] || 0;

        if (numA > numB) return 1;
        if (numA < numB) return -1;
    }

    return 0;
}

// Get the path to look for updates
function getUpdatePath(): string | null {
    if (app.isPackaged) {
        const exePath = path.dirname(app.getPath('exe'));

        // Check various possible locations for the release folder
        const possiblePaths = [
            path.join(exePath, '..', 'updates'),
            path.join(exePath, '..', 'release'),
            path.join(exePath, 'updates'),
            path.join(app.getPath('desktop'), 'cabinet', 'release'),
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                console.log(`[Updater] Found update path: ${p}`);
                return p;
            }
        }

        return null;
    } else {
        return path.join(app.getAppPath(), 'release');
    }
}

// Check for local update files
export async function checkForLocalUpdates(currentVersion: string): Promise<{
    hasUpdate: boolean;
    version?: string;
    installerPath?: string;
}> {
    const updatePath = getUpdatePath();

    console.log(`[Updater] Current version: ${currentVersion}`);
    console.log(`[Updater] Checking for updates in: ${updatePath}`);

    if (!updatePath || !fs.existsSync(updatePath)) {
        console.log('[Updater] Update path not found');
        return { hasUpdate: false };
    }

    try {
        const files = fs.readdirSync(updatePath);

        const installers = files.filter(f =>
            f.endsWith('.exe') &&
            (f.toLowerCase().includes('dentalcab') || f.toLowerCase().includes('dental') || f.toLowerCase().includes('setup')) &&
            !f.toLowerCase().includes('uninstall')
        );

        let newestVersion: string | null = null;
        let newestInstaller: string | null = null;

        for (const installer of installers) {
            const versionMatch = installer.match(/(\d+\.\d+\.\d+)/);
            if (versionMatch) {
                const fileVersion = versionMatch[1];

                if (compareVersions(fileVersion, currentVersion) > 0) {
                    if (!newestVersion || compareVersions(fileVersion, newestVersion) > 0) {
                        newestVersion = fileVersion;
                        newestInstaller = installer;
                    }
                }
            }
        }

        if (newestVersion && newestInstaller) {
            console.log(`[Updater] Update available: ${newestVersion}`);
            return {
                hasUpdate: true,
                version: newestVersion,
                installerPath: path.join(updatePath, newestInstaller)
            };
        }
    } catch (error) {
        console.error('[Updater] Error checking local files:', error);
    }

    return { hasUpdate: false };
}

// Initialize updater and check for updates
export async function initializeUpdater(): Promise<void> {
    if (!app.isPackaged) {
        console.log('[Updater] Skipping update check in development mode');
        return;
    }

    const currentVersion = app.getVersion();
    const updateInfo = await checkForLocalUpdates(currentVersion);

    if (updateInfo.hasUpdate && updateInfo.version && updateInfo.installerPath) {
        const result = await dialog.showMessageBox({
            type: 'info',
            title: 'Mise à jour disponible',
            message: `Une nouvelle version (${updateInfo.version}) est disponible !`,
            detail: 'Voulez-vous installer la mise à jour maintenant ?\n\nL\'application va se fermer et l\'installateur va démarrer.',
            buttons: ['Installer maintenant', 'Plus tard'],
            defaultId: 0,
            cancelId: 1
        });

        if (result.response === 0) {
            await shell.openPath(updateInfo.installerPath);
            setTimeout(() => app.quit(), 1000);
        }
    }
}
