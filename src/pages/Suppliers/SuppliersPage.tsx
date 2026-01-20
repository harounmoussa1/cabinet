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
                                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100">
                                        <Building2 className="text-purple-600" size={22} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">{supplier.name}</h3>
                                        {supplier.contact && (
                                            <p className="text-sm text-slate-500">{supplier.contact}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                {supplier.phone && (
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Phone size={14} className="text-slate-400" />
                                        {supplier.phone}
                                    </div>
                                )}
                                {supplier.email && (
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Mail size={14} className="text-slate-400" />
                                        {supplier.email}
                                    </div>
                                )}
                                {supplier.address && (
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <MapPin size={14} className="text-slate-400" />
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
                size="md"
            >
                {selectedSupplier && (
                    <div className="space-y-6">
                        {/* Supplier Header */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-200">
                                <Building2 size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{selectedSupplier.name}</h3>
                                {selectedSupplier.contact && (
                                    <p className="text-slate-500">Contact: {selectedSupplier.contact}</p>
                                )}
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b border-slate-200">
                            <button
                                onClick={() => setViewTab('info')}
                                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${viewTab === 'info' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                Informations
                            </button>
                            <button
                                onClick={() => setViewTab('billing')}
                                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${viewTab === 'billing' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Receipt size={16} />
                                    Facturation & Paiements
                                </div>
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[300px]">
                            {viewTab === 'info' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Téléphone</p>
                                            <p className="text-slate-800 font-medium flex items-center gap-2">
                                                <Phone size={14} className="text-purple-500" />
                                                {selectedSupplier.phone || '-'}
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Email</p>
                                            <p className="text-slate-800 font-medium flex items-center gap-2">
                                                <Mail size={14} className="text-purple-500" />
                                                {selectedSupplier.email || '-'}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedSupplier.address && (
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Adresse</p>
                                            <p className="text-slate-800 flex items-center gap-2">
                                                <MapPin size={14} className="text-purple-500" />
                                                {selectedSupplier.address}
                                            </p>
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
