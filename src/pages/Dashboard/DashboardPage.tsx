import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Users,
    CalendarDays,
    Crown,
    AlertTriangle,
    TrendingUp,
    Clock,
    Plus,
    ArrowRight,
    Activity,
    ChevronRight
} from 'lucide-react';
import api from '../../lib/api';
import type { DashboardStats, Appointment, Prosthetic } from '../../types';
import { LoadingCard } from '../../components/ui';

export function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({ patients: 0, appointments: 0, prosthetics: 0, delays: 0 });
    const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
    const [delayedProsthetics, setDelayedProsthetics] = useState<Prosthetic[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [statsData, appointments, delayed] = await Promise.all([
                api.getStats(),
                api.getTodayAppointments(),
                api.getDelayedProsthetics()
            ]);
            setStats(statsData);
            setTodayAppointments(appointments);
            setDelayedProsthetics(delayed);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (time: string) => {
        return time.substring(0, 5);
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { class: string, label: string }> = {
            'PLANNED': { class: 'badge-info', label: 'Planifié' },
            'COMPLETED': { class: 'badge-success', label: 'Terminé' },
            'CANCELLED': { class: 'badge-neutral', label: 'Annulé' },
            'NO_SHOW': { class: 'badge-danger', label: 'Absent' }
        };
        const { class: badgeClass, label } = statusMap[status] || statusMap['PLANNED'];
        return <span className={badgeClass}>{label}</span>;
    };

    const getDaysOverdue = (dueDate: string) => {
        const due = new Date(dueDate);
        const today = new Date();
        const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    if (loading) {
        return (
            <div className="p-8">
                <LoadingCard message="Chargement de votre espace de travail..." />
            </div>
        );
    }

    const statCards = [
        {
            label: 'Total Patients',
            value: stats.patients,
            icon: Users,
            color: 'from-blue-500 to-indigo-600',
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-500/10',
            link: '/patients'
        },
        {
            label: 'RDV Aujourd\'hui',
            value: stats.appointments,
            icon: CalendarDays,
            color: 'from-teal-500 to-emerald-600',
            iconColor: 'text-teal-600',
            bgColor: 'bg-teal-500/10',
            link: '/appointments'
        },
        {
            label: 'Prothèses en cours',
            value: stats.prosthetics,
            icon: Crown,
            color: 'from-amber-500 to-orange-600',
            iconColor: 'text-amber-600',
            bgColor: 'bg-amber-500/10',
            link: '/prosthetics'
        },
        {
            label: 'Livraisons en retard',
            value: stats.delays,
            icon: AlertTriangle,
            color: 'from-rose-500 to-red-600',
            iconColor: 'text-rose-600',
            bgColor: 'bg-rose-500/10',
            link: '/prosthetics',
            pulse: stats.delays > 0
        },
    ];

    return (
        <div className="p-8 space-y-10 animate-slide-up">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">Bonjour, Dr. Sana</h1>
                    <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                        <CalendarDays size={16} className="text-teal-500" />
                        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <Link to="/patients" className="btn-primary px-8 py-3.5 shadow-2xl group">
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    Ajouter un Patient
                </Link>
            </header>

            {/* Banner / Quick Info */}
            {stats.delays > 0 && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between ring-1 ring-rose-500/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center animate-pulse">
                            <AlertTriangle className="text-rose-600" size={24} />
                        </div>
                        <div>
                            <p className="text-slate-800 font-bold">Attention : Retards de livraison</p>
                            <p className="text-sm text-slate-500">{stats.delays} prothèses sont en attente depuis plusieurs jours.</p>
                        </div>
                    </div>
                    <Link to="/prosthetics" className="btn-secondary py-2 group">
                        Gérer les retards
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => (
                    <Link
                        key={idx}
                        to={stat.link}
                        className="group relative"
                    >
                        <div className="stat-card bg-white p-3 rounded-2xl  group-hover:scale-[1.02] transition-all duration-300 h-full">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
                                    <p className="text-4xl font-black text-slate-800 tracking-tight">{stat.value}</p>
                                </div>
                                <div className={`w-14 h-14 rounded-2xl ${stat.bgColor} flex items-center justify-center ring-1 ring-white/5 group-hover:ring-white/20 transition-all`}>
                                    <stat.icon className={stat.iconColor} size={28} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-8">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1 group-hover:text-teal-600 transition-colors">
                                    <Activity size={12} />
                                    Statistiques
                                </span>
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-teal-500/20 group-hover:text-teal-600 transition-all">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Today's Appointments */}
                <section className="lg:col-span-2 card">
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                                <Clock className="text-teal-600" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Rendez-vous du jour</h2>
                                <p className="text-sm text-slate-500 font-medium">{todayAppointments.length} interventions prévues</p>
                            </div>
                        </div>
                        <Link to="/appointments" className="btn-ghost group text-sm font-bold uppercase tracking-widest">
                            Tout voir
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <div className="p-6">
                        {todayAppointments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <CalendarDays size={48} className="mb-4 opacity-20" />
                                <p className="font-semibold">Journée calme</p>
                                <p className="text-sm">Aucun rendez-vous pour le moment.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {todayAppointments.slice(0, 6).map((appointment) => (
                                    <div
                                        key={appointment.id}
                                        className="group p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md hover:border-teal-500/30 transition-all duration-300"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="px-3 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20">
                                                <span className="text-teal-600 font-black text-sm tabular-nums">{formatTime(appointment.time)}</span>
                                            </div>
                                            {getStatusBadge(appointment.status)}
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-teal-600 transition-colors">{appointment.patientName}</h3>
                                        <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                            {appointment.type}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Prosthetics Alerts */}
                <aside className="card border-rose-500/10 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-rose-500/[0.02]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                <Activity className="text-orange-600" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Alertes & Retards</h2>
                                <p className="text-sm text-slate-500 font-medium">Logistique & Labo</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                        {delayedProsthetics.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                                    <Activity className="text-emerald-600" size={24} />
                                </div>
                                <p className="text-slate-400 font-bold">Flux logistique parfaits</p>
                                <p className="text-xs text-slate-600 mt-1">✓ Aucune alerte de retard</p>
                            </div>
                        ) : (
                            delayedProsthetics.map((prosthetic) => (
                                <div
                                    key={prosthetic.id}
                                    className="relative p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 group hover:bg-rose-500/10 transition-all"
                                >
                                    <div className="absolute top-5 right-5 h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                                    <div className="mb-3">
                                        <p className="text-rose-500 font-black text-xs uppercase tracking-widest">{prosthetic.type}</p>
                                        <h4 className="text-slate-800 font-bold mt-1">{prosthetic.patientName}</h4>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{prosthetic.supplierName}</span>
                                        <span className="badge bg-rose-500 text-white border-none py-1 px-2 text-[10px]">-{getDaysOverdue(prosthetic.dueDate)}j</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100">
                        <Link to="/prosthetics" className="btn-secondary w-full py-2.5 text-xs font-bold uppercase tracking-widest">
                            Gestion logistique
                        </Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}
