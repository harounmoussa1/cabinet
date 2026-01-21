import React, { useEffect, useState } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    Crown,
    Clock,
    AlertTriangle,
    CheckCircle,
    Package,
    User,
    Building2,
    Filter,
    Search
} from 'lucide-react';
import api from '../../lib/api';
import type { Prosthetic, Patient, Supplier } from '../../types';
import { Modal, ConfirmModal, EmptyState, LoadingCard } from '../../components/ui';

const PROSTHETIC_TYPES = [
    { value: 'COURONNE', label: 'Couronne' },
    { value: 'BRIDGE', label: 'Bridge' },
    { value: 'APPAREIL', label: 'Appareil' },
    { value: 'IMPLANT', label: 'Implant' },
    { value: 'FACETTE', label: 'Facette' },
    { value: 'INLAY', label: 'Inlay' },
    { value: 'ONLAY', label: 'Onlay' },
    { value: 'AUTRE', label: 'Autre' },
];

const STATUS_OPTIONS = [
    { value: 'ORDERED', label: 'Commandée', color: 'badge-info', icon: Package },
    { value: 'IN_PROGRESS', label: 'En cours', color: 'badge-warning', icon: Clock },
    { value: 'RECEIVED', label: 'Reçue', color: 'badge-success', icon: CheckCircle },
    { value: 'DELAYED', label: 'En retard', color: 'badge-danger', icon: AlertTriangle },
    { value: 'CANCELLED', label: 'Annulée', color: 'badge-neutral', icon: null },
];

export function ProstheticsPage() {
    const [prosthetics, setProsthetics] = useState<Prosthetic[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedProsthetic, setSelectedProsthetic] = useState<Prosthetic | null>(null);
    const [formData, setFormData] = useState<Partial<Prosthetic>>({});
    const [patientSearch, setPatientSearch] = useState('');
    const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [prostheticsData, patientsData, suppliersData] = await Promise.all([
                api.getProsthetics(),
                api.getPatients(),
                api.getSuppliers()
            ]);

            // Check for delayed prosthetics and update status
            const today = new Date().toISOString().split('T')[0];
            const updatedProsthetics = prostheticsData.map((p: Prosthetic) => {
                if (p.status !== 'RECEIVED' && p.status !== 'CANCELLED' && p.dueDate < today) {
                    return { ...p, status: 'DELAYED' as const };
                }
                return p;
            });

            setProsthetics(updatedProsthetics);
            setPatients(patientsData);
            setSuppliers(suppliersData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProsthetics = statusFilter === 'all'
        ? prosthetics
        : prosthetics.filter(p => p.status === statusFilter);

    const handleCreate = () => {
        setSelectedProsthetic(null);
        const today = new Date().toISOString().split('T')[0];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        setFormData({
            orderDate: today,
            dueDate: dueDate.toISOString().split('T')[0],
            type: 'COURONNE',
            status: 'ORDERED'
        });
        setPatientSearch('');
        setIsFormOpen(true);
    };

    const handleEdit = (prosthetic: Prosthetic) => {
        setSelectedProsthetic(prosthetic);
        setFormData(prosthetic);
        setPatientSearch(prosthetic.patientName || '');
        setIsFormOpen(true);
    };

    const handleDelete = (prosthetic: Prosthetic) => {
        setSelectedProsthetic(prosthetic);
        setIsDeleteOpen(true);
    };

    const handleMarkReceived = async (prosthetic: Prosthetic) => {
        const today = new Date().toISOString().split('T')[0];
        await api.updateProsthetic(prosthetic.id, {
            status: 'RECEIVED',
            receivedDate: today,
            // Optionnel: peut-on marquer comme payé automatiquement ? Non, mieux vaut laisser l'utilisateur choisir
        });
        await loadData();
    };

    const confirmDelete = async () => {
        if (selectedProsthetic) {
            await api.deleteProsthetic(selectedProsthetic.id);
            await loadData();
            setIsDeleteOpen(false);
            setSelectedProsthetic(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Frontend: Prosthetics handleSubmit', formData);
        try {
            if (selectedProsthetic) {
                console.log('Frontend: Calling updateProsthetic', selectedProsthetic.id, formData);
                await api.updateProsthetic(selectedProsthetic.id, formData);
            } else {
                console.log('Frontend: Calling createProsthetic', formData);
                await api.createProsthetic(formData as Omit<Prosthetic, 'id'>);
            }
            await loadData();
            setIsFormOpen(false);
            setFormData({});
        } catch (error) {
            console.error('Failed to save prosthetic:', error);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('fr-FR');
    };

    const getDaysRemaining = (dueDate: string) => {
        const due = new Date(dueDate);
        const today = new Date();
        const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const getStatusBadge = (status: string) => {
        const statusOption = STATUS_OPTIONS.find(s => s.value === status);
        return <span className={statusOption?.color || 'badge-neutral'}>{statusOption?.label || status}</span>;
    };

    const getTypeLabel = (type: string) => {
        return PROSTHETIC_TYPES.find(t => t.value === type)?.label || type;
    };

    // Stats
    const stats = {
        total: prosthetics.length,
        ordered: prosthetics.filter(p => p.status === 'ORDERED').length,
        inProgress: prosthetics.filter(p => p.status === 'IN_PROGRESS').length,
        delayed: prosthetics.filter(p => p.status === 'DELAYED').length,
        received: prosthetics.filter(p => p.status === 'RECEIVED').length,
    };

    if (loading) {
        return (
            <div className="p-6">
                <LoadingCard message="Chargement des prothèses..." />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Prothèses Dentaires</h1>
                    <p className="text-slate-500 mt-1">Suivi des commandes et livraisons</p>
                </div>
                <button onClick={handleCreate} className="btn-primary">
                    <Plus size={18} />
                    Nouvelle Prothèse
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <button
                    onClick={() => setStatusFilter('all')}
                    className={`card p-4 text-left hover:border-teal-500/30 transition-colors ${statusFilter === 'all' ? 'border-teal-500 ring-1 ring-teal-500' : 'border-slate-200'}`}
                >
                    <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
                    <p className="text-xs text-slate-500">Total</p>
                </button>
                <button
                    onClick={() => setStatusFilter('ORDERED')}
                    className={`card p-4 text-left hover:border-blue-500/30 transition-colors ${statusFilter === 'ORDERED' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'}`}
                >
                    <p className="text-2xl font-bold text-blue-600">{stats.ordered}</p>
                    <p className="text-xs text-slate-500">Commandées</p>
                </button>
                <button
                    onClick={() => setStatusFilter('IN_PROGRESS')}
                    className={`card p-4 text-left hover:border-amber-500/30 transition-colors ${statusFilter === 'IN_PROGRESS' ? 'border-amber-500 ring-1 ring-amber-500' : 'border-slate-200'}`}
                >
                    <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
                    <p className="text-xs text-slate-500">En cours</p>
                </button>
                <button
                    onClick={() => setStatusFilter('DELAYED')}
                    className={`card p-4 text-left hover:border-red-500/30 transition-colors ${statusFilter === 'DELAYED' ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`}
                >
                    <p className="text-2xl font-bold text-red-600">{stats.delayed}</p>
                    <p className="text-xs text-slate-500">En retard</p>
                </button>
                <button
                    onClick={() => setStatusFilter('RECEIVED')}
                    className={`card p-4 text-left hover:border-emerald-500/30 transition-colors ${statusFilter === 'RECEIVED' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200'}`}
                >
                    <p className="text-2xl font-bold text-emerald-600">{stats.received}</p>
                    <p className="text-xs text-slate-500">Reçues</p>
                </button>
            </div>

            {/* Prosthetics List */}
            {filteredProsthetics.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={<Crown size={32} />}
                        title="Aucune prothèse"
                        description={statusFilter !== 'all' ? "Aucune prothèse avec ce statut" : "Commencez par ajouter une commande de prothèse"}
                        action={
                            statusFilter === 'all' ? (
                                <button onClick={handleCreate} className="btn-primary">
                                    <Plus size={18} />
                                    Commander une prothèse
                                </button>
                            ) : (
                                <button onClick={() => setStatusFilter('all')} className="btn-secondary">
                                    Voir toutes les prothèses
                                </button>
                            )
                        }
                    />
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Patient</th>
                                <th>Fournisseur</th>
                                <th>Date commande</th>
                                <th>Délai livraison</th>
                                <th>Statut</th>
                                <th>Prix</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProsthetics.map((prosthetic) => {
                                const daysRemaining = getDaysRemaining(prosthetic.dueDate);
                                const isDelayed = daysRemaining < 0 && prosthetic.status !== 'RECEIVED' && prosthetic.status !== 'CANCELLED';

                                return (
                                    <tr key={prosthetic.id} className={isDelayed ? 'bg-red-500/5' : ''}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100">
                                                    <Crown className="text-amber-500" size={18} />
                                                </div>
                                                <span className="font-medium text-slate-700">{getTypeLabel(prosthetic.type)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <User size={14} className="text-slate-400" />
                                                {prosthetic.patientName}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Building2 size={14} className="text-slate-400" />
                                                {prosthetic.supplierName || '-'}
                                            </div>
                                        </td>
                                        <td className="text-slate-600">
                                            {formatDate(prosthetic.orderDate)}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-300">{formatDate(prosthetic.dueDate)}</span>
                                                {prosthetic.status !== 'RECEIVED' && prosthetic.status !== 'CANCELLED' && (
                                                    <span className={`text-xs ${isDelayed ? 'text-red-500 font-medium' : daysRemaining <= 3 ? 'text-amber-500 font-medium' : 'text-slate-500'}`}>
                                                        ({isDelayed ? `${Math.abs(daysRemaining)}j de retard` : `${daysRemaining}j restants`})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                {getStatusBadge(isDelayed ? 'DELAYED' : prosthetic.status)}
                                                {prosthetic.paymentStatus === 'PAID' ? (
                                                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 w-fit">PAYÉ</span>
                                                ) : (
                                                    <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200 w-fit">NON PAYÉ</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-slate-600 font-medium">
                                            {prosthetic.price ? `${prosthetic.price} TND` : '-'}
                                        </td>
                                        <td>
                                            <div className="flex items-center justify-end gap-1">
                                                {prosthetic.status !== 'RECEIVED' && prosthetic.status !== 'CANCELLED' && (
                                                    <button
                                                        onClick={() => handleMarkReceived(prosthetic)}
                                                        className="btn-icon text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                        title="Marquer comme reçue"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(prosthetic)}
                                                    className="btn-icon text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                                    title="Modifier"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(prosthetic)}
                                                    className="btn-icon text-red-400 hover:text-red-500 hover:bg-red-50"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={selectedProsthetic ? 'Modifier la prothèse' : 'Nouvelle commande'}
                size="lg"
            >
                <form id="prosthetic-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="label">Patient *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="input border-2 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg p-2.5 w-full pr-10"
                                    placeholder="Rechercher un patient..."
                                    value={patientSearch}
                                    onChange={(e) => {
                                        setPatientSearch(e.target.value);
                                        setShowPatientSuggestions(true);
                                        // Reset ID if input is cleared manually
                                        if (!e.target.value) setFormData({ ...formData, patientId: undefined });
                                    }}
                                    onFocus={() => setShowPatientSuggestions(true)}
                                    autoComplete="off"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Search size={18} />
                                </div>
                            </div>

                            {showPatientSuggestions && patientSearch.length >= 0 && (
                                <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                    {patients
                                        .filter(p => {
                                            const searchTerms = patientSearch.toLowerCase().split(' ').filter(t => t);
                                            const patientData = `${p.lastName} ${p.firstName} ${p.phone || ''} ${p.cin || ''}`.toLowerCase();
                                            return searchTerms.every(term => patientData.includes(term));
                                        })
                                        .map(patient => (
                                            <button
                                                key={patient.id}
                                                type="button"
                                                className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-3 transition-colors border-b border-slate-50 last:border-none"
                                                onClick={() => {
                                                    setFormData({ ...formData, patientId: patient.id });
                                                    setPatientSearch(`${patient.lastName} ${patient.firstName}`);
                                                    setShowPatientSuggestions(false);
                                                }}
                                            >
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                                    {patient.lastName[0]}{patient.firstName[0]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{patient.lastName} {patient.firstName}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{patient.cin || 'Sans CIN'}</p>
                                                        {patient.phone && (
                                                            <>
                                                                <span className="text-slate-300">•</span>
                                                                <p className="text-[10px] text-indigo-500 font-bold">{patient.phone}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    {patients.filter(p =>
                                        `${p.lastName} ${p.firstName}`.toLowerCase().includes(patientSearch.toLowerCase())
                                    ).length === 0 && (
                                            <div className="px-4 py-6 text-center text-slate-500 italic text-sm">
                                                Aucun patient trouvé
                                            </div>
                                        )}
                                </div>
                            )}
                            {/* Hidden required field for form validation */}
                            <input type="hidden" value={formData.patientId || ''} required />
                        </div>
                        <div>
                            <label className="label">Fournisseur *</label>
                            <select
                                className="select border-2 border-slate-300 focus:border-slate-400 focus:ring-slate-400 rounded-md p-2"
                                value={formData.supplierId || ''}
                                onChange={(e) => setFormData({ ...formData, supplierId: parseInt(e.target.value) })}
                                required
                            >
                                <option value="">Sélectionner un fournisseur</option>
                                {suppliers.map(supplier => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Type de prothèse *</label>
                            <input
                                type="text"
                                className="input border-2 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg p-2.5"
                                placeholder="Ex: Couronne, Bridge..."
                                value={formData.type || ''}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Statut</label>
                            <select
                                className="select border-2 border-slate-300 focus:border-slate-400 focus:ring-slate-400 rounded-md p-2"
                                value={formData.status || 'ORDERED'}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as Prosthetic['status'] })}
                            >
                                {STATUS_OPTIONS.map(status => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Date de commande *</label>
                            <input
                                type="date"
                                className="input"
                                value={formData.orderDate || ''}
                                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Date de livraison prévue *</label>
                            <input
                                type="date"
                                className="input"
                                value={formData.dueDate || ''}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Prix (TND)</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.price || ''}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                placeholder="Ex: 450"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label className="label">Statut Paiement</label>
                            <select
                                className="select border-2 border-slate-300 focus:border-slate-400 focus:ring-slate-400 rounded-md p-2"
                                value={formData.paymentStatus || 'UNPAID'}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    paymentStatus: e.target.value as 'PAID' | 'UNPAID',
                                    paymentDate: e.target.value === 'PAID' ? (formData.paymentDate || new Date().toISOString().split('T')[0]) : null as any
                                })}
                            >
                                <option value="UNPAID">Non payé</option>
                                <option value="PAID">Payé</option>
                            </select>
                        </div>
                    </div>

                    {formData.paymentStatus === 'PAID' && (
                        <div>
                            <label className="label">Date de paiement</label>
                            <input
                                type="date"
                                className="input"
                                value={formData.paymentDate?.split('T')[0] || ''}
                                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                            />
                        </div>
                    )}

                    <div>
                        <label className="label">Notes</label>
                        <textarea
                            className="input min-h-[60px]"
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Instructions pour le labo..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">
                            Annuler
                        </button>
                        <button type="submit" className="btn-primary">
                            {selectedProsthetic ? 'Enregistrer' : 'Créer'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={confirmDelete}
                title="Supprimer la prothèse"
                message={`Êtes-vous sûr de vouloir supprimer cette prothèse ${selectedProsthetic?.type} pour ${selectedProsthetic?.patientName} ?`}
                confirmText="Supprimer"
                variant="danger"
            />
        </div>
    );
}
