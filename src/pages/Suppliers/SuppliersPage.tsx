import React, { useEffect, useState } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    Truck,
    Phone,
    Mail,
    MapPin,
    Search,
    Building2,
    Eye,
    Receipt
} from 'lucide-react';
import api from '../../lib/api';
import type { Supplier } from '../../types';
import { Modal, ConfirmModal, EmptyState, LoadingCard } from '../../components/ui';
import { SupplierInvoices } from '../../components/suppliers';

export function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState<Partial<Supplier>>({});
    const [viewTab, setViewTab] = useState<'info' | 'billing'>('info');

    useEffect(() => {
        loadSuppliers();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            setFilteredSuppliers(suppliers.filter(s =>
                s.name.toLowerCase().includes(query) ||
                s.contact?.toLowerCase().includes(query) ||
                s.phone?.includes(query)
            ));
        } else {
            setFilteredSuppliers(suppliers);
        }
    }, [searchQuery, suppliers]);

    const loadSuppliers = async () => {
        try {
            const data = await api.getSuppliers();
            setSuppliers(data);
            setFilteredSuppliers(data);
        } catch (error) {
            console.error('Failed to load suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedSupplier(null);
        setFormData({});
        setIsFormOpen(true);
    };

    const handleEdit = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setFormData(supplier);
        setIsFormOpen(true);
    };

    const handleView = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsViewOpen(true);
    };

    const handleDelete = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedSupplier) {
            const success = await api.deleteSupplier(selectedSupplier.id);
            if (success) {
                await loadSuppliers();
                setIsDeleteOpen(false);
                setSelectedSupplier(null);
            } else {
                alert('Impossible de supprimer ce fournisseur car il a des prothèses associées.');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Frontend: Suppliers handleSubmit', formData);
        try {
            if (selectedSupplier) {
                console.log('Frontend: Calling updateSupplier', selectedSupplier.id, formData);
                await api.updateSupplier(selectedSupplier.id, formData);
            } else {
                console.log('Frontend: Calling createSupplier', formData);
                await api.createSupplier(formData as Omit<Supplier, 'id'>);
            }
            await loadSuppliers();
            setIsFormOpen(false);
            setFormData({});
        } catch (error) {
            console.error('Failed to save supplier:', error);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <LoadingCard message="Chargement des fournisseurs..." />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Fournisseurs</h1>
                    <p className="text-slate-500 mt-1">{suppliers.length} laboratoires et fournisseurs</p>
                </div>
                <button onClick={handleCreate} className="btn-primary">
                    <Plus size={18} />
                    Nouveau Fournisseur
                </button>
            </div>

            {/* Search */}
            <div className="card p-4 bg-slate-50 border-slate-200">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher un fournisseur..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-12 bg-white"
                    />
                </div>
            </div>

            {/* Suppliers Grid */}
            {filteredSuppliers.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={<Truck size={32} />}
                        title={searchQuery ? "Aucun résultat" : "Aucun fournisseur"}
                        description={searchQuery ? "Essayez une autre recherche" : "Commencez par ajouter votre premier fournisseur ou laboratoire"}
                        action={!searchQuery && (
                            <button onClick={handleCreate} className="btn-primary">
                                <Plus size={18} />
                                Ajouter un fournisseur
                            </button>
                        )}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSuppliers.map((supplier) => (
                        <div
                            key={supplier.id}
                            className="card p-5 hover:border-teal-500/30 transition-colors group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                        <Building2 className="text-indigo-600" size={26} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{supplier.name}</h3>
                                        {supplier.contact && (
                                            <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                                {supplier.contact}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                {supplier.phone && (
                                    <div className="flex items-center gap-2.5 text-sm text-slate-600 font-medium bg-slate-50/50 p-2 rounded-lg">
                                        <Phone size={14} className="text-indigo-500" />
                                        {supplier.phone}
                                    </div>
                                )}
                                {supplier.email && (
                                    <div className="flex items-center gap-2.5 text-sm text-slate-600 font-medium bg-slate-50/50 p-2 rounded-lg">
                                        <Mail size={14} className="text-indigo-500" />
                                        {supplier.email}
                                    </div>
                                )}
                                {supplier.address && (
                                    <div className="flex items-center gap-2.5 text-sm text-slate-600 font-medium bg-slate-50/50 p-2 rounded-lg">
                                        <MapPin size={14} className="text-indigo-500" />
                                        <span className="truncate">{supplier.address}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-1 pt-4 border-t border-slate-200">
                                <button
                                    onClick={() => handleView(supplier)}
                                    className="btn-icon text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                    title="Voir détails"
                                >
                                    <Eye size={18} />
                                </button>
                                <button
                                    onClick={() => handleEdit(supplier)}
                                    className="btn-icon text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                    title="Modifier"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(supplier)}
                                    className="btn-icon text-red-400 hover:text-red-500 hover:bg-red-50"
                                    title="Supprimer"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={selectedSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
                size="lg"
            >
                <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Nom du laboratoire / fournisseur *</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Labo Dentaire Tunis"
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Personne de contact</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.contact || ''}
                            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                            placeholder="Ex: M. Karim"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Téléphone</label>
                            <input
                                type="tel"
                                className="input"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="Ex: 71 234 567"
                            />
                        </div>
                        <div>
                            <label className="label">Email</label>
                            <input
                                type="email"
                                className="input"
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="contact@exemple.tn"
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
                            placeholder="Adresse du fournisseur"
                        />
                    </div>

                    <div>
                        <label className="label">Notes</label>
                        <textarea
                            className="input min-h-[60px]"
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Notes additionnelles..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary">
                            Annuler
                        </button>
                        <button type="submit" className="btn-primary">
                            {selectedSupplier ? 'Enregistrer' : 'Créer'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Modal */}
            <Modal
                isOpen={isViewOpen}
                onClose={() => setIsViewOpen(false)}
                title="Détails du fournisseur"
                size="lg"
            >
                {selectedSupplier && (
                    <div className="space-y-6">
                        {/* Supplier Header */}
                        <div className="flex items-center gap-5 p-2">
                            <div className="w-20 h-20 rounded-2xl bg-indigo-500 flex flex-col items-center justify-center text-white border-4 border-white shadow-xl ring-1 ring-indigo-100">
                                <Building2 size={36} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedSupplier.name}</h3>
                                {selectedSupplier.contact && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                                            Contact: {selectedSupplier.contact}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b border-slate-200 px-2">
                            <button
                                onClick={() => setViewTab('info')}
                                className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${viewTab === 'info' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Informations
                            </button>
                            <button
                                onClick={() => setViewTab('billing')}
                                className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${viewTab === 'billing' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Receipt size={16} />
                                    Facturation
                                </div>
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[300px]">
                            {viewTab === 'info' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 flex flex-col items-center text-center">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                                                <Phone size={18} className="text-indigo-600" />
                                            </div>
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Téléphone</p>
                                            <p className="text-slate-800 font-bold tracking-tight">
                                                {selectedSupplier.phone || '-'}
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 flex flex-col items-center text-center">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                                                <Mail size={18} className="text-indigo-600" />
                                            </div>
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Email</p>
                                            <p className="text-slate-800 font-bold tracking-tight">
                                                {selectedSupplier.email || '-'}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedSupplier.address && (
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                                                    <MapPin size={20} className="text-indigo-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Localisation</p>
                                                    <p className="text-slate-800 font-bold leading-relaxed">{selectedSupplier.address}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedSupplier.notes && (
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Notes internes</p>
                                            <p className="text-slate-600 italic">"{selectedSupplier.notes}"</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {viewTab === 'billing' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <SupplierInvoices supplierId={selectedSupplier.id} />
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
                title="Supprimer le fournisseur"
                message={`Êtes-vous sûr de vouloir supprimer ${selectedSupplier?.name} ? Cette action est irréversible.`}
                confirmText="Supprimer"
                variant="danger"
            />
        </div>
    );
}
