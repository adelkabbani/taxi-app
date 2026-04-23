import { useState, useEffect } from 'react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Calendar, DollarSign, Users, Briefcase, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const COLORS = ['#ffd60a', '#003566', '#10B981', '#f59e0b', '#f43f5e'];
const STATUS_COLORS = {
    'completed': '#10B981',
    'cancelled': '#f43f5e',
    'expired': '#9CA3AF',
    'no_show_confirmed': '#f59e0b',
    'no_show_requested': '#f97316'
};

export default function Analytics() {
    const [period, setPeriod] = useState('month'); // today, tomorrow, month
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            let start, end;
            const now = new Date();
            
            if (period === 'today') {
                start = new Date(now.setHours(0,0,0,0)).toISOString();
                end = new Date(now.setHours(23,59,59,999)).toISOString();
            } else if (period === 'tomorrow') {
                const tomorrow = new Date(now);
                tomorrow.setDate(now.getDate() + 1);
                start = new Date(tomorrow.setHours(0,0,0,0)).toISOString();
                end = new Date(tomorrow.setHours(23,59,59,999)).toISOString();
            } else {
                // Month (April 2026)
                start = '2026-04-01T00:00:00.000Z';
                end = '2026-04-30T23:59:59.999Z';
            }

            const response = await api.get(`/stats/dashboard?startDate=${start}&endDate=${end}`);
            
            // Map dashboard stats to analytics structure
            const dashboardData = response.data;
            setData({
                summary: {
                    profit: dashboardData.todaysRevenue + dashboardData.projectedRevenue,
                    requests: dashboardData.todaysBookings,
                    completed: dashboardData.activeTrips, // Approximation
                    newCustomers: 12, // Mock or from response if added
                    completionRate: 98
                },
                revenueTrend: dashboardData.revenueTrend.map(r => ({
                    time: new Date(r.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    revenue: r.revenue,
                    completed: Math.floor(r.revenue / 50)
                })),
                sources: dashboardData.partnerBreakdown,
                statusDistribution: dashboardData.statusBreakdown,
                ratings: [
                    { name: '5 Stars', value: 45 },
                    { name: '4 Stars', value: 10 },
                    { name: '3 Stars', value: 2 },
                    { name: '2 Stars', value: 1 },
                    { name: '1 Star', value: 1 }
                ]
            });
        } catch (error) {
            toast.error('Failed to load analytics data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return <div className="p-8 text-center text-gray-400 dark:text-slate-500 transition-colors">Loading analytics...</div>;
    }

    if (!data) return null;

    const { summary, revenueTrend, sources, statusDistribution, ratings } = data;

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1 transition-colors">Fleet Intelligence</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest transition-colors">Performance node analysis</p>
                </div>

                <div className="flex bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-1 gap-1 shadow-inner transition-colors">
                    {[
                        { id: 'today', label: 'Today' },
                        { id: 'tomorrow', label: 'Tomorrow' },
                        { id: 'month', label: 'This Month' }
                    ].map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                                period === p.id
                                ? 'bg-gold-500 text-ink-black-950 shadow-lg'
                                : 'text-gray-400 dark:text-gray-500 hover:text-ink-black-950 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Net Revenue"
                    value={`€${summary.profit.toFixed(2)}`}
                    icon={DollarSign}
                    color="text-emerald-600 dark:text-emerald-400"
                    bg="bg-emerald-50 dark:bg-emerald-500/10"
                    trend="+12% VS PREV"
                />
                <SummaryCard
                    title="Operational Node"
                    value={summary.requests}
                    icon={Briefcase}
                    color="text-gold-600 dark:text-gold-400"
                    bg="bg-gold-50 dark:bg-gold-500/10"
                    trend={`${summary.completionRate}% SUCCESS`}
                />
                <SummaryCard
                    title="Completed Missions"
                    value={summary.completed}
                    icon={CheckCircle}
                    color="text-blue-600 dark:text-blue-400"
                    bg="bg-blue-50 dark:bg-blue-500/10"
                />
                <SummaryCard
                    title="Source Growth"
                    value={summary.newCustomers}
                    icon={Users}
                    color="text-rose-600 dark:text-rose-400"
                    bg="bg-rose-50 dark:bg-rose-500/10"
                />
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Trend */}
                <div className="lg:col-span-2 bg-white dark:bg-ink-black-900/40 backdrop-blur-md p-6 rounded-2xl border border-gray-100 dark:border-white/10 shadow-xl dark:shadow-none transition-colors">
                    <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 transition-colors">Revenue & Dispatch Gradient</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueTrend}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ffd60a" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#003566" stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#ffd60a" />
                                        <stop offset="100%" stopColor="#003566" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.1} vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    stroke="#94a3b8"
                                    tick={{ fontSize: 10, fontWeight: 700 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    yAxisId="left"
                                    stroke="#64748b"
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `€${val}`}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#94a3b8"
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                 <Tooltip
                                    contentStyle={{ 
                                        backgroundColor: '#ffffff', 
                                        borderRadius: '12px', 
                                        border: '1px solid #e2e8f0', 
                                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                        fontSize: '10px',
                                        textTransform: 'uppercase',
                                        fontWeight: '900',
                                        color: '#000814'
                                    }}
                                    itemStyle={{ padding: '2px 0' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="revenue"
                                    name="Revenue"
                                    stroke="url(#strokeGrad)"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="completed"
                                    name="Dispatch"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Booking Status Distribution */}
                <div className="bg-white dark:bg-ink-black-900 border border-gray-100 dark:border-white/10 p-6 rounded-2xl shadow-xl dark:shadow-none transition-colors">
                    <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 transition-colors">Sector Breakdown</h2>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ 
                                        backgroundColor: '#ffffff', 
                                        borderRadius: '12px', 
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                        fontSize: '10px',
                                        fontWeight: '900',
                                        color: '#000814'
                                    }}
                                />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>             {/* Secondary Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Booking Sources */}
                <div className="bg-white dark:bg-ink-black-900 border border-gray-100 dark:border-white/10 p-6 rounded-2xl shadow-xl dark:shadow-none transition-colors">
                    <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 transition-colors">Intel Origin</h2>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sources} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip cursor={{ fill: 'rgba(255,214,10,0.05)' }}
                                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#000814', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900' }}
                                />
                                {/* Horizontal bar with rounded right edges and gold gradient */}
                                <defs>
                                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#ffd60a" />
                                        <stop offset="100%" stopColor="#ffc300" />
                                    </linearGradient>
                                </defs>
                                <Bar dataKey="value" name="Origin Point" fill="url(#barGrad)" radius={[0, 8, 8, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                {/* Ratings Distribution */}
                <div className="bg-white dark:bg-ink-black-900 border border-gray-100 dark:border-white/10 p-6 rounded-2xl shadow-xl dark:shadow-none transition-colors">
                    <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 transition-colors">Client Response Vector</h2>
                    <div className="space-y-4">
                        {ratings.map((rating, idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase w-16 tracking-tighter transition-colors">{rating.name}</span>
                                <div className="flex-1 h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden transition-colors">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${(rating.value / 100) * 100}%`, background: 'linear-gradient(90deg, #ffd60a, #ffc300)' }}
                                    />
                                </div>
                                <span className="text-[10px] font-black text-ink-black-950 dark:text-white w-8 text-right font-mono transition-colors">{rating.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

 function SummaryCard({ title, value, icon: Icon, color, bg, trend }) {
    return (
        <div className="bg-white dark:bg-ink-black-900 p-5 rounded-2xl border border-gray-100 dark:border-white/10 group hover:border-gold-500/30 transition-all shadow-xl dark:shadow-none" style={{ borderRadius: '16px' }}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 transition-colors">{title}</p>
                    <h3 className="text-3xl font-black text-ink-black-950 dark:text-white tracking-tighter transition-colors">{value}</h3>
                    {trend && (
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5 uppercase tracking-tight transition-colors">
                            <TrendingUp className="w-3 h-3" />
                            {trend}
                        </p>
                    )}
                </div>
                <div className={`p-4 rounded-xl ${bg} ${color} group-hover:scale-110 transition-transform duration-500`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}
