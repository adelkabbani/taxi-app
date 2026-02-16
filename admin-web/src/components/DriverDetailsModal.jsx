import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import AvailabilityBadge from './AvailabilityBadge';
import { Star, FileText, Download, X } from 'lucide-react';

const DriverDetailsModal = ({ driverId, isOpen, onClose, onUpdate }) => {
    const [driver, setDriver] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (isOpen && driverId) {
            fetchDriverDetails();
        }
    }, [isOpen, driverId]);

    const fetchDriverDetails = async () => {
        setLoading(true);
        try {
            const driverResponse = await api.get(`/drivers/${driverId}`);
            setDriver(driverResponse.data.data);

            try {
                const docsResponse = await api.get(`/documents/driver/${driverId}`);
                setDocuments(docsResponse.data.data || []);
            } catch (e) {
                console.error('Could not fetch documents:', e);
                setDocuments([]);
            }

            setError(null);
        } catch (err) {
            console.error('Failed to fetch driver details:', err);
            setError('Failed to load driver details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        try {
            await api.patch(`/drivers/${driverId}/availability`, { availability: newStatus });
            if (onUpdate) onUpdate();
            fetchDriverDetails();
        } catch (err) {
            console.error('Failed to update driver status:', err);
            alert('Failed to update driver status');
        }
    };

    // Helper to safely format numbers and ratings
    const formatRating = (rating) => {
        const num = Number(rating);
        return isNaN(num) || num === 0 ? 'N/A' : num.toFixed(1);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Driver Details</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-4 overflow-y-auto flex-1 bg-white dark:bg-slate-800">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-red-500">{error}</div>
                    ) : driver ? (
                        <div className="space-y-6">
                            {/* Driver Info Header */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {driver.first_name} {driver.last_name}
                                    </h2>
                                    <p className="text-slate-500">{driver.email}</p>
                                    <p className="text-slate-500">{driver.phone}</p>
                                </div>
                                <AvailabilityBadge availability={driver.availability} isStale={driver.isStale} />
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex border-b border-slate-200 dark:border-slate-700 -mx-6 px-6">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'overview'
                                            ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('ratings')}
                                    className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'ratings'
                                            ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    Ratings {driver.average_rating ? `(${formatRating(driver.average_rating)}⭐)` : ''}
                                </button>
                                <button
                                    onClick={() => setActiveTab('documents')}
                                    className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'documents'
                                            ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    Documents ({documents.length})
                                </button>
                            </div>

                            {/* Overview Tab Content */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Acceptance</p>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white">{driver.acceptance_rate || 0}%</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Total Bookings</p>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white">{driver.total_bookings || 0}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Rating</p>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                                {formatRating(driver.average_rating)}
                                                {driver.average_rating && <span className="text-sm"> ⭐</span>}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase font-semibold">No Shows</p>
                                            <p className="text-lg font-bold text-red-500">{driver.no_shows || 0}</p>
                                        </div>
                                    </div>

                                    {/* Vehicle Details */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Vehicle Details</h4>
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">{driver.license_plate || 'N/A'}</p>
                                                <p className="text-sm text-slate-500 uppercase">{driver.vehicle_type || 'N/A'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-slate-500">License #: {driver.license_number || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Quick Actions</h4>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => handleUpdateStatus('available')}
                                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Set Available
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus('on_break')}
                                                className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Put on Break
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus('offline')}
                                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Set Offline
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Ratings Tab Content */}
                            {activeTab === 'ratings' && (
                                <div className="space-y-4">
                                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold uppercase">Average Rating</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-4xl font-bold text-slate-900 dark:text-white">
                                                        {formatRating(driver.average_rating)}
                                                    </span>
                                                    <div className="flex">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`w-6 h-6 ${i < Math.round(Number(driver.average_rating) || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-slate-600 dark:text-slate-400">Total Ratings</p>
                                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{driver.total_ratings || 0}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-8 rounded-lg text-center">
                                        <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500">Rating history coming soon</p>
                                        <p className="text-sm text-slate-400 mt-1">View detailed ratings from trip history</p>
                                    </div>
                                </div>
                            )}

                            {/* Documents Tab Content */}
                            {activeTab === 'documents' && (
                                <div className="space-y-4">
                                    {documents.length === 0 ? (
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-12 rounded-lg text-center">
                                            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                            <p className="text-slate-500 font-medium">No documents uploaded</p>
                                            <p className="text-sm text-slate-400 mt-2">Driver hasn't uploaded any documents yet</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {documents.map((doc) => (
                                                <div key={doc.document_id} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex gap-3 flex-1">
                                                            <div className="p-2 bg-slate-100 dark:bg-slate-600 rounded-lg">
                                                                <FileText className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="font-semibold text-slate-900 dark:text-white capitalize">
                                                                    {doc.document_type.replace(/_/g, ' ')}
                                                                </h4>
                                                                <p className="text-sm text-slate-500 mt-1">{doc.file_name}</p>
                                                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                                                    <span>Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                                                    {doc.expiry_date && (
                                                                        <span>Expires: {new Date(doc.expiry_date).toLocaleDateString()}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${doc.verification_status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                                    doc.verification_status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                                        doc.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                            'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-400'
                                                                }`}>
                                                                {doc.verification_status || 'Unknown'}
                                                            </span>
                                                            <button
                                                                onClick={() => window.open(`/api/documents/${doc.document_id}/download`, '_blank')}
                                                                className="p-2 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-lg transition-colors"
                                                                title="Download"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {doc.verification_notes && (
                                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                                                            <p className="text-xs font-semibold text-slate-500 uppercase">Notes</p>
                                                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{doc.verification_notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 text-right border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DriverDetailsModal;
