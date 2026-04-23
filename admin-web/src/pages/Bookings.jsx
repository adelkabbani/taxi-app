import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Plus, Search, Filter, RefreshCw, Calendar, ChevronLeft, ChevronRight,
    Eye, UserPlus, MoreHorizontal, Clock, MapPin, Download, User, Car,
    CheckCircle, XCircle, AlertCircle, Clock8, History, ListFilter, 
    LayoutGrid, List, ArrowUpDown, ChevronDown, Zap, Play, CheckCheck
} from 'lucide-react';

import api from '../lib/api';
import { toast } from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import SourceBadge from '../components/SourceBadge';
import CreateBookingModal from '../components/CreateBookingModal';
import BookingDetailsModal from '../components/BookingDetailsModal';
import AssignDriverModal from '../components/AssignDriverModal';
import { useSocket } from '../lib/socket';
import BookingAssignmentTimelineModal from '../components/BookingAssignmentTimelineModal';

const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'needs_review_price', label: '🔴 Quarantined (Low Fare)' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'arrived', label: 'Arrived' },
    { value: 'waiting_started', label: 'Waiting' },
    { value: 'started', label: 'In Progress' },
    { value: 'completed', label: 'Complete' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'expired', label: 'Expired' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'no_show_requested', label: 'No-Show Pending' },
    { value: 'no_show_confirmed', label: 'No-Show' }
];


export default function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [runningAssignment, setRunningAssignment] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'quarantine' | 'finished'

    const socket = useSocket();

    // Filters
    const [filters, setFilters] = useState({
        status: '',
        search: '',
        datePreset: 'today', // DEFAULT: 'today' to focus on now
        from: '',
        to: '',
        tenantId: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [partners, setPartners] = useState([]);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [selectedBookingId, setSelectedBookingId] = useState(null);

    // Quick stats
    const [stats, setStats] = useState({
        pending: 0,
        inProgress: 0,
        noShowPending: 0,
        quarantined: 0
    });


    // We consider the operational day to start at midnight (00:00)
    const getOperationalDayStart = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    };

    // Helper to get date ranges for presets
    const getDateRange = (preset) => {
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const tomorrowEnd = new Date(todayEnd);
        tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

        const dayAfterStart = new Date(todayStart);
        dayAfterStart.setDate(dayAfterStart.getDate() + 2);
        const dayAfterEnd = new Date(todayEnd);
        dayAfterEnd.setDate(dayAfterEnd.getDate() + 2);

        switch (preset) {
            case 'today': return { from: todayStart, to: todayEnd };
            case 'tomorrow': return { from: tomorrowStart, to: tomorrowEnd };
            case 'dayAfter': return { from: dayAfterStart, to: dayAfterEnd };
            case 'custom': return { from: filters.from ? new Date(filters.from) : null, to: filters.to ? new Date(filters.to) : null };
            default: return { from: null, to: null };
        }
    };

    const fetchBookings = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const opDayStart = getOperationalDayStart();
            const params = new URLSearchParams();

            // ================================================================
            // THREE STRICT ROOMS — nothing leaks between them
            // ================================================================

            if (activeTab === 'quarantine') {
                // ── QUARANTINE ROOM ── ONLY cheap tours, all dates
                params.set('status', 'needs_review_price');
                // No date fence — show all quarantined regardless of pickup time

            } else if (activeTab === 'active') {
                // ── ACTIVE QUEUE ── ALL statuses for the operational day (default: today).
                // Completed/cancelled tours from today stay here until the next day.
                // Only quarantine (needs_review_price) is permanently excluded.
                const ALL_DAY_STATUSES = 'pending,assigned,accepted,arrived,waiting_started,started,completed,cancelled,rejected,no_show_requested,no_show_confirmed';

                if (!filters.status || filters.status === 'needs_review_price') {
                    params.set('status', ALL_DAY_STATUSES);
                } else {
                    params.set('status', filters.status);
                }

                // Date fence: follow the preset (default Today)
                const range = getDateRange(filters.datePreset);
                if (range.from) params.set('from_date', range.from.toISOString());
                if (range.to) params.set('to_date', range.to.toISOString());

            } else {
                // ── HISTORY ROOM ── Final-state statuses, STRICTLY before today.
                // Today's bookings never appear here — they live in Active Queue.
                const HISTORY_STATUSES = 'completed,cancelled,rejected,no_show_confirmed';

                if (!filters.status || !['completed','cancelled','rejected','no_show_confirmed'].includes(filters.status)) {
                    params.set('status', HISTORY_STATUSES);
                } else {
                    params.set('status', filters.status);
                }

                // Hard fence: never show today's work in History
                params.set('to_date', opDayStart.toISOString());

                // Allow custom date range within History (capped at pre-today)
                if (filters.datePreset === 'custom') {
                    if (filters.from) params.set('from_date', new Date(filters.from).toISOString());
                    if (filters.to) {
                        const customTo = new Date(filters.to);
                        params.set('to_date', customTo < opDayStart ? customTo.toISOString() : opDayStart.toISOString());
                    }
                }
            }

            // Search filter applies to all tabs
            if (filters.search) params.append('search', filters.search);
            if (filters.tenantId) params.append('tenant_id', filters.tenantId);

            // Pagination
            params.append('page', pagination.page);
            params.append('limit', pagination.limit);

            const response = await api.get(`/bookings?${params.toString()}`);
            let data = response.data.data || [];

            // Sort: Newest created at the top for Active Queue
            // History: Most recent pickup at the top
            data.sort((a, b) => {
                if (activeTab === 'active') {
                    return new Date(b.created_at) - new Date(a.created_at);
                }
                return new Date(b.scheduled_pickup_time) - new Date(a.scheduled_pickup_time);
            });

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

    const handleRunAutoAssign = async () => {
        if (runningAssignment) return;
        setRunningAssignment(true);
        const toastId = toast.loading('AI Assignment Engine: Distributing rides...');
        try {
            const response = await api.post('/stats/auto-assign');
            const processedCount = response.data.processed || 0;
            
            toast.success(`Success! Distributed ${processedCount} rides across fleets.`, { id: toastId });
            
            // Immediate forced refresh
            setTimeout(() => {
                fetchBookings(true);
                fetchQuickStats();
            }, 500);
        } catch (err) {
            console.error('Failed to run auto-assign:', err);
            toast.error('Failed to trigger assignment engine', { id: toastId });
        } finally {
            setRunningAssignment(false);
        }
    };

    const handleApprovePrice = async (bookingId, bookingRef) => {
        const toastId = toast.loading(`Approving price for ${bookingRef}...`);
        try {
            await api.patch(`/bookings/${bookingId}/approve-price`);
            toast.success(`✅ ${bookingRef} approved — moved to Active Queue!`, { id: toastId });
            setTimeout(() => {
                fetchBookings(true);
                fetchQuickStats();
            }, 300);
        } catch (err) {
            console.error('Failed to approve price:', err);
            toast.error(err?.response?.data?.message || 'Failed to approve price.', { id: toastId });
        }
    };

    const handleRejectQuarantine = async (bookingId, bookingRef) => {
        const toastId = toast.loading(`Rejecting ${bookingRef}...`);
        try {
            await api.patch(`/bookings/${bookingId}/reject-quarantine`, {
                reason: 'Manually rejected by Admin'
            });
            toast.success(`❌ ${bookingRef} rejected and removed from Quarantine.`, { id: toastId });
            setTimeout(() => {
                fetchBookings(true);
                fetchQuickStats();
            }, 300);
        } catch (err) {
            console.error('Failed to reject quarantine booking:', err);
            toast.error(err?.response?.data?.message || 'Failed to reject booking.', { id: toastId });
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

    // Socket.io listener for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            fetchBookings(true);
            fetchQuickStats();
        };

        socket.on('bookings_updated', handleUpdate);
        socket.on('auto_assignment_success', handleUpdate);

        return () => {
            socket.off('bookings_updated', handleUpdate);
            socket.off('auto_assignment_success', handleUpdate);
        };
    }, [socket, fetchBookings]);

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
                    <h1 className="text-3xl font-black tracking-tight text-ink-black-950 dark:text-white transition-colors" id="dispatch-title">
                        Dispatch Console
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">
                        Live monitoring of manual, app, and partner bookings
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        id="run-auto-assign-btn"
                        onClick={handleRunAutoAssign}
                        disabled={runningAssignment}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                            runningAssignment 
                                ? 'bg-gold-400/20 text-gold-500 cursor-not-allowed border border-gold-400/30' 
                                : 'bg-emerald-500 hover:bg-emerald-600 text-ink-black-950 shadow-lg shadow-emerald-500/20 active:scale-95 transition-colors'
                        }`}
                    >
                        {runningAssignment ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Zap className="w-4 h-4" />
                        )}
                        {runningAssignment ? 'Processing...' : 'Run AI Auto-Assign'}
                    </button>
                    <button
                        id="new-booking-btn"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-ink-black-950 rounded-xl font-bold shadow-lg shadow-gold-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        New Booking
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-ink-black-900 p-5 rounded-2xl border border-regal-navy/10 dark:border-gold-500/20 dark:bg-gold-400/5 relative overflow-hidden group shadow-[0_4px_20px_rgba(0,29,61,0.08)] dark:shadow-none transition-colors"
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gold-500 dark:text-gold-400 mb-1">Pending Assignment</p>
                            <p className="text-3xl font-black text-ink-black-950 dark:text-white font-mono transition-colors">{stats.pending}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gold-500/10 text-gold-500 group-hover:bg-gold-500 transition-colors group-hover:text-ink-black-950">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-ink-black-900 p-5 rounded-2xl border border-regal-navy/10 dark:border-cyan-500/20 bg-cyan-50/50 dark:bg-cyan-500/5 relative overflow-hidden group shadow-[0_4px_20px_rgba(0,29,61,0.08)] dark:shadow-none transition-colors"
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-1 transition-colors">In Progress</p>
                            <p className="text-3xl font-black text-ink-black-950 dark:text-white font-mono transition-colors">{stats.inProgress}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                            <MapPin className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`bg-white dark:bg-ink-black-900 transition-colors p-5 rounded-2xl border relative overflow-hidden group shadow-[0_4px_20px_rgba(0,29,61,0.08)] dark:shadow-none ${stats.noShowPending > 0
                        ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 animate-pulse-slow'
                        : 'border-regal-navy/10 dark:border-white/5 bg-white dark:bg-white/2'
                        }`}
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 transition-colors ${stats.noShowPending > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500'}`}>No-Show Alerts</p>
                            <p className="text-3xl font-black text-ink-black-950 dark:text-white font-mono transition-colors">{stats.noShowPending}</p>
                        </div>
                        <div className={`p-3 rounded-xl transition-colors ${stats.noShowPending > 0
                            ? 'bg-rose-600/20 text-rose-500 group-hover:bg-rose-600 group-hover:text-white'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-400'
                            }`}>
                            <Eye className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>

                {/* Quarantine Counter — always visible, pulses when non-zero */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => setActiveTab('quarantine')}
                    className={`bg-white dark:bg-ink-black-900 p-5 rounded-2xl border relative overflow-hidden group cursor-pointer transition-all shadow-[0_4px_20px_rgba(0,29,61,0.08)] dark:shadow-none ${
                        stats.quarantined > 0
                            ? 'border-rose-300 dark:border-rose-600/50 bg-rose-50 dark:bg-rose-600/10 hover:border-rose-400 dark:hover:border-rose-500/70'
                            : 'border-regal-navy/10 dark:border-white/5 bg-white dark:bg-white/2 hover:border-regal-navy/20 dark:hover:border-white/10'
                    } ${activeTab === 'quarantine' ? 'ring-2 ring-rose-500/50 dark:ring-rose-600/50' : ''}`}
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                                stats.quarantined > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500'
                            }`}>🔴 Quarantined</p>
                            <p className="text-3xl font-black text-ink-black-950 dark:text-white font-mono transition-colors">{stats.quarantined}</p>
                            <p className="text-[9px] text-rose-400/60 font-bold uppercase tracking-widest mt-1">Low Fare (&lt;€50)</p>
                        </div>
                        <div className={`p-3 rounded-xl transition-colors ${
                            stats.quarantined > 0
                                ? 'bg-rose-600/20 text-rose-500 group-hover:bg-rose-600 group-hover:text-white animate-pulse'
                                : 'bg-white/5 text-gray-600'
                        }`}>
                            <AlertCircle className="w-6 h-6" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Filter Bar & Tabs */}
            <div className="flex flex-col gap-4">
                <div className="flex border-b border-regal-navy/10 dark:border-white/10">
                    <button
                        id="active-queue-tab"
                        onClick={() => setActiveTab('active')}
                        className={`px-8 py-3 text-xs font-bold border-b-2 transition-all tracking-widest uppercase ${activeTab === 'active'
                            ? 'border-gold-500 text-gold-500'
                            : 'border-transparent text-slate-500 dark:text-gray-500 hover:text-ink-black-950 dark:hover:text-white'
                            }`}
                    >
                        Active Queue
                    </button>
                    <button
                        id="quarantine-tab"
                        onClick={() => setActiveTab('quarantine')}
                        className={`px-8 py-3 text-xs font-bold border-b-2 transition-all tracking-widest uppercase flex items-center gap-2 ${
                            activeTab === 'quarantine'
                                ? 'border-rose-500 text-rose-400'
                                : 'border-transparent text-gray-500 hover:text-rose-400'
                        }`}
                    >
                        🔴 Quarantine
                        {stats.quarantined > 0 && (
                            <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full animate-pulse">
                                {stats.quarantined}
                            </span>
                        )}
                    </button>
                    <button
                        id="history-tab"
                        onClick={() => setActiveTab('finished')}
                        className={`px-8 py-3 text-xs font-bold border-b-2 transition-all tracking-widest uppercase ${activeTab === 'finished'
                            ? 'border-gold-400 text-gold-400'
                            : 'border-transparent text-slate-500 dark:text-gray-500 hover:text-ink-black-950 dark:hover:text-white'
                            }`}
                    >
                        History
                    </button>
                </div>

                <div className="bg-white dark:bg-ink-black-900 p-4 rounded-xl flex flex-col lg:flex-row gap-4 border border-regal-navy/10 dark:border-white/5 shadow-[0_2px_16px_rgba(0,29,61,0.07)] dark:shadow-none transition-colors">
                    {/* Search */}
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 group-focus-within:text-gold-500 transition-colors" />
                        <input
                            id="search-input"
                            type="text"
                            placeholder="Search by Flight #, Name, Ref..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-10 pr-12 py-2 bg-regal-navy/5 dark:bg-ink-black-950 border border-regal-navy/10 dark:border-white/5 rounded-lg text-sm text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600"
                        />
                        {filters.search && (
                            <button
                                onClick={() => {
                                    handleFilterChange('search', '');
                                    handleFilterChange('datePreset', 'today');
                                }}
                                className="absolute right-3 top-2 text-gray-500 hover:text-gold-400 p-1 rounded-full hover:bg-white/5 transition-all"
                                title="Clear search and reset to Today"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <select
                        id="status-filter"
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 bg-regal-navy/5 dark:bg-ink-black-950 border border-regal-navy/10 dark:border-white/10 rounded-lg text-sm text-ink-black-950 dark:text-gray-300 focus:outline-none focus:border-gold-400/50 min-w-[160px] cursor-pointer transition-colors"
                    >
                        {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    {/* Date Ribbon Quick-Actions — Professional Relative System */}
                    <div className="flex bg-regal-navy/5 dark:bg-ink-black-950 border border-regal-navy/10 dark:border-white/5 rounded-lg p-1 gap-1 transition-colors">
                        {[
                            { id: 'today', label: 'Today', icon: Clock },
                            { id: 'tomorrow', label: 'Tomorrow', icon: Calendar },
                            { id: 'dayAfter', label: 'Day After', icon: Zap },
                            { id: 'custom', label: 'Custom Range', icon: History }
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => handleFilterChange('datePreset', btn.id)}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                                    filters.datePreset === btn.id
                                        ? 'bg-gold-500 text-ink-black-950 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-500 hover:text-ink-black-950 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'
                                }`}
                            >
                                <btn.icon className="w-3 h-3" />
                                {btn.label}
                            </button>
                        ))}
                        <button
                            onClick={() => handleFilterChange('datePreset', 'all')}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                                filters.datePreset === 'all'
                                    ? 'bg-white dark:bg-white/10 text-ink-black-950 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-gray-600 hover:text-ink-black-950 dark:hover:text-gray-400'
                            }`}
                        >
                            All
                        </button>
                    </div>
                    {filters.datePreset === 'custom' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                             <input
                                type="date"
                                value={filters.from}
                                onChange={(e) => handleFilterChange('from', e.target.value)}
                                className="px-3 py-1.5 bg-gray-50 dark:bg-ink-black-950 border border-gold-400/20 rounded-md text-xs text-ink-black-900 dark:text-gold-400 focus:outline-none focus:border-gold-500 transition-colors"
                            />
                            <span className="text-gray-400 dark:text-gray-600 text-xs font-bold">TO</span>
                            <input
                                type="date"
                                value={filters.to}
                                onChange={(e) => handleFilterChange('to', e.target.value)}
                                className="px-3 py-1.5 bg-gray-50 dark:bg-ink-black-950 border border-gold-400/20 rounded-md text-xs text-ink-black-900 dark:text-gold-400 focus:outline-none focus:border-gold-500 transition-colors"
                            />
                        </div>
                    )}

                    {/* More Filters & Refresh */}
                    <div className="flex gap-2">
                        <button
                            id="toggle-filters-btn"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-bold transition-all ${showFilters
                                ? 'bg-gold-400/10 border-gold-400/30 text-gold-500 dark:text-gold-400'
                                : 'bg-white dark:bg-white/5 border-regal-navy/12 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:bg-regal-navy/5 dark:hover:bg-white/5 hover:text-ink-black-950 dark:hover:text-white'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filters</span>
                        </button>

                        <button
                            id="refresh-btn"
                            onClick={() => fetchBookings(true)}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-regal-navy/12 dark:border-white/5 rounded-lg text-sm font-bold text-slate-500 dark:text-gray-400 hover:bg-regal-navy/5 dark:hover:bg-white/10 hover:text-ink-black-950 dark:hover:text-white transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Global Search Indicator */}
            {filters.search && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-center"
                >
                    <div className="bg-gold-500/10 border border-gold-500/30 text-gold-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-gold-500/5">
                        <Search className="w-3 h-3" />
                        Global Search Active (Ignoring Date Filters)
                    </div>
                </motion.div>
            )}

            {/* Bookings Table */}
            <div className="bg-white dark:bg-ink-black-900 rounded-2xl overflow-hidden border border-regal-navy/10 dark:border-white/5 shadow-[0_8px_40px_rgba(0,29,61,0.10)] dark:shadow-2xl transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse" id="bookings-table">
                        <thead className="bg-regal-navy/4 dark:bg-ink-black-900/80 border-b border-regal-navy/10 dark:border-white/5 text-slate-500 dark:text-gray-500 uppercase text-[10px] font-bold tracking-widest transition-colors">
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
                        <tbody className="divide-y divide-regal-navy/6 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-16 text-center text-gray-500">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400 mx-auto mb-3"></div>
                                        <span className="text-xs font-mono animate-pulse tracking-widest">SYNCING BOOKING DATA...</span>
                                    </td>
                                </tr>
                            ) : bookings.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-20 text-center text-gray-700">
                                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-bold">No bookings found</p>
                                        <p className="text-xs mt-1">Try adjusting your filters</p>
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((booking, index) => (
                                    <motion.tr
                                        key={booking.id}
                                        data-id={booking.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`group hover:bg-regal-navy/4 dark:hover:bg-white/[0.02] transition-colors ${
                                            booking.status === 'pending' && 
                                            Array.isArray(booking.excluded_drivers) && 
                                            booking.excluded_drivers.length > 0
                                                ? 'blink-red-active' 
                                                : ''
                                        }`}
                                    >
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-bold text-gold-500/90 text-sm tracking-wide">
                                                {booking.booking_reference}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <SourceBadge source={booking.source} partnerName={booking.partner_name} />
                                            {booking.service_type && (
                                                <p className="text-[10px] text-gray-500 mt-1.5 capitalize font-bold flex items-center gap-1">
                                                    {booking.service_type.replace('_', ' ')}
                                                    {booking.flight_number && (
                                                        <span className="text-cyan-400 bg-cyan-400/10 px-1 rounded">
                                                            {booking.flight_number}
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-[150px]">
                                                <p className="font-bold text-ink-black-900 dark:text-white truncate mb-0.5 transition-colors">
                                                    {booking.passenger_name || 'Unknown'}
                                                </p>
                                                <p className="text-[10px] text-gray-500 truncate font-mono tracking-tighter">
                                                    {booking.passenger_phone}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-gray-400 max-w-[220px] truncate" title={booking.pickup_address}>
                                                {booking.pickup_address}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-ink-black-900 dark:text-white transition-colors">
                                                    {new Date(booking.scheduled_pickup_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-tighter transition-colors">
                                                    {new Date(booking.scheduled_pickup_time).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {booking.driver_name ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-ink-black-900 dark:text-white text-sm transition-colors">
                                                        {booking.driver_name}
                                                    </span>
                                                    <span className="text-[10px] text-gold-600 dark:text-gold-400/80 font-mono border border-gold-200 dark:border-gold-400/20 bg-gold-50 dark:bg-gold-400/5 px-1 rounded w-fit mt-0.5 transition-colors">
                                                        {booking.license_plate}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-700 text-[10px] font-black uppercase tracking-widest italic transition-colors">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {booking.status === 'needs_review_price' ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-600/20 text-rose-400 border border-rose-600/40 animate-pulse">
                                                        🔴 QUARANTINED: LOW FARE
                                                    </span>
                                                    <span className="text-[9px] text-rose-400/60 font-bold uppercase tracking-widest">Below €50 threshold</span>
                                                </div>
                                            ) : (
                                                <StatusBadge status={booking.status} />
                                            )}
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
                                                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-ink-black-950 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10 details-btn"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setSelectedBookingId(booking.id);
                                                        setIsTimelineModalOpen(true);
                                                    }}
                                                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gold-600 dark:hover:text-gold-400 hover:bg-gold-500/10 rounded-lg transition-colors border border-transparent hover:border-gold-500/20 timeline-btn"
                                                    title="View Assignment History"
                                                >
                                                    <History className="w-4 h-4" />
                                                </button>

                                                {/* QUARANTINE ACTIONS — only for needs_review_price */}
                                                {booking.status === 'needs_review_price' && (
                                                    <>
                                                        {/* ✅ APPROVE — promotes to pending */}
                                                        <button
                                                            onClick={() => handleApprovePrice(booking.id, booking.booking_reference)}
                                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/60 rounded-lg transition-all active:scale-95"
                                                            title="Approve Price — move to Active Queue"
                                                        >
                                                            <CheckCheck className="w-3.5 h-3.5" />
                                                            Approve
                                                        </button>

                                                        {/* ❌ REJECT — permanently rejects */}
                                                        <button
                                                            onClick={() => handleRejectQuarantine(booking.id, booking.booking_reference)}
                                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-500/60 rounded-lg transition-all active:scale-95"
                                                            title="Reject — permanently discard this tour"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            Reject
                                                        </button>
                                                    </>
                                                )}

                                                {['pending', 'rejected'].includes(booking.status) && (
                                                    <button
                                                        onClick={() => openAssign(booking)}
                                                        className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 rounded-lg transition-colors assign-btn"
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
                    <div className="px-6 py-4 border-t border-regal-navy/8 dark:border-white/5 flex items-center justify-between bg-regal-navy/3 dark:bg-white/2 transition-colors">
                        <p className="text-[10px] text-slate-500 dark:text-gray-500 font-bold uppercase tracking-widest">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="p-2 border border-regal-navy/10 dark:border-white/5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed bg-white dark:bg-white/2 hover:bg-regal-navy/5 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 hover:text-ink-black-950 dark:hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-black font-mono text-gold-500 dark:text-gold-400 px-3">
                                {pagination.page} / {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page === totalPages}
                                className="p-2 border border-regal-navy/10 dark:border-white/5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed bg-white dark:bg-white/2 hover:bg-regal-navy/5 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 hover:text-ink-black-950 dark:hover:text-white transition-colors"
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
            {isTimelineModalOpen && (
                <BookingAssignmentTimelineModal
                    isOpen={isTimelineModalOpen}
                    onClose={() => setIsTimelineModalOpen(false)}
                    bookingId={selectedBookingId}
                />
            )}
        </div>
    );
}
