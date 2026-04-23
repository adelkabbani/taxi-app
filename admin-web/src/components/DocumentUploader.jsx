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
        <div className="bg-white dark:bg-ink-black-900 rounded-2xl shadow-xl border border-gray-100 dark:border-white/5 w-full max-w-lg mx-auto overflow-hidden transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-ink-black-950/50 transition-colors">
                <h3 className="text-base font-black text-ink-black-950 dark:text-white uppercase tracking-widest transition-colors">Repository Upload</h3>
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-ink-black-950 dark:hover:text-white transition-all p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="p-6 space-y-6">

                {/* Driver ID Input (if not provided prop) */}
                {!driverId && (
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">
                            Driver Identification
                        </label>
                        <input
                            type="number"
                            value={selectedDriverId}
                            onChange={(e) => setSelectedDriverId(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 dark:border-white/5 rounded-xl bg-gray-50 dark:bg-ink-black-950 text-ink-black-950 dark:text-white focus:ring-1 focus:ring-gold-500 outline-none text-sm placeholder-gray-400 dark:placeholder:text-gray-600 transition-all"
                            placeholder="Enter System Driver ID"
                        />
                    </div>
                )}

                {/* Metadata Form */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">
                            Document Category
                        </label>
                        <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 dark:border-white/5 rounded-xl bg-gray-50 dark:bg-ink-black-950 text-ink-black-950 dark:text-white focus:ring-1 focus:ring-gold-500 outline-none text-sm appearance-none transition-all"
                        >
                            {docTypeOptions.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-white dark:bg-ink-black-950">{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">
                            Expiration Control
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 dark:border-white/5 rounded-xl bg-gray-50 dark:bg-ink-black-950 text-ink-black-950 dark:text-white focus:ring-1 focus:ring-gold-500 outline-none text-sm [color-scheme:light] dark:[color-scheme:dark] transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Dropzone */}
                {!file ? (
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300
                            ${isDragActive
                                ? 'border-gold-500 bg-gold-500/5'
                                : 'border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-ink-black-950 hover:border-gold-500/50 hover:bg-white dark:hover:bg-white/2'
                            }
                            ${fileRejections.length > 0 ? 'border-rose-500 bg-rose-500/5' : ''}
                        `}
                    >
                        <input {...getInputProps()} />
                        <div className="w-14 h-14 bg-white dark:bg-ink-black-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-white/5 transition-colors">
                            <Upload className="w-6 h-6 text-gold-500" />
                        </div>
                        <p className="text-sm font-black text-ink-black-950 dark:text-white uppercase tracking-widest transition-colors">
                            Dispatch File
                        </p>
                        <p className="text-[10px] text-gray-600 mt-2 font-bold uppercase tracking-widest">
                            PDF, JPG, PNG or DOCX (MAX 10MB)
                        </p>
                        {fileRejections.length > 0 && (
                            <div className="mt-4 p-3 bg-rose-500/10 rounded-xl flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-widest justify-center">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Invalid Object Detected</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative border border-gray-100 dark:border-white/5 rounded-2xl p-5 bg-gray-50 dark:bg-ink-black-950 transition-colors">
                        <button
                            onClick={removeFile}
                            className="absolute top-3 right-3 p-1.5 bg-white dark:bg-white/5 rounded-full shadow-sm hover:bg-rose-500/20 text-gray-400 hover:text-rose-500 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-start gap-4">
                            {preview ? (
                                <img src={preview} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-gray-200 dark:border-white/5 shadow-lg" />
                            ) : (
                                <div className="w-16 h-16 bg-white dark:bg-ink-black-900 rounded-xl flex items-center justify-center border border-gray-100 dark:border-white/5 transition-colors">
                                    <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 pt-1">
                                <p className="text-xs font-black text-ink-black-950 dark:text-white uppercase tracking-widest truncate transition-colors">
                                    {file.name}
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1 transition-colors">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                {uploading && (
                                    <div className="mt-3 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-gold-500 to-amber-500 transition-all duration-300"
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
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 pl-1">
                        Operational Notes
                    </label>
                     <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-white/5 rounded-xl bg-gray-50 dark:bg-ink-black-950 text-ink-black-950 dark:text-white focus:ring-1 focus:ring-gold-500 outline-none resize-none text-sm placeholder-gray-400 dark:placeholder:text-gray-600 transition-all"
                        placeholder="Add verification context..."
                    />
                </div>

            </div>

             {/* Footer */}
            <div className="p-5 border-t border-gray-100 dark:border-white/5 flex justify-end gap-4 bg-gray-50 dark:bg-ink-black-950/50 transition-colors">
                <button
                    onClick={onClose}
                    className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:text-ink-black-950 dark:hover:text-white transition-all active:scale-95"
                >
                    Cancel
                </button>
                <button
                    onClick={handleUpload}
                    disabled={!file || uploading || !selectedDriverId}
                     className="flex items-center gap-2 px-8 py-3 bg-gold-500 hover:bg-gold-400 text-ink-black-950 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-gold-500/20 active:scale-95"
                >
                    {uploading ? (
                        <>
                            <div className="w-3.5 h-3.5 border-2 border-ink-black-950/20 border-t-ink-black-950 rounded-full animate-spin" />
                            Syncing...
                        </>
                    ) : (
                        <>
                            <Upload className="w-3.5 h-3.5" />
                            Confirm Upload
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
