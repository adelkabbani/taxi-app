import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Building2, Users, Calendar,
    TrendingUp, Shield, Mail, Phone, ExternalLink
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

    if (loading) return <div className="p-8 animate-pulse text-slate-400">Loading Agency Data...</div>;
    if (!tenant) return <div className="p-8 text-red-500">Agency not found</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/tenants')}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="h-12 w-12 rounded-xl bg-sky-500 flex items-center justify-center text-white font-black text-xl">
                    {tenant.name[0]}
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{tenant.name}</h1>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span className="uppercase tracking-widest">External Agency</span>
                        <span>•</span>
                        <span className="text-sky-500 uppercase">{tenant.slug}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800">
                    <div className="p-2 bg-sky-500/10 text-sky-500 w-fit rounded-lg mb-4">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{drivers.length}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Drivers</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 w-fit rounded-lg mb-4">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-black text-emerald-500">--</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bookings (24h)</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800">
                    <div className="p-2 bg-indigo-500/10 text-indigo-500 w-fit rounded-lg mb-4">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-black text-indigo-500">€0.00</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue</div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800">
                    <div className="p-2 bg-amber-500/10 text-amber-500 w-fit rounded-lg mb-4">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-black text-amber-500">Active</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sub Status</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Assigned Drivers</h2>
                        <span className="text-xs font-bold text-slate-400 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">{drivers.length} TOTAL</span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="px-8 py-4">Driver Profile</th>
                                    <th className="px-8 py-4">Vehicle</th>
                                    <th className="px-8 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {drivers.map(driver => (
                                    <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white">{driver.first_name} {driver.last_name}</span>
                                                <span className="text-xs text-slate-400">{driver.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{driver.license_plate}</span>
                                                <span className="text-[10px] font-black text-sky-500 uppercase">{driver.vehicle_type}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <AvailabilityBadge availability={driver.availability} />
                                        </td>
                                    </tr>
                                ))}
                                {drivers.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-8 py-10 text-center text-slate-400 font-medium">No drivers registered in this agency yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Agency Contact</h2>
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Support Email</div>
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">contact@agency.com</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Emergency Line</div>
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">+49 123 456 789</div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={handleLaunchConsole}
                                className="w-full py-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl font-black shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Launch Agency Console
                            </button>
                            <p className="text-[10px] text-center text-slate-400 mt-4 uppercase font-bold tracking-widest">Impersonate Fleet Manager</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
