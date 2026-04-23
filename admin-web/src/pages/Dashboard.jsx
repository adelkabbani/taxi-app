import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../lib/socket';
import {
    Users, MapPin, Calendar, Euro, RefreshCw,
    Activity, ShieldCheck, AlertCircle, TrendingUp, TrendingDown, Play, Zap, Database, LayoutDashboard, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../lib/api';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        onlineDrivers: 0,
        activeTrips: 0,
        todaysBookings: 0,
        todaysRevenue: 0,
        partnerBreakdown: [],
        revenueTrend: [],
        recentActivity: [],
        documents: { pending: 0, expired: 0, total: 0 },
        weeklyRevenue: 0,
        currency: 'EUR',
        lastUpdated: null
    });
    const [health, setHealth] = useState({ database: 'ok', redis: 'ok', status: 'ready' });
    const [settings, setSettings] = useState({ stop_sell: false, auto_assign_min_fare: 0 });
    const [loading, setLoading] = useState(true);
    const [runningAssignment, setRunningAssignment] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [updatingSettings, setUpdatingSettings] = useState(false);
    const [error, setError] = useState(null);

    // ANALYTICS & FILTERING
    const [period, setPeriod] = useState('today'); // today, tomorrow, month
    const [pulseDate, setPulseDate] = useState(new Date().toISOString().split('T')[0]);
    const [pulseData, setPulseData] = useState(null);
    const [loadingPulse, setLoadingPulse] = useState(false);
    const socket = useSocket();

    const fetchData = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        try {
            // Calculate Dates based on period
            const now = new Date();
            let startDate = new Date(now);
            let endDate = new Date(now);

            if (period === 'today') {
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            } else if (period === 'tomorrow') {
                startDate.setDate(now.getDate() + 1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setDate(now.getDate() + 1);
                endDate.setHours(23, 59, 59, 999);
            } else if (period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            }

            const [statsRes, healthRes, settingsRes] = await Promise.all([
                api.get(`/stats/dashboard?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
                api.get('/health/ready').catch(() => ({ data: { status: 'error' } })),
                api.get('/tenants/current/settings').catch(() => ({ data: { stop_sell: false, auto_assign_min_fare: 0 } }))
            ]);

            setStats(statsRes.data);
            if (healthRes.data) setHealth(healthRes.data);
            if (settingsRes.data && settingsRes.data.data) setSettings(settingsRes.data.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            setError('Failed to sync dashboard');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    const fetchPulseData = useCallback(async (date) => {
        setLoadingPulse(true);
        try {
            const res = await api.get(`/stats/revenue-pulse?date=${date}`);
            setPulseData(res.data);
        } catch (err) {
            console.error('Failed to fetch pulse data:', err);
        } finally {
            setLoadingPulse(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchPulseData(pulseDate);
        const interval = setInterval(() => {
            if (!document.hidden) {
                fetchData(true);
                fetchPulseData(pulseDate);
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchData, fetchPulseData, pulseDate]);

    // Socket.IO Connection
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = () => {
            console.log('[SOCKET DEBUG] Dashboard refreshing via signal');
            fetchData(true);
        };

        socket.on('booking_created', handleUpdate);
        socket.on('booking_updated', handleUpdate);
        socket.on('bookings_updated', handleUpdate);

        return () => {
            socket.off('booking_created', handleUpdate);
            socket.off('booking_updated', handleUpdate);
            socket.off('bookings_updated', handleUpdate);
        };
    }, [socket, fetchData]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: stats.currency
        }).format(amount);
    };

    const updateSettings = async (updates) => {
        setUpdatingSettings(true);
        try {
            const res = await api.patch('/tenants/current/settings', updates);
            if (res.data && res.data.data) {
                setSettings(res.data.data);
            }
        } catch (err) {
            console.error('Failed to update settings:', err);
            setError('Failed to update settings');
        } finally {
            setUpdatingSettings(false);
        }
    };

    const handleRunAutoAssign = async () => {
        if (runningAssignment) return;
        setRunningAssignment(true);
        try {
            setTimeout(() => { fetchData(true); }, 500);
        } catch (err) {
            console.error('Failed to run auto-assign:', err);
            setError('Failed to trigger assignment engine');
        } finally {
            setRunningAssignment(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-6 pb-12"
        >
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4">
                <div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 mb-1"
                    >
                        <div className="p-2 bg-gradient-to-br from-gold-500 to-amber-600 rounded-lg shadow-lg shadow-gold-500/20">
                            <LayoutDashboard className="w-6 h-6 text-ink-black-950" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-ink-black-950 dark:text-white dark:text-glow transition-colors">
                            Command Center
                        </h1>
                    </motion.div>
                    <p className="text-slate-500 dark:text-gray-400 text-sm font-medium flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        System Operational · {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-white/5 backdrop-blur-md px-4 py-2 rounded-full hidden sm:flex items-center gap-4 border border-regal-navy/10 dark:border-white/5 transition-colors shadow-[0_2px_12px_rgba(0,29,61,0.07)] dark:shadow-none">
                        <div className="flex items-center gap-2">
                            <Database className={`w-3.5 h-3.5 ${health.database === 'ok' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">DB</span>
                        </div>
                        <div className="w-px h-3 bg-gray-200 dark:bg-white/10" />
                        <div className="flex items-center gap-2">
                            <Zap className={`w-3.5 h-3.5 ${health.redis === 'ok' ? 'text-amber-600 dark:text-amber-500' : 'text-rose-600 dark:text-rose-500'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Redis</span>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.5 }}
                        onClick={() => fetchData(true)}
                        className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-full hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-xl"
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-400 dark:text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
                    </motion.button>
                </div>
            </header>

            {/* Period Selector — Professional Ribbon Layout */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-white/[0.02] border border-regal-navy/10 dark:border-white/5 rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,29,61,0.07)] dark:shadow-xl transition-colors">
                <div>
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-gold-500/80 mb-2 sm:mb-0">
                        Fleet Intelligence Period
                    </h3>
                </div>
                <div className="flex bg-regal-navy/6 dark:bg-ink-black-900 border border-regal-navy/10 dark:border-white/10 rounded-lg p-1 gap-1 shadow-inner transition-colors">
                    {[
                        { id: 'today', label: 'Today', icon: Activity },
                        { id: 'tomorrow', label: 'Tomorrow', icon: Calendar },
                        { id: 'month', label: 'This Month', icon: Globe }
                    ].map(p => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                period === p.id
                                    ? 'bg-gold-500 text-ink-black-950 shadow-lg shadow-gold-500/20 active:scale-95'
                                    : 'text-slate-500 dark:text-gray-500 hover:text-ink-black-950 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'
                            }`}
                        >
                            <p.icon className="w-3 h-3" />
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-bold">{error}</span>
                </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Active Fleet"    value={stats.onlineDrivers}              icon={<Users    className="w-6 h-6" />} color="cyan"    trend="+12% vs last hr"  trendUp={true}  loading={loading} />
                <StatCard title="Live Trips"       value={stats.activeTrips}                icon={<MapPin   className="w-6 h-6" />} color="cyan"    trend="High Demand"      trendUp={true}  loading={loading} />
                <StatCard
                    title="Today's Revenue"
                    value={formatCurrency(stats.todaysRevenue)}
                    subValue={stats.projectedRevenue > 0 ? `+${formatCurrency(stats.projectedRevenue)} projected` : null}
                    icon={<Euro  className="w-6 h-6" />}
                    color="emerald"
                    trend="Incl. Projected"
                    trendUp={true}
                    loading={loading}
                />
                <StatCard title="24h Bookings"     value={stats.todaysBookings}             icon={<Calendar className="w-6 h-6" />} color="amber"   trend="Steady"                           loading={loading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Pulse Chart */}
                <motion.div
                    variants={itemVariants}
                    className="lg:col-span-2 bg-white dark:bg-ink-black-900 border border-regal-navy/10 dark:border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-[0_8px_32px_rgba(0,29,61,0.10)] dark:shadow-none transition-colors"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-ink-black-950 dark:text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-gold-500" />
                                Revenue Pulse
                            </h3>
                            <p className="text-xs text-slate-400">Real-time earnings tracking</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold-400/50" />
                                <input
                                    type="date"
                                    value={pulseDate}
                                    onChange={(e) => setPulseDate(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-regal-navy/5 dark:bg-white/5 border border-regal-navy/12 dark:border-white/10 rounded-xl text-xs font-bold text-ink-black-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/30 transition-all cursor-pointer"
                                />
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <div className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </div>
                                <span className="text-xs font-bold text-emerald-400">Live Feedback</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                        <div className="xl:col-span-3 h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={(stats.revenueTrend || []).map(d => ({
                                            hour: new Date(d.hour).getHours().toString().padStart(2,'0') + ':00',
                                            revenue: Number(d.revenue) || 0
                                        }))}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#ffd60a" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#ffd60a" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#64748b" strokeOpacity={0.13} />
                                    <XAxis
                                        dataKey="hour"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                        tickFormatter={(value) => `€${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#000814', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900' }}
                                        itemStyle={{ color: '#ffd60a' }}
                                        formatter={(value, name) => name === 'revenue' ? [`€${Number(value).toFixed(2)}`, 'Revenue'] : [value, 'Bookings']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#ffd60a"
                                        strokeWidth={2.5}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                        activeDot={(props) => {
                                            const { cx, cy } = props;
                                            return (
                                                <g>
                                                    <circle cx={cx} cy={cy} r={5} fill="#ffd60a" stroke="#ffffff" strokeWidth={2} />
                                                    <circle cx={cx} cy={cy} r={10} fill="#ffd60a" opacity={0.2}>
                                                        <animate attributeName="r" from="5" to="18" dur="1.5s" begin="0s" repeatCount="indefinite" />
                                                        <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" begin="0s" repeatCount="indefinite" />
                                                    </circle>
                                                </g>
                                            );
                                        }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="xl:col-span-1 flex flex-col justify-center">
                            <div className="text-center mb-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-500 mb-1 transition-colors">Sector Breakdown</h4>
                                <div className="text-2xl font-black text-ink-black-950 dark:text-white transition-colors">{stats.todaysBookings || 0}</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-gold-500 dark:text-gold-400/50 transition-colors">Total Projects</div>
                            </div>
                            <div className="h-[180px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.statusBreakdown || []}
                                            cx="50%" cy="50%"
                                            innerRadius={45} outerRadius={65}
                                            paddingAngle={5} dataKey="value"
                                        >
                                            {stats.statusBreakdown?.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={
                                                        entry.name === 'Assigned' ? '#22d3ee' : // Cyan
                                                        entry.name === 'Pending' ? '#fbbf24' :  // Amber
                                                        entry.name === 'Quarantined' ? '#f43f5e' : // Rose
                                                        '#475569' // Slate
                                                    } 
                                                    stroke="none" 
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#000814', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900' }}
                                            itemStyle={{ fontSize: '10px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap justify-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-400" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-500">Assigned</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-500">Pending</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-500">Quarantined</span></div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="space-y-6">
                    {/* Fleet Health */}
                    <motion.div variants={itemVariants} className="bg-white dark:bg-ink-black-900 border border-regal-navy/10 dark:border-white/5 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,29,61,0.09)] dark:shadow-2xl transition-colors">
                        <h3 className="font-bold text-ink-black-950 dark:text-white mb-6 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            Fleet Health
                        </h3>
                        <div className="flex justify-around items-center">
                            {/* Docs circle */}
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" className="text-regal-navy/10 dark:text-ink-black-800" strokeWidth="8" fill="transparent" />
                                    <circle cx="48" cy="48" r="40"
                                        stroke={stats.documents.expired > 0 ? '#f43f5e' : '#10b981'}
                                        strokeWidth="8" fill="transparent"
                                        strokeDasharray="251.2"
                                        strokeDashoffset={251.2 * (1 - (stats.documents.total > 0 ? (stats.documents.total - stats.documents.expired) / stats.documents.total : 1))}
                                        className="transition-all duration-1000 ease-out" strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-xl font-bold ${stats.documents.expired > 0 ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
                                        {stats.documents.total > 0 ? Math.round(((stats.documents.total - stats.documents.expired) / stats.documents.total) * 100) : 100}%
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-500 uppercase font-black transition-colors">Docs</span>
                                </div>
                            </div>
                            {/* Online circle */}
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="40" stroke="currentColor" className="text-regal-navy/10 dark:text-ink-black-800" strokeWidth="8" fill="transparent" />
                                    <circle cx="48" cy="48" r="40" stroke="#22d3ee" strokeWidth="8" fill="transparent"
                                        strokeDasharray="251.2" strokeDashoffset={251.2 * 0.25}
                                        className="transition-all duration-1000 ease-out" strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400 transition-colors">{stats.onlineDrivers}</span>
                                    <span className="text-[10px] text-slate-500 dark:text-gray-400 uppercase font-black transition-colors">Online</span>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-2">
                            <div className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                                <span className="block text-xl font-bold text-rose-500">{stats.documents.expired}</span>
                                <span className="text-[10px] text-rose-400 uppercase font-bold">Expired</span>
                            </div>
                            <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                                <span className="block text-xl font-bold text-amber-500">{stats.documents.pending}</span>
                                <span className="text-[10px] text-amber-400 uppercase font-bold">Pending</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Dispatch Control */}
                    <motion.div variants={itemVariants} className="bg-white dark:bg-ink-black-900 border border-regal-navy/10 dark:border-white/5 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,29,61,0.09)] dark:shadow-2xl transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-ink-black-950 dark:text-white">Dispatch Control</h3>
                            <div className={`w-2 h-2 rounded-full ${settings.stop_sell ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                        </div>
                        <div className="bg-regal-navy/5 dark:bg-ink-black-950 border border-regal-navy/8 dark:border-white/5 rounded-2xl p-4 mb-4 transition-colors">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-500">System Status</span>
                                <span className={`text-xs font-black px-2 py-1 rounded transition-colors ${settings.stop_sell ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                                    {settings.stop_sell ? 'SUSPENDED' : 'ONLINE'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-gray-500 transition-colors">
                                {settings.stop_sell ? 'New bookings are currently paused.' : 'System is accepting new bookings normally.'}
                            </p>
                        </div>
                        <button
                            disabled={updatingSettings}
                            onClick={() => updateSettings({ stop_sell: !settings.stop_sell })}
                            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${settings.stop_sell
                                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
                                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'}`}
                        >
                            {updatingSettings ? 'Updating...' : settings.stop_sell ? 'Resume Operations' : 'Emergency Stop'}
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* Bottom CTA cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                <div className="bg-white dark:bg-ink-black-900 border border-regal-navy/10 dark:border-white/5 hover:border-gold-500/30 rounded-3xl p-6 text-ink-black-950 dark:text-white relative overflow-hidden group transition-all cursor-pointer shadow-[0_4px_24px_rgba(0,29,61,0.09)] dark:shadow-2xl">
                    <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
                        <Globe className="w-32 h-32 text-gold-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-1 text-gold-500 dark:text-gold-400 group-hover:text-gold-400 dark:group-hover:text-gold-300">Global Map View</h3>
                    <p className="text-slate-500 dark:text-gray-400 text-sm mb-4">Track your entire fleet in real-time across all active zones.</p>
                    <button
                        onClick={() => navigate('/live-map')}
                        className="bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-gold-600 dark:text-gold-400 transition-all"
                    >
                        Launch Dispatch Console
                    </button>
                </div>
                <div className="bg-white dark:bg-ink-black-900 p-6 rounded-3xl border border-regal-navy/10 dark:border-white/5 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,29,61,0.10)] dark:shadow-none transition-colors">
                    <div>
                        <div className="p-3 rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-400 w-fit mb-4 transition-colors">
                            <Zap className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-ink-black-950 dark:text-white mb-2 transition-colors">Assignment Engine</h3>
                        <p className="text-slate-500 dark:text-gray-400 text-sm mb-6 transition-colors">
                            Manually trigger the AI engine to match online drivers with pending bookings for the next 24 hours.
                        </p>
                    </div>
                    <button
                        onClick={handleRunAutoAssign}
                        disabled={runningAssignment}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-gold-500 to-amber-400 hover:from-gold-400 hover:to-amber-300 text-ink-black-950 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-gold-500/20 disabled:opacity-50"
                    >
                        {runningAssignment
                            ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ink-black-950"></div>
                            : <Play className="w-4 h-4 fill-current" />}
                    </button>
                </div>
            </motion.div>

        </motion.div>
    );
}

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ title, value, subValue, icon, color, trend, trendUp, loading }) {
    const colorStyles = {
        cyan:    { icon: 'text-cyan-400    bg-cyan-500/10    border-cyan-500/20',    glow: 'rgba(34,211,238,0.15)'  },
        violet:  { icon: 'text-violet-400  bg-violet-500/10  border-violet-500/20',  glow: 'rgba(139,92,246,0.15)' },
        emerald: { icon: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', glow: 'rgba(16,185,129,0.15)'  },
        amber:   { icon: 'text-gold-400    bg-gold-500/10    border-gold-500/20',    glow: 'rgba(234,179,8,0.15)'   },
    };
    const style = colorStyles[color] || colorStyles.cyan;

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-white dark:bg-ink-black-900 p-6 rounded-2xl relative overflow-hidden group border border-regal-navy/10 dark:border-white/10 shadow-[0_4px_24px_rgba(0,29,61,0.09),0_1px_4px_rgba(0,53,102,0.06)] dark:shadow-2xl transition-all"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl border ${style.icon}`}>{icon}</div>
                {trend && (
                    <div className={`flex items-center text-xs font-bold ${trendUp ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {trend}
                    </div>
                )}
            </div>
            <div>
                <h4 className="text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</h4>
                <div className={`text-3xl font-black font-mono tracking-tighter text-ink-black-950 dark:text-white dark:text-glow transition-colors ${loading ? 'animate-pulse bg-regal-navy/8 dark:bg-white/5 h-8 w-24 rounded' : ''}`}>
                    {!loading && value}
                </div>
                {!loading && subValue && (
                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500/70 mt-1 tracking-wide">{subValue}</div>
                )}
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-3xl opacity-20 dark:opacity-30 group-hover:opacity-50 dark:group-hover:opacity-60 transition-opacity"
                style={{ background: style.glow }} />
        </motion.div>
    );
}
