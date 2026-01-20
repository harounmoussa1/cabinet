import React, { useEffect, useState } from 'react';
import {
    Calendar,
    Clock,
    FileText,
    Activity,
    Package,
    CheckCircle2,
    Clock3,
    AlertCircle,
    XCircle
} from 'lucide-react';
import api from '../../lib/api';
import type { Appointment, Prosthetic } from '../../types';
import { LoadingCard } from '../ui';

interface PatientHistoryProps {
    patientId: number;
}

type HistoryEvent =
    | { type: 'appointment', data: Appointment, date: string }
    | { type: 'prosthetic', data: Prosthetic, date: string };

export function PatientHistory({ patientId }: PatientHistoryProps) {
    const [events, setEvents] = useState<HistoryEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, [patientId]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const [appointments, prosthetics] = await Promise.all([
                api.getAppointmentsByPatient(patientId),
                api.getProstheticsByPatient(patientId)
            ]);

            const allEvents: HistoryEvent[] = [
                ...appointments.map(a => ({ type: 'appointment' as const, data: a, date: a.date })),
                ...prosthetics.map(p => ({ type: 'prosthetic' as const, data: p, date: p.orderDate }))
            ];

            // Sort by date descending
            allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setEvents(allEvents);
        } catch (error) {
            console.error('Failed to load patient history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    if (loading) {
        return <LoadingCard message="Chargement de l'historique..." />;
    }

    if (events.length === 0) {
        return (
            <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-700">
                <Activity size={32} className="text-slate-500 mx-auto mb-2 opacity-50" />
                <p className="text-slate-400">Aucun historique disponible pour ce patient.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} />
                Historique des soins et prothèses
            </h4>

            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
                {events.map((event, index) => (
                    <div key={`${event.type}-${event.data.id}`} className="relative flex items-start gap-6 group">
                        {/* Timeline dot/icon */}
                        <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 shadow-sm
                            ${event.type === 'appointment'
                                ? 'bg-teal-50 text-teal-600 border border-teal-200'
                                : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
                            {event.type === 'appointment' ? <Clock size={18} /> : <Package size={18} />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                                        ${event.type === 'appointment' ? 'bg-teal-50 text-teal-600 border border-teal-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                        {event.type === 'appointment' ? 'Rendez-vous' : 'Prothèse'}
                                    </span>
                                    <span className="text-sm text-slate-500 font-medium">
                                        {formatDate(event.date)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {event.type === 'appointment' ? (
                                        <AppointmentStatusBadge status={event.data.status} />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <ProstheticStatusBadge status={event.data.status} />
                                            <PaymentStatusBadge status={event.data.paymentStatus} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h5 className="text-slate-800 font-bold">
                                    {event.type === 'appointment'
                                        ? (event.data.type === 'CONSULTATION' ? 'Consultation' :
                                            event.data.type === 'SOINS' ? 'Soins Dentaires' :
                                                event.data.type === 'DETARTRAGE' ? 'Détartrage' :
                                                    event.data.type === 'EXTRACTION' ? 'Extraction' :
                                                        event.data.type === 'PROTHESE' ? 'Pose de Prothèse' :
                                                            event.data.type === 'URGENCE' ? 'Urgence' :
                                                                event.data.type === 'CONTROLE' ? 'Contrôle' : 'Autre')
                                        : event.data.type}
                                </h5>

                                {event.type === 'appointment' && (
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Clock3 size={12} />
                                            {event.data.time.substring(0, 5)}
                                        </div>
                                    </div>
                                )}

                                {event.type === 'prosthetic' && (
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        {event.data.price && (
                                            <div className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
                                                {event.data.price} TND
                                            </div>
                                        )}
                                        {event.data.supplierName && (
                                            <div className="flex items-center gap-1">
                                                <Package size={12} />
                                                {event.data.supplierName}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {event.data.notes && (
                                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                        <p className="text-xs text-slate-600 italic">"{event.data.notes}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AppointmentStatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'COMPLETED':
            return <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"><CheckCircle2 size={10} /> Terminé</span>;
        case 'CANCELLED':
            return <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20"><XCircle size={10} /> Annulé</span>;
        case 'NO_SHOW':
            return <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/20">Absent</span>;
        default:
            return <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Prévu</span>;
    }
}

function PaymentStatusBadge({ status }: { status?: string }) {
    if (status === 'PAID') {
        return <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">PAYÉ</span>;
    }
    return <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">NON PAYÉ</span>;
}

function ProstheticStatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'RECEIVED':
            return <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"><CheckCircle2 size={10} /> Reçue</span>;
        case 'DELAYED':
            return <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20"><AlertCircle size={10} /> En retard</span>;
        case 'IN_PROGRESS':
            return <span className="flex items-center gap-1 text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">En cours</span>;
        case 'CANCELLED':
            return <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/20">Annulée</span>;
        default:
            return <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Commandée</span>;
    }
}
