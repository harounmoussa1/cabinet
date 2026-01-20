import React, { useEffect, useState } from 'react';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    Phone,
    MapPin,
    Calendar,
    AlertCircle,
    Users,
    Eye
} from 'lucide-react';
import api from '../../lib/api';
import type { Patient } from '../../types';
import { Modal, ConfirmModal, EmptyState, LoadingCard } from '../../components/ui';
import { PatientFiles, PatientHistory } from '../../components/patients';

export function PatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [formData, setFormData] = useState<Partial<Patient>>({});
    const [viewTab, setViewTab] = useState<'info' | 'history' | 'files'>('info');

    useEffect(() => {
        loadPatients();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            setFilteredPatients(patients.filter(p =>
                p.firstName.toLowerCase().includes(query) ||
                p.lastName.toLowerCase().includes(query) ||
                p.phone?.includes(query)
            ));
        } else {
            setFilteredPatients(patients);
        }
    }, [searchQuery, patients]);

    const loadPatients = async () => {
        try {
            const data = await api.getPatients();
            setPatients(data);
            setFilteredPatients(data);
        } catch (error) {
            console.error('Failed to load patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedPatient(null);
        setFormData({});
        setIsFormOpen(true);
    };

    const handleEdit = (patient: Patient) => {
        setSelectedPatient(patient);
        setFormData(patient);
        setIsFormOpen(true);
    };

    const handleView = (patient: Patient) => {
        setSelectedPatient(patient);
        setIsViewOpen(true);
    };

    const handleDelete = (patient: Patient) => {
        setSelectedPatient(patient);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedPatient) {
            await api.deletePatient(selectedPatient.id);
            await loadPatients();
            setIsDeleteOpen(false);
            setSelectedPatient(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Frontend: handleSubmit triggered', formData);
        try {
            if (selectedPatient) {
                console.log('Frontend: Calling updatePatient with', selectedPatient.id, formData);
                await api.updatePatient(selectedPatient.id, formData);
            } else {
                console.log('Frontend: Calling createPatient with', formData);
                await api.createPatient(formData as Omit<Patient, 'id' | 'createdAt'>);
            }
            await loadPatients();
            setIsFormOpen(false);
            setFormData({});
        } catch (error) {
            console.error('Failed to save patient:', error);
        }
    };

    const formatDate = (date: string | undefined) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('fr-FR');
    };

    if (loading) {
        return (
            <div className="p-6">
                <LoadingCard message="Chargement des patients..." />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Patients</h1>
                    <p className="text-slate-500 font-medium">{patients.length} patients au total</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="btn-primary group px-6 py-3"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    Ajouter un Patient
                </button>
            </header>

            {/* Search */}
            <div className="card p-4 bg-slate-50 border-slate-200">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom, prénom ou numéro de téléphone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-12 bg-white border-slate-200 focus:border-teal-500"
                    />
                </div>
            </div>

            {/* Patients Table */}
            {filteredPatients.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={<Users size={32} />}
                        title={searchQuery ? "Aucun résultat" : "Aucun patient"}
                        description={searchQuery ? "Essayez une autre recherche" : "Commencez par ajouter votre premier patient"}
                        action={!searchQuery && (
                            <button onClick={handleCreate} className="btn-primary">
                                <Plus size={18} />
                                Ajouter un patient
                            </button>
                        )}
                    />
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Téléphone</th>
                                <th>Date de naissance</th>
                                <th>Adresse</th>
                                <th>Inscrit le</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPatients.map((patient) => (
                                <tr key={patient.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center border border-teal-500/30">
                                                <span className="text-teal-400 font-medium text-sm">
                                                    {patient.firstName[0]}{patient.lastName[0]}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{patient.lastName} {patient.firstName}</p>
                                                {patient.allergies && (
                                                    <p className="text-xs text-red-400 flex items-center gap-1">
                                                        <AlertCircle size={12} />
                                                        Allergies
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Phone size={14} className="text-slate-400" />
                                            {patient.phone || '-'}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar size={14} className="text-slate-400" />
                                            {formatDate(patient.birthDate)}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2 text-slate-400 max-w-[200px] truncate">
                                            <MapPin size={14} className="text-slate-500 flex-shrink-0" />
                                            {patient.address || '-'}
                                        </div>
                                    </td>
                                    <td className="text-slate-400">
                                        {formatDate(patient.createdAt)}
                                    </td>
                                    <td>
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleView(patient)}
                                                className="btn-icon"
                                                title="Voir détails"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(patient)}
                                                className="btn-icon"
                                                title="Modifier"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(patient)}
                                                className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={selectedPatient ? 'Modifier le patient' : 'Nouveau patient'}
                size="lg"
            >
                <form id="patient-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Prénom *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.firstName || ''}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Nom *</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.lastName || ''}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Date de naissance</label>
                            <input
                                type="date"
                                className="input"
                                value={formData.birthDate || ''}
                                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">Téléphone</label>
                            <input
                                type="tel"
                                className="input"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label">Adresse</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.address || ''}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label">Antécédents médicaux</label>
                        <textarea
                            className="input min-h-[80px]"
                            value={formData.medicalHistory || ''}
                            onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                            placeholder="Diabète, hypertension, etc."
                        />
                    </div>

                    <div>
                        <label className="label">Allergies</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.allergies || ''}
                            onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                            placeholder="Pénicilline, latex, etc."
                        />
                    </div>

                    <div>
                        <textarea
                            className="input min-h-[60px]"
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">
                            Annuler
                        </button>
                        <button type="submit" className="btn-primary">
                            {selectedPatient ? 'Enregistrer' : 'Créer'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Modal */}
            <Modal
                isOpen={isViewOpen}
                onClose={() => setIsViewOpen(false)}
                title="Fiche patient"
                size="lg"
                className="modal-view-details"
            >
                {selectedPatient && (
                    <div className="space-y-6">
                        {/* Patient Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xl font-bold border-2 border-slate-700">
                                    {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">
                                        {selectedPatient.lastName} {selectedPatient.firstName}
                                    </h3>
                                    <p className="text-slate-400 text-sm">
                                        Inscrit le {formatDate(selectedPatient.createdAt)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`badge-${selectedPatient.allergies ? 'danger' : 'success'} text-xs uppercase tracking-wider`}>
                                    {selectedPatient.allergies ? 'Allergies détectées' : 'Pas d\'allergies'}
                                </span>
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b border-slate-700">
                            <button
                                onClick={() => setViewTab('info')}
                                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${viewTab === 'info' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Informations
                            </button>
                            <button
                                onClick={() => setViewTab('history')}
                                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${viewTab === 'history' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Historique médical
                            </button>
                            <button
                                onClick={() => setViewTab('files')}
                                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${viewTab === 'files' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Radios & Documents
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[400px]">
                            {viewTab === 'info' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Téléphone</p>
                                            <p className="text-slate-800 font-medium flex items-center gap-2">
                                                <Phone size={14} className="text-teal-500" />
                                                {selectedPatient.phone || '-'}
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Date de naissance</p>
                                            <p className="text-slate-800 font-medium flex items-center gap-2">
                                                <Calendar size={14} className="text-teal-500" />
                                                {formatDate(selectedPatient.birthDate)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Adresse</p>
                                        <p className="text-slate-800 flex items-center gap-2">
                                            <MapPin size={14} className="text-teal-500" />
                                            {selectedPatient.address || '-'}
                                        </p>
                                    </div>

                                    {selectedPatient.medicalHistory && (
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Antécédents médicaux</p>
                                            <div className="flex gap-2">
                                                <AlertCircle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-slate-800">{selectedPatient.medicalHistory}</p>
                                            </div>
                                        </div>
                                    )}

                                    {selectedPatient.allergies && (
                                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                            <p className="text-xs text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
                                                <AlertCircle size={12} />
                                                ATTENTION : Allergies
                                            </p>
                                            <p className="text-red-200">{selectedPatient.allergies}</p>
                                        </div>
                                    )}

                                    {selectedPatient.notes && (
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Notes importantes</p>
                                            <p className="text-slate-600 italic">"{selectedPatient.notes}"</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {viewTab === 'history' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <PatientHistory patientId={selectedPatient.id} />
                                </div>
                            )}

                            {viewTab === 'files' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <PatientFiles patientId={selectedPatient.id} />
                                </div>
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
                title="Supprimer le patient"
                message={`Êtes-vous sûr de vouloir supprimer ${selectedPatient?.firstName} ${selectedPatient?.lastName} ? Cette action supprimera également tous ses rendez-vous et prothèses associés.`}
                confirmText="Supprimer"
                variant="danger"
            />
        </div>
    );
}
