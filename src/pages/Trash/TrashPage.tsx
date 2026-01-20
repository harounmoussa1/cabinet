import React, { useEffect, useState } from 'react';
import { Trash2, RotateCcw, AlertCircle, Clock, Users, Calendar, Package, ClipboardList } from 'lucide-react';
import api from '../../lib/api';
import { LoadingCard } from '../../components/ui';

interface TrashItem {
    type: 'patient' | 'appointment' | 'supplier' | 'prosthetic';
    id: number;
    name: string;
    deletedAt: string;
}

export default function TrashPage() {
    const [items, setItems] = useState<TrashItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState<number | null>(null);

    useEffect(() => {
        loadTrash();
    }, []);

    const loadTrash = async () => {
        try {
            setLoading(true);
            const data = await api.getTrash();
            setItems(data);
        } catch (error) {
            console.error('Failed to load trash:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (type: string, id: number) => {
        try {
            setRestoring(id);
            const success = await api.restoreItem(type, id);
            if (success) {
                setItems((prev: TrashItem[]) => prev.filter((item: TrashItem) => !(item.id === id && item.type === type)));
            }
        } catch (error) {
            console.error('Failed to restore item:', error);
        } finally {
            setRestoring(null);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'patient': return <Users className="text-blue-400" size={20} />;
            case 'appointment': return <Calendar className="text-teal-400" size={20} />;
            case 'supplier': return <Package className="text-purple-400" size={20} />;
            case 'prosthetic': return <RotateCcw className="text-orange-400" size={20} />;
            default: return <Trash2 className="text-slate-400" size={20} />;
        }
    };

    const getTypeName = (type: string) => {
        switch (type) {
            case 'patient': return 'Patient';
            case 'appointment': return 'Rendez-vous';
            case 'supplier': return 'Fournisseur';
            case 'prosthetic': return 'Prothèse';
            default: return type;
        }
    };

    const getDaysRemaining = (deletedAt: string) => {
        const delDate = new Date(deletedAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - delDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, 15 - diffDays);
    };

    if (loading) return <LoadingCard message="Chargement de la corbeille..." />;

    return (
        <div className="space-y-8 animate-slide-up p-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Corbeille</h1>
                    <p className="text-slate-500 font-medium">Les éléments supprimés sont conservés pendant 15 jours.</p>
                </div>
                <div className="p-4 glass rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
                        <Trash2 className="text-rose-400" size={24} />
                    </div>
                    <div className="text-sm">
                        <p className="text-slate-800 font-bold">Auto-suppression</p>
                        <p className="text-slate-500">Délai de grâce: 15 jours</p>
                    </div>
                </div>
            </header>

            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 card bg-slate-50 border-dashed border-2">
                    <Trash2 size={80} className="text-slate-800 mb-6 opacity-30" />
                    <p className="text-slate-500 text-xl font-semibold tracking-wide">La corbeille est vide</p>
                    <p className="text-slate-600 mt-2">Aucun élément n'a été supprimé récemment.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Élément</th>
                                <th>Date de suppression</th>
                                <th>Expiration</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item: TrashItem) => {
                                const daysLeft = getDaysRemaining(item.deletedAt);
                                return (
                                    <tr key={`${item.type}-${item.id}`}>
                                        <td>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center ring-1 ring-white/5">
                                                    {getTypeIcon(item.type)}
                                                </div>
                                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">{getTypeName(item.type)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-slate-800 font-semibold text-base">{item.name}</span>
                                        </td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="text-slate-600 font-medium">
                                                    {new Date(item.deletedAt).toLocaleDateString('fr-FR', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                                <span className="text-slate-500 text-xs">
                                                    {new Date(item.deletedAt).toLocaleTimeString('fr-FR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-2">
                                                <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden ring-1 ring-white/5">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${daysLeft < 3 ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-teal-500 to-emerald-500'}`}
                                                        style={{ width: `${(daysLeft / 15) * 100}%` }}
                                                    />
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${daysLeft < 3 ? 'text-rose-400' : 'text-slate-500'}`}>
                                                    {daysLeft} Jours restants
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <button
                                                onClick={() => handleRestore(item.type, item.id)}
                                                disabled={restoring === item.id}
                                                className="btn-secondary group px-4 hover:border-teal-500/30"
                                            >
                                                <RotateCcw size={16} className="text-teal-400 group-hover:rotate-[-45deg] transition-transform duration-300" />
                                                <span className="group-hover:text-teal-400">Restaurer</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
