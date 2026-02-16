import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    ArrowLeft, MapPin, Clock, User, Phone, Car, FileText, DollarSign, Navigation,
    CheckCircle, XCircle, AlertTriangle, Play, Flag, UserCheck, Eye, ExternalLink
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import SourceBadge from '../components/SourceBadge';
import AssignDriverModal from '../components/AssignDriverModal';

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

export default function BookingDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [booking, setBooking] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [overrideReason, setOverrideReason] = useState('');
    const [showReasonInput, setShowReasonInput] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    useEffect(() => {
        if (id) {
            fetchBookingDetails();
            fetchTimeline();
        }
    }, [id]);

    const fetchBookingDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/bookings/${id}`);
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
            const response = await api.get(`/bookings/${id}/timeline`);
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
            await api.patch(`/bookings/${id}/override`, {
                newStatus,
                reason: overrideReason || 'Admin action'
            });
            toast.success(`Booking status updated to ${newStatus}`);
            fetchBookingDetails();
            fetchTimeline();
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

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="text-center py-20">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Booking Not Found</h2>
                <p className="text-slate-500 mt-2">The booking you're looking for doesn't exist.</p>
                <button
                    onClick={() => navigate('/bookings')}
                    className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors"
                >
                    Back to Bookings
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/bookings')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                #{booking.booking_reference}
                            </h1>
                            <StatusBadge status={booking.status} />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <SourceBadge source={booking.source} partnerName={booking.partner_name} />
                            <span className="text-slate-500 text-sm">
                                Created {formatDate(booking.created_at)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                    {booking.status === 'pending' && (
                        <button
                            onClick={() => setIsAssignModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                        >
                            <UserCheck className="w-4 h-4" />
                            Assign Driver
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Passenger Info Card */}
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <User className="w-4 h-4 text-sky-500" />
                            Passenger Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Name</p>
                                <p className="font-bold text-slate-900 dark:text-white text-lg">
                                    {booking.passenger_name || 'Unknown'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase">Phone</p>
                                <p className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    {booking.passenger_phone || '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Route Card */}
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <MapPin className="w-4 h-4 text-emerald-500" />
                            Route Details
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border-l-4 border-emerald-500">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase">Pickup Location</p>
                                        <p className="text-slate-900 dark:text-white mt-1 font-medium">{booking.pickup_address}</p>
                                    </div>
                                    <a
                                        href={`https://www.google.com/maps?q=${booking.pickup_lat},${booking.pickup_lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                                <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Scheduled: {formatDate(booking.scheduled_pickup_time) || 'ASAP'}
                                </p>
                            </div>

                            {booking.dropoff_address && (
                                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border-l-4 border-red-500">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-xs text-red-600 dark:text-red-400 font-medium uppercase">Dropoff Location</p>
                                            <p className="text-slate-900 dark:text-white mt-1 font-medium">{booking.dropoff_address}</p>
                                        </div>
                                        {booking.dropoff_lat && (
                                            <a
                                                href={`https://www.google.com/maps?q=${booking.dropoff_lat},${booking.dropoff_lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Driver Card */}
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <Car className="w-4 h-4 text-indigo-500" />
                            Assigned Driver
                        </h3>
                        {booking.driver_name ? (
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                                        {booking.driver_name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{booking.driver_name}</p>
                                        <p className="text-sm text-slate-500">{booking.driver_phone}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-900 dark:text-white">{booking.license_plate}</p>
                                    <p className="text-xs text-slate-500 uppercase">{booking.vehicle_type}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No driver assigned yet</p>
                                {booking.status === 'pending' && (
                                    <button
                                        onClick={() => setIsAssignModalOpen(true)}
                                        className="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Assign Driver
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Notes Card */}
                    {(booking.passenger_notes || booking.driver_notes || booking.admin_notes) && (
                        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                                <FileText className="w-4 h-4 text-slate-500" />
                                Notes
                            </h3>
                            <div className="space-y-3">
                                {booking.passenger_notes && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                        <p className="text-xs text-blue-600 font-medium uppercase mb-1">Passenger Notes</p>
                                        <p className="text-slate-700 dark:text-slate-300">{booking.passenger_notes}</p>
                                    </div>
                                )}
                                {booking.driver_notes && (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                                        <p className="text-xs text-indigo-600 font-medium uppercase mb-1">Driver Notes</p>
                                        <p className="text-slate-700 dark:text-slate-300">{booking.driver_notes}</p>
                                    </div>
                                )}
                                {booking.admin_notes && (
                                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                                        <p className="text-xs text-slate-600 font-medium uppercase mb-1">Admin Notes</p>
                                        <p className="text-slate-700 dark:text-slate-300">{booking.admin_notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Pricing Card */}
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                            Pricing
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Estimate</span>
                                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(booking.fare_estimate)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Final Fare</span>
                                <span className="font-bold text-emerald-600 text-lg">{formatCurrency(booking.fare_final)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Waiting Fee</span>
                                <span className="font-medium text-amber-600">{formatCurrency(booking.waiting_fee)}</span>
                            </div>
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Payment</span>
                                    <span className="font-medium text-slate-900 dark:text-white capitalize">
                                        {booking.payment_method?.replace('_', ' ') || '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline Card */}
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <Clock className="w-4 h-4 text-sky-500" />
                            Timeline
                        </h3>
                        {timeline.length === 0 ? (
                            <div className="text-center py-6 text-slate-500 text-sm">
                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p>No timeline events yet</p>
                            </div>
                        ) : (
                            <div className="space-y-0 max-h-80 overflow-y-auto">
                                {timeline.map((event, index) => {
                                    const eventConfig = timelineIcons[event.event_type] || { icon: FileText, color: 'bg-slate-400' };
                                    const IconComponent = eventConfig.icon;
                                    const isLast = index === timeline.length - 1;

                                    return (
                                        <div key={event.id} className="flex gap-3">
                                            <div className="relative flex flex-col items-center">
                                                <div className={`w-6 h-6 rounded-full ${eventConfig.color} flex items-center justify-center z-10`}>
                                                    <IconComponent className="w-3 h-3 text-white" />
                                                </div>
                                                {!isLast && (
                                                    <div className="w-0.5 bg-slate-200 dark:bg-slate-700 flex-1 min-h-[30px]"></div>
                                                )}
                                            </div>
                                            <div className={`flex-1 ${!isLast ? 'pb-4' : ''}`}>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                                                    {event.event_type.replace(/_/g, ' ')}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {formatDate(event.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Actions Card */}
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Admin Actions
                        </h3>
                        {statusActions[booking.status] ? (
                            <div className="space-y-2">
                                {statusActions[booking.status].map(action => (
                                    <button
                                        key={action.action}
                                        onClick={() => handleStatusChange(action.action, action.requiresReason)}
                                        disabled={actionLoading}
                                        className={`w-full px-4 py-2 ${action.color} text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50`}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-4">No actions available</p>
                        )}

                        {showReasonInput && (
                            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <label className="block text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">
                                    Reason (required)
                                </label>
                                <textarea
                                    value={overrideReason}
                                    onChange={(e) => setOverrideReason(e.target.value)}
                                    rows="2"
                                    className="w-full px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm resize-none"
                                    placeholder="Enter reason..."
                                />
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={confirmAction}
                                        disabled={!overrideReason || actionLoading}
                                        className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowReasonInput(false);
                                            setOverrideReason('');
                                            setPendingAction(null);
                                        }}
                                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Assign Driver Modal */}
            <AssignDriverModal
                booking={booking}
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onAssigned={() => {
                    fetchBookingDetails();
                    fetchTimeline();
                }}
            />
        </div>
    );
}
