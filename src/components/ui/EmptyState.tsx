import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="empty-state bg-white p-6 rounded-lg shadow-sm">
            <div className="empty-state-icon text-slate-500">
                {icon || <FolderOpen size={32} />}
            </div>
            <h3 className="text-lg font-semibold text-black mb-2">{title}</h3>
            {description && (
                <p className="text-slate-400 mb-4 max-w-sm">{description}</p>
            )}
            {action}
        </div>
    );
}
