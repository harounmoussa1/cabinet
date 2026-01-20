import { app, BrowserWindow, ipcMain, dialog, shell, Notification } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { initDB, db } from './database'
import { initializeUpdater } from './updater'
import { BackupService } from './backupService'




// Track notified appointments to avoid duplicates
const notifiedAppointments = new Set<number>();

// Check for upcoming appointments every minute
function startNotificationService() {
    setInterval(() => {
        try {
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // Get appointments for today that haven't been notified yet
            const appointments = db.prepare(`
                SELECT a.id, a.time, p.firstName, p.lastName, a.type
                FROM appointments a
                JOIN patients p ON a.patientId = p.id
                WHERE a.date = ? AND a.status = 'PLANNED'
            `).all(todayStr) as any[];

            appointments.forEach(apppt => {
                if (notifiedAppointments.has(apppt.id)) return;

                const [hours, minutes] = apppt.time.split(':').map(Number);
                const apptDate = new Date(now);
                apptDate.setHours(hours, minutes, 0, 0);

                const diffMinutes = (apptDate.getTime() - now.getTime()) / (1000 * 60);

                // Alert if appointment is in 5 minutes (between 4 and 6 minutes to be safe with interval)
                if (diffMinutes > 0 && diffMinutes <= 5.5) {
                    new Notification({
                        title: 'Rendez-vous imminent !',
                        body: `Patient: ${apppt.lastName} ${apppt.firstName} dans 5 minutes (${apppt.time})\nType: ${apppt.type}`,
                        icon: path.join(process.env.VITE_PUBLIC as string, 'icon.png')
                    }).show();

                    notifiedAppointments.add(apppt.id);
                }
            });

            // Clear set at midnight
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                notifiedAppointments.clear();
            }
        } catch (error) {
            console.error('Notification service error:', error);
        }
    }, 60000); // Check every 60 seconds
}

// Files storage directory
const getFilesDir = () => {
    const isDev = !app.isPackaged;
    const filesDir = isDev
        ? path.join(app.getAppPath(), 'patient_files')
        : path.join(app.getPath('userData'), 'patient_files');

    if (!fs.existsSync(filesDir)) {
        fs.mkdirSync(filesDir, { recursive: true });
    }
    return filesDir;
};

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function createWindow() {
    win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        icon: path.join(process.env.VITE_PUBLIC as string, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#f1f5f9',
            symbolColor: '#334155',
            height: 40
        },
        show: false,
        backgroundColor: '#f1f5f9'
    })

    // Show window when ready to prevent visual flash
    win.once('ready-to-show', () => {
        win?.show()
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(process.env.DIST as string, 'index.html'))
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
        win = null
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(async () => {
    initDB();
    registerIpcHandlers();
    createWindow();
    startNotificationService();

    // Initialize Startup Backup Check
    BackupService.getInstance().init();

    // Initialize local updater
    if (app.isPackaged) {
        setTimeout(() => {
            initializeUpdater();
        }, 3000);
    }
})


// ==================== IPC HANDLERS ====================
function registerIpcHandlers() {
    // ==================== DASHBOARD ====================
    ipcMain.handle('get-stats', () => {
        try {
            const patientCount = db.prepare('SELECT count(*) as count FROM patients WHERE isDeleted = 0').get() as { count: number };
            const appointmentCount = db.prepare("SELECT count(*) as count FROM appointments WHERE date = date('now') AND isDeleted = 0").get() as { count: number };
            const prostheticCount = db.prepare("SELECT count(*) as count FROM prosthetics WHERE status IN ('ORDERED', 'IN_PROGRESS') AND isDeleted = 0").get() as { count: number };
            const delayCount = db.prepare("SELECT count(*) as count FROM prosthetics WHERE status != 'RECEIVED' AND status != 'CANCELLED' AND dueDate < date('now') AND isDeleted = 0").get() as { count: number };
            return {
                patients: patientCount.count,
                appointments: appointmentCount.count,
                prosthetics: prostheticCount.count,
                delays: delayCount.count
            };
        } catch (error) {
            console.error('get-stats error:', error);
            return { patients: 0, appointments: 0, prosthetics: 0, delays: 0 };
        }
    });

    // ==================== PATIENTS ====================
    ipcMain.handle('get-patients', () => {
        try {
            return db.prepare('SELECT * FROM patients WHERE isDeleted = 0 ORDER BY lastName, firstName').all();
        } catch (error) {
            console.error('get-patients error:', error);
            return [];
        }
    });

    ipcMain.handle('get-patient', (_event, id: number) => {
        try {
            return db.prepare('SELECT * FROM patients WHERE id = ? AND isDeleted = 0').get(id);
        } catch (error) {
            console.error('get-patient error:', error);
            return null;
        }
    });

    ipcMain.handle('search-patients', (_event, query: string) => {
        try {
            const searchQuery = `%${query}%`;
            return db.prepare(`
                SELECT * FROM patients 
                WHERE (firstName LIKE ? OR lastName LIKE ? OR phone LIKE ?) AND isDeleted = 0
                ORDER BY lastName, firstName
            `).all(searchQuery, searchQuery, searchQuery);
        } catch (error) {
            console.error('search-patients error:', error);
            return [];
        }
    });

    ipcMain.handle('create-patient', (_event, patient: { firstName: string, lastName: string, birthDate?: string, phone?: string, address?: string, medicalHistory?: string, allergies?: string, notes?: string }) => {
        try {
            console.log('IPC: create-patient received:', patient);
            const stmt = db.prepare(`
                INSERT INTO patients (firstName, lastName, birthDate, phone, address, medicalHistory, allergies, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(
                patient.firstName,
                patient.lastName,
                patient.birthDate || null,
                patient.phone || null,
                patient.address || null,
                patient.medicalHistory || null,
                patient.allergies || null,
                patient.notes || null
            );
            console.log('IPC: create-patient success, id:', result.lastInsertRowid);
            return db.prepare('SELECT * FROM patients WHERE id = ?').get(result.lastInsertRowid);
        } catch (error) {
            console.error('create-patient error:', error);
            throw error;
        }
    });

    ipcMain.handle('update-patient', (_event, id: number, patient: any) => {
        try {
            console.log('IPC: update-patient received:', id, patient);
            const allowedFields = ['firstName', 'lastName', 'birthDate', 'phone', 'address', 'medicalHistory', 'allergies', 'notes'];
            const updates = Object.keys(patient)
                .filter(key => allowedFields.includes(key))
                .reduce((obj, key) => {
                    obj[key] = patient[key];
                    return obj;
                }, {} as any);

            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);

            if (fields) {
                db.prepare(`UPDATE patients SET ${fields} WHERE id = ?`).run(...values, id);
            }
            console.log('IPC: update-patient success');
            return db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
        } catch (error) {
            console.error('update-patient error:', error);
            throw error;
        }
    });

    ipcMain.handle('delete-patient', (_event, id: number) => {
        try {
            // Soft delete patient and associated records
            db.prepare("UPDATE appointments SET isDeleted = 1, deletedAt = CURRENT_TIMESTAMP WHERE patientId = ?").run(id);
            db.prepare("UPDATE prosthetics SET isDeleted = 1, deletedAt = CURRENT_TIMESTAMP WHERE patientId = ?").run(id);
            db.prepare("UPDATE patients SET isDeleted = 1, deletedAt = CURRENT_TIMESTAMP WHERE id = ?").run(id);
            return true;
        } catch (error) {
            console.error('delete-patient error:', error);
            return false;
        }
    });

    // ==================== APPOINTMENTS ====================
    ipcMain.handle('get-appointments', (_event, date?: string) => {
        try {
            let query = `
                SELECT a.*, p.firstName || ' ' || p.lastName as patientName
                FROM appointments a
                LEFT JOIN patients p ON a.patientId = p.id
                WHERE a.isDeleted = 0
            `;
            if (date) {
                query += ` AND a.date = ? ORDER BY a.time`;
                return db.prepare(query).all(date);
            }
            query += ` ORDER BY a.date DESC, a.time`;
            return db.prepare(query).all();
        } catch (error) {
            console.error('get-appointments error:', error);
            return [];
        }
    });

    ipcMain.handle('get-today-appointments', () => {
        try {
            return db.prepare(`
                SELECT a.*, p.firstName || ' ' || p.lastName as patientName
                FROM appointments a
                LEFT JOIN patients p ON a.patientId = p.id
                WHERE a.date = date('now') AND a.isDeleted = 0
                ORDER BY a.time
            `).all();
        } catch (error) {
            console.error('get-today-appointments error:', error);
            return [];
        }
    });

    ipcMain.handle('get-appointments-by-patient', (_event, patientId: number) => {
        try {
            return db.prepare(`
                SELECT a.*, p.firstName || ' ' || p.lastName as patientName
                FROM appointments a
                LEFT JOIN patients p ON a.patientId = p.id
                WHERE a.patientId = ? AND a.isDeleted = 0
                ORDER BY a.date DESC, a.time
            `).all(patientId);
        } catch (error) {
            console.error('get-appointments-by-patient error:', error);
            return [];
        }
    });

    ipcMain.handle('create-appointment', (_event, appointment: { patientId: number, date: string, time: string, type: string, status?: string, notes?: string }) => {
        try {
            console.log('IPC: create-appointment received:', appointment);
            const stmt = db.prepare(`
                INSERT INTO appointments (patientId, date, time, type, status, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(
                appointment.patientId,
                appointment.date,
                appointment.time,
                appointment.type,
                appointment.status || 'PLANNED',
                appointment.notes || null
            );
            console.log('IPC: create-appointment success, id:', result.lastInsertRowid);
            return db.prepare(`
                SELECT a.*, p.firstName || ' ' || p.lastName as patientName
                FROM appointments a
                LEFT JOIN patients p ON a.patientId = p.id
                WHERE a.id = ?
            `).get(result.lastInsertRowid);
        } catch (error) {
            console.error('create-appointment error:', error);
            throw error;
        }
    });

    ipcMain.handle('update-appointment', (_event, id: number, appointment: any) => {
        try {
            const allowedFields = ['patientId', 'date', 'time', 'type', 'status', 'notes'];
            const updates = Object.keys(appointment)
                .filter(key => allowedFields.includes(key))
                .reduce((obj, key) => {
                    obj[key] = appointment[key];
                    return obj;
                }, {} as any);

            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);

            if (fields) {
                db.prepare(`UPDATE appointments SET ${fields} WHERE id = ?`).run(...values, id);
            }
            console.log('IPC: update-appointment success, id:', id);

            return db.prepare(`
                SELECT a.*, p.firstName || ' ' || p.lastName as patientName
                FROM appointments a
                LEFT JOIN patients p ON a.patientId = p.id
                WHERE a.id = ?
            `).get(id);
        } catch (error) {
            console.error('update-appointment error:', error);
            throw error;
        }
    });

    ipcMain.handle('update-appointment-status', (_event, id: number, status: string) => {
        try {
            db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
            return true;
        } catch (error) {
            console.error('update-appointment-status error:', error);
            return false;
        }
    });

    ipcMain.handle('delete-appointment', (_event, id: number) => {
        try {
            db.prepare("UPDATE appointments SET isDeleted = 1, deletedAt = CURRENT_TIMESTAMP WHERE id = ?").run(id);
            return true;
        } catch (error) {
            console.error('delete-appointment error:', error);
            return false;
        }
    });

    // ==================== PROSTHETICS ====================
    ipcMain.handle('get-prosthetics', () => {
        try {
            return db.prepare(`
                SELECT pr.*, 
                       p.firstName || ' ' || p.lastName as patientName,
                       s.name as supplierName
                FROM prosthetics pr
                LEFT JOIN patients p ON pr.patientId = p.id
                LEFT JOIN suppliers s ON pr.supplierId = s.id
                WHERE pr.isDeleted = 0
                ORDER BY pr.dueDate
            `).all();
        } catch (error) {
            console.error('get-prosthetics error:', error);
            return [];
        }
    });

    ipcMain.handle('get-prosthetics-by-patient', (_event, patientId: number) => {
        try {
            return db.prepare(`
                SELECT pr.*, 
                       p.firstName || ' ' || p.lastName as patientName,
                       s.name as supplierName
                FROM prosthetics pr
                LEFT JOIN patients p ON pr.patientId = p.id
                LEFT JOIN suppliers s ON pr.supplierId = s.id
                WHERE pr.patientId = ? AND pr.isDeleted = 0
                ORDER BY pr.orderDate DESC
            `).all(patientId);
        } catch (error) {
            console.error('get-prosthetics-by-patient error:', error);
            return [];
        }
    });

    ipcMain.handle('get-delayed-prosthetics', () => {
        try {
            return db.prepare(`
                SELECT pr.*, 
                       p.firstName || ' ' || p.lastName as patientName,
                       s.name as supplierName
                FROM prosthetics pr
                LEFT JOIN patients p ON pr.patientId = p.id
                LEFT JOIN suppliers s ON pr.supplierId = s.id
                WHERE pr.status NOT IN ('RECEIVED', 'CANCELLED') AND pr.dueDate < date('now') AND pr.isDeleted = 0
                ORDER BY pr.dueDate
            `).all();
        } catch (error) {
            console.error('get-delayed-prosthetics error:', error);
            return [];
        }
    });

    ipcMain.handle('create-prosthetic', (_event, prosthetic: { patientId: number, supplierId: number, type: string, orderDate: string, dueDate: string, status?: string, notes?: string, price?: number }) => {
        try {
            console.log('IPC: create-prosthetic received:', prosthetic);
            const stmt = db.prepare(`
                INSERT INTO prosthetics (patientId, supplierId, type, orderDate, dueDate, status, notes, price)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(
                prosthetic.patientId,
                prosthetic.supplierId,
                prosthetic.type,
                prosthetic.orderDate,
                prosthetic.dueDate,
                prosthetic.status || 'ORDERED',
                prosthetic.notes || null,
                prosthetic.price || null
            );
            console.log('IPC: create-prosthetic success update, id:', result.lastInsertRowid);
            return db.prepare(`
                SELECT pr.*, 
                       p.firstName || ' ' || p.lastName as patientName,
                       s.name as supplierName
                FROM prosthetics pr
                LEFT JOIN patients p ON pr.patientId = p.id
                LEFT JOIN suppliers s ON pr.supplierId = s.id
                WHERE pr.id = ?
            `).get(result.lastInsertRowid);
        } catch (error) {
            console.error('create-prosthetic error:', error);
            throw error;
        }
    });

    ipcMain.handle('update-prosthetic', (_event, id: number, prosthetic: any) => {
        try {
            const allowedFields = ['patientId', 'supplierId', 'type', 'orderDate', 'dueDate', 'receivedDate', 'status', 'notes', 'price', 'paymentStatus', 'paymentDate'];
            const updates = Object.keys(prosthetic)
                .filter(key => allowedFields.includes(key))
                .reduce((obj, key) => {
                    obj[key] = prosthetic[key];
                    return obj;
                }, {} as any);

            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);

            if (fields) {
                db.prepare(`UPDATE prosthetics SET ${fields} WHERE id = ?`).run(...values, id);
            }
            console.log('IPC: update-prosthetic success, id:', id);

            return db.prepare(`
                SELECT pr.*, 
                       p.firstName || ' ' || p.lastName as patientName,
                       s.name as supplierName
                FROM prosthetics pr
                LEFT JOIN patients p ON pr.patientId = p.id
                LEFT JOIN suppliers s ON pr.supplierId = s.id
                WHERE pr.id = ?
            `).get(id);
        } catch (error) {
            console.error('update-prosthetic error:', error);
            throw error;
        }
    });

    ipcMain.handle('mark-prosthetic-received', (_event, id: number) => {
        try {
            db.prepare("UPDATE prosthetics SET status = 'RECEIVED', receivedDate = date('now') WHERE id = ?").run(id);
            return true;
        } catch (error) {
            console.error('mark-prosthetic-received error:', error);
            return false;
        }
    });

    ipcMain.handle('delete-prosthetic', (_event, id: number) => {
        try {
            db.prepare("UPDATE prosthetics SET isDeleted = 1, deletedAt = CURRENT_TIMESTAMP WHERE id = ?").run(id);
            return true;
        } catch (error) {
            console.error('delete-prosthetic error:', error);
            return false;
        }
    });

    // ==================== SUPPLIERS ====================
    ipcMain.handle('get-suppliers', () => {
        try {
            return db.prepare('SELECT * FROM suppliers WHERE isDeleted = 0 ORDER BY name').all();
        } catch (error) {
            console.error('get-suppliers error:', error);
            return [];
        }
    });

    ipcMain.handle('get-supplier', (_event, id: number) => {
        try {
            return db.prepare('SELECT * FROM suppliers WHERE id = ? AND isDeleted = 0').get(id);
        } catch (error) {
            console.error('get-supplier error:', error);
            return null;
        }
    });

    ipcMain.handle('create-supplier', (_event, supplier: { name: string, contact?: string, phone?: string, email?: string, address?: string, notes?: string }) => {
        try {
            console.log('IPC: create-supplier received:', supplier);
            const stmt = db.prepare(`
                INSERT INTO suppliers (name, contact, phone, email, address, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(
                supplier.name,
                supplier.contact || null,
                supplier.phone || null,
                supplier.email || null,
                supplier.address || null,
                supplier.notes || null
            );
            console.log('IPC: create-supplier success, id:', result.lastInsertRowid);
            return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
        } catch (error) {
            console.error('create-supplier error:', error);
            throw error;
        }
    });

    ipcMain.handle('update-supplier', (_event, id: number, supplier: any) => {
        try {
            const allowedFields = ['name', 'contact', 'phone', 'email', 'address', 'notes'];
            const updates = Object.keys(supplier)
                .filter(key => allowedFields.includes(key))
                .reduce((obj, key) => {
                    obj[key] = supplier[key];
                    return obj;
                }, {} as any);

            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);

            if (fields) {
                db.prepare(`UPDATE suppliers SET ${fields} WHERE id = ?`).run(...values, id);
            }
            console.log('IPC: update-supplier success, id:', id);
            return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
        } catch (error) {
            console.error('update-supplier error:', error);
            throw error;
        }
    });

    ipcMain.handle('delete-supplier', (_event, id: number) => {
        try {
            // Check if supplier has prosthetics (active only)
            const prosthetics = db.prepare('SELECT count(*) as count FROM prosthetics WHERE supplierId = ? AND isDeleted = 0').get(id) as { count: number };
            if (prosthetics.count > 0) {
                throw new Error('Cannot delete supplier with existing active prosthetics');
            }
            db.prepare("UPDATE suppliers SET isDeleted = 1, deletedAt = CURRENT_TIMESTAMP WHERE id = ?").run(id);
            return true;
        } catch (error) {
            console.error('delete-supplier error:', error);
            return false;
        }
    });

    // ==================== TRASH BIN ====================
    ipcMain.handle('get-trash', () => {
        try {
            const patients = db.prepare("SELECT 'patient' as type, id, firstName || ' ' || lastName as name, deletedAt FROM patients WHERE isDeleted = 1").all();
            const appointments = db.prepare("SELECT 'appointment' as type, id, date || ' ' || time as name, deletedAt FROM appointments WHERE isDeleted = 1").all();
            const suppliers = db.prepare("SELECT 'supplier' as type, id, name, deletedAt FROM suppliers WHERE isDeleted = 1").all();
            const prosthetics = db.prepare("SELECT 'prosthetic' as type, id, type as name, deletedAt FROM prosthetics WHERE isDeleted = 1").all();

            return [...patients, ...appointments, ...suppliers, ...prosthetics].sort((a: any, b: any) =>
                new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
            );
        } catch (error) {
            console.error('get-trash error:', error);
            return [];
        }
    });

    ipcMain.handle('restore-item', (_event, type: string, id: number) => {
        try {
            const table = type === 'patient' ? 'patients' :
                type === 'appointment' ? 'appointments' :
                    type === 'supplier' ? 'suppliers' :
                        type === 'prosthetic' ? 'prosthetics' : null;

            if (table) {
                db.prepare(`UPDATE ${table} SET isDeleted = 0, deletedAt = NULL WHERE id = ?`).run(id);

                // If restoring a patient, we might want to optionally restore their records, but let's keep it simple for now
                // and only restore the patient record itself to avoid confusion.
                return true;
            }
            return false;
        } catch (error) {
            console.error('restore-item error:', error);
            return false;
        }
    });

    // ==================== PATIENT FILES ====================
    ipcMain.handle('get-patient-files', (_event, patientId: number) => {
        try {
            return db.prepare(`
                SELECT * FROM patient_files 
                WHERE patientId = ?
                ORDER BY uploadedAt DESC
            `).all(patientId);
        } catch (error) {
            console.error('get-patient-files error:', error);
            return [];
        }
    });

    ipcMain.handle('upload-patient-file', async (_event, patientId: number, category: string, description?: string) => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [
                    { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
                    { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx'] },
                    { name: 'Tous les fichiers', extensions: ['*'] }
                ]
            });

            if (result.canceled || result.filePaths.length === 0) {
                return null;
            }

            const sourcePath = result.filePaths[0];
            const originalName = path.basename(sourcePath);
            const ext = path.extname(originalName);
            const fileType = ext.toLowerCase().replace('.', '');

            // Generate unique filename
            const uniqueId = crypto.randomBytes(16).toString('hex');
            const fileName = `${patientId}_${uniqueId}${ext}`;

            // Copy file to storage directory
            const filesDir = getFilesDir();
            const destPath = path.join(filesDir, fileName);
            fs.copyFileSync(sourcePath, destPath);

            // Get file size
            const stats = fs.statSync(destPath);

            // Save to database
            const stmt = db.prepare(`
                INSERT INTO patient_files (patientId, fileName, originalName, fileType, fileSize, category, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const insertResult = stmt.run(
                patientId,
                fileName,
                originalName,
                fileType,
                stats.size,
                category,
                description || null
            );

            return db.prepare('SELECT * FROM patient_files WHERE id = ?').get(insertResult.lastInsertRowid);
        } catch (error) {
            console.error('upload-patient-file error:', error);
            throw error;
        }
    });

    ipcMain.handle('delete-patient-file', (_event, fileId: number) => {
        try {
            // Get file info
            const file = db.prepare('SELECT * FROM patient_files WHERE id = ?').get(fileId) as { fileName: string } | undefined;

            if (file) {
                // Delete physical file
                const filePath = path.join(getFilesDir(), file.fileName);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }

                // Delete from database
                db.prepare('DELETE FROM patient_files WHERE id = ?').run(fileId);
            }

            return true;
        } catch (error) {
            console.error('delete-patient-file error:', error);
            return false;
        }
    });

    ipcMain.handle('open-patient-file', (_event, fileId: number) => {
        try {
            const file = db.prepare('SELECT * FROM patient_files WHERE id = ?').get(fileId) as { fileName: string } | undefined;

            if (file) {
                const filePath = path.join(getFilesDir(), file.fileName);
                if (fs.existsSync(filePath)) {
                    shell.openPath(filePath);
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('open-patient-file error:', error);
            return false;
        }
    });

    ipcMain.handle('get-file-path', (_event, fileId: number) => {
        try {
            const file = db.prepare('SELECT * FROM patient_files WHERE id = ?').get(fileId) as { fileName: string } | undefined;

            if (file) {
                return path.join(getFilesDir(), file.fileName);
            }

            return null;
        } catch (error) {
            console.error('get-file-path error:', error);
            return null;
        }
    });
}
