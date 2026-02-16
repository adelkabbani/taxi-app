import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';

export default function DocumentUploader({ driverId, onUploadSuccess, onClose }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Form State
    const [docType, setDocType] = useState('license');
    const [expiryDate, setExpiryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedDriverId, setSelectedDriverId] = useState(driverId || '');

    const onDrop = useCallback(acceptedFiles => {
        const selectedFile = acceptedFiles[0];
        if (selectedFile) {
            setFile(selectedFile);

            // Create preview for images
            if (selectedFile.type.startsWith('image/')) {
                const objectUrl = URL.createObjectURL(selectedFile);
                setPreview(objectUrl);
            } else {
                setPreview(null);
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        onDrop,
        maxSize: 10 * 1024 * 1024, // 10MB
        accept: {
            'image/jpeg': [],
            'image/png': [],
            'application/pdf': [],
            'application/msword': [],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': []
        },
        maxFiles: 1
    });

    const handleUpload = async () => {
        if (!file) return;
        if (!selectedDriverId) {
            toast.error('Please select a driver');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('document', file);
        formData.append('driverId', selectedDriverId);
        formData.append('documentType', docType);
        if (expiryDate) formData.append('expiryDate', expiryDate);
        if (notes) formData.append('notes', notes);

        try {
            await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            toast.success('Document uploaded successfully!');
            setFile(null);
            setPreview(null);
            setNotes('');
            setExpiryDate('');
            if (onUploadSuccess) onUploadSuccess();
            if (onClose) onClose();

        } catch (error) {
            console.error('Upload failed:', error);
            const msg = error.response?.data?.message || 'Upload failed. Please try again.';
            toast.error(msg);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const removeFile = () => {
        setFile(null);
        setPreview(null);
    };

    const docTypeOptions = [
        { value: 'license', label: 'Driver License' },
        { value: 'cv', label: 'CV / Resume' },
        { value: 'certificate', label: 'Certificate / Training' },
        { value: 'insurance', label: 'Insurance Policy' },
        { value: 'work_experience', label: 'Work Experience' }
    ];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 w-full max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Upload Document</h3>
                {onClose && (
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="p-6 space-y-6">

                {/* Driver ID Input (if not provided prop) */}
                {!driverId && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Driver ID
                        </label>
                        <input
                            type="number"
                            value={selectedDriverId}
                            onChange={(e) => setSelectedDriverId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                            placeholder="Enter Driver ID"
                        />
                    </div>
                )}

                {/* Metadata Form */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Document Type
                        </label>
                        <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                        >
                            {docTypeOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Expiry Date (Optional)
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className="w-full pl-3 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Dropzone */}
                {!file ? (
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                            ${isDragActive
                                ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                                : 'border-slate-300 dark:border-slate-600 hover:border-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }
                            ${fileRejections.length > 0 ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''}
                        `}
                    >
                        <input {...getInputProps()} />
                        <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                            Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            PDF, JPG, PNG or DOCX (max 10MB)
                        </p>
                        {fileRejections.length > 0 && (
                            <div className="mt-4 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm justify-center">
                                <AlertCircle className="w-4 h-4" />
                                <span>File invalid (check size or type)</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50">
                        <button
                            onClick={removeFile}
                            className="absolute top-2 right-2 p-1 bg-white dark:bg-slate-700 rounded-full shadow hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-start gap-4">
                            {preview ? (
                                <img src={preview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-600" />
                            ) : (
                                <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600">
                                    <FileText className="w-8 h-8 text-slate-400" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {file.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                {uploading && (
                                    <div className="mt-2 h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-sky-500 transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Notes (Optional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                        placeholder="Add verification notes..."
                    />
                </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleUpload}
                    disabled={!file || uploading || !selectedDriverId}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-sky-500/20"
                >
                    {uploading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4" />
                            Upload Document
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
