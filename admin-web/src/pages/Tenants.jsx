import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, User, Mail, Phone, Lock, Globe, ExternalLink } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';

export default function Tenants() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPhone: '',
        adminPassword: ''
    });

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const res = await api.get('/tenants');
            setTenants(res.data.data);
        } catch (err) {
            console.error('Failed to fetch tenants', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePriorityChange = async (tenantId, newPriority, e) => {
        e.stopPropagation(); // Prevent card click event
        try {
            await api.patch(`/tenants/${tenantId}/priority`, { priority: newPriority });
            toast.success(`Priority updated to ${newPriority}`);
            fetchTenants(); // Refresh to show new priority
        } catch (error) {
            toast.error('Failed to update priority');
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tenants', formData);
            toast.success('Company and Fleet Manager created!');
            setIsModalOpen(false);
            fetchTenants();
            setFormData({
                name: '', slug: '', adminFirstName: '', adminLastName: '',
                adminEmail: '', adminPhone: '', adminPassword: ''
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create tenant');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Fleet Management</h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage partner companies and their fleet managers.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold shadow-lg shadow-sky-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Add Partner Agency
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-white dark:bg-slate-800 animate-pulse border border-slate-100 dark:border-slate-800" />)
                ) : tenants.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                        <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-400">No partner companies yet</h3>
                    </div>
                ) : (
                    tenants.map((tenant) => (
                        <div
                            key={tenant.id}
                            onClick={() => navigate(`/tenants/${tenant.id}`)}
                            className="group cursor-pointer relative bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl font-black text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                                    {tenant.name[0]}
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{tenant.name}</h3>
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Slug: {tenant.slug}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Globe className="w-4 h-4" />
                                    <span>Timezone: {tenant.timezone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${tenant.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{tenant.is_active ? 'ACTIVE ACCOUNT' : 'SUSPENDED'}</span>
                                </div>
                            </div>

                            {/* Priority Selection */}
                            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Priority Level</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${tenant.priority === 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            tenant.priority === 2 ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' :
                                                tenant.priority === 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                    tenant.priority === 4 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {tenant.priority === 1 ? 'Highest' :
                                            tenant.priority === 2 ? 'High' :
                                                tenant.priority === 3 ? 'Medium' :
                                                    tenant.priority === 4 ? 'Low' : 'Lowest'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((priority) => (
                                        <button
                                            key={priority}
                                            onClick={(e) => handlePriorityChange(tenant.id, priority, e)}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tenant.priority === priority
                                                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-105'
                                                    : 'bg-white dark:bg-slate-700 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-600'
                                                }`}
                                        >
                                            {priority}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 text-center">1 = Highest Priority, 5 = Lowest</p>
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-300 tracking-[0.2em] uppercase">Partner Details</span>
                                <button className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-all">
                                    <ExternalLink className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Company Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

                        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-2xl transition-all border border-slate-200 dark:border-slate-800 p-8">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Onboard New Agency</h2>
                            <p className="text-slate-500 mb-8 text-sm">This will create a new company environment and a fleet manager account.</p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-1">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Company Name</label>
                                        <input
                                            type="text" required
                                            placeholder="Berlin Wings"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-sky-500"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Slug (Unique Name)</label>
                                        <input
                                            type="text" required
                                            placeholder="berlin-wings"
                                            value={formData.slug}
                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-sky-500"
                                        />
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl space-y-4">
                                    <span className="text-xs font-black text-sky-500 uppercase tracking-widest">Initial Fleet Manager</span>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            type="text" placeholder="First Name" required
                                            value={formData.adminFirstName}
                                            onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                                            className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border-none"
                                        />
                                        <input
                                            type="text" placeholder="Last Name" required
                                            value={formData.adminLastName}
                                            onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                                            className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border-none"
                                        />
                                        <input
                                            type="email" placeholder="Email" required
                                            value={formData.adminEmail}
                                            onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                                            className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border-none col-span-2"
                                        />
                                        <input
                                            type="text" placeholder="Phone" required
                                            value={formData.adminPhone}
                                            onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                                            className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border-none"
                                        />
                                        <input
                                            type="password" placeholder="Temporary Password" required
                                            value={formData.adminPassword}
                                            onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                                            className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white font-black rounded-2xl shadow-xl shadow-sky-500/20 transition-all"
                                >
                                    Activate Partner Environment
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
