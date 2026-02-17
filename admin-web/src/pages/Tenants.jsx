import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, User, Globe, ExternalLink, Activity, Shield, Phone, Mail, Lock } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
        e.stopPropagation();
        try {
            await api.patch(`/tenants/${tenantId}/priority`, { priority: newPriority });
            toast.success(`Priority updated to ${newPriority}`);
            fetchTenants();
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
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Fleet Management
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm max-w-2xl">
                        Manage partner companies, configure fleet priorities, and oversee multi-tenant operations.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Partner Agency</span>
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-80 rounded-2xl bg-slate-900/50 animate-pulse border border-white/5" />
                    ))
                ) : tenants.length === 0 ? (
                    <div className="col-span-full py-20 text-center glass-panel rounded-2xl border border-dashed border-slate-800">
                        <Building2 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-500">No partner companies yet</h3>
                        <p className="text-slate-600 text-sm mt-1">Add a new agency to get started</p>
                    </div>
                ) : (
                    tenants.map((tenant, index) => (
                        <div
                            key={tenant.id}
                            onClick={() => navigate(`/tenants/${tenant.id}`)}
                            className="group cursor-pointer relative bg-[#0f1115]/80 backdrop-blur-md rounded-2xl p-6 border border-white/5 shadow-lg hover:shadow-2xl hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 animate-power-up"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {/* Card Header */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-center text-2xl font-black text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                    {tenant.name[0]}
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="text-lg font-bold text-white truncate group-hover:text-amber-400 transition-colors">{tenant.name}</h3>
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Globe className="w-3 h-3" />
                                        {tenant.slug}
                                    </span>
                                </div>
                            </div>

                            {/* Stats/Info */}
                            <div className="space-y-3 mb-6 p-4 rounded-xl bg-slate-900/50 border border-white/5">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Activity className="w-4 h-4 text-emerald-500" />
                                        <span>Status</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${tenant.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                                        <span className={`text-xs font-bold ${tenant.is_active ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {tenant.is_active ? 'ACTIVE' : 'SUSPENDED'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Shield className="w-4 h-4 text-blue-500" />
                                        <span>Timezone</span>
                                    </div>
                                    <span className="text-xs font-medium text-white bg-slate-800 px-2 py-0.5 rounded border border-white/5">{tenant.timezone}</span>
                                </div>
                            </div>

                            {/* Priority Selection */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dispatch Priority</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${tenant.priority === 1 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' :
                                            tenant.priority === 2 ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                                tenant.priority === 3 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                    tenant.priority === 4 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        }`}>
                                        {tenant.priority === 1 ? 'Highest' :
                                            tenant.priority === 2 ? 'High' :
                                                tenant.priority === 3 ? 'Medium' :
                                                    tenant.priority === 4 ? 'Low' : 'Lowest'}
                                    </span>
                                </div>
                                <div className="flex gap-1.5 bg-slate-900/50 p-1.5 rounded-xl border border-white/5">
                                    {[1, 2, 3, 4, 5].map((priority) => (
                                        <button
                                            key={priority}
                                            onClick={(e) => handlePriorityChange(tenant.id, priority, e)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all relative overflow-hidden ${tenant.priority === priority
                                                    ? 'text-white shadow-lg bg-gradient-to-b from-amber-500 to-orange-600 border border-orange-400/50'
                                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            {priority}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-4 border-t border-white/5 group-hover:border-white/10 transition-colors">
                                <span className="uppercase tracking-widest">View Details</span>
                                <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300 text-amber-500">
                                    <ExternalLink className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Company Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="bg-[#0f1115] w-full max-w-2xl rounded-2xl shadow-2xl border border-amber-500/20 overflow-hidden"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-transparent">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        Onboard New Agency
                                    </h2>
                                    <p className="text-slate-400 text-sm mt-1 ml-11">Create a new company environment and fleet manager account</p>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                                        <div className="glass-panel p-6 rounded-xl border border-white/5 bg-white/5">
                                            <h4 className="text-sm font-semibold text-amber-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                                <Building2 className="w-4 h-4" />
                                                Company Information
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs text-slate-400 font-medium ml-1">Company Name</label>
                                                    <input
                                                        type="text" required
                                                        placeholder="Berlin Wings"
                                                        value={formData.name}
                                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-slate-600"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs text-slate-400 font-medium ml-1">Slug (URL)</label>
                                                    <input
                                                        type="text" required
                                                        placeholder="berlin-wings"
                                                        value={formData.slug}
                                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-slate-600"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="glass-panel p-6 rounded-xl border border-white/5 bg-white/5">
                                            <h4 className="text-sm font-semibold text-amber-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                                <User className="w-4 h-4" />
                                                Fleet Manager Admin
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs text-slate-400 font-medium ml-1">First Name</label>
                                                    <input
                                                        type="text" required
                                                        value={formData.adminFirstName}
                                                        onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs text-slate-400 font-medium ml-1">Last Name</label>
                                                    <input
                                                        type="text" required
                                                        value={formData.adminLastName}
                                                        onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                                    />
                                                </div>
                                                <div className="col-span-2 space-y-1.5">
                                                    <label className="text-xs text-slate-400 font-medium ml-1">Email Address</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                                        <input
                                                            type="email" required
                                                            value={formData.adminEmail}
                                                            onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs text-slate-400 font-medium ml-1">Phone</label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                                        <input
                                                            type="text" required
                                                            value={formData.adminPhone}
                                                            onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs text-slate-400 font-medium ml-1">Temporary Password</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                                        <input
                                                            type="password" required
                                                            value={formData.adminPassword}
                                                            onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-8 py-5 bg-slate-900/80 border-t border-white/5 flex justify-end gap-3 backdrop-blur-md">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold rounded-lg text-sm shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5"
                                        >
                                            Activate Partner Environment
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
