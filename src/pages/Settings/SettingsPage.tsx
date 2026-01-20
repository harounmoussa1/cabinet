import React, { useState, useEffect } from 'react';
import {
    Settings as SettingsIcon,
    Database,
    Shield,
    Bell,
    Palette,
    HardDrive,
    Info,
    Cloud,
    RefreshCw,
    Download,
    Trash2,
    Calendar,
    Loader2
} from 'lucide-react';

export function SettingsPage() {
    const [backups, setBackups] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadBackups();
    }, []);

    const loadBackups = async () => {
        setIsLoading(true);
        try {
            const list = await (window as any).ipcRenderer.invoke('list-backups');
            setBackups(list || []);
            setError(null);
        } catch (err: any) {
            console.error('Failed to load backups:', err);
            setError('Impossible de se connecter à Google Drive. Vérifiez votre configuration.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackupNow = async () => {
        setIsBackingUp(true);
        try {
            const result = await (window as any).ipcRenderer.invoke('backup-now');
            if (result.success) {
                await loadBackups();
            } else {
                alert('Erreur: ' + result.error);
            }
        } catch (err: any) {
            alert('Erreur lors du backup: ' + err.message);
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleRestore = async (fileId: string, fileName: string) => {
        if (confirm(`Êtes-vous sûr de vouloir restaurer la sauvegarde "${fileName}" ? Toutes les données actuelles seront remplacées et l'application redémarrera.`)) {
            try {
                await (window as any).ipcRenderer.invoke('restore-backup', fileId);
            } catch (err: any) {
                alert('Erreur lors de la restauration: ' + err.message);
            }
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatSize = (bytes: string) => {
        const b = parseInt(bytes);
        return (b / 1024 / 1024).toFixed(2) + ' MB';
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Paramètres</h1>
                <p className="text-slate-500 mt-1">Configuration de l'application et sauvegardes</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cloud Backup Card */}
                <div className="card lg:col-span-2">
                    <div className="p-5 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                <Cloud className="text-indigo-500" size={20} />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-800">Sauvegarde Cloud Google Drive</h2>
                                <p className="text-xs text-slate-500">Sauvegarde sécurisée et chiffrée</p>
                            </div>
                        </div>
                        <button
                            onClick={handleBackupNow}
                            disabled={isBackingUp}
                            className="btn-primary"
                        >
                            {isBackingUp ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                            Sauvegarder maintenant
                        </button>
                    </div>
                    <div className="p-5">
                        {error ? (
                            <div className="p-4 rounded-lg bg-red-50 text-red-600 border border-red-100 text-sm">
                                {error}
                                <button onClick={loadBackups} className="ml-2 underline font-medium">Réessayer</button>
                            </div>
                        ) : backups.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                                {isLoading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="animate-spin text-slate-300" size={32} />
                                        <p>Chargement des sauvegardes...</p>
                                    </div>
                                ) : (
                                    <>
                                        <Cloud size={40} className="mx-auto mb-2 opacity-20" />
                                        <p>Aucune sauvegarde trouvée sur Google Drive.</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-lg border border-slate-200">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fichier</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Taille</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {backups.map((bk) => (
                                            <tr key={bk.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        {formatDate(bk.createdTime)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                                                    {bk.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                    {bk.size ? formatSize(bk.size) : '--'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleRestore(bk.id, bk.name)}
                                                        className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 ml-auto"
                                                    >
                                                        <Download size={16} />
                                                        Restaurer
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <p className="mt-4 text-xs text-slate-400 italic">
                            * Les sauvegardes sont chiffrées avec AES-256 avant d'être envoyées. Seules les 7 dernières sont conservées.
                        </p>
                    </div>
                </div>

                {/* Application Info */}
                <div className="card">
                    <div className="p-5 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center border border-teal-100">
                                <Info className="text-teal-500" size={20} />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-800">À propos</h2>
                                <p className="text-xs text-slate-500">Informations sur l'application</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Nom</span>
                            <span className="text-slate-800 font-medium">DentalCab Manager</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Version</span>
                            <span className="text-slate-800 font-medium">1.0.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Plateforme</span>
                            <span className="text-slate-800 font-medium">Electron + React</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Base de données</span>
                            <span className="text-slate-800 font-medium">SQLite</span>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div className="card">
                    <div className="p-5 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100">
                                <Shield className="text-amber-500" size={20} />
                            </div>
                            <div>
                                <h2 className="font-semibold text-slate-800">Sécurité</h2>
                                <p className="text-xs text-slate-500">Protection des données</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                            <div>
                                <p className="text-slate-800 font-medium">Protection par mot de passe</p>
                                <p className="text-xs text-slate-500">Activer la connexion sécurisée</p>
                            </div>
                            <span className="badge-neutral">Bientôt</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                            <div>
                                <p className="text-slate-800 font-medium">Chiffrement AES-256</p>
                                <p className="text-xs text-slate-500">Sauvegardes cloud protégées</p>
                            </div>
                            <span className="badge-success">Actif</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-slate-500 text-sm pt-6 border-t border-slate-200">
                <p>DentalCab Manager © 2026 - Développé pour la gestion des cabinets dentaires</p>
            </div>
        </div>
    );
}
