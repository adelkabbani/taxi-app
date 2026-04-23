import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Building2, Users, Calendar,
    TrendingUp, Shield, Mail, Phone, ExternalLink,
    Car, Wallet, CheckCircle2
} from 'lucide-react';
import api from '../lib/api';
import AvailabilityBadge from '../components/AvailabilityBadge';
import { toast } from 'react-hot-toast';

export default function TenantDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [tenant, setTenant] = useState(null);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const tenantRes = await api.get(`/tenants/${id}`);
                setTenant(tenantRes.data.data);
                const driversRes = await api.get(`/drivers`, { params: { tenant_id: id, includeStale: true } });
                setDrivers(driversRes.data.data);
            } catch (err) {
                console.error('Failed to fetch tenant details', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleLaunchConsole = () => {
        localStorage.setItem('tenantOverride', tenant.id);
        localStorage.setItem('tenantOverrideName', tenant.name);
        toast.success(`Switching to ${tenant.name} view`);
        navigate('/dashboard');
    };

    if (loading) return <div className="h-full flex items-center justify-center bg-white dark:bg-ink-black-950 transition-colors">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto"></div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Accessing Node Data...</p>
        </div>
    </div>;
    if (!tenant) return <div className="p-8 text-rose-500">Agency not found</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-6">
                <button
                    onClick={() => navigate('/tenants')}
                    className="p-3 rounded-xl bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-white/5 text-gray-400 dark:text-slate-400 hover:text-ink-black-950 dark:hover:text-white transition-all group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="h-16 w-16 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-3xl font-black text-gold-400 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
                    {tenant.name[0]}
                </div>
                <div>
                    <h1 className="text-3xl font-black text-ink-black-950 dark:text-white uppercase tracking-tight transition-colors">{tenant.name}</h1>
                    <div className="flex items-center gap-3 text-[10px] font-black text-gray-400 dark:text-gray-500 mt-2 transition-colors">
                        <span className="uppercase tracking-[0.2em] bg-gray-50 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-white/5">External Agency Node</span>
                        <span className="text-gray-200 dark:text-white/10">•</span>
                        <span className="text-gold-600 dark:text-gold-400 uppercase flex items-center gap-2 tracking-widest">
                            <Building2 className="w-3.5 h-3.5" />
                            {tenant.slug}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-ink-black-900/40 backdrop-blur-md p-6 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gold-500/20 transition-all group shadow-sm dark:shadow-none">
                    <div className="p-2.5 bg-gold-500/10 text-gold-600 dark:text-gold-400 w-fit rounded-xl mb-4 group-hover:bg-gold-500 group-hover:text-ink-black-950 transition-colors">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-black text-ink-black-950 dark:text-white tracking-tighter transition-colors">{drivers.length}</div>
                    <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2 px-1 transition-colors">Active Personnel</div>
                </div>
                <div className="bg-white dark:bg-ink-black-900/40 backdrop-blur-md p-6 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-emerald-500/20 transition-all group shadow-sm dark:shadow-none">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit rounded-xl mb-4 group-hover:bg-emerald-500 group-hover:text-ink-black-950 transition-colors">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter transition-colors">--</div>
                    <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2 px-1 transition-colors">Daily Operations</div>
                </div>
                <div className="bg-white dark:bg-ink-black-900/40 backdrop-blur-md p-6 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-cyan-500/20 transition-all group shadow-sm dark:shadow-none">
                    <div className="p-2.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 w-fit rounded-xl mb-4 group-hover:bg-cyan-500 group-hover:text-ink-black-950 transition-colors">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400 tracking-tighter transition-colors">€0.00</div>
                    <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2 px-1 transition-colors">Node Revenue</div>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20 transition-all group shadow-sm dark:shadow-none">
                    <div className="p-2.5 bg-white/10 dark:bg-white/5 text-gray-400 w-fit rounded-xl mb-4 group-hover:bg-white group-hover:text-ink-black-950 transition-colors">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-black text-gray-300 dark:text-white tracking-tighter uppercase opacity-50 transition-colors">Active</div>
                    <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2 px-1 transition-colors">Sub Priority</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Driver List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Car className="w-4 h-4 text-gold-500" />
                            Assigned Fleet Agents
                        </h2>
                        <span className="text-[9px] font-black text-gold-400 px-3 py-1 bg-gold-500/10 border border-gold-500/20 rounded-lg uppercase tracking-widest shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                            {drivers.length} LINKED
                        </span>
                    </div>

                    <div className="bg-white dark:bg-ink-black-950/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-xl transition-colors">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-slate-900/50 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-white/5 transition-colors">
                                <tr>
                                    <th className="px-6 py-4">Driver Profile</th>
                                    <th className="px-6 py-4">Vehicle</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {drivers.map(driver => (
                                    <tr key={driver.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 flex items-center justify-center font-black text-[10px] tracking-tighter border border-gray-200 dark:border-white/5 group-hover:border-gold-500/30 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-all duration-300">
                                                    {driver.first_name?.[0]}{driver.last_name?.[0]}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-ink-black-950 dark:text-white group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors uppercase tracking-tight">{driver.first_name} {driver.last_name}</span>
                                                    <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 flex items-center gap-2">
                                                        <Mail className="w-3 h-3" />
                                                        {driver.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300 font-mono tracking-wider">{driver.license_plate || '—'}</span>
                                                <span className="text-[10px] font-black text-gold-600 dark:text-gold-500/70 uppercase tracking-widest">{driver.vehicle_type || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <AvailabilityBadge availability={driver.availability} />
                                        </td>
                                    </tr>
                                ))}
                                {drivers.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-8 py-16 text-center text-slate-500">
                                            <Car className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                            <p className="font-medium">No drivers registered in this agency yet.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Contact Card */}
                <div className="space-y-4">
                    <h2 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-2 flex items-center gap-2 transition-colors">
                        <Phone className="w-4 h-4 text-emerald-500" />
                        Intelligence Contact
                    </h2>
                    <div className="bg-white dark:bg-ink-black-950/90 backdrop-blur-md rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-xl space-y-6 relative overflow-hidden transition-colors">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl text-gold-600 dark:text-amber-500 border border-gray-100 dark:border-white/5 transition-colors">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 transition-colors">Authorization Uplink</div>
                                <div className="text-sm font-bold text-ink-black-800 dark:text-gray-200 hover:text-gold-600 dark:hover:text-gold-400 transition-colors cursor-pointer tracking-tight">contact@agency.com</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl text-emerald-600 dark:text-emerald-500 border border-gray-100 dark:border-white/5 transition-colors">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 transition-colors">Direct Neural Frequency</div>
                                <div className="text-sm font-bold text-ink-black-800 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors tracking-tight font-mono">+49 123 456 789</div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 dark:border-white/5 relative z-10 transition-colors">
                            <button
                                onClick={handleLaunchConsole}
                                className="w-full py-4 bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-ink-black-950 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-gold-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 group"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Launch Orbital Console
                            </button>
                            <p className="text-[10px] text-center text-gray-400 dark:text-slate-500 mt-4 uppercase font-bold tracking-widest flex items-center justify-center gap-1">
                                <Shield className="w-3 h-3" />
                                Secured Admin Access
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
