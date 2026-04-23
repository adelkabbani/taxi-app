import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import DocumentUploader from '../components/DocumentUploader';

export default function Documents() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'
    const [stats, setStats] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDocuments();
        fetchStats();
    }, [filter]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/documents/pending', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch documents');

            const data = await response.json();
            setDocuments(data.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/documents/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch stats');

            const data = await response.json();
            setStats(data.data);
        } catch (err) {
            console.error('Stats error:', err);
        }
    };

    const handleVerify = async (documentId, status, notes = '') => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/documents/${documentId}/verify`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, notes })
            });

            if (!response.ok) throw new Error('Failed to verify document');

            // Refresh the list
            fetchDocuments();
            fetchStats();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const getDocumentTypeIcon = (type) => {
        const icons = {
            cv: '📄',
            license: '🪪',
            certificate: '📜',
            insurance: '🛡️',
            work_experience: '💼'
        };
        return icons[type] || '📎';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading && !documents.length) {
        return (
            <div className="h-full flex items-center justify-center bg-white dark:bg-ink-black-950 transition-colors">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto"></div>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 transition-colors">Decrypting Repository...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1 transition-colors">Archival Intelligence</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest transition-colors">Verify personnel authorization</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gold-400 hover:bg-gold-500 text-ink-black-950 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_10px_15px_-3px_rgba(234,179,8,0.2)] active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Inject Data
                </button>
            </div>
               {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gold-500/10 border border-gray-100 dark:border-gold-500/20 rounded-2xl p-5 shadow-sm dark:shadow-2xl transition-colors">
                        <div className="text-[10px] font-black text-gold-600 dark:text-gray-400 uppercase tracking-widest transition-colors">Awaiting Verification</div>
                        <div className="text-3xl font-black text-gold-500 dark:text-gold-400 mt-2 tracking-tighter transition-colors">{stats.pending || 0}</div>
                    </div>
                    <div className="bg-white dark:bg-emerald-500/10 border border-gray-100 dark:border-emerald-500/20 rounded-2xl p-5 shadow-sm dark:shadow-2xl transition-colors">
                        <div className="text-[10px] font-black text-emerald-600 dark:text-gray-400 uppercase tracking-widest transition-colors">Authorized</div>
                        <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tighter transition-colors">{stats.approved || 0}</div>
                    </div>
                    <div className="bg-white dark:bg-rose-500/10 border border-gray-100 dark:border-rose-500/20 rounded-2xl p-5 shadow-sm dark:shadow-2xl transition-colors">
                        <div className="text-[10px] font-black text-rose-600 dark:text-gray-400 uppercase tracking-widest transition-colors">Restricted</div>
                        <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2 tracking-tighter transition-colors">{stats.rejected || 0}</div>
                    </div>
                    <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-2xl transition-colors">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest transition-colors">Invalid/Expired</div>
                        <div className="text-3xl font-black text-gray-400 dark:text-gray-300 mt-2 tracking-tighter transition-colors">{stats.expired || 0}</div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-6">
                    <p className="text-rose-500 text-xs font-black uppercase tracking-widest">{error}</p>
                </div>
            )}

            {/* Documents Table */}
            <div className="bg-white dark:bg-ink-black-900/40 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-xl dark:shadow-2xl transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-white/5 transition-colors">
                             <tr className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">
                                <th className="px-6 py-5">Classification</th>
                                <th className="px-6 py-5">Personnel</th>
                                <th className="px-6 py-5">Intel Trace</th>
                                <th className="px-6 py-5">Arrival</th>
                                <th className="px-6 py-5">Persistence</th>
                                <th className="px-6 py-5">Expiry</th>
                                <th className="px-6 py-5 text-right">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/[0.03]">
                             {documents.length === 0 ? (
                                <tr>
                                     <td colSpan="7" className="px-6 py-12 text-center text-gray-400 dark:text-gray-500 transition-colors">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">🎉 Repository Purged • No data to verify</p>
                                    </td>
                                </tr>
                            ) : (
                                documents.map((doc) => (
                                    <tr key={doc.document_id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl opacity-60 group-hover:opacity-100 transition-opacity">{getDocumentTypeIcon(doc.document_type)}</span>
                                                 <span className="text-[10px] font-black text-gray-400 dark:text-gray-300 uppercase tracking-widest group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                                                    {doc.document_type.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="text-sm font-bold text-ink-black-900 dark:text-white mb-0.5 transition-colors">{doc.driver_name}</div>
                                            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono uppercase transition-colors">{doc.driver_phone}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-[10px] font-bold text-gray-400 truncate max-w-[150px]">{doc.file_name}</div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-[10px] text-gray-500 font-mono">
                                            {formatDate(doc.uploaded_at)}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-lg border ${parseInt(doc.days_pending) > 7 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                parseInt(doc.days_pending) > 3 ? 'bg-gold-500/10 text-gold-400 border-gold-500/20' :
                                                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                }`}>
                                                {doc.days_pending} CYCLES
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-[10px] font-mono">
                                            <span className={doc.is_expired ? 'text-rose-500 font-black' : 'text-gray-400'}>
                                                {doc.expiry_date ? formatDate(doc.expiry_date) : 'PERMANENT'}
                                            </span>
                                             {doc.is_expired && (
                                                <span className="ml-2 animate-pulse text-rose-500">⚠️ EXPIRED</span>
                                            )}
                                        </td>
                                         <td className="px-6 py-5 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-right">
                                            <button
                                                onClick={() => handleVerify(doc.document_id, 'approved')}
                                                className="text-emerald-600 dark:text-emerald-400 hover:text-ink-black-950 dark:hover:text-white transition-colors mr-4"
                                            >
                                                [ Authorize ]
                                            </button>
                                             <button
                                                onClick={() => {
                                                    const notes = prompt('Reason for rejection:');
                                                    if (notes) handleVerify(doc.document_id, 'rejected', notes);
                                                }}
                                                className="text-rose-600 dark:text-rose-400 hover:text-ink-black-950 dark:hover:text-white transition-colors"
                                            >
                                                [ Reject ]
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

             {/* Document Types Breakdown */}
            {stats && stats.byType && (
                <div className="bg-white dark:bg-ink-black-900 border border-gray-100 dark:border-white/5 rounded-2xl p-6 shadow-xl mt-8 transition-colors">
                    <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 transition-colors">Type Density</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(stats.byType).map(([type, counts]) => (
                            <div key={type} className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 rounded-xl p-4 transition-all group">
                                <div className="text-2xl mb-3 opacity-60 group-hover:scale-110 transition-transform">{getDocumentTypeIcon(type)}</div>
                                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
                                    {type.replace('_', ' ')}
                                </div>
                                 <div className="space-y-1 text-[9px] font-black uppercase tracking-widest">
                                    <div className="flex justify-between text-gold-600 dark:text-gold-400">
                                        <span>Pending:</span>
                                        <span>{counts.pending || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-600/60 dark:text-emerald-400/60">
                                        <span>Authorized:</span>
                                        <span>{counts.approved || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-rose-600/60 dark:text-rose-400/60">
                                        <span>Restricted:</span>
                                        <span>{counts.rejected || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <DocumentUploader
                        onClose={() => setShowUploadModal(false)}
                        onUploadSuccess={() => {
                            setShowUploadModal(false);
                            fetchDocuments();
                            fetchStats();
                        }}
                    />
                </div>
            )}
        </div>
    );
}
