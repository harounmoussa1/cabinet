// Types principaux pour l'application DentalCab Manager

export interface Patient {
    id: number;
    firstName: string;
    lastName: string;
    cin?: string;
    birthDate?: string;
    phone?: string;
    address?: string;
    medicalHistory?: string;
    allergies?: string;
    notes?: string;
    createdAt: string;
}

export interface Appointment {
    id: number;
    patientId: number;
    patientName?: string; // Joined from patients table
    date: string;
    time: string;
    type: AppointmentType;
    status: AppointmentStatus;
    notes?: string;
}

export type AppointmentType =
    | 'CONSULTATION'
    | 'DETARTRAGE'
    | 'EXTRACTION'
    | 'SOINS'
    | 'PROTHESE'
    | 'CONTROLE'
    | 'URGENCE'
    | 'AUTRE';

export type AppointmentStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Prosthetic {
    id: number;
    patientId: number;
    patientName?: string;
    supplierId: number;
    supplierName?: string;
    type: ProstheticType;
    orderDate: string;
    dueDate: string;
    receivedDate?: string;
    status: ProstheticStatus;
    notes?: string;
    price?: number;
    paymentStatus?: 'UNPAID' | 'PAID';
    paymentDate?: string;
}

export type ProstheticType = string;

export type ProstheticStatus = 'ORDERED' | 'IN_PROGRESS' | 'RECEIVED' | 'DELAYED' | 'CANCELLED';

export interface Supplier {
    id: number;
    name: string;
    contact?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
}

export interface DashboardStats {
    patients: number;
    appointments: number;
    prosthetics: number;
    delays: number;
}

export interface User {
    id: number;
    username: string;
    role: 'ADMIN' | 'DENTIST' | 'ASSISTANT';
    fullName: string;
}

export interface PatientFile {
    id: number;
    patientId: number;
    fileName: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    category: FileCategory;
    description?: string;
    uploadedAt: string;
}

export type FileCategory =
    | 'RADIOGRAPHIE'
    | 'PANORAMIQUE'
    | 'SCANNER'
    | 'ORDONNANCE'
    | 'CERTIFICAT'
    | 'FACTURE'
    | 'AUTRE';
