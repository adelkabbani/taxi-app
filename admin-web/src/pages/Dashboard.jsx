import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
    Users, MapPin, Calendar, Euro, RefreshCw,
    ArrowUpRight, Clock, Activity, ShieldCheck, Database, Zap, ShieldOff, Coins,
    TrendingUp, TrendingDown, LayoutDashboard, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';

export default function Dashboard() {
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
    const [refreshing, setRefreshing] = useState(false);
    const [updatingSettings, setUpdatingSettings] = useState(false);
    const [error, setError] = useState(null);
    const [socket, setSocket] = useState(null);

    const fetchData = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        try {
            const [statsRes, healthRes, settingsRes] = await Promise.all([
                api.get('/stats/dashboard'),
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
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            if (!document.hidden) fetchData(true);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Socket.IO Connection
    useEffect(() => {
        const newSocket = io();

        newSocket.on('connect', () => {
            console.log('Dashboard socket connected');
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            newSocket.emit('authenticate', { token, userId: user.id, role: user.role });
        });

        newSocket.on('booking_created', () => {
            fetchData(true);
        });

        newSocket.on('booking_updated', () => {
            fetchData(true);
        });

        newSocket.on('driver_location', (data) => {
            // console.log('Driver location update:', data);
        });

        setSocket(newSocket);
        return () => newSocket.disconnect();
    }, []);

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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
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
                        <div className="p-2 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/30">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white">
                            Command Center
                        </h1>
                    </motion.div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        System Operational · {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-4 border border-white/5">
                        <div className="flex items-center gap-2">
                            <Database className={`w-3.5 h-3.5 ${health.database === 'ok' ? 'text-emerald-500' : 'text-red-500'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">DB</span>
                        </div>
                        <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                        <div className="flex items-center gap-2">
                            <Zap className={`w-3.5 h-3.5 ${health.redis === 'ok' ? 'text-amber-500' : 'text-red-500'}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Redis</span>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.5 }}
                        onClick={() => fetchData(true)}
                        className="p-3 glass-panel rounded-full hover:bg-white/10 transition-colors shadow-sm border border-white/5"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                    </motion.button>
                </div>
            </header>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Active Fleet"
                    value={stats.onlineDrivers}
                    icon={<Users className="w-6 h-6" />}
                    color="cyan"
                    trend="+12% vs last hr" // Mock trend
                    trendUp={true}
                    loading={loading}
                />
                <StatCard
                    title="Live Trips"
                    value={stats.activeTrips}
                    icon={<MapPin className="w-6 h-6" />}
                    color="violet"
                    trend="High Demand"
                    trendUp={true}
                    loading={loading}
                />
                <StatCard
                    title="Today's Revenue"
                    value={formatCurrency(stats.todaysRevenue)}
                    icon={<Euro className="w-6 h-6" />}
                    color="emerald"
                    trend="+5% vs yesterday" // Mock trend
                    trendUp={true}
                    loading={loading}
                />
                <StatCard
                    title="24h Bookings"
                    value={stats.todaysBookings}
                    icon={<Calendar className="w-6 h-6" />}
                    color="amber"
                    trend="Steady"
                    loading={loading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pulse Revenue Chart */}
                <motion.div
                    variants={itemVariants}
                    className="lg:col-span-2 glass-panel rounded-3xl p-6 relative overflow-hidden animate-power-up"
                    style={{ animationDelay: '0.1s' }}
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-gold-400" />
                                Revenue Pulse
                            </h3>
                            <p className="text-xs text-slate-400">Real-time earnings tracking</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                            <span className="text-xs font-bold text-emerald-400">+8.4% Growth</span>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.revenueTrend.map((d, i, arr) => ({
                                ...d,
                                hourLabel: new Date(d.hour).getHours() + ':00',
                                revenue: Number(d.revenue),
                                isLast: i === arr.length - 1 // Mark last point
                            }))}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FBbf24" stopOpacity={0.3} /> {/* Gold */}
                                        <stop offset="95%" stopColor="#FBbf24" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.3} />
                                <XAxis
                                    dataKey="hourLabel"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    minTickGap={30}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(value) => `€${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0a0a0c', border: '1px solid #333', borderRadius: '12px', color: '#fff' }}
                                    itemStyle={{ color: '#fbbf24' }}
                                    formatter={(value) => [`€${value}`, 'Revenue']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#fbbf24"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                    activeDot={(props) => {
                                        const { cx, cy } = props;
                                        return (
                                            <g>
                                                <circle cx={cx} cy={cy} r={6} fill="#fbbf24" stroke="white" strokeWidth={2} />
                                                <circle cx={cx} cy={cy} r={12} fill="#fbbf24" opacity={0.3}>
                                                    <animate attributeName="r" from="6" to="20" dur="1.5s" begin="0s" repeatCount="indefinite" />
                                                    <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" begin="0s" repeatCount="indefinite" />
                                                </circle>
                                            </g>
                                        );
                                    }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Fleet Health & Stats Column */}
                <div className="space-y-6">
                    {/* Fleet Health Rings */}
                    <motion.div
                        variants={itemVariants}
                        className="glass-panel rounded-3xl p-6 animate-power-up"
                        style={{ animationDelay: '0.2s' }}
                    >
                        <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            Fleet Health
                        </h3>

                        <div className="flex justify-around items-center">
                            {/* Compliance Ring */}
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="40" stroke="#333" strokeWidth="8" fill="transparent" />
                                    <circle
                                        cx="48" cy="48" r="40"
                                        stroke={stats.documents.expired > 0 ? '#f43f5e' : '#10b981'}
                                        strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray="251.2"
                                        strokeDashoffset={251.2 * (1 - (stats.documents.total > 0 ? (stats.documents.total - stats.documents.expired) / stats.documents.total : 1))}
                                        className="transition-all duration-1000 ease-out"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-xl font-bold ${stats.documents.expired > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {stats.documents.total > 0 ? Math.round(((stats.documents.total - stats.documents.expired) / stats.documents.total) * 100) : 100}%
                                    </span>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">Docs</span>
                                </div>
                            </div>

                            {/* Active Fleet Ring */}
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="40" stroke="#333" strokeWidth="8" fill="transparent" />
                                    <circle
                                        cx="48" cy="48" r="40"
                                        stroke="#0ea5e9"
                                        strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray="251.2"
                                        strokeDashoffset={251.2 * 0.25} // Mock 75% availability
                                        className="transition-all duration-1000 ease-out"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-bold text-sky-500">
                                        {stats.onlineDrivers}
                                    </span>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">Online</span>
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

                    {/* Dispatch Status Control */}
                    <motion.div
                        variants={itemVariants}
                        className="glass-panel rounded-3xl p-6 animate-power-up"
                        style={{ animationDelay: '0.3s' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white">Dispatch Control</h3>
                            <div className={`w-2 h-2 rounded-full ${settings.stop_sell ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                        </div>

                        <div className="bg-slate-900/50 rounded-2xl p-4 mb-4 border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold uppercase text-slate-500">System Status</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${settings.stop_sell ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    {settings.stop_sell ? 'SUSPENDED' : 'ONLINE'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                {settings.stop_sell ? 'New bookings are currently paused.' : 'System is accepting new bookings normally.'}
                            </p>
                        </div>

                        <button
                            disabled={updatingSettings}
                            onClick={() => updateSettings({ stop_sell: !settings.stop_sell })}
                            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${settings.stop_sell
                                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
                                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'
                                }`}
                        >
                            {updatingSettings ? 'Updating...' : settings.stop_sell ? 'Resume Operations' : 'Emergency Stop'}
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* Bottom Quick Actions (Activity Feed moved here or kept?) - Keeping Quick Actions for now but updated style */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-power-up" style={{ animationDelay: '0.4s' }}>
                <div className="bg-gradient-to-r from-violet-900/50 to-indigo-900/50 border border-white/5 rounded-3xl p-6 text-white relative overflow-hidden group hover:border-indigo-500/50 transition-all cursor-pointer">
                    <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Globe className="w-32 h-32" />
                    </div>
                    <h3 className="text-xl font-bold mb-1 text-indigo-300 group-hover:text-indigo-200">Global Map View</h3>
                    <p className="text-slate-400 text-sm mb-4">Track your entire fleet in real-time across all active zones.</p>
                    <button className="bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 px-4 py-2 rounded-xl text-sm font-bold text-indigo-200 transition-all">
                        Launch Map
                    </button>
                </div>

                <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border border-white/5 rounded-3xl p-6 text-white relative overflow-hidden group hover:border-emerald-500/50 transition-all cursor-pointer">
                    <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Coins className="w-32 h-32" />
                    </div>
                    <h3 className="text-xl font-bold mb-1 text-emerald-300 group-hover:text-emerald-200">Financial Report</h3>
                    <p className="text-slate-400 text-sm mb-4">Detailed breakdown of revenue, partner payouts, and margins.</p>
                    <button className="bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 px-4 py-2 rounded-xl text-sm font-bold text-emerald-200 transition-all">
                        View Report
                    </button>
                </div>
            </motion.div>

        </motion.div>
    );
}

function StatCard({ title, value, icon, color, trend, trendUp, loading }) {
    const colorStyles = {
        cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        amber: 'text-gold-400 bg-gold-500/10 border-gold-500/20',
    };

    // Fallback
    const activeStyle = colorStyles[color] || colorStyles.cyan;
    const glowColor = color === 'amber' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(56, 189, 248, 0.4)';

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="glass-panel p-6 rounded-3xl relative overflow-hidden group border border-white/5 hover:border-white/10"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${activeStyle}`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center text-xs font-bold ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {trend}
                    </div>
                )}
            </div>

            <div>
                <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</h4>
                <div className={`text-3xl font-black font-mono tracking-tighter text-white ${loading ? 'animate-pulse bg-slate-800 h-8 w-24 rounded' : ''}`} style={{ textShadow: `0 0 20px ${glowColor}` }}>
                    {!loading && value}
                </div>
            </div>

            {/* Gradient Orb Decoration */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${activeStyle.split(' ')[1]} blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`} />
        </motion.div>
    );
}

function getStatusColorDot(status) {
    switch (status) {
        case 'pending': return 'bg-amber-400';
        case 'completed': return 'bg-emerald-400';
        case 'cancelled': return 'bg-red-400';
        case 'started': return 'bg-sky-400';
        default: return 'bg-slate-300';
    }
}

function formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
