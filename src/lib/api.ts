// API wrapper pour communiquer avec le processus principal Electron via IPC
import type { Patient, Appointment, Prosthetic, Supplier, DashboardStats, PatientFile } from '../types';

const api = {
    // ==================== DASHBOARD ====================
    getStats: async (): Promise<DashboardStats> => {
        return await window.ipcRenderer.invoke('get-stats') as DashboardStats;
    },

    // ==================== PATIENTS ====================
    getPatients: async (): Promise<Patient[]> => {
        return await window.ipcRenderer.invoke('get-patients') as Patient[];
    },

    getPatient: async (id: number): Promise<Patient | null> => {
        return await window.ipcRenderer.invoke('get-patient', id) as Patient | null;
    },

    searchPatients: async (query: string): Promise<Patient[]> => {
        return await window.ipcRenderer.invoke('search-patients', query) as Patient[];
    },

    createPatient: async (patient: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient> => {
        return await window.ipcRenderer.invoke('create-patient', patient) as Patient;
    },

    updatePatient: async (id: number, patient: Partial<Patient>): Promise<Patient> => {
        return await window.ipcRenderer.invoke('update-patient', id, patient) as Patient;
    },

    deletePatient: async (id: number): Promise<boolean> => {
        return await window.ipcRenderer.invoke('delete-patient', id) as boolean;
    },

    // ==================== APPOINTMENTS ====================
    getAppointments: async (date?: string): Promise<Appointment[]> => {
        return await window.ipcRenderer.invoke('get-appointments', date) as Appointment[];
    },

    getAppointmentsByPatient: async (patientId: number): Promise<Appointment[]> => {
        return await window.ipcRenderer.invoke('get-appointments-by-patient', patientId) as Appointment[];
    },

    getTodayAppointments: async (): Promise<Appointment[]> => {
        return await window.ipcRenderer.invoke('get-today-appointments') as Appointment[];
    },

    createAppointment: async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
        return await window.ipcRenderer.invoke('create-appointment', appointment) as Appointment;
    },

    updateAppointment: async (id: number, appointment: Partial<Appointment>): Promise<Appointment> => {
        return await window.ipcRenderer.invoke('update-appointment', id, appointment) as Appointment;
    },

    deleteAppointment: async (id: number): Promise<boolean> => {
        return await window.ipcRenderer.invoke('delete-appointment', id) as boolean;
    },

    updateAppointmentStatus: async (id: number, status: string): Promise<boolean> => {
        return await window.ipcRenderer.invoke('update-appointment-status', id, status) as boolean;
    },

    // ==================== PROSTHETICS ====================
    getProsthetics: async (): Promise<Prosthetic[]> => {
        return await window.ipcRenderer.invoke('get-prosthetics') as Prosthetic[];
    },

    getProstheticsByPatient: async (patientId: number): Promise<Prosthetic[]> => {
        return await window.ipcRenderer.invoke('get-prosthetics-by-patient', patientId) as Prosthetic[];
    },

    getDelayedProsthetics: async (): Promise<Prosthetic[]> => {
        return await window.ipcRenderer.invoke('get-delayed-prosthetics') as Prosthetic[];
    },

    createProsthetic: async (prosthetic: Omit<Prosthetic, 'id'>): Promise<Prosthetic> => {
        return await window.ipcRenderer.invoke('create-prosthetic', prosthetic) as Prosthetic;
    },

    updateProsthetic: async (id: number, prosthetic: Partial<Prosthetic>): Promise<Prosthetic> => {
        return await window.ipcRenderer.invoke('update-prosthetic', id, prosthetic) as Prosthetic;
    },

    deleteProsthetic: async (id: number): Promise<boolean> => {
        return await window.ipcRenderer.invoke('delete-prosthetic', id) as boolean;
    },

    markProstheticReceived: async (id: number): Promise<boolean> => {
        return await window.ipcRenderer.invoke('mark-prosthetic-received', id) as boolean;
    },

    // ==================== SUPPLIERS ====================
    getSuppliers: async (): Promise<Supplier[]> => {
        return await window.ipcRenderer.invoke('get-suppliers') as Supplier[];
    },

    getSupplier: async (id: number): Promise<Supplier | null> => {
        return await window.ipcRenderer.invoke('get-supplier', id) as Supplier | null;
    },

    createSupplier: async (supplier: Omit<Supplier, 'id'>): Promise<Supplier> => {
        return await window.ipcRenderer.invoke('create-supplier', supplier) as Supplier;
    },

    updateSupplier: async (id: number, supplier: Partial<Supplier>): Promise<Supplier> => {
        return await window.ipcRenderer.invoke('update-supplier', id, supplier) as Supplier;
    },

    deleteSupplier: async (id: number): Promise<boolean> => {
        return await window.ipcRenderer.invoke('delete-supplier', id) as boolean;
    },

    // ==================== PATIENT FILES ====================
    getPatientFiles: async (patientId: number): Promise<PatientFile[]> => {
        return await window.ipcRenderer.invoke('get-patient-files', patientId) as PatientFile[];
    },

    uploadPatientFile: async (patientId: number, category: string, description?: string): Promise<PatientFile | null> => {
        return await window.ipcRenderer.invoke('upload-patient-file', patientId, category, description) as PatientFile | null;
    },

    deletePatientFile: async (fileId: number): Promise<boolean> => {
        return await window.ipcRenderer.invoke('delete-patient-file', fileId) as boolean;
    },

    openPatientFile: async (fileId: number): Promise<boolean> => {
        return await window.ipcRenderer.invoke('open-patient-file', fileId) as boolean;
    },

    getFilePath: async (fileId: number): Promise<string | null> => {
        return await window.ipcRenderer.invoke('get-file-path', fileId) as string | null;
    },

    // ==================== TRASH BIN ====================
    getTrash: async (): Promise<any[]> => {
        return await window.ipcRenderer.invoke('get-trash') as any[];
    },

    restoreItem: async (type: string, id: number): Promise<boolean> => {
        return await window.ipcRenderer.invoke('restore-item', type, id) as boolean;
    },
};

export default api;
