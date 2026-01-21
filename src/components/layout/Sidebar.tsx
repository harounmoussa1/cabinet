import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    Crown,
    Truck,
    Settings,
    Stethoscope,
    Trash2,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
}

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/patients', icon: Users, label: 'Patients' },
    { path: '/appointments', icon: CalendarDays, label: 'Rendez-vous' },
    { path: '/prosthetics', icon: Crown, label: 'Prothèses' },
    { path: '/suppliers', icon: Truck, label: 'Fournisseurs' },
    { path: '/trash', icon: Trash2, label: 'Corbeille' },
    { path: '/settings', icon: Settings, label: 'Paramètres' },
];

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
    const location = useLocation();

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} glass border-r flex flex-col transition-all duration-300 relative group`}>
            {/* Collapse Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-200 shadow-sm z-50 transition-colors"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Logo / Header - Draggable for Electron window */}
            <div className="drag-region h-16 flex items-center px-4 border-b border-slate-200 overflow-hidden">
                <div className="no-drag flex items-center gap-3">
                    <div className="w-10 h-10 min-w-[40px] rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/25 transition-transform duration-300">
                        <Stethoscope className="text-white" size={20} />
                    </div>
                    {!isCollapsed && (
                        <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                            <h1 className="font-bold text-slate-800 text-lg leading-tight whitespace-nowrap">DentalCab</h1>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Manager Pro</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`${isActive ? 'nav-item-active' : 'nav-item'} ${isCollapsed ? 'justify-center px-2' : 'px-3'}`}
                            title={isCollapsed ? item.label : ''}
                        >
                            <item.icon size={20} className="min-w-[20px]" />
                            {!isCollapsed && (
                                <span className="font-medium whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                                    {item.label}
                                </span>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* User Profile */}
            <div className="p-3 border-t border-slate-200 overflow-hidden">
                <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-9 h-9 min-w-[36px] rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                        DH
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                            <p className="font-bold text-slate-800 text-sm truncate">Dr. Haroun</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Administrateur</p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
