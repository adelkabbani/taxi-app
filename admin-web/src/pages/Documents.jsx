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
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading documents...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Driver Documents</h1>
                    <p className="text-gray-600 mt-2">Review and verify driver uploaded documents</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    Upload Document
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="text-sm font-medium text-yellow-800">Pending Review</div>
                        <div className="text-2xl font-bold text-yellow-900 mt-2">{stats.pending || 0}</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-sm font-medium text-green-800">Approved</div>
                        <div className="text-2xl font-bold text-green-900 mt-2">{stats.approved || 0}</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="text-sm font-medium text-red-800">Rejected</div>
                        <div className="text-2xl font-bold text-red-900 mt-2">{stats.rejected || 0}</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-800">Expired</div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">{stats.expired || 0}</div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {/* Documents Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Driver
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    File
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Uploaded
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Days Pending
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Expiry
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {documents.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        🎉 No pending documents to review!
                                    </td>
                                </tr>
                            ) : (
                                documents.map((doc) => (
                                    <tr key={doc.document_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <span className="text-2xl mr-2">{getDocumentTypeIcon(doc.document_type)}</span>
                                                <span className="text-sm font-medium text-gray-900 capitalize">
                                                    {doc.document_type.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{doc.driver_name}</div>
                                            <div className="text-sm text-gray-500">{doc.driver_phone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{doc.file_name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(doc.uploaded_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${parseInt(doc.days_pending) > 7 ? 'bg-red-100 text-red-800' :
                                                parseInt(doc.days_pending) > 3 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                                }`}>
                                                {doc.days_pending} days
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {doc.expiry_date ? formatDate(doc.expiry_date) : 'N/A'}
                                            {doc.is_expired && (
                                                <span className="ml-2 text-red-600 font-semibold">⚠️ Expired</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => handleVerify(doc.document_id, 'approved')}
                                                className="text-green-600 hover:text-green-900 mr-3"
                                            >
                                                ✓ Approve
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const notes = prompt('Reason for rejection:');
                                                    if (notes) handleVerify(doc.document_id, 'rejected', notes);
                                                }}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                ✗ Reject
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
                <div className="mt-6 bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents by Type</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(stats.byType).map(([type, counts]) => (
                            <div key={type} className="border rounded-lg p-4">
                                <div className="text-2xl mb-2">{getDocumentTypeIcon(type)}</div>
                                <div className="text-sm font-medium text-gray-700 capitalize mb-2">
                                    {type.replace('_', ' ')}
                                </div>
                                <div className="text-xs text-gray-600">
                                    <div>Pending: {counts.pending || 0}</div>
                                    <div>Approved: {counts.approved || 0}</div>
                                    <div>Rejected: {counts.rejected || 0}</div>
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
