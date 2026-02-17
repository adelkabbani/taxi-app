import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gold-200 to-gold-400">
                        Dispatch Console
                    </h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">
                        Live monitoring of manual, app, and partner bookings
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-obsidian-950 rounded-xl font-bold shadow-lg shadow-gold-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    New Booking
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 relative overflow-hidden group"
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Pending Assignment</p>
                            <p className="text-3xl font-black text-white font-mono">{stats.pending}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-obsidian-900 transition-colors">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-panel p-5 rounded-2xl border border-sky-500/20 bg-sky-500/5 relative overflow-hidden group"
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-1">In Progress</p>
                            <p className="text-3xl font-black text-white font-mono">{stats.inProgress}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-obsidian-900 transition-colors">
                            <MapPin className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`glass-panel p-5 rounded-2xl border relative overflow-hidden group ${stats.noShowPending > 0
                        ? 'border-rose-500/40 bg-rose-500/10 animate-pulse-slow'
                        : 'border-white/10 bg-white/5'
                        }`}
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${stats.noShowPending > 0 ? 'text-rose-400' : 'text-slate-400'}`}>No-Show Alerts</p>
                            <p className="text-3xl font-black text-white font-mono">{stats.noShowPending}</p>
                        </div>
                        <div className={`p-3 rounded-xl transition-colors ${stats.noShowPending > 0
                            ? 'bg-rose-500/20 text-rose-500 group-hover:bg-rose-500 group-hover:text-white'
                            : 'bg-white/5 text-slate-400'
                            }`}>
                            <Eye className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Filter Bar & Tabs */}
            <div className="flex flex-col gap-4">
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-8 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'active'
                            ? 'border-gold-500 text-gold-400'
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        Active Queue
                    </button>
                    <button
                        onClick={() => setActiveTab('finished')}
                        className={`px-8 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'finished'
                            ? 'border-gold-500 text-gold-400'
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        History
                    </button>
                </div>

                <div className="glass-panel p-4 rounded-xl flex flex-col lg:flex-row gap-4 border border-white/5">
                    {/* Search */}
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 group-focus-within:text-gold-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by Flight #, Name, Ref..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-obsidian-900/50 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/50 transition-all placeholder:text-slate-600"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 bg-obsidian-900/50 border border-white/10 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-gold-500/50 min-w-[160px] cursor-pointer"
                    >
                        {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    {/* Quick Date Filter */}
                    <select
                        value={filters.datePreset}
                        onChange={(e) => handleFilterChange('datePreset', e.target.value)}
                        className="px-4 py-2 bg-obsidian-900/50 border border-white/10 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-gold-500/50 min-w-[140px] cursor-pointer"
                    >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="tomorrow">Tomorrow</option>
                        <option value="week">This Week</option>
                        <option value="custom">Custom Range</option>
                    </select>

                    {/* More Filters & Refresh */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-bold transition-all ${showFilters
                                ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filters</span>
                        </button>

                        <button
                            onClick={() => fetchBookings(true)}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bookings Table */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-obsidian-900/50 border-b border-white/5 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Reference</th>
                                <th className="px-6 py-4">Source</th>
                                <th className="px-6 py-4">Passenger</th>
                                <th className="px-6 py-4">Pickup</th>
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">Driver</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Fare</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-16 text-center text-slate-500">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500 mx-auto mb-3"></div>
                                        <span className="text-xs font-mono animate-pulse">SYNCING BOOKING DATA...</span>
                                    </td>
                                </tr>
                            ) : bookings.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-20 text-center text-slate-600">
                                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-medium">No bookings found</p>
                                        <p className="text-xs mt-1">Try adjusting your filters</p>
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((booking, index) => (
                                    <motion.tr
                                        key={booking.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="group hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-bold text-gold-500/90 text-sm tracking-wide">
                                                {booking.booking_reference}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <SourceBadge source={booking.source} partnerName={booking.partner_name} />
                                            {booking.service_type && (
                                                <p className="text-[10px] text-slate-500 mt-1.5 capitalize font-medium flex items-center gap-1">
                                                    {booking.service_type.replace('_', ' ')}
                                                    {booking.flight_number && (
                                                        <span className="text-slate-400 bg-white/5 px-1 rounded">
                                                            {booking.flight_number}
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-[150px]">
                                                <p className="font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                                                    {booking.passenger_name || 'Unknown'}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate font-mono mt-0.5">
                                                    {booking.passenger_phone}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-400 max-w-[220px] truncate" title={booking.pickup_address}>
                                                {booking.pickup_address}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-300">
                                                    {new Date(booking.scheduled_pickup_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] text-slate-500 uppercase font-bold">
                                                    {new Date(booking.scheduled_pickup_time).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {booking.driver_name ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-200 text-sm">
                                                        {booking.driver_name}
                                                    </span>
                                                    <span className="text-[10px] text-gold-500/60 font-mono border border-gold-500/10 bg-gold-500/5 px-1 rounded w-fit mt-0.5">
                                                        {booking.license_plate}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-600 text-xs italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={booking.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold font-mono text-emerald-400">
                                                {formatCurrency(booking.fare_final || booking.fare_estimate)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openDetails(booking.id)}
                                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {booking.status === 'pending' && (
                                                    <button
                                                        onClick={() => openAssign(booking)}
                                                        className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 rounded-lg transition-colors"
                                                        title="Assign Driver"
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-obsidian-900/30">
                        <p className="text-xs text-slate-500 font-medium">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="p-2 border border-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-mono text-slate-400 px-3">
                                {pagination.page} / {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page === totalPages}
                                className="p-2 border border-white/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
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
