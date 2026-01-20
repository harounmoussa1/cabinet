import React, { useEffect, useState } from 'react';
import {
    Receipt,
    CheckCircle2,
    XCircle,
    Clock,
    DollarSign,
    Download,
    Filter
} from 'lucide-react';
import api from '../../lib/api';
import type { Prosthetic } from '../../types';
import { LoadingCard } from '../ui';

interface SupplierInvoicesProps {
    supplierId: number;
}

export function SupplierInvoices({ supplierId }: SupplierInvoicesProps) {
    const [prosthetics, setProsthetics] = useState<Prosthetic[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');

    useEffect(() => {
        loadData();
    }, [supplierId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const allProsthetics = await api.getProsthetics();
            const supplierProsthetics = allProsthetics.filter(p => p.supplierId === supplierId);
            setProsthetics(supplierProsthetics);
        } catch (error) {
            console.error('Failed to load supplier invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePayment = async (prosthetic: Prosthetic) => {
        try {
            const newStatus = prosthetic.paymentStatus === 'PAID' ? 'UNPAID' : 'PAID';
            await api.updateProsthetic(prosthetic.id, {
                paymentStatus: newStatus,
                paymentDate: newStatus === 'PAID' ? new Date().toISOString() : null as any
            });
            await loadData();
        } catch (error) {
            console.error('Failed to update payment status:', error);
        }
    };

    const filteredProsthetics = prosthetics.filter(p => {
        if (filter === 'ALL') return true;
        return p.paymentStatus === filter;
    });

    const stats = prosthetics.reduce((acc, p) => {
        const price = p.price || 0;
        acc.total += price;
        if (p.paymentStatus === 'PAID') {
            acc.paid += price;
        } else {
            acc.unpaid += price;
        }
        return acc;
    }, { total: 0, paid: 0, unpaid: 0 });

    if (loading) return <LoadingCard message="Chargement de la facturation..." />;

    return (
        <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Commandé</p>
                    <p className="text-xl font-bold text-white">{stats.total.toLocaleString()} TND</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-emerald-500 uppercase tracking-wider mb-1">Total Payé</p>
                    <p className="text-xl font-bold text-emerald-400">{stats.paid.toLocaleString()} TND</p>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-500 uppercase tracking-wider mb-1">Reste à Payer</p>
                    <p className="text-xl font-bold text-red-400">{stats.unpaid.toLocaleString()} TND</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === 'ALL' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Tout
                    </button>
                    <button
                        onClick={() => setFilter('UNPAID')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === 'UNPAID' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Non payés
                    </button>
                    <button
                        onClick={() => setFilter('PAID')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === 'PAID' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Payés
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-700/50">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800/50">
                            <th className="p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                            <th className="p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient & Type</th>
                            <th className="p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Prix</th>
                            <th className="p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Statut Paiement</th>
                            <th className="p-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {filteredProsthetics.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                    Aucune prothèse trouvée.
                                </td>
                            </tr>
                        ) : (
                            filteredProsthetics.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-3 text-sm text-slate-300">
                                        {new Date(p.orderDate).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="p-3">
                                        <p className="text-sm font-medium text-white">{p.patientName}</p>
                                        <p className="text-xs text-slate-400 uppercase">{p.type}</p>
                                    </td>
                                    <td className="p-3 text-sm font-bold text-white">
                                        {p.price?.toLocaleString() || 0} TND
                                    </td>
                                    <td className="p-3 text-sm">
                                        {p.paymentStatus === 'PAID' ? (
                                            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                                <CheckCircle2 size={14} />
                                                Payé {p.paymentDate && `le ${new Date(p.paymentDate).toLocaleDateString()}`}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-red-400 font-medium">
                                                <XCircle size={14} />
                                                Non payé
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => handleTogglePayment(p)}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${p.paymentStatus === 'PAID' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-emerald-500 text-white hover:bg-emerald-400'}`}
                                        >
                                            {p.paymentStatus === 'PAID' ? 'Annuler Paiement' : 'Marquer comme Payé'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
