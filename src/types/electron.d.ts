import type { Patient, Appointment, Prosthetic, Supplier, DashboardStats } from './index';

export interface ElectronAPI {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    send: (channel: string, ...args: unknown[]) => void;
    on: (channel: string, listener: (...args: unknown[]) => void) => void;
    off: (channel: string, listener: (...args: unknown[]) => void) => void;
}

declare global {
    interface Window {
        ipcRenderer: ElectronAPI;
    }
}
