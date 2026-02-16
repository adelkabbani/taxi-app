import React, { useState, useEffect } from 'react';
import {
    X, MapPin, Clock, User, Phone, Car, FileText, DollarSign, Navigation,
    CheckCircle, XCircle, AlertTriangle, Play, Flag, UserCheck, Eye
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import StatusBadge from './StatusBadge';
import SourceBadge from './SourceBadge';

// Timeline event icons
const timelineIcons = {
    booking_created: { icon: FileText, color: 'bg-blue-500' },
    driver_assigned: { icon: UserCheck, color: 'bg-indigo-500' },
    booking_accepted: { icon: CheckCircle, color: 'bg-emerald-500' },
    driver_arrived: { icon: MapPin, color: 'bg-purple-500' },
    waiting_started: { icon: Clock, color: 'bg-orange-500' },
    trip_started: { icon: Play, color: 'bg-sky-500' },
    trip_completed: { icon: Flag, color: 'bg-emerald-600' },
    booking_cancelled: { icon: XCircle, color: 'bg-red-500' },
    no_show_requested: { icon: AlertTriangle, color: 'bg-amber-500' },
    no_show_confirmed: { icon: AlertTriangle, color: 'bg-red-600' },
    admin_override: { icon: Eye, color: 'bg-slate-500' }
};

const statusActions = {
    pending: [
        { action: 'cancelled', label: 'Cancel Booking', color: 'bg-red-500 hover:bg-red-600', requiresReason: true }
    ],
    assigned: [
        { action: 'pending', label: 'Unassign Driver', color: 'bg-slate-500 hover:bg-slate-600' },
        { action: 'cancelled', label: 'Cancel Booking', color: 'bg-red-500 hover:bg-red-600', requiresReason: true }
    ],
    accepted: [
        { action: 'cancelled', label: 'Cancel Booking', color: 'bg-red-500 hover:bg-red-600', requiresReason: true }
    ],
    arrived: [
        { action: 'started', label: 'Start Trip (Override)', color: 'bg-sky-500 hover:bg-sky-600' },
        { action: 'cancelled', label: 'Cancel Booking', color: 'bg-red-500 hover:bg-red-600', requiresReason: true }
    ],
    waiting_started: [
        { action: 'started', label: 'Start Trip (Override)', color: 'bg-sky-500 hover:bg-sky-600' },
        { action: 'no_show_confirmed', label: 'Confirm No-Show', color: 'bg-amber-500 hover:bg-amber-600' }
    ],
    started: [
        { action: 'completed', label: 'Complete Trip (Override)', color: 'bg-emerald-500 hover:bg-emerald-600' }
    ],
    no_show_requested: [
        { action: 'no_show_confirmed', label: 'Confirm No-Show', color: 'bg-red-500 hover:bg-red-600' },
        { action: 'cancelled', label: 'Reject & Cancel', color: 'bg-slate-500 hover:bg-slate-600' }
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-slate-900 opacity-75"></div>
                </div>

                <div className="inline-block align-bottom bg-white dark:bg-dark-card rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-slate-200 dark:border-slate-800">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div>
                        </div>
                    ) : booking ? (
                        <>
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-800 to-slate-900">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-white">
                                                #{booking.booking_reference}
                                            </h3>
                                            <StatusBadge status={booking.status} />
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <SourceBadge source={booking.source} partnerName={booking.partner_name} />
                                            <span className="text-slate-400 text-sm">
                                                Created {formatDate(booking.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="border-b border-slate-200 dark:border-slate-700">
                                <div className="flex">
                                    <button
                                        onClick={() => setActiveTab('details')}
                                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details'
                                            ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                                            : 'border-transparent text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        Details
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('timeline')}
                                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timeline'
                                            ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                                            : 'border-transparent text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        Timeline ({timeline.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('actions')}
                                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'actions'
                                            ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                                            : 'border-transparent text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        Actions
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-6 py-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                                {activeTab === 'details' && (
                                    <div className="space-y-6">
                                        {/* Passenger Info */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                                <User className="w-4 h-4 text-sky-500" />
                                                Passenger
                                            </h4>
                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                                <p className="font-bold text-slate-900 dark:text-white">
                                                    {booking.passenger_name || 'Unknown'}
                                                </p>
                                                <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                                    <Phone className="w-3 h-3" />
                                                    {booking.passenger_phone || '-'}
                                                </p>
                                            </div>
                                        </div>


                                        {/* Service Details */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                                <Car className="w-4 h-4 text-sky-500" />
                                                Service Details
                                            </h4>
                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg flex flex-wrap gap-8">
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase">Service Level</p>
                                                    <p className="font-bold text-slate-900 dark:text-white capitalize">
                                                        {booking.service_type?.replace(/_/g, ' ') || 'Standard'}
                                                    </p>
                                                </div>
                                                {booking.flight_number && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase">Flight Number</p>
                                                        <p className="font-bold text-slate-900 dark:text-white">
                                                            {booking.flight_number}
                                                        </p>
                                                    </div>
                                                )}
                                                {booking.group_id && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase">Group ID</p>
                                                        <p className="font-mono text-slate-900 dark:text-white text-sm">
                                                            {booking.group_id}
                                                        </p>
                                                    </div>
                                                )}
                                                {booking.passenger_count > 1 && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase">Passengers</p>
                                                        <p className="font-bold text-slate-900 dark:text-white">
                                                            {booking.passenger_count}
                                                        </p>
                                                    </div>
                                                )}
                                                {booking.luggage_count > 0 && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase">Luggage</p>
                                                        <p className="font-bold text-slate-900 dark:text-white">
                                                            {booking.luggage_count}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Locations */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-emerald-500" />
                                                Route
                                            </h4>
                                            <div className="space-y-3">
                                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border-l-4 border-emerald-500">
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase">Pickup</p>
                                                    <p className="text-slate-900 dark:text-white mt-1">{booking.pickup_address}</p>
                                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(booking.scheduled_pickup_time) || 'ASAP'}
                                                    </p>
                                                </div>
                                                {booking.dropoff_address && (
                                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border-l-4 border-red-500">
                                                        <p className="text-xs text-red-600 dark:text-red-400 font-medium uppercase">Dropoff</p>
                                                        <p className="text-slate-900 dark:text-white mt-1">{booking.dropoff_address}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Driver Info */}
                                        {booking.driver_name && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                                    <Car className="w-4 h-4 text-indigo-500" />
                                                    Assigned Driver
                                                </h4>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">{booking.driver_name}</p>
                                                        <p className="text-sm text-slate-500">{booking.driver_phone}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-slate-900 dark:text-white">{booking.license_plate}</p>
                                                        <p className="text-xs text-slate-500 uppercase">{booking.vehicle_type}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Pricing */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                                Pricing
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-center">
                                                    <p className="text-xs text-slate-500 uppercase">Estimate</p>
                                                    <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(booking.fare_estimate)}</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-center">
                                                    <p className="text-xs text-slate-500 uppercase">Final</p>
                                                    <p className="font-bold text-emerald-600">{formatCurrency(booking.fare_final)}</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-center">
                                                    <p className="text-xs text-slate-500 uppercase">Waiting</p>
                                                    <p className="font-bold text-amber-600">{formatCurrency(booking.waiting_fee)}</p>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-center">
                                                    <p className="text-xs text-slate-500 uppercase">Payment</p>
                                                    <p className="font-bold text-slate-900 dark:text-white capitalize">{booking.payment_method?.replace('_', ' ') || '-'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        {(booking.passenger_notes || booking.driver_notes || booking.admin_notes) && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-slate-500" />
                                                    Notes
                                                </h4>
                                                <div className="space-y-2">
                                                    {booking.passenger_notes && (
                                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                                                            <p className="text-xs text-blue-600 font-medium mb-1">Passenger</p>
                                                            <p className="text-slate-700 dark:text-slate-300">{booking.passenger_notes}</p>
                                                        </div>
                                                    )}
                                                    {booking.driver_notes && (
                                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg text-sm">
                                                            <p className="text-xs text-indigo-600 font-medium mb-1">Driver</p>
                                                            <p className="text-slate-700 dark:text-slate-300">{booking.driver_notes}</p>
                                                        </div>
                                                    )}
                                                    {booking.admin_notes && (
                                                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-sm">
                                                            <p className="text-xs text-slate-600 font-medium mb-1">Admin</p>
                                                            <p className="text-slate-700 dark:text-slate-300">{booking.admin_notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'timeline' && (
                                    <div className="relative">
                                        {timeline.length === 0 ? (
                                            <div className="text-center py-12 text-slate-500">
                                                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                <p>No timeline events yet</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-0">
                                                {timeline.map((event, index) => {
                                                    const eventConfig = timelineIcons[event.event_type] || { icon: FileText, color: 'bg-slate-400' };
                                                    const IconComponent = eventConfig.icon;
                                                    const isLast = index === timeline.length - 1;

                                                    return (
                                                        <div key={event.id} className="flex gap-4">
                                                            <div className="relative flex flex-col items-center">
                                                                <div className={`w-8 h-8 rounded-full ${eventConfig.color} flex items-center justify-center z-10`}>
                                                                    <IconComponent className="w-4 h-4 text-white" />
                                                                </div>
                                                                {!isLast && (
                                                                    <div className="w-0.5 bg-slate-200 dark:bg-slate-700 flex-1 min-h-[40px]"></div>
                                                                )}
                                                            </div>
                                                            <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
                                                                <p className="font-medium text-slate-900 dark:text-white capitalize">
                                                                    {event.event_type.replace(/_/g, ' ')}
                                                                </p>
                                                                <p className="text-xs text-slate-500 mt-0.5">
                                                                    {formatDate(event.created_at)}
                                                                    {event.actor_type && (
                                                                        <span className="ml-2 text-slate-400">
                                                                            by {event.actor_type}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                {event.details && typeof event.details === 'object' && Object.keys(event.details).length > 0 && (
                                                                    <div className="mt-2 text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded font-mono text-slate-600 dark:text-slate-400">
                                                                        {JSON.stringify(event.details, null, 2)}
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
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                                                Status Actions
                                            </h4>
                                            {statusActions[booking.status] ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {statusActions[booking.status].map(action => (
                                                        <button
                                                            key={action.action}
                                                            onClick={() => handleStatusChange(action.action, action.requiresReason)}
                                                            disabled={actionLoading}
                                                            className={`px-4 py-2 ${action.color} text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50`}
                                                        >
                                                            {action.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-500">No actions available for this status</p>
                                            )}
                                        </div>

                                        {/* Reason Input */}
                                        {showReasonInput && (
                                            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                                                <label className="block text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                                                    Reason for action (required)
                                                </label>
                                                <textarea
                                                    value={overrideReason}
                                                    onChange={(e) => setOverrideReason(e.target.value)}
                                                    rows="2"
                                                    className="w-full px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-sm"
                                                    placeholder="Enter reason for this action..."
                                                />
                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={confirmAction}
                                                        disabled={!overrideReason || actionLoading}
                                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowReasonInput(false);
                                                            setOverrideReason('');
                                                            setPendingAction(null);
                                                        }}
                                                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Warning */}
                                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                                    <p className="font-medium text-slate-900 dark:text-white">Admin Override Warning</p>
                                                    <p className="mt-1">
                                                        Status changes bypass normal state machine validations. All overrides are logged for audit purposes
                                                        and may affect driver metrics.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
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
                </div>
            </div>
        </div >
    );
};

export default BookingDetailsModal;
