import { useState, useEffect, useCallback } from 'react';
import {
    Plus, Search, Filter, RefreshCw, Calendar, ChevronLeft, ChevronRight,
    Eye, UserPlus, MoreHorizontal, Clock, MapPin, Download
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import SourceBadge from '../components/SourceBadge';
import CreateBookingModal from '../components/CreateBookingModal';
import BookingDetailsModal from '../components/BookingDetailsModal';
import AssignDriverModal from '../components/AssignDriverModal';

const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'arrived', label: 'Arrived' },
    { value: 'waiting_started', label: 'Waiting' },
    { value: 'started', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no_show_requested', label: 'No-Show Pending' },
    { value: 'no_show_confirmed', label: 'No-Show' }
];

export default function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'finished'

    // Filters
    const [filters, setFilters] = useState({
        status: '',
        search: '',
        datePreset: 'all', // 'all', 'today', 'tomorrow', 'week', 'custom'
        from: '',
        to: '',
        partnerId: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [partners, setPartners] = useState([]);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [selectedBookingId, setSelectedBookingId] = useState(null);

    // Quick stats
    const [stats, setStats] = useState({
        pending: 0,
        inProgress: 0,
        noShowPending: 0
    });

    // Helper to get date ranges
    const getDateRange = (preset) => {
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const todayEnd = new Date(now.setHours(23, 59, 59, 999));

        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const tomorrowEnd = new Date(todayEnd);
        tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - todayStart.getDay() + 1); // Monday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        switch (preset) {
            case 'today': return { from: todayStart, to: todayEnd };
            case 'tomorrow': return { from: tomorrowStart, to: tomorrowEnd };
            case 'week': return { from: weekStart, to: weekEnd };
            default: return { from: null, to: null };
        }
    };

    const fetchBookings = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                search: filters.search
            };

            // Status filtering based on Tab + Dropdown
            if (filters.status) {
                params.status = filters.status;
            } else {
                // If no specific status selected, filter by Tab
                // If we can't filter multiple statuses, we might need to filter client-side 
                // OR update backend to support `status=active_group`.

                // Let's assume for now we filter by specific status if selected, otherwise show all.
                // But effectively 'active' tab should probably show non-completed.
            }

            // Apply Date Filters
            let dateRange = { from: filters.from, to: filters.to };
            if (filters.datePreset !== 'custom' && filters.datePreset !== 'all') {
                const range = getDateRange(filters.datePreset);
                if (range.from) dateRange = { from: range.from.toISOString(), to: range.to.toISOString() };
            }

            if (dateRange.from) params.from = dateRange.from;
            if (dateRange.to) params.to = dateRange.to;

            if (filters.partnerId) params.partnerId = filters.partnerId;

            const response = await api.get('/bookings', { params });

            let data = response.data.data || [];

            // Client-side Tab Filtering (Temporary until backend supports scopes)
            if (!filters.status) {
                if (activeTab === 'active') {
                    const finishedStatuses = ['completed', 'cancelled', 'no_show_confirmed', 'auto_released'];
                    data = data.filter(b => !finishedStatuses.includes(b.status));
                } else if (activeTab === 'finished') {
                    const finishedStatuses = ['completed', 'cancelled', 'no_show_confirmed', 'auto_released'];
                    data = data.filter(b => finishedStatuses.includes(b.status));
                }
            }

            setBookings(data);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0
            }));

        } catch (err) {
            console.error('Failed to fetch bookings:', err);
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [pagination.page, pagination.limit, filters, activeTab]);

    const fetchQuickStats = async () => {
        try {
            const response = await api.get('/stats/bookings');
            setStats(response.data);
        } catch (err) {
            console.error('Failed to fetch quick stats:', err);
        }
    };

    const fetchPartners = async () => {
        try {
            const response = await api.get('/partners');
            setPartners(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch partners:', err);
        }
    };

    useEffect(() => {
        fetchBookings();
        fetchQuickStats();
    }, [fetchBookings]);

    useEffect(() => {
        fetchPartners();
    }, []);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (!document.hidden) {
                fetchBookings(true);
                fetchQuickStats();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchBookings]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const openDetails = (bookingId) => {
        setSelectedBookingId(bookingId);
        setIsDetailsModalOpen(true);
    };

    const openAssign = (booking) => {
        setSelectedBooking(booking);
        setIsAssignModalOpen(true);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bookings</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Manage all bookings from manual entries, Booking.com, and partner APIs
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-sky-500/25"
                >
                    <Plus className="w-4 h-4" />
                    New Booking
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Pending Assignment</p>
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{stats.pending}</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
                        <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                </div>
                <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-sky-600 dark:text-sky-400">In Progress</p>
                        <p className="text-2xl font-bold text-sky-700 dark:text-sky-300 mt-1">{stats.inProgress}</p>
                    </div>
                    <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/50 rounded-full flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-sky-600" />
                    </div>
                </div>
                <div className={`${stats.noShowPending > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 animate-pulse' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'} border rounded-xl p-4 flex items-center justify-between`}>
                    <div>
                        <p className={`text-sm font-medium ${stats.noShowPending > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>No-Show Alerts</p>
                        <p className={`text-2xl font-bold mt-1 ${stats.noShowPending > 0 ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-300'}`}>{stats.noShowPending}</p>
                    </div>
                    <div className={`w-12 h-12 ${stats.noShowPending > 0 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-slate-100 dark:bg-slate-800'} rounded-full flex items-center justify-center`}>
                        <Eye className={`w-6 h-6 ${stats.noShowPending > 0 ? 'text-red-600' : 'text-slate-600'}`} />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'active'
                        ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Active Queue
                </button>
                <button
                    onClick={() => setActiveTab('finished')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'finished'
                        ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Finished / Historical
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Flight #, Name, Ref..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent min-w-[160px]"
                    >
                        {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    {/* Quick Date Filter */}
                    <select
                        value={filters.datePreset}
                        onChange={(e) => handleFilterChange('datePreset', e.target.value)}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent min-w-[140px]"
                    >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="tomorrow">Tomorrow</option>
                        <option value="week">This Week</option>
                        <option value="custom">Custom Range</option>
                    </select>

                    {/* More Filters Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters
                            ? 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-900/20 dark:border-sky-800 dark:text-sky-400'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchBookings(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Extended Filters */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {(filters.datePreset === 'custom') && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
                                    <input
                                        type="datetime-local"
                                        value={filters.from}
                                        onChange={(e) => handleFilterChange('from', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
                                    <input
                                        type="datetime-local"
                                        value={filters.to}
                                        onChange={(e) => handleFilterChange('to', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                    />
                                </div>
                            </>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Source / Partner</label>
                            <select
                                value={filters.partnerId}
                                onChange={(e) => handleFilterChange('partnerId', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                            >
                                <option value="">All Sources</option>
                                <option value="manual">Manual / Direct</option>
                                {partners.map(partner => (
                                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Bookings Table */}
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-4 py-4">Reference</th>
                                <th className="px-4 py-4">Source</th>
                                <th className="px-4 py-4">Passenger</th>
                                <th className="px-4 py-4">Pickup</th>
                                <th className="px-4 py-4">Time</th>
                                <th className="px-4 py-4">Driver</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4">Fare</th>
                                <th className="px-4 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="px-4 py-12 text-center text-slate-500">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto mb-2"></div>
                                        Loading bookings...
                                    </td>
                                </tr>
                            ) : bookings.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-4 py-12 text-center text-slate-500">
                                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p>No bookings found</p>
                                        <p className="text-xs mt-1">Try adjusting your filters or create a new booking</p>
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-4">
                                            <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                                                {booking.booking_reference}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <SourceBadge source={booking.source} partnerName={booking.partner_name} />
                                            {booking.service_type && (
                                                <p className="text-xs text-slate-500 mt-1 capitalize">
                                                    {booking.service_type.replace('_', ' ')}
                                                    {booking.flight_number && ` (${booking.flight_number})`}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="max-w-[150px]">
                                                <p className="font-medium text-slate-900 dark:text-white truncate">
                                                    {booking.passenger_name || 'Unknown'}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">
                                                    {booking.passenger_phone}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-sm text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={booking.pickup_address}>
                                                {booking.pickup_address}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {formatDate(booking.scheduled_pickup_time)}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            {booking.driver_name ? (
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white text-sm">
                                                        {booking.driver_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{booking.license_plate}</p>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusBadge status={booking.status} />
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {formatCurrency(booking.fare_final || booking.fare_estimate)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openDetails(booking.id)}
                                                    className="p-2 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {booking.status === 'pending' && (
                                                    <button
                                                        onClick={() => openAssign(booking)}
                                                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                        title="Assign Driver"
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} bookings
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-slate-700 dark:text-slate-300 px-3">
                                Page {pagination.page} of {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page === totalPages}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateBookingModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={fetchBookings}
            />

            <BookingDetailsModal
                bookingId={selectedBookingId}
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedBookingId(null);
                }}
                onUpdate={fetchBookings}
            />

            <AssignDriverModal
                booking={selectedBooking}
                isOpen={isAssignModalOpen}
                onClose={() => {
                    setIsAssignModalOpen(false);
                    setSelectedBooking(null);
                }}
                onAssigned={fetchBookings}
            />
        </div>
    );
}
