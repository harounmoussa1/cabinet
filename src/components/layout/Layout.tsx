import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
    return (
        <div className="flex h-screen w-full overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Draggable header area for Electron window */}
                <div className="drag-region h-10 bg-slate-50 border-b border-slate-200" />

                {/* Page content */}
                <div className="flex-1 overflow-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
