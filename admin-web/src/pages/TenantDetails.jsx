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

    if (loading) return <div className="p-8 animate-pulse text-amber-500 font-medium">Loading Agency Data...</div>;
    if (!tenant) return <div className="p-8 text-rose-500">Agency not found</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-6">
                <button
                    onClick={() => navigate('/tenants')}
                    className="p-3 rounded-xl bg-slate-900/50 border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white transition-all group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-center text-3xl font-black text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                    {tenant.name[0]}
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">{tenant.name}</h1>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-400 mt-1">
                        <span className="uppercase tracking-widest bg-slate-800/50 px-2 py-0.5 rounded border border-white/5">External Agency</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-amber-500 uppercase flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {tenant.slug}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#0f1115]/80 backdrop-blur-sm p-6 rounded-2xl border border-white/5 hover:border-amber-500/20 transition-all group">
                    <div className="p-2 bg-amber-500/10 text-amber-500 w-fit rounded-lg mb-4 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight">{drivers.length}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total Drivers</div>
                </div>
                <div className="bg-[#0f1115]/80 backdrop-blur-sm p-6 rounded-2xl border border-white/5 hover:border-emerald-500/20 transition-all group">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 w-fit rounded-lg mb-4 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-black text-emerald-500 tracking-tight">--</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Bookings (24h)</div>
                </div>
                <div className="bg-[#0f1115]/80 backdrop-blur-sm p-6 rounded-2xl border border-white/5 hover:border-purple-500/20 transition-all group">
                    <div className="p-2 bg-purple-500/10 text-purple-500 w-fit rounded-lg mb-4 group-hover:bg-purple-500 group-hover:text-black transition-colors">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-black text-purple-400 tracking-tight">€0.00</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Revenue</div>
                </div>
                <div className="bg-[#0f1115]/80 backdrop-blur-sm p-6 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all group">
                    <div className="p-2 bg-blue-500/10 text-blue-500 w-fit rounded-lg mb-4 group-hover:bg-blue-500 group-hover:text-black transition-colors">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-black text-blue-400 tracking-tight">Active</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Sub Status</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Driver List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Car className="w-5 h-5 text-amber-500" />
                            Assigned Drivers
                        </h2>
                        <span className="text-xs font-bold text-amber-500 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                            {drivers.length} REGISTERED
                        </span>
                    </div>

                    <div className="bg-[#0f1115]/80 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4">Driver Profile</th>
                                    <th className="px-6 py-4">Vehicle</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {drivers.map(driver => (
                                    <tr key={driver.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm border border-white/5 group-hover:border-amber-500/30 group-hover:text-amber-500 transition-colors">
                                                    {driver.first_name?.[0]}{driver.last_name?.[0]}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-200 group-hover:text-white transition-colors">{driver.first_name} {driver.last_name}</span>
                                                    <span className="text-xs text-slate-500">{driver.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-400">{driver.license_plate || '—'}</span>
                                                <span className="text-[10px] font-black text-amber-500/70 uppercase">{driver.vehicle_type || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
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
                    <h2 className="text-lg font-black text-white uppercase tracking-widest px-2 flex items-center gap-2">
                        <Phone className="w-5 h-5 text-emerald-500" />
                        Agency Contact
                    </h2>
                    <div className="bg-[#0f1115]/90 backdrop-blur-md rounded-2xl p-6 border border-white/5 shadow-xl space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-slate-900 rounded-xl text-amber-500 border border-white/5">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Support Email</div>
                                <div className="text-sm font-bold text-slate-200 hover:text-amber-500 transition-colors cursor-pointer">contact@agency.com</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-slate-900 rounded-xl text-emerald-500 border border-white/5">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Emergency Line</div>
                                <div className="text-sm font-bold text-slate-200">+49 123 456 789</div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5 relative z-10">
                            <button
                                onClick={handleLaunchConsole}
                                className="w-full py-4 bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 hover:border-amber-500/50 text-white rounded-xl font-black shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group"
                            >
                                <ExternalLink className="w-4 h-4 text-emerald-500" />
                                Launch Agency Console
                            </button>
                            <p className="text-[10px] text-center text-slate-500 mt-4 uppercase font-bold tracking-widest flex items-center justify-center gap-1">
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
