import React, { useState, useEffect } from 'react';
import {
    X, MapPin, Clock, User, Phone, Car, FileText, DollarSign, Navigation,
    CheckCircle, XCircle, AlertTriangle, Play, Flag, UserCheck, Eye, CreditCard,
    Camera, Shield
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import StatusBadge from './StatusBadge';
import SourceBadge from './SourceBadge';
import { motion, AnimatePresence } from 'framer-motion';

// Timeline event icons
const timelineIcons = {
    booking_created: { icon: FileText, color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10' },
    driver_assigned: { icon: UserCheck, color: 'text-gold-400', bg: 'bg-gold-500/10', border: 'border-gold-500/20' },
    booking_accepted: { icon: CheckCircle, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    driver_arrived: { icon: MapPin, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    waiting_started: { icon: Clock, color: 'text-gold-300', bg: 'bg-gold-500/10', border: 'border-gold-500/20' },
    trip_started: { icon: Play, color: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    trip_completed: { icon: Flag, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    booking_cancelled: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    no_show_requested: { icon: AlertTriangle, color: 'text-gold-400', bg: 'bg-gold-500/10', border: 'border-gold-500/20' },
    no_show_confirmed: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    admin_override: { icon: Eye, color: 'text-gray-500', bg: 'bg-white/5', border: 'border-white/10' },
    driver_rejected: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' }
};

const statusActions = {
    pending: [
        { action: 'cancelled', label: 'Cancel Booking', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20', requiresReason: true }
    ],
    assigned: [
        { action: 'unassign', label: 'Unassign Driver', color: 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10' },
        { action: 'cancelled', label: 'Cancel Booking', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20', requiresReason: true }
    ],
    accepted: [
        { action: 'cancelled', label: 'Cancel Booking', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20', requiresReason: true }
    ],
    arrived: [
        { action: 'started', label: 'Start Trip (Override)', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20' },
        { action: 'cancelled', label: 'Cancel Booking', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20', requiresReason: true }
    ],
    waiting_started: [
        { action: 'started', label: 'Start Trip (Override)', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20' },
        { action: 'no_show_confirmed', label: 'Confirm No-Show', color: 'bg-gold-500/10 text-gold-400 border-gold-500/20 hover:bg-gold-500/20' }
    ],
    started: [
        { action: 'completed', label: 'Complete Trip (Override)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' }
    ],
    no_show_requested: [
        { action: 'no_show_confirmed', label: 'Confirm No-Show', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' },
        { action: 'cancelled', label: 'Reject & Cancel', color: 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10' }
    ],
    rejected: [
        { action: 'reset', label: 'Reset to Pending', color: 'bg-gold-500/10 text-gold-400 border-gold-500/20 hover:bg-gold-500/20' },
        { action: 'cancelled', label: 'Cancel Booking', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20', requiresReason: true }
    ]
};

const BookingDetailsModal = ({ bookingId, isOpen, onClose, onUpdate }) => {
    const [booking, setBooking] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [evidence, setEvidence] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [overrideReason, setOverrideReason] = useState('');
    const [showReasonInput, setShowReasonInput] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [lightboxSrc, setLightboxSrc] = useState(null);

    useEffect(() => {
        if (isOpen && bookingId) {
            fetchBookingDetails();
            fetchTimeline();
        }
    }, [isOpen, bookingId]);

    const fetchBookingDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/bookings/${bookingId}`);
            setBooking(response.data.data);
        } catch (err) {
            console.error('Failed to fetch booking:', err);
            toast.error('Failed to load booking details');
        } finally {
            setLoading(false);
        }
    };

    const fetchTimeline = async () => {
        try {
            const response = await api.get(`/bookings/${bookingId}/timeline`);
            setTimeline(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch timeline:', err);
        }
    };

    const fetchEvidence = async () => {
        try {
            const response = await api.get(`/evidence/booking/${bookingId}`);
            setEvidence(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch evidence:', err);
        }
    };

    const handleStatusChange = async (newStatus, requiresReason = false) => {
        if (requiresReason && !overrideReason) {
            setPendingAction(newStatus);
            setShowReasonInput(true);
            return;
        }

        setActionLoading(true);
        try {
            if (newStatus === 'unassign') {
                await api.patch(`/bookings/${bookingId}/unassign`);
                toast.success(`Driver unassigned successfully`);
            } else if (newStatus === 'reset') {
                await api.patch(`/bookings/${bookingId}/reset`);
                toast.success(`Booking reset to pending`);
            } else {
                await api.patch(`/bookings/${bookingId}/override`, {
                    newStatus,
                    reason: overrideReason || 'Admin action'
                });
                toast.success(`Booking status updated to ${newStatus}`);
            }
            fetchBookingDetails();
            fetchTimeline();
            onUpdate?.();
            setOverrideReason('');
            setShowReasonInput(false);
            setPendingAction(null);
        } catch (err) {
            console.error('Failed to update status:', err);
            toast.error(err.response?.data?.message || 'Failed to update booking');
        } finally {
            setActionLoading(false);
        }
    };

    const confirmAction = () => {
        if (pendingAction) {
            handleStatusChange(pendingAction);
        }
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    if (!isOpen) return null;

    return (
        <>
        <AnimatePresence>
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 transition-opacity backdrop-blur-sm"
                        onClick={onClose}
                    >
                        <div className="absolute inset-0 bg-ink-black-950/80"></div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="inline-block align-bottom bg-white dark:bg-ink-black-900 rounded-2xl text-left overflow-hidden shadow-2xl shadow-ink-black-950/50 transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-gray-100 dark:border-white/10"
                    >
                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500"></div>
                            </div>
                        ) : booking ? (
                            <>
                                {/* Header */}
                                <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-ink-black-900 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-black text-ink-black-950 dark:text-white tracking-tight flex items-center gap-2 transition-colors">
                                                    <span className="text-gold-500">#</span>{booking.booking_reference}
                                                </h3>
                                                <StatusBadge status={booking.status} />
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <SourceBadge source={booking.source} partnerName={booking.partner_name} />
                                                <span className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider transition-colors">
                                                    Created {formatDate(booking.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-950 dark:hover:text-white transition-all p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="border-b border-gray-100 dark:border-white/10 bg-white/50 dark:bg-gray-900/50 transition-colors">
                                    <div className="flex px-4">
                                        {['details', 'timeline', 'actions'].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab
                                                    ? 'border-gold-500 text-gold-500 dark:text-gold-400'
                                                    : 'border-transparent text-gray-500 hover:text-gray-950 dark:hover:text-gray-300'
                                                    }`}
                                            >
                                                {tab} {tab === 'timeline' && `(${timeline.length})`}
                                            </button>
                                        ))}
                                        {['no_show_requested', 'no_show_confirmed'].includes(booking.status) && (
                                            <button
                                                onClick={() => { setActiveTab('evidence'); fetchEvidence(); }}
                                                className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'evidence'
                                                    ? 'border-rose-500 text-rose-500 dark:text-rose-400'
                                                    : 'border-transparent text-gray-500 hover:text-gray-950 dark:hover:text-gray-300'
                                                    }`}
                                            >
                                                <Shield className="w-3 h-3" />
                                                Evidence {evidence.length > 0 && `(${evidence.length})`}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="px-6 py-6 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                                    {activeTab === 'details' && (
                                        <div className="space-y-6">
                                            {/* Passenger Info */}
                                            <div>
                                                <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2 transition-colors">
                                                    <User className="w-3.5 h-3.5 text-gold-500 dark:text-gold-400" />
                                                    Passenger
                                                </h4>
                                                <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4 rounded-xl flex items-center justify-between transition-colors">
                                                    <div>
                                                        <p className="font-bold text-lg text-gray-950 dark:text-white transition-colors">
                                                            {booking.passenger_name || 'Unknown'}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-500 flex items-center gap-2 mt-1 transition-colors">
                                                            <Phone className="w-3 h-3" />
                                                            {booking.passenger_phone || '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Service Details */}
                                            <div>
                                                <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2 transition-colors">
                                                    <Car className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                                                    Service Details
                                                </h4>
                                                <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4 rounded-xl flex flex-wrap gap-8 transition-colors">
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold">Service Level</p>
                                                        <p className="font-bold text-gray-950 dark:text-white capitalize text-sm mt-0.5 transition-colors">
                                                            {booking.service_type?.replace(/_/g, ' ') || 'Standard'}
                                                        </p>
                                                    </div>
                                                    {booking.flight_number && (
                                                        <div>
                                                            <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold">Flight Number</p>
                                                            <p className="font-bold text-gray-950 dark:text-white text-sm mt-0.5 transition-colors">
                                                                {booking.flight_number}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {booking.group_id && (
                                                        <div>
                                                            <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold">Group ID</p>
                                                            <p className="font-mono text-gold-600 dark:text-gold-400 text-sm mt-0.5 transition-colors">
                                                                {booking.group_id}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {booking.passenger_count > 1 && (
                                                        <div>
                                                            <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold">Pax</p>
                                                            <p className="font-bold text-gray-950 dark:text-white text-sm mt-0.5 transition-colors">
                                                                {booking.passenger_count}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {booking.luggage_count > 0 && (
                                                        <div>
                                                            <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold">Luggage</p>
                                                            <p className="font-bold text-gray-950 dark:text-white text-sm mt-0.5 transition-colors">
                                                                {booking.luggage_count}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Locations */}
                                            <div>
                                                <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2 transition-colors">
                                                    <MapPin className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                                                    Route
                                                </h4>
                                                <div className="space-y-3 transition-colors">
                                                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                            <div>
                                                                <p className="text-[10px] text-emerald-500 dark:text-emerald-400/80 font-bold uppercase tracking-wider mb-1 transition-colors">Pickup</p>
                                                                <p className="text-gray-950 dark:text-white font-medium text-sm transition-colors">{booking.pickup_address}</p>
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1 font-mono transition-colors">
                                                                    <Clock className="w-3 h-3" />
                                                                    {formatDate(booking.scheduled_pickup_time) || 'ASAP'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {booking.dropoff_address && (
                                                        <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl">
                                                            <div className="flex items-start gap-3">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                                                                <div>
                                                                    <p className="text-[10px] text-rose-500 dark:text-rose-400/80 font-bold uppercase tracking-wider mb-1 transition-colors">Dropoff</p>
                                                                    <p className="text-gray-950 dark:text-white font-medium text-sm transition-colors">{booking.dropoff_address}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Driver Info */}
                                            {booking.driver_name && (
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2 transition-colors">
                                                        <Car className="w-3.5 h-3.5 text-gold-500 dark:text-gold-400" />
                                                        Assigned Driver
                                                    </h4>
                                                    <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-4 rounded-xl flex justify-between items-center transition-colors">
                                                        <div>
                                                            <p className="font-bold text-gray-950 dark:text-white text-lg transition-colors">{booking.driver_name}</p>
                                                            <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2 mt-1 transition-colors">
                                                                <Phone className="w-3 h-3" />
                                                                {booking.driver_phone}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-mono text-gold-600 dark:text-gold-400 font-bold text-lg transition-colors">{booking.license_plate}</p>
                                                            <p className="text-xs text-gray-400 dark:text-slate-500 uppercase font-bold mt-1 transition-colors">{booking.vehicle_type}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Pricing */}
                                            <div>
                                                <h4 className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2 transition-colors">
                                                    <DollarSign className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                                                    Pricing
                                                </h4>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 transition-colors">
                                                    <div className="bg-gray-50 dark:bg-white/2 border border-gray-100 dark:border-white/5 p-3 rounded-xl text-center transition-colors">
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold mb-1 transition-colors">Estimate</p>
                                                        <p className="font-mono font-bold text-gray-500 dark:text-gray-400 transition-colors">{formatCurrency(booking.fare_estimate)}</p>
                                                    </div>
                                                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                                                        <p className="text-[10px] text-emerald-500 dark:text-emerald-400 uppercase font-bold mb-1 transition-colors">Final</p>
                                                        <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg transition-colors">{formatCurrency(booking.fare_final)}</p>
                                                    </div>
                                                    <div className="bg-gray-50 dark:bg-white/2 border border-gray-100 dark:border-white/5 p-3 rounded-xl text-center transition-colors">
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold mb-1 transition-colors">Waiting</p>
                                                        <p className="font-mono font-bold text-gold-600 dark:text-gold-500 transition-colors">{formatCurrency(booking.waiting_fee)}</p>
                                                    </div>
                                                    <div className="bg-gray-50 dark:bg-white/2 border border-gray-100 dark:border-white/5 p-3 rounded-xl text-center transition-colors">
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold mb-1 transition-colors">Method</p>
                                                        <div className="flex items-center justify-center gap-1.5 text-gray-950 dark:text-white transition-colors">
                                                            <CreditCard className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                                                            <p className="text-xs font-bold capitalize tracking-wide">{booking.payment_method?.replace('_', ' ') || 'Cash'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            {(booking.passenger_notes || booking.driver_notes || booking.admin_notes) && (
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2 transition-colors">
                                                        <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600" />
                                                        Notes
                                                    </h4>
                                                    <div className="space-y-3 transition-colors">
                                                        {booking.passenger_notes && (
                                                            <div className="bg-cyan-500/5 dark:bg-cyan-500/5 border border-cyan-500/10 p-4 rounded-xl text-sm">
                                                                <p className="text-[10px] text-cyan-500 dark:text-cyan-400/80 font-black uppercase tracking-widest mb-2 transition-colors">Passenger Note</p>
                                                                <p className="text-gray-950 dark:text-white leading-relaxed text-sm transition-colors">{booking.passenger_notes}</p>
                                                            </div>
                                                        )}
                                                        {booking.driver_notes && (
                                                            <div className="bg-gold-500/5 dark:bg-gold-500/5 border border-gold-500/10 p-4 rounded-xl text-sm">
                                                                <p className="text-[10px] text-gold-600 dark:text-gold-400/80 font-black uppercase tracking-widest mb-2 transition-colors">Driver Note</p>
                                                                <p className="text-gray-950 dark:text-white leading-relaxed text-sm transition-colors">{booking.driver_notes}</p>
                                                            </div>
                                                        )}
                                                        {booking.admin_notes && (
                                                            <div className="bg-gray-100 dark:bg-white/2 border border-gray-200 dark:border-white/5 p-4 rounded-xl text-sm">
                                                                <p className="text-[10px] text-gray-500 dark:text-gray-500 font-black uppercase tracking-widest mb-2 transition-colors">Admin Note</p>
                                                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-mono text-sm transition-colors">{booking.admin_notes}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'timeline' && (
                                        <div className="relative pl-2 transition-colors">
                                            {timeline.length === 0 ? (
                                                <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                                                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    <p className="text-sm">No timeline events recorded yet</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-0 transition-colors">
                                                    {timeline.map((event, index) => {
                                                        const eventConfig = timelineIcons[event.event_type] || { icon: FileText, color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10' };
                                                        const IconComponent = eventConfig.icon;
                                                        const isLast = index === timeline.length - 1;

                                                        return (
                                                            <div key={event.id} className="flex gap-4">
                                                                <div className="relative flex flex-col items-center">
                                                                    <div className={`w-8 h-8 rounded-full ${eventConfig.bg} ${eventConfig.border} border flex items-center justify-center z-10 shadow-lg transition-all`}>
                                                                        <IconComponent className={`w-4 h-4 ${eventConfig.color}`} />
                                                                    </div>
                                                                    {!isLast && (
                                                                        <div className="w-0.5 bg-gray-100 dark:bg-white/10 flex-1 min-h-[40px] my-1 transition-colors"></div>
                                                                    )}
                                                                </div>
                                                                <div className={`flex-1 ${!isLast ? 'pb-8' : ''} transition-colors`}>
                                                                    <p className="font-bold text-gray-950 dark:text-white capitalize text-sm transition-colors">
                                                                        {event.event_type.replace(/_/g, ' ')}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1 font-mono transition-colors">
                                                                        {formatDate(event.created_at)}
                                                                        {event.actor_type && (
                                                                            <span className="ml-2 text-gray-500 dark:text-slate-600 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded transition-colors">
                                                                                {event.actor_type}
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                    {event.details && typeof event.details === 'object' && Object.keys(event.details).length > 0 && (
                                                                        <div className="mt-3 text-xs bg-gray-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 p-3 rounded-lg font-mono text-gray-500 dark:text-slate-400 whitespace-pre-wrap transition-colors">
                                                                            {JSON.stringify(event.details, null, 2).replace(/[{}"]/g, '')}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'evidence' && (
                                        <div className="space-y-5">
                                            <div className="flex items-center gap-3 p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                                                <Shield className="w-5 h-5 text-rose-400 shrink-0" />
                                                <div>
                                                    <p className="text-xs font-black text-rose-400 uppercase tracking-widest">No-Show Evidence Package</p>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                                        Photos submitted by the driver as proof of attendance. GPS coordinates and timestamps are burned into each image.
                                                    </p>
                                                </div>
                                            </div>

                                            {evidence.length === 0 ? (
                                                <div className="text-center py-12 text-gray-500">
                                                    <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    <p className="text-sm">No evidence photos uploaded yet.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {evidence.map((item) => (
                                                        <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                                                            <div
                                                                className="relative cursor-pointer group"
                                                                onClick={() => setLightboxSrc(item.file_url)}
                                                            >
                                                                <img
                                                                    src={item.file_url}
                                                                    alt={item.asset_type}
                                                                    className="w-full object-cover max-h-64 group-hover:opacity-80 transition-opacity"
                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Eye className="w-8 h-8 text-white drop-shadow-lg" />
                                                                </div>
                                                            </div>
                                                            <div className="px-4 py-3 space-y-1.5">
                                                                <div className="flex items-center justify-between">
                                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${item.asset_type === 'pickup_photo' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20'}`}>
                                                                        {item.asset_type.replace(/_/g, ' ')}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-500 font-mono">#{item.id}</span>
                                                                </div>
                                                                <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {new Date(item.captured_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                                </p>
                                                                {item.gps_lat && (
                                                                    <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                                                                        <MapPin className="w-3 h-3 text-gold-500" />
                                                                        {parseFloat(item.gps_lat).toFixed(6)}, {parseFloat(item.gps_lng).toFixed(6)}
                                                                        {item.gps_accuracy_m && <span className="text-gray-600 ml-1">±{Math.round(item.gps_accuracy_m)}m</span>}
                                                                    </p>
                                                                )}
                                                                {item.pickup_label && (
                                                                    <p className="text-[10px] text-gray-500 leading-snug">{item.pickup_label}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'actions' && (
                                        <div className="space-y-6">
                                            {/* Status Override Actions */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                                    Status Actions
                                                </h4>
                                                {statusActions[booking.status] ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {statusActions[booking.status].map(action => (
                                                            <button
                                                                key={action.action}
                                                                onClick={() => handleStatusChange(action.action, action.requiresReason)}
                                                                disabled={actionLoading}
                                                                className={`px-4 py-3 border rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex-1 min-w-[200px] ${action.color}`}
                                                            >
                                                                {action.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-500 italic">No manual actions available for this status</p>
                                                )}
                                            </div>

                                            {/* Reason Input */}
                                            <AnimatePresence>
                                                {showReasonInput && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="bg-gold-500/10 p-5 rounded-xl border border-gold-500/20 shadow-[0_0_20px_rgba(255,215,0,0.05)] transition-colors">
                                                            <label className="block text-[10px] font-black text-gold-600 dark:text-gold-500 mb-2 uppercase tracking-widest transition-colors">
                                                                Reason for action (required)
                                                            </label>
                                                            <textarea
                                                                value={overrideReason}
                                                                onChange={(e) => setOverrideReason(e.target.value)}
                                                                rows="3"
                                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gold-500/20 rounded-lg bg-white dark:bg-gray-950 text-gray-950 dark:text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 transition-all resize-none text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                                                placeholder="Enter a detailed reason for this override..."
                                                            />
                                                            <div className="flex gap-3 mt-4">
                                                                <button
                                                                    onClick={confirmAction}
                                                                    disabled={!overrideReason || actionLoading}
                                                                    className="px-6 py-2 bg-gold-500 hover:bg-gold-400 text-gray-950 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gold-500/20 transition-all disabled:opacity-50 active:scale-95"
                                                                >
                                                                    Confirm Action
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setShowReasonInput(false);
                                                                        setOverrideReason('');
                                                                        setPendingAction(null);
                                                                    }}
                                                                    className="px-6 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Warning */}
                                            <div className="bg-rose-500/5 border border-rose-500/10 p-5 rounded-xl transition-colors">
                                                <div className="flex items-start gap-4">
                                                    <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
                                                    <div className="text-sm">
                                                        <p className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide text-xs mb-1 transition-colors">Admin Override Warning</p>
                                                        <p className="text-gray-500 dark:text-slate-400 leading-relaxed transition-colors">
                                                            Forcing state changes bypasses the standard booking flow checks. All overrides are permanently logged for security auditing.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-white/5 flex justify-end transition-colors">
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2.5 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-950 dark:hover:text-white transition-all active:scale-95"
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-20 text-slate-500">
                                <p>Booking not found</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>

        {/* Lightbox */}

        {lightboxSrc && (
            <div
                className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
                onClick={() => setLightboxSrc(null)}
            >
                <img
                    src={lightboxSrc}
                    alt="Evidence"
                    className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
                />
                <button
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                    onClick={() => setLightboxSrc(null)}
                >
                    <X className="w-6 h-6 text-white" />
                </button>
            </div>
        )}
        </>
    );
};

export default BookingDetailsModal;
