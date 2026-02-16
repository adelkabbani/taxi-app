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
                    <div className="glass-card px-4 py-2 rounded-full flex items-center gap-4">
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
                        className="p-3 glass-card rounded-full hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm"
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
                {/* Revenue Chart */}
                <motion.div
                    variants={itemVariants}
                    className="lg:col-span-2 glass-card rounded-3xl p-6 relative overflow-hidden"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Revenue Trends
                            </h3>
                            <p className="text-xs text-slate-500">Real-time financial performance</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+8.4% Growth</span>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.revenueTrend.map(d => ({
                                ...d,
                                hourLabel: new Date(d.hour).getHours() + ':00',
                                revenue: Number(d.revenue)
                            }))}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.1} />
                                <XAxis
                                    dataKey="hourLabel"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    minTickGap={30}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickFormatter={(value) => `€${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value) => [`€${value}`, 'Revenue']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Control Panel & Quick Stats */}
                <div className="space-y-6">
                    {/* Dispatch Status Control */}
                    <motion.div variants={itemVariants} className="glass-card rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 dark:text-white">Dispatch Control</h3>
                            <div className={`w-2 h-2 rounded-full ${settings.stop_sell ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold uppercase text-slate-500">System Status</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${settings.stop_sell ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
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
                                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'
                                    : 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                                }`}
                        >
                            {updatingSettings ? 'Updating...' : settings.stop_sell ? 'Resume Operations' : 'Emergency Stop'}
                        </button>
                    </motion.div>

                    {/* Activity Feed Mini */}
                    <motion.div variants={itemVariants} className="glass-card rounded-3xl p-6 flex-1 min-h-[200px]">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-500" />
                            Live Feed
                        </h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {stats.recentActivity.length > 0 ? (
                                stats.recentActivity.slice(0, 5).map((activity) => (
                                    <div key={activity.id} className="flex gap-3 items-start">
                                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${getStatusColorDot(activity.status)}`} />
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {activity.booking_reference}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {formatTime(activity.updated_at)} · {activity.status.replace('_', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-400 text-sm italic text-center py-4">No recent activity</p>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Bottom Quick Actions */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group hover:-translate-y-1 transition-transform cursor-pointer">
                    <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Globe className="w-32 h-32" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">Global Map View</h3>
                    <p className="text-indigo-100 text-sm mb-4">Track your entire fleet in real-time across all active zones.</p>
                    <button className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold group-hover:bg-white group-hover:text-indigo-600 transition-all">
                        Launch Map
                    </button>
                </div>

                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group hover:-translate-y-1 transition-transform cursor-pointer">
                    <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Coins className="w-32 h-32" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">Financial Report</h3>
                    <p className="text-emerald-50 text-sm mb-4">Detailed breakdown of revenue, partner payouts, and margins.</p>
                    <button className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold group-hover:bg-white group-hover:text-teal-600 transition-all">
                        View Report
                    </button>
                </div>
            </motion.div>

        </motion.div>
    );
}

function StatCard({ title, value, icon, color, trend, trendUp, loading }) {
    const colorStyles = {
        cyan: 'text-cyan-500 bg-cyan-500/10 border-cyan-200/50',
        violet: 'text-violet-500 bg-violet-500/10 border-violet-200/50',
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-200/50',
        amber: 'text-amber-500 bg-amber-500/10 border-amber-200/50',
    };

    // Fallback if color not found
    const activeStyle = colorStyles[color] || colorStyles.cyan;

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="glass-card p-6 rounded-3xl relative overflow-hidden group"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${activeStyle.split(' ')[1]} ${activeStyle.split(' ')[0]}`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center text-xs font-bold ${trendUp ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {trend}
                    </div>
                )}
            </div>

            <div>
                <h4 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</h4>
                <div className={`text-3xl font-black text-slate-800 dark:text-white ${loading ? 'animate-pulse bg-slate-200 dark:bg-slate-700 h-8 w-24 rounded' : ''}`}>
                    {!loading && value}
                </div>
            </div>

            {/* Decoration */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${activeStyle.split(' ')[1]} blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`} />
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
