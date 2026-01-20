import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    Crown,
    Truck,
    Settings,
    Stethoscope,
    Trash2
} from 'lucide-react';

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/patients', icon: Users, label: 'Patients' },
    { path: '/appointments', icon: CalendarDays, label: 'Rendez-vous' },
    { path: '/prosthetics', icon: Crown, label: 'Prothèses' },
    { path: '/suppliers', icon: Truck, label: 'Fournisseurs' },
    { path: '/trash', icon: Trash2, label: 'Corbeille' },
    { path: '/settings', icon: Settings, label: 'Paramètres' },
];

export function Sidebar() {
    const location = useLocation();

    return (
        <aside className="w-64 glass border-r flex flex-col">
            {/* Logo / Header - Draggable for Electron window */}
            <div className="drag-region h-16 flex items-center px-6 border-b border-slate-200">
                <div className="no-drag flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/25">
                        <Stethoscope className="text-white" size={22} />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-800 text-lg leading-tight">DentalCab</h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Manager Pro</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={isActive ? 'nav-item-active' : 'nav-item'}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-slate-200">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                        DH
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">Dr. Haroun</p>
                        <p className="text-xs text-slate-500">Administrateur</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
