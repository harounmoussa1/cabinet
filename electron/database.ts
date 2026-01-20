import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

// Database path: local in dev, userData in production
const isDev = !app.isPackaged;
export const dbPath = isDev
    ? path.join(app.getAppPath(), 'dental_cabinet.db')
    : path.join(app.getPath('userData'), 'dental_cabinet.db');

console.log('Database path:', dbPath);

export const db = new Database(dbPath, { verbose: isDev ? console.log : undefined });

/**
 * Close the database connection. Necessary for file replacement during restoration.
 */
export function closeDB(): void {
    try {
        db.close();
        console.log('Database connection closed.');
    } catch (error) {
        console.error('Error closing database:', error);
    }
}

/**
 * Perform a live backup of the database to a destination file.
 * This is the recommended way to backup a better-sqlite3 database.
 */
export async function backupDatabase(destination: string): Promise<void> {
    try {
        await db.backup(destination);
        console.log(`Database backed up to ${destination}`);
    } catch (error) {
        console.error('Database backup failed:', error);
        throw error;
    }
}

export function initDB() {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    db.exec(`
        -- Patients table
        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            birthDate TEXT,
            phone TEXT,
            address TEXT,
            medicalHistory TEXT,
            allergies TEXT,
            notes TEXT,
            isDeleted INTEGER DEFAULT 0,
            deletedAt DATETIME,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Appointments table
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patientId INTEGER NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'CONSULTATION',
            status TEXT DEFAULT 'PLANNED',
            notes TEXT,
            isDeleted INTEGER DEFAULT 0,
            deletedAt DATETIME,
            FOREIGN KEY(patientId) REFERENCES patients(id)
        );

        -- Suppliers table
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            notes TEXT,
            isDeleted INTEGER DEFAULT 0,
            deletedAt DATETIME
        );

        -- Prosthetics table
        CREATE TABLE IF NOT EXISTS prosthetics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patientId INTEGER NOT NULL,
            supplierId INTEGER,
            type TEXT NOT NULL,
            orderDate TEXT NOT NULL,
            dueDate TEXT NOT NULL,
            receivedDate TEXT,
            status TEXT DEFAULT 'ORDERED',
            notes TEXT,
            price REAL,
            paymentStatus TEXT DEFAULT 'UNPAID',
            paymentDate TEXT,
            isDeleted INTEGER DEFAULT 0,
            deletedAt DATETIME,
            FOREIGN KEY(patientId) REFERENCES patients(id),
            FOREIGN KEY(supplierId) REFERENCES suppliers(id)
        );

        -- Patient files table
        CREATE TABLE IF NOT EXISTS patient_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patientId INTEGER NOT NULL,
            fileName TEXT NOT NULL,
            originalName TEXT NOT NULL,
            fileType TEXT NOT NULL,
            fileSize INTEGER,
            category TEXT DEFAULT 'AUTRE',
            description TEXT,
            uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(patientId) REFERENCES patients(id)
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
        CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patientId);
        CREATE INDEX IF NOT EXISTS idx_prosthetics_patient ON prosthetics(patientId);
        CREATE INDEX IF NOT EXISTS idx_prosthetics_status ON prosthetics(status);
        CREATE INDEX IF NOT EXISTS idx_prosthetics_due ON prosthetics(dueDate);
        CREATE INDEX IF NOT EXISTS idx_patient_files ON patient_files(patientId);
    `);

    // Migrations / Column checks
    const tables = ['patients', 'appointments', 'suppliers', 'prosthetics'];
    tables.forEach(table => {
        const columns = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
        const columnNames = columns.map(c => c.name);

        if (!columnNames.includes('isDeleted')) {
            db.exec(`ALTER TABLE ${table} ADD COLUMN isDeleted INTEGER DEFAULT 0`);
        }
        if (!columnNames.includes('deletedAt')) {
            db.exec(`ALTER TABLE ${table} ADD COLUMN deletedAt DATETIME`);
        }
    });

    // Special checks for prosthetics
    const prostheticColumns = db.prepare("PRAGMA table_info(prosthetics)").all() as any[];
    const prostheticColumnNames = prostheticColumns.map(c => c.name);

    if (!prostheticColumnNames.includes('price')) {
        db.exec('ALTER TABLE prosthetics ADD COLUMN price REAL');
    }
    if (!prostheticColumnNames.includes('paymentStatus')) {
        db.exec("ALTER TABLE prosthetics ADD COLUMN paymentStatus TEXT DEFAULT 'UNPAID'");
    }
    if (!prostheticColumnNames.includes('paymentDate')) {
        db.exec('ALTER TABLE prosthetics ADD COLUMN paymentDate TEXT');
    }

    // Cleanup permanent deletes (older than 15 days)
    try {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        const isoDate = fifteenDaysAgo.toISOString();

        tables.forEach(table => {
            db.prepare(`DELETE FROM ${table} WHERE isDeleted = 1 AND deletedAt < ?`).run(isoDate);
        });
        console.log('Old deleted items cleaned up from database.');
    } catch (error) {
        console.error('Database cleanup error:', error);
    }

    // Seed with sample data if database is empty
    try {
        const patientCount = db.prepare('SELECT count(*) as count FROM patients').get() as { count: number };

        if (patientCount.count === 0) {
            console.log('Seeding database with sample data...');

            // Insert sample suppliers
            const insertSupplier = db.prepare('INSERT INTO suppliers (name, contact, phone, email) VALUES (?, ?, ?, ?)');
            insertSupplier.run('Labo Dentaire Tunis', 'M. Karim', '71 234 567', 'contact@labotunis.tn');
            insertSupplier.run('ProDent Solutions', 'Mme. Sonia', '71 890 123', 'info@prodent.tn');
            insertSupplier.run('TechDent Lab', 'M. Ahmed', '71 456 789', 'tech@techdent.tn');

            // Insert sample patients
            const insertPatient = db.prepare(`
                INSERT INTO patients (firstName, lastName, birthDate, phone, address, medicalHistory, allergies)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            insertPatient.run('Fatma', 'Ben Ali', '1985-03-15', '55 123 456', 'Rue de la République, Sousse', 'Diabète type 2', 'Pénicilline');
            insertPatient.run('Mohamed', 'Tounsi', '1978-07-22', '55 789 012', 'Avenue Habib Bourguiba, Tunis', 'Hypertension', null);
            insertPatient.run('Leila', 'Gharbi', '1992-11-08', '55 345 678', 'Rue Ibn Khaldoun, Sfax', null, null);
            insertPatient.run('Karim', 'Mejri', '1965-01-30', '55 901 234', 'Avenue de la Liberté, Monastir', 'Problèmes cardiaques', 'Latex');
            insertPatient.run('Sonia', 'Bouazizi', '1988-05-12', '55 567 890', 'Rue de Marseille, Tunis', null, null);

            // Insert sample appointments for today
            const today = new Date().toISOString().split('T')[0];
            const insertAppointment = db.prepare(`
                INSERT INTO appointments (patientId, date, time, type, status, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            insertAppointment.run(1, today, '09:00', 'CONSULTATION', 'PLANNED', 'Premier rendez-vous');
            insertAppointment.run(2, today, '10:30', 'SOINS', 'PLANNED', 'Carie à traiter');
            insertAppointment.run(3, today, '14:00', 'DETARTRAGE', 'PLANNED', null);
            insertAppointment.run(4, today, '15:30', 'PROTHESE', 'PLANNED', 'Pose de couronne');

            // Insert sample prosthetics
            const insertProsthetic = db.prepare(`
                INSERT INTO prosthetics (patientId, supplierId, type, orderDate, dueDate, status, price)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            // One delayed prosthetic
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 3);
            insertProsthetic.run(2, 1, 'COURONNE', '2026-01-10', pastDate.toISOString().split('T')[0], 'IN_PROGRESS', 450);

            // One in progress
            const futureDate1 = new Date();
            futureDate1.setDate(futureDate1.getDate() + 5);
            insertProsthetic.run(4, 2, 'BRIDGE', '2026-01-15', futureDate1.toISOString().split('T')[0], 'ORDERED', 1200);

            // One ordered recently
            const futureDate2 = new Date();
            futureDate2.setDate(futureDate2.getDate() + 10);
            insertProsthetic.run(1, 3, 'APPAREIL', '2026-01-17', futureDate2.toISOString().split('T')[0], 'ORDERED', 800);

            console.log('Database seeded successfully!');
        }
    } catch (error) {
        console.error('Database seeding error:', error);
    }
}

export default db;
