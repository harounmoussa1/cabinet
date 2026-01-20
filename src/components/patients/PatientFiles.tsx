import React, { useEffect, useState } from 'react';
import {
    Upload,
    Trash2,
    FileText,
    Image as ImageIcon,
    File,
    Download,
    ExternalLink,
    FolderOpen,
    Plus
} from 'lucide-react';
import api from '../../lib/api';
import type { PatientFile, FileCategory } from '../../types';
import { ConfirmModal, EmptyState } from '../ui';

const FILE_CATEGORIES = [
    { value: 'RADIOGRAPHIE', label: 'Radiographie' },
    { value: 'PANORAMIQUE', label: 'Panoramique' },
    { value: 'SCANNER', label: 'Scanner 3D' },
    { value: 'ORDONNANCE', label: 'Ordonnance' },
    { value: 'CERTIFICAT', label: 'Certificat' },
    { value: 'FACTURE', label: 'Facture' },
    { value: 'AUTRE', label: 'Autre' },
];

interface PatientFilesProps {
    patientId: number;
}

export function PatientFiles({ patientId }: PatientFilesProps) {
    const [files, setFiles] = useState<PatientFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<FileCategory>('AUTRE');
    const [description, setDescription] = useState('');
    const [showUploadForm, setShowUploadForm] = useState(false);

    // Delete confirmation
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<PatientFile | null>(null);

    useEffect(() => {
        loadFiles();
    }, [patientId]);

    const loadFiles = async () => {
        try {
            const data = await api.getPatientFiles(patientId);
            setFiles(data);
        } catch (error) {
            console.error('Failed to load files:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        setUploading(true);
        try {
            const file = await api.uploadPatientFile(patientId, selectedCategory, description);
            if (file) {
                setFiles([file, ...files]);
                setShowUploadForm(false);
                setDescription('');
            }
        } catch (error) {
            console.error('Failed to upload file:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = (file: PatientFile) => {
        setSelectedFile(file);
        setIsDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedFile) {
            await api.deletePatientFile(selectedFile.id);
            setFiles(files.filter(f => f.id !== selectedFile.id));
            setIsDeleteOpen(false);
            setSelectedFile(null);
        }
    };

    const handleOpen = async (file: PatientFile) => {
        await api.openPatientFile(file.id);
    };

    const getFileIcon = (fileType: string) => {
        const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        const docTypes = ['pdf', 'doc', 'docx'];

        if (imageTypes.includes(fileType.toLowerCase())) {
            return <ImageIcon className="text-blue-400" size={20} />;
        } else if (docTypes.includes(fileType.toLowerCase())) {
            return <FileText className="text-red-400" size={20} />;
        }
        return <File className="text-slate-400" size={20} />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCategoryLabel = (category: string) => {
        return FILE_CATEGORIES.find(c => c.value === category)?.label || category;
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            'RADIOGRAPHIE': 'bg-blue-50 text-blue-600 border border-blue-100',
            'PANORAMIQUE': 'bg-cyan-50 text-cyan-600 border border-cyan-100',
            'SCANNER': 'bg-purple-50 text-purple-600 border border-purple-100',
            'ORDONNANCE': 'bg-emerald-50 text-emerald-600 border border-emerald-100',
            'CERTIFICAT': 'bg-amber-50 text-amber-600 border border-amber-100',
            'FACTURE': 'bg-orange-50 text-orange-600 border border-orange-100',
            'AUTRE': 'bg-slate-50 text-slate-600 border border-slate-100',
        };
        return colors[category] || colors['AUTRE'];
    };

    if (loading) {
        return (
            <div className="p-4 text-center text-slate-500">
                Chargement des fichiers...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with Upload Button */}
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                    <FolderOpen size={16} className="text-teal-500" />
                    Fichiers du patient ({files.length})
                </h4>
                <button
                    onClick={() => setShowUploadForm(!showUploadForm)}
                    className="btn-primary text-sm py-1.5 px-3"
                >
                    <Plus size={16} />
                    Ajouter
                </button>
            </div>

            {/* Upload Form */}
            {showUploadForm && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3 fade-in shadow-sm">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label text-xs">Catégorie</label>
                            <select
                                className="input text-sm py-2"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value as FileCategory)}
                            >
                                {FILE_CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label text-xs">Description (optionnel)</label>
                            <input
                                type="text"
                                className="input text-sm py-2"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ex: Radio dent 46"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="btn-primary text-sm py-2 flex-1"
                        >
                            <Upload size={16} />
                            {uploading ? 'Chargement...' : 'Sélectionner et uploader'}
                        </button>
                        <button
                            onClick={() => setShowUploadForm(false)}
                            className="btn-secondary text-sm py-2"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}

            {/* Files List */}
            {files.length === 0 ? (
                <EmptyState
                    icon={<FolderOpen size={24} />}
                    title="Aucun fichier"
                    description="Ajoutez des radiographies, documents ou autres fichiers pour ce patient"
                />
            ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 border border-slate-100">
                                    {getFileIcon(file.fileType)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-slate-800 truncate">
                                            {file.originalName}
                                        </p>
                                        <span className={`badge text-[10px] px-1.5 py-0.5 ${getCategoryColor(file.category)}`}>
                                            {getCategoryLabel(file.category)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        <span>{formatFileSize(file.fileSize)}</span>
                                        <span>•</span>
                                        <span>{formatDate(file.uploadedAt)}</span>
                                        {file.description && (
                                            <>
                                                <span>•</span>
                                                <span className="text-slate-400 truncate">{file.description}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpen(file)}
                                    className="btn-icon text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                    title="Ouvrir"
                                >
                                    <ExternalLink size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(file)}
                                    className="btn-icon text-red-400 hover:text-red-500 hover:bg-red-50"
                                    title="Supprimer"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={confirmDelete}
                title="Supprimer le fichier"
                message={`Êtes-vous sûr de vouloir supprimer "${selectedFile?.originalName}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                variant="danger"
            />
        </div>
    );
}
