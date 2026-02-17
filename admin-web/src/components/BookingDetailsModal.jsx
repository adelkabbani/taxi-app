import React, { useState, useEffect } from 'react';
import {
    X, MapPin, Clock, User, Phone, Car, FileText, DollarSign, Navigation,
    CheckCircle, XCircle, AlertTriangle, Play, Flag, UserCheck, Eye, CreditCard
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import StatusBadge from './StatusBadge';
import SourceBadge from './SourceBadge';
import { motion, AnimatePresence } from 'framer-motion';

// Timeline event icons
const timelineIcons = {
    booking_created: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    driver_assigned: { icon: UserCheck, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    booking_accepted: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    driver_arrived: { icon: MapPin, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    waiting_started: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    trip_started: { icon: Play, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    trip_completed: { icon: Flag, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    booking_cancelled: { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    no_show_requested: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    no_show_confirmed: { icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    admin_override: { icon: Eye, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' }
};

const statusActions = {
    pending: [
        { action: 'cancelled', label: 'Cancel Booking', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20', requiresReason: true }
    ],
    assigned: [
        { action: 'pending', label: 'Unassign Driver', color: 'bg-slate-500/10 text-slate-300 border-slate-500/20 hover:bg-slate-500/20' },
        { action: 'cancelled', label: 'Cancel Booking', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20', requiresReason: true }
    ],
    accepted: [
        { action: 'cancelled', label: 'Cancel Booking', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20', requiresReason: true }
    ],
    arrived: [
        { action: 'started', label: 'Start Trip (Override)', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20' },
        { action: 'cancelled', label: 'Cancel Booking', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20', requiresReason: true }
    ],
    waiting_started: [
        { action: 'started', label: 'Start Trip (Override)', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20' },
        { action: 'no_show_confirmed', label: 'Confirm No-Show', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' }
    ],
    started: [
        { action: 'completed', label: 'Complete Trip (Override)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' }
    ],
    no_show_requested: [
        { action: 'no_show_confirmed', label: 'Confirm No-Show', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' },
        { action: 'cancelled', label: 'Reject & Cancel', color: 'bg-slate-500/10 text-slate-300 border-slate-500/20 hover:bg-slate-500/20' }
    ]
};

const BookingDetailsModal = ({ bookingId, isOpen, onClose, onUpdate }) => {
    const [booking, setBooking] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [overrideReason, setOverrideReason] = useState('');
    const [showReasonInput, setShowReasonInput] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

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

    const handleStatusChange = async (newStatus, requiresReason = false) => {
        if (requiresReason && !overrideReason) {
            setPendingAction(newStatus);
            setShowReasonInput(true);
            return;
        }

        setActionLoading(true);
        try {
            await api.patch(`/bookings/${bookingId}/override`, {
                newStatus,
                reason: overrideReason || 'Admin action'
            });
            toast.success(`Booking status updated to ${newStatus}`);
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
                        <div className="absolute inset-0 bg-obsidian-950/80"></div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="inline-block align-bottom glass-panel rounded-2xl text-left overflow-hidden shadow-2xl shadow-obsidian-950/50 transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-white/10"
                    >
                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500"></div>
                            </div>
                        ) : booking ? (
                            <>
                                {/* Header */}
                                <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-obsidian-900 to-obsidian-800">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                                    <span className="text-gold-500">#</span>{booking.booking_reference}
                                                </h3>
                                                <StatusBadge status={booking.status} />
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <SourceBadge source={booking.source} partnerName={booking.partner_name} />
                                                <span className="text-slate-400 text-xs font-medium">
                                                    Created {formatDate(booking.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
                                            <X className="h-6 w-6" />
                                        </button>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="border-b border-white/10 bg-obsidian-900/50">
                                    <div className="flex px-4">
                                        {['details', 'timeline', 'actions'].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`px-6 py-4 text-sm font-bold border-b-2 transition-all capitalize ${activeTab === tab
                                                    ? 'border-gold-500 text-gold-400'
                                                    : 'border-transparent text-slate-500 hover:text-slate-300'
                                                    }`}
                                            >
                                                {tab} {tab === 'timeline' && `(${timeline.length})`}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="px-6 py-6 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                                    {activeTab === 'details' && (
                                        <div className="space-y-6">
                                            {/* Passenger Info */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <User className="w-4 h-4 text-gold-500" />
                                                    Passenger
                                                </h4>
                                                <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                                                    <div>
                                                        <p className="font-bold text-lg text-white">
                                                            {booking.passenger_name || 'Unknown'}
                                                        </p>
                                                        <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                                                            <Phone className="w-3 h-3" />
                                                            {booking.passenger_phone || '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Service Details */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <Car className="w-4 h-4 text-sky-500" />
                                                    Service Details
                                                </h4>
                                                <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-wrap gap-8">
                                                    <div>
                                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Service Level</p>
                                                        <p className="font-bold text-white capitalize text-sm mt-0.5">
                                                            {booking.service_type?.replace(/_/g, ' ') || 'Standard'}
                                                        </p>
                                                    </div>
                                                    {booking.flight_number && (
                                                        <div>
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Flight Number</p>
                                                            <p className="font-bold text-white text-sm mt-0.5">
                                                                {booking.flight_number}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {booking.group_id && (
                                                        <div>
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Group ID</p>
                                                            <p className="font-mono text-gold-400 text-sm mt-0.5">
                                                                {booking.group_id}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {booking.passenger_count > 1 && (
                                                        <div>
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Pax</p>
                                                            <p className="font-bold text-white text-sm mt-0.5">
                                                                {booking.passenger_count}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {booking.luggage_count > 0 && (
                                                        <div>
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Luggage</p>
                                                            <p className="font-bold text-white text-sm mt-0.5">
                                                                {booking.luggage_count}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Locations */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-emerald-500" />
                                                    Route
                                                </h4>
                                                <div className="space-y-3">
                                                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                                            <div>
                                                                <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">Pickup</p>
                                                                <p className="text-white font-medium">{booking.pickup_address}</p>
                                                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-mono">
                                                                    <Clock className="w-3 h-3" />
                                                                    {formatDate(booking.scheduled_pickup_time) || 'ASAP'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {booking.dropoff_address && (
                                                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
                                                            <div className="flex items-start gap-3">
                                                                <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
                                                                <div>
                                                                    <p className="text-xs text-rose-400 font-bold uppercase tracking-wider mb-1">Dropoff</p>
                                                                    <p className="text-white font-medium">{booking.dropoff_address}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Driver Info */}
                                            {booking.driver_name && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <Car className="w-4 h-4 text-indigo-400" />
                                                        Assigned Driver
                                                    </h4>
                                                    <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex justify-between items-center">
                                                        <div>
                                                            <p className="font-bold text-white text-lg">{booking.driver_name}</p>
                                                            <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                                                                <Phone className="w-3 h-3" />
                                                                {booking.driver_phone}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-mono text-gold-400 font-bold text-lg">{booking.license_plate}</p>
                                                            <p className="text-xs text-slate-500 uppercase font-bold mt-1">{booking.vehicle_type}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Pricing */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                                    Pricing
                                                </h4>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    <div className="bg-white/5 border border-white/5 p-3 rounded-xl text-center">
                                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Estimate</p>
                                                        <p className="font-mono font-bold text-slate-300">{formatCurrency(booking.fare_estimate)}</p>
                                                    </div>
                                                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center">
                                                        <p className="text-[10px] text-emerald-400 uppercase font-bold mb-1">Final</p>
                                                        <p className="font-mono font-bold text-emerald-400 text-lg">{formatCurrency(booking.fare_final)}</p>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/5 p-3 rounded-xl text-center">
                                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Waiting</p>
                                                        <p className="font-mono font-bold text-amber-500">{formatCurrency(booking.waiting_fee)}</p>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/5 p-3 rounded-xl text-center">
                                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Method</p>
                                                        <div className="flex items-center justify-center gap-1.5 text-white">
                                                            <CreditCard className="w-3 h-3 text-slate-400" />
                                                            <p className="text-sm font-bold capitalize">{booking.payment_method?.replace('_', ' ') || 'Cash'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            {(booking.passenger_notes || booking.driver_notes || booking.admin_notes) && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-slate-500" />
                                                        Notes
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {booking.passenger_notes && (
                                                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-sm">
                                                                <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-2">Passenger Note</p>
                                                                <p className="text-white leading-relaxed">{booking.passenger_notes}</p>
                                                            </div>
                                                        )}
                                                        {booking.driver_notes && (
                                                            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-sm">
                                                                <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-2">Driver Note</p>
                                                                <p className="text-white leading-relaxed">{booking.driver_notes}</p>
                                                            </div>
                                                        )}
                                                        {booking.admin_notes && (
                                                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm">
                                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Admin Note</p>
                                                                <p className="text-slate-200 leading-relaxed font-mono">{booking.admin_notes}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'timeline' && (
                                        <div className="relative pl-2">
                                            {timeline.length === 0 ? (
                                                <div className="text-center py-12 text-slate-500">
                                                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    <p>No timeline events yet</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-0">
                                                    {timeline.map((event, index) => {
                                                        const eventConfig = timelineIcons[event.event_type] || { icon: FileText, color: 'text-slate-400', bg: 'bg-white/5', border: 'border-white/10' };
                                                        const IconComponent = eventConfig.icon;
                                                        const isLast = index === timeline.length - 1;

                                                        return (
                                                            <div key={event.id} className="flex gap-4">
                                                                <div className="relative flex flex-col items-center">
                                                                    <div className={`w-8 h-8 rounded-full ${eventConfig.bg} ${eventConfig.border} border flex items-center justify-center z-10 shadow-lg`}>
                                                                        <IconComponent className={`w-4 h-4 ${eventConfig.color}`} />
                                                                    </div>
                                                                    {!isLast && (
                                                                        <div className="w-0.5 bg-white/10 flex-1 min-h-[40px] my-1"></div>
                                                                    )}
                                                                </div>
                                                                <div className={`flex-1 ${!isLast ? 'pb-8' : ''}`}>
                                                                    <p className="font-bold text-white capitalize text-sm">
                                                                        {event.event_type.replace(/_/g, ' ')}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500 mt-1 font-mono">
                                                                        {formatDate(event.created_at)}
                                                                        {event.actor_type && (
                                                                            <span className="ml-2 text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">
                                                                                {event.actor_type}
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                    {event.details && typeof event.details === 'object' && Object.keys(event.details).length > 0 && (
                                                                        <div className="mt-3 text-xs bg-black/30 border border-white/5 p-3 rounded-lg font-mono text-slate-400 whitespace-pre-wrap">
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
                                                        <div className="bg-amber-500/10 p-5 rounded-xl border border-amber-500/20">
                                                            <label className="block text-sm font-bold text-amber-500 mb-2">
                                                                Reason for action (required)
                                                            </label>
                                                            <textarea
                                                                value={overrideReason}
                                                                onChange={(e) => setOverrideReason(e.target.value)}
                                                                rows="3"
                                                                className="w-full px-4 py-3 border border-amber-500/30 rounded-lg bg-black/40 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none text-sm placeholder:text-slate-600"
                                                                placeholder="Enter a detailed reason for this override..."
                                                            />
                                                            <div className="flex gap-3 mt-4">
                                                                <button
                                                                    onClick={confirmAction}
                                                                    disabled={!overrideReason || actionLoading}
                                                                    className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-obsidian-950 rounded-lg text-sm font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                                                                >
                                                                    Confirm Action
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setShowReasonInput(false);
                                                                        setOverrideReason('');
                                                                        setPendingAction(null);
                                                                    }}
                                                                    className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm font-bold transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Warning */}
                                            <div className="bg-rose-500/5 border border-rose-500/10 p-5 rounded-xl">
                                                <div className="flex items-start gap-4">
                                                    <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
                                                    <div className="text-sm">
                                                        <p className="font-bold text-rose-400 uppercase tracking-wide text-xs mb-1">Admin Override Warning</p>
                                                        <p className="text-slate-400 leading-relaxed">
                                                            Forcing state changes bypasses the standard booking flow checks. All overrides are permanently logged for security auditing.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 bg-obsidian-950 border-t border-white/5 flex justify-end">
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-slate-300 hover:text-white transition-all"
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
    );
};

export default BookingDetailsModal;
