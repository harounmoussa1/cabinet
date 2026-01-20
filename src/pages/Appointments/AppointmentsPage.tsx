import React, { useEffect, useState } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    CalendarDays,
    Clock,
    CheckCircle,
    XCircle,
    ChevronLeft,
    Eye,
    MapPin,
    Phone,
    AlertCircle,
    ChevronRight,
    User
} from 'lucide-react';
import api from '../../lib/api';
import type { Appointment, Patient } from '../../types';
import { Modal, ConfirmModal, EmptyState, LoadingCard } from '../../components/ui';
import { PatientFiles, PatientHistory } from '../../components/patients';

const APPOINTMENT_TYPES = [
    { value: 'CONSULTATION', label: 'Consultation' },
    { value: 'DETARTRAGE', label: 'Détartrage' },
    { value: 'EXTRACTION', label: 'Extraction' },
    { value: 'SOINS', label: 'Soins' },
    { value: 'PROTHESE', label: 'Prothèse' },
    { value: 'CONTROLE', label: 'Contrôle' },
    { value: 'URGENCE', label: 'Urgence' },
    { value: 'AUTRE', label: 'Autre' },
];

const STATUS_OPTIONS = [
    { value: 'PLANNED', label: 'Planifié', color: 'badge-info' },
    { value: 'COMPLETED', label: 'Terminé', color: 'badge-success' },
    { value: 'CANCELLED', label: 'Annulé', color: 'badge-neutral' },
    { value: 'NO_SHOW', label: 'Absent', color: 'badge-danger' },
];

export function AppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [formData, setFormData] = useState<Partial<Appointment>>({});

    // Patient View Modal State
    const [isViewPatientOpen, setIsViewPatientOpen] = useState(false);
    const [viewPatientTab, setViewPatientTab] = useState<'info' | 'history' | 'files'>('info');
    const [selectedPatientForView, setSelectedPatientForView] = useState<Patient | null>(null);

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const loadData = async () => {
        try {
            const [appointmentsData, patientsData] = await Promise.all([
                api.getAppointments(selectedDate),
                api.getPatients()
            ]);
            setAppointments(appointmentsData);
            setPatients(patientsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() - 1);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + 1);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const handleToday = () => {
        setSelectedDate(new Date().toISOString().split('T')[0]);
    };

    const handleCreate = () => {
        setSelectedAppointment(null);
        setFormData({ date: selectedDate, time: '09:00', type: 'CONSULTATION', status: 'PLANNED' });
        setIsFormOpen(true);
    };

    const handleEdit = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setFormData(appointment);
        setIsFormOpen(true);
    };

    const handleDelete = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setIsDeleteOpen(true);
    };

    const handleViewPatient = async (patientId: number) => {
        const patient = patients.find(p => p.id === patientId);
        if (patient) {
            setSelectedPatientForView(patient);
            setIsViewPatientOpen(true);
            setViewPatientTab('info');
        }
    };

    const handleStatusChange = async (appointment: Appointment, status: string) => {
        await api.updateAppointmentStatus(appointment.id, status);
        await loadData();
    };

    const confirmDelete = async () => {
        if (selectedAppointment) {
            await api.deleteAppointment(selectedAppointment.id);
            await loadData();
            setIsDeleteOpen(false);
            setSelectedAppointment(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Frontend: Appointments handleSubmit', formData);
        try {
            if (selectedAppointment) {
                console.log('Frontend: Calling updateAppointment', selectedAppointment.id, formData);
                await api.updateAppointment(selectedAppointment.id, formData);
            } else {
                console.log('Frontend: Calling createAppointment', formData);
                await api.createAppointment(formData as Omit<Appointment, 'id'>);
            }
            await loadData();
            setIsFormOpen(false);
            setFormData({});
        } catch (error) {
            console.error('Failed to save appointment:', error);
        }
    };

    const formatDateDisplay = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatDateOfBirth = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('fr-FR');
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    const getStatusBadge = (status: string) => {
        const statusOption = STATUS_OPTIONS.find(s => s.value === status);
        return <span className={statusOption?.color || 'badge-neutral'}>{statusOption?.label || status}</span>;
    };

    const getTypeLabel = (type: string) => {
        return APPOINTMENT_TYPES.find(t => t.value === type)?.label || type;
    };

    if (loading) {
        return (
            <div className="p-6">
                <LoadingCard message="Chargement des rendez-vous..." />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-slide-up">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Agenda</h1>
                    <p className="text-slate-500 font-medium">Planification et suivi des interventions</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="btn-primary group px-6 py-3"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    Nouveau Rendez-vous
                </button>
            </header>

            {/* Date Navigation */}
            <div className="card p-4 bg-slate-50 border-slate-200">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevDay} className="btn-icon bg-white text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={handleToday} className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${isToday ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                            Aujourd'hui
                        </button>
                        <button onClick={handleNextDay} className="btn-icon bg-white text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="flex flex-col items-center md:items-end">
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500" size={18} />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="input pl-12 w-auto bg-white border-slate-200 font-bold tabular-nums"
                                />
                            </div>
                        </div>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 mr-2">{formatDateDisplay(selectedDate)}</p>
                    </div>
                </div>
            </div>

            {/* Appointments List */}
            {appointments.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={<CalendarDays size={32} />}
                        title="Aucun rendez-vous"
                        description="Aucun rendez-vous prévu pour cette date"
                        action={
                            <button onClick={handleCreate} className="btn-primary">
                                <Plus size={18} />
                                Planifier un rendez-vous
                            </button>
                        }
                    />
                </div>
            ) : (
                <div className="space-y-3">
                    {appointments.map((appointment) => (
                        <div
                            key={appointment.id}
                            className="card p-4 hover:border-teal-500/30 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex flex-col items-center justify-center border border-teal-500/20">
                                        <Clock size={16} className="text-teal-400 mb-1" />
                                        <span className="text-teal-400 font-bold text-lg">{appointment.time.substring(0, 5)}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-slate-400" />
                                            <p className="font-semibold text-slate-800">{appointment.patientName}</p>
                                        </div>
                                        <p className="text-slate-500 mt-1">{getTypeLabel(appointment.type)}</p>
                                        {appointment.notes && (
                                            <p className="text-xs text-slate-500 mt-1">{appointment.notes}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Status Dropdown */}
                                    <select
                                        value={appointment.status}
                                        onChange={(e) => handleStatusChange(appointment, e.target.value)}
                                        className="input text-sm py-2"
                                    >
                                        {STATUS_OPTIONS.map(status => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Quick Actions */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleViewPatient(appointment.patientId)}
                                            className="btn-icon text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                            title="Voir la fiche patient"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(appointment, 'COMPLETED')}
                                            className="btn-icon text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                            title="Marquer comme terminé"
                                        >
                                            <CheckCircle size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(appointment, 'CANCELLED')}
                                            className="btn-icon text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                            title="Annuler"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(appointment)}
                                            className="btn-icon"
                                            title="Modifier"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(appointment)}
                                            className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={selectedAppointment ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
            >
                <form id="appointment-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Patient *</label>
                        <select
                            className="input"
                            value={formData.patientId || ''}
                            onChange={(e) => setFormData({ ...formData, patientId: parseInt(e.target.value) })}
                            required
                        >
                            <option value="">Sélectionner un patient</option>
                            {patients.map(patient => (
                                <option key={patient.id} value={patient.id}>
                                    {patient.lastName} {patient.firstName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Date *</label>
                            <input
                                type="date"
                                className="input"
                                value={formData.date || ''}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Heure *</label>
                            <input
                                type="time"
                                className="input"
                                value={formData.time || ''}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Type de consultation *</label>
                            <select
                                className="input"
                                value={formData.type || 'CONSULTATION'}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as Appointment['type'] })}
                                required
                            >
                                {APPOINTMENT_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Statut</label>
                            <select
                                className="input"
                                value={formData.status || 'PLANNED'}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as Appointment['status'] })}
                            >
                                {STATUS_OPTIONS.map(status => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="label">Notes</label>
                        <textarea
                            className="input min-h-[80px]"
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Détails du rendez-vous..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">
                            Annuler
                        </button>
                        <button type="submit" className="btn-primary">
                            {selectedAppointment ? 'Enregistrer' : 'Créer'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Patient Modal */}
            <Modal
                isOpen={isViewPatientOpen}
                onClose={() => setIsViewPatientOpen(false)}
                title="Fiche patient"
                size="lg"
                className="modal-view-details"
            >
                {selectedPatientForView && (
                    <div className="space-y-6">
                        {/* Patient Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xl font-bold border-2 border-slate-700">
                                    {selectedPatientForView.firstName[0]}{selectedPatientForView.lastName[0]}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">
                                        {selectedPatientForView.lastName} {selectedPatientForView.firstName}
                                    </h3>
                                    <p className="text-slate-400 text-sm">
                                        Inscrit le {formatDateOfBirth(selectedPatientForView.createdAt)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`badge-${selectedPatientForView.allergies ? 'danger' : 'success'} text-xs uppercase tracking-wider`}>
                                    {selectedPatientForView.allergies ? 'Allergies détectées' : 'Pas d\'allergies'}
                                </span>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b border-slate-700">
                            <button
                                onClick={() => setViewPatientTab('info')}
                                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${viewPatientTab === 'info' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Informations
                            </button>
                            <button
                                onClick={() => setViewPatientTab('history')}
                                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${viewPatientTab === 'history' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Historique médical
                            </button>
                            <button
                                onClick={() => setViewPatientTab('files')}
                                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${viewPatientTab === 'files' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Radios & Documents
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[400px]">
                            {viewPatientTab === 'info' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Téléphone</p>
                                            <p className="text-slate-800 font-medium flex items-center gap-2">
                                                <Phone size={14} className="text-teal-500" />
                                                {selectedPatientForView.phone || '-'}
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Date de naissance</p>
                                            <p className="text-slate-800 font-medium flex items-center gap-2">
                                                <CalendarDays size={14} className="text-teal-500" />
                                                {formatDateOfBirth(selectedPatientForView.birthDate)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Adresse</p>
                                        <p className="text-slate-800 flex items-center gap-2">
                                            <MapPin size={14} className="text-teal-500" />
                                            {selectedPatientForView.address || '-'}
                                        </p>
                                    </div>

                                    {selectedPatientForView.medicalHistory && (
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Antécédents médicaux</p>
                                            <div className="flex gap-2">
                                                <AlertCircle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-slate-800">{selectedPatientForView.medicalHistory}</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedPatientForView.allergies && (
                                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                            <p className="text-xs text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
                                                <AlertCircle size={12} />
                                                ATTENTION : Allergies
                                            </p>
                                            <p className="text-red-400 font-medium">{selectedPatientForView.allergies}</p>
                                        </div>
                                    )}

                                    {selectedPatientForView.notes && (
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Notes importantes</p>
                                            <p className="text-slate-600 italic">"{selectedPatientForView.notes}"</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {viewPatientTab === 'history' && (
                                <PatientHistory patientId={selectedPatientForView.id} />
                            )}

                            {viewPatientTab === 'files' && (
                                <PatientFiles patientId={selectedPatientForView.id} />
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={confirmDelete}
                title="Supprimer le rendez-vous"
                message={`Êtes-vous sûr de vouloir supprimer ce rendez-vous avec ${selectedAppointment?.patientName} ?`}
                confirmText="Supprimer"
                variant="danger"
            />
        </div>
    );
}
