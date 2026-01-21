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
        <div className="space-y-8 animate-slide-up">
            {/* Stats Summary - Redesigned */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-5 bg-gradient-to-br from-slate-800 to-slate-900 border-none shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative z-10">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-3">Total Commandé</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-black text-white tracking-tight">{stats.total.toLocaleString()}</p>
                            <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">TND</span>
                        </div>
                    </div>
                </div>

                <div className="card p-5 bg-white border-emerald-100 shadow-xl shadow-emerald-500/5 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative z-10">
                        <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.2em] mb-3">Total Payé</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-black text-slate-800 tracking-tight">{stats.paid.toLocaleString()}</p>
                            <span className="text-emerald-500 font-bold text-xs uppercase tracking-widest">TND</span>
                        </div>
                        <div className="mt-3 w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${stats.total > 0 ? (stats.paid / stats.total) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="card p-5 bg-white border-rose-100 shadow-xl shadow-rose-500/5 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative z-10">
                        <p className="text-[10px] text-rose-500 font-black uppercase tracking-[0.2em] mb-3">Reste à Payer</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-black text-rose-600 tracking-tight">{stats.unpaid.toLocaleString()}</p>
                            <span className="text-rose-400 font-bold text-xs uppercase tracking-widest">TND</span>
                        </div>
                        <p className="mt-3 text-[10px] font-bold text-rose-400 uppercase tracking-wider">Attention : Solde débiteur</p>
                    </div>
                </div>
            </div>

            {/* Filter - Redesigned */}
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Filter size={14} className="text-indigo-500" />
                    Historique des travaux
                </h4>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === 'ALL' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Tout
                    </button>
                    <button
                        onClick={() => setFilter('UNPAID')}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === 'UNPAID' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Impayés
                    </button>
                    <button
                        onClick={() => setFilter('PAID')}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === 'PAID' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Payés
                    </button>
                </div>
            </div>

            {/* Table - Premium Redesign */}
            <div className="card overflow-hidden border-slate-200 bg-white shadow-2xl shadow-slate-200/40">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-slate-50/80 backdrop-blur-sm">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Date d'ordre</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Patient & Travail</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Montant</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">État du paiement</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredProsthetics.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <Receipt size={32} className="mb-2 opacity-20" />
                                        <p className="font-bold text-sm">Aucun enregistrement financier</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredProsthetics.map((p) => (
                                <tr key={p.id} className="hover:bg-indigo-50/30 transition-all duration-300 group">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-500 tabular-nums">
                                        {new Date(p.orderDate).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{p.patientName}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{p.type}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-800 font-black text-sm tabular-nums border border-slate-200">
                                            {p.price?.toLocaleString() || 0} <span className="text-[10px] text-slate-400 ml-1">TND</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {p.paymentStatus === 'PAID' ? (
                                            <div className="flex flex-col">
                                                <span className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase tracking-widest bg-emerald-50 w-fit px-2 py-1 rounded-md border border-emerald-100">
                                                    <CheckCircle2 size={12} />
                                                    Paiement effectué
                                                </span>
                                                {p.paymentDate && (
                                                    <span className="text-[9px] text-slate-400 mt-1 font-bold ml-1">
                                                        Le {new Date(p.paymentDate).toLocaleDateString('fr-FR')}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-rose-600 font-black text-[10px] uppercase tracking-widest bg-rose-50 w-fit px-2 py-1 rounded-md border border-rose-100">
                                                <XCircle size={12} />
                                                En attente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleTogglePayment(p)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${p.paymentStatus === 'PAID'
                                                    ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                                                    : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20 shadow-lg group-hover:scale-105'
                                                }`}
                                        >
                                            {p.paymentStatus === 'PAID' ? 'Annuler' : 'Régler'}
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
