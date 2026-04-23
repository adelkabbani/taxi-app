import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import AvailabilityBadge from './AvailabilityBadge';
import { Star, FileText, Download, X, Car, Navigation, RotateCcw, Ban, Activity, Clock } from 'lucide-react';

const DriverDetailsModal = ({ driverId, isOpen, onClose, onUpdate }) => {
    const [driver, setDriver] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [tempPassword, setTempPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

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

    const handlePasswordReset = async () => {
        if (!tempPassword || tempPassword.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }

        if (!window.confirm(`Are you sure you want to reset the password for ${driver?.driver_name || 'this driver'}? This will immediately logout ALL their active app sessions.`)) {
            return;
        }

        setIsResetting(true);
        setResetSuccess(false);
        try {
            await api.patch(`/drivers/${driverId}/password`, { password: tempPassword });
            setResetSuccess(true);
            setTempPassword('');
            setTimeout(() => setResetSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to reset password:', err);
            alert('Failed to reset driver password. Please check backend logs.');
        } finally {
            setIsResetting(false);
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
            className="fixed inset-0 bg-ink-black-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-ink-black-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-white/5 transition-colors"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-ink-black-950/50 transition-colors">
                    <h3 className="text-base font-black text-ink-black-950 dark:text-white uppercase tracking-widest transition-colors">Driver Profile</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/5 text-gray-400 dark:text-gray-500 hover:text-ink-black-950 dark:hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 py-4 overflow-y-auto flex-1 bg-white dark:bg-ink-black-900 transition-colors">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-rose-500">{error}</div>
                    ) : driver ? (
                        <div className="space-y-6">
                            {/* Driver Info Header */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-ink-black-950 dark:text-white uppercase tracking-tighter transition-colors">
                                        {driver.driver_name || (driver.first_name || driver.last_name ? `${driver.first_name || ''} ${driver.last_name || ''}`.trim() : 'Unnamed Driver')}
                                    </h2>
                                    <div className="flex flex-col gap-1 mt-2">
                                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{driver.email}</p>
                                        <p className="text-gold-400/80 text-[10px] font-bold uppercase tracking-widest">{driver.phone}</p>
                                    </div>
                                </div>
                                <AvailabilityBadge availability={driver.availability} isStale={driver.isStale} />
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex border-b border-gray-100 dark:border-white/5 -mx-6 px-6 transition-colors">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`px-6 py-3 font-black text-[10px] uppercase tracking-widest transition-all border-b-2 ${activeTab === 'overview'
                                            ? 'border-gold-500 text-gold-500'
                                            : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-ink-black-950 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('ratings')}
                                    className={`px-6 py-3 font-black text-[10px] uppercase tracking-widest transition-all border-b-2 ${activeTab === 'ratings'
                                            ? 'border-gold-500 text-gold-500'
                                            : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-ink-black-950 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Ratings {driver.average_rating ? `(${formatRating(driver.average_rating)}⭐)` : ''}
                                </button>
                                <button
                                    onClick={() => setActiveTab('documents')}
                                    className={`px-6 py-3 font-black text-[10px] uppercase tracking-widest transition-all border-b-2 ${activeTab === 'documents'
                                            ? 'border-gold-500 text-gold-500'
                                            : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-ink-black-950 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Documents ({documents.length})
                                </button>
                            </div>

                            {/* Overview Tab Content */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4 rounded-xl transition-colors">
                                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Affinity</p>
                                            <p className="text-xl font-black text-ink-black-950 dark:text-white transition-colors">
                                                {(() => {
                                                    const accepted = parseInt(driver.accepted_bookings || 0);
                                                    const rejected = parseInt(driver.rejected_bookings || 0);
                                                    return (accepted + rejected) > 0 
                                                        ? Math.round((accepted / (accepted + rejected)) * 100) 
                                                        : 100;
                                                })()}%
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4 rounded-xl transition-colors">
                                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Bookings</p>
                                            <p className="text-xl font-black text-ink-black-950 dark:text-white transition-colors">{driver.total_bookings || 0}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4 rounded-xl transition-colors">
                                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Rating</p>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xl font-black text-ink-black-950 dark:text-white transition-colors">{formatRating(driver.average_rating)}</p>
                                                {driver.average_rating && <Star className="w-4 h-4 text-gold-500 fill-gold-500" />}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4 rounded-xl transition-colors">
                                            <p className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-1">No Shows</p>
                                            <p className="text-xl font-black text-rose-600 dark:text-rose-500 transition-colors">{driver.no_shows || 0}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4 rounded-xl transition-colors">
                                            <p className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-1">Rejections</p>
                                            <p className="text-xl font-black text-amber-600 dark:text-amber-500 transition-colors">{driver.rejected_bookings || 0}</p>
                                        </div>

                                    </div>

                                    {/* Vehicle Details */}
                                    <div>
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Car className="w-3.5 h-3.5" />
                                            Vehicle Information
                                        </h4>
                                        <div className="bg-gray-50 dark:bg-ink-black-950 border border-gray-100 dark:border-gold-500/10 p-5 rounded-2xl flex items-center justify-between shadow-sm transition-colors">
                                            <div>
                                                <p className="font-black text-ink-black-950 dark:text-white uppercase tracking-wider text-sm transition-colors">{driver.license_plate || 'N/A'}</p>
                                                <p className="text-[10px] font-black text-gold-600 dark:text-gold-500 uppercase tracking-widest mt-1 transition-colors">{driver.vehicle_type || 'N/A'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tax / License</p>
                                                <p className="text-xs font-mono text-gray-500 dark:text-gray-300 mt-1 transition-colors">{driver.license_number || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Security Overrides */}
                                    <div className="pt-6 border-t border-white/5">
                                        <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Ban className="w-3.5 h-3.5" />
                                            Security Overrides
                                        </h4>
                                        <div className="bg-rose-500/5 border border-rose-500/10 p-5 rounded-2xl flex flex-col gap-4">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Set Temporary Password</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text"
                                                        value={tempPassword}
                                                        onChange={(e) => setTempPassword(e.target.value)}
                                                        placeholder="e.g. Taxi2026!"
                                                        className="flex-1 bg-gray-50 dark:bg-ink-black-950 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-xs text-ink-black-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-700 focus:outline-none focus:border-rose-500/50 transition-all"
                                                    />
                                                    <button
                                                        onClick={handlePasswordReset}
                                                        disabled={isResetting}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                            resetSuccess 
                                                            ? 'bg-emerald-500 text-white' 
                                                            : 'bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30'
                                                        }`}
                                                    >
                                                        {isResetting ? 'Processing...' : resetSuccess ? 'SUCCESS!' : 'Set & Force Logout'}
                                                    </button>
                                                </div>
                                                <p className="text-[9px] text-gray-600 font-medium leading-relaxed italic">
                                                    * This will immediately invalidate all active sessions for this driver across all devices.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="pt-6 border-t border-white/5">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Commander Context</h4>
                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                onClick={() => {
                                                    onClose();
                                                    // Trigger assign flow - we need to pass this driver to the parent
                                                    if (onUpdate) onUpdate('assign', driver);
                                                }}
                                                className="px-6 py-2.5 bg-gold-500/10 hover:bg-gold-500 text-gold-500 hover:text-white border border-gold-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Assign Tour
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus('available')}
                                                className="px-6 py-2.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Force Online
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus('on_break')}
                                                className="px-6 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-ink-black-950 dark:hover:text-white border border-gray-200 dark:border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Set On Break
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus('offline')}
                                                className="px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-500 hover:text-white border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Kick Offline
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
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest transition-colors">Average Rating</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-4xl font-black text-ink-black-950 dark:text-white transition-colors">
                                                        {formatRating(driver.average_rating)}
                                                    </span>
                                                    <div className="flex">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`w-6 h-6 ${i < Math.round(Number(driver.average_rating) || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest transition-colors">Total Ratings</p>
                                                <p className="text-2xl font-black text-ink-black-950 dark:text-white transition-colors">{driver.total_ratings || 0}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-2xl text-center border border-gray-100 dark:border-white/5 transition-colors">
                                        <Star className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3 transition-colors" />
                                        <p className="text-gray-500 dark:text-gray-500 font-black uppercase tracking-widest text-[10px]">Rating history coming soon</p>
                                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">View detailed ratings from trip history</p>
                                    </div>
                                </div>
                            )}

                            {/* Documents Tab Content */}
                            {activeTab === 'documents' && (
                                <div className="space-y-4">
                                    {documents.length === 0 ? (
                                        <div className="bg-gray-50 dark:bg-white/5 p-12 rounded-2xl text-center border border-gray-100 dark:border-white/5 transition-colors">
                                            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4 transition-colors" />
                                            <p className="text-gray-500 dark:text-gray-500 font-black uppercase tracking-widest text-[10px]">No documents uploaded</p>
                                            <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest font-bold">Driver hasn't uploaded any documents yet</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {documents.map((doc) => (
                                                <div key={doc.document_id} className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 hover:shadow-lg transition-all group">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex gap-3 flex-1">
                                                            <div className="p-2 bg-white dark:bg-ink-black-950 rounded-xl border border-gray-100 dark:border-white/5 transition-colors">
                                                                <FileText className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-gold-500 transition-colors" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="text-[10px] font-black text-ink-black-950 dark:text-white uppercase tracking-widest transition-colors mb-1">
                                                                    {doc.document_type.replace(/_/g, ' ')}
                                                                </h4>
                                                                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 truncate group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors">{doc.file_name}</p>
                                                                <div className="flex items-center gap-3 mt-3 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 transition-colors">
                                                                    <span>Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                                                    {doc.expiry_date && (
                                                                        <span>Expires: {new Date(doc.expiry_date).toLocaleDateString()}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${doc.verification_status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                                                                    doc.verification_status === 'rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
                                                                        doc.verification_status === 'pending' ? 'bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/20' :
                                                                            'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-400 border border-gray-200 dark:border-white/10'
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
                                                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 transition-colors">
                                                            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Commander Notes</p>
                                                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-1 transition-colors">{doc.verification_notes}</p>
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

                <div className="px-6 py-5 bg-gray-50 dark:bg-ink-black-950 text-right border-t border-gray-100 dark:border-white/5 transition-colors">
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-500 hover:text-ink-black-950 dark:hover:text-white transition-all shadow-sm active:scale-95"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DriverDetailsModal;
