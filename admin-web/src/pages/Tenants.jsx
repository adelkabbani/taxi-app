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
                    <h1 className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-1 transition-colors">Fleet Orchestration</h1>
                    <p className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest transition-colors">Manage partner nodes and multi-tenant protocols</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gold-400 hover:bg-gold-500 text-ink-black-950 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_10px_15px_-3px_rgba(234,179,8,0.2)] active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Initialize Node
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-80 rounded-2xl bg-slate-900/50 animate-pulse border border-white/5" />
                    ))
                ) : tenants.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-ink-black-900 rounded-2xl border border-dashed border-gray-200 dark:border-white/5 transition-colors">
                        <Building2 className="w-16 h-16 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-400 dark:text-slate-500">No partner companies yet</h3>
                        <p className="text-gray-500 dark:text-slate-600 text-sm mt-1">Add a new agency to get started</p>
                    </div>
                ) : (
                    tenants.map((tenant, index) => (
                        <div
                            key={tenant.id}
                            onClick={() => navigate(`/drivers?tenantId=${tenant.id}`)}
                            className="group cursor-pointer relative bg-white dark:bg-ink-black-900 backdrop-blur-md rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm dark:shadow-lg hover:shadow-xl dark:hover:shadow-2xl hover:border-gold-500/30 transition-all duration-300 hover:-translate-y-1"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {/* Card Header */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-14 w-14 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-2xl font-black text-gold-500 group-hover:bg-gold-500 group-hover:text-ink-black-950 transition-all duration-300 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                    {tenant.name[0]}
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="text-lg font-black text-ink-black-950 dark:text-white truncate group-hover:text-gold-600 dark:group-hover:text-gold-500 transition-colors uppercase tracking-tight">{tenant.name}</h3>
                                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-1.5 transition-colors">
                                        <Globe className="w-3.5 h-3.5" />
                                        {tenant.slug}
                                    </span>
                                </div>
                            </div>

                             {/* Stats/Info */}
                            <div className="space-y-3 mb-6 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 transition-colors">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest transition-colors">Protocol Status</span>
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${tenant.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                                        <span className={`text-[10px] font-black tracking-widest ${tenant.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {tenant.is_active ? 'NOMINAL' : 'RESTRICTED'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest transition-colors">Temporal Node</span>
                                    <span className="text-[9px] font-black text-ink-black-900 dark:text-white bg-white dark:bg-white/5 px-2 py-0.5 rounded-lg border border-gray-100 dark:border-white/5 uppercase transition-colors">{tenant.timezone}</span>
                                </div>
                            </div>

                            {/* Priority Selection */}
                             <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest transition-colors">Dispatch Priority</span>
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
                                <div className="flex gap-1.5 bg-gray-50 dark:bg-white/5 p-1 rounded-xl border border-gray-100 dark:border-white/5 transition-colors">
                                    {[1, 2, 3, 4, 5].map((priority) => (
                                        <button
                                            key={priority}
                                            onClick={(e) => handlePriorityChange(tenant.id, priority, e)}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${tenant.priority === priority
                                                    ? 'bg-gold-500 text-ink-black-950 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                                                    : 'text-gray-500 hover:text-ink-black-950 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            {priority}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-black text-gray-400 dark:text-gray-500 pt-4 border-t border-gray-100 dark:border-white/5 group-hover:border-gold-500/20 transition-colors">
                                <span className="uppercase tracking-widest">View Fleet</span>
                                <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300 text-gold-400">
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
                            className="fixed inset-0 bg-ink-black-950/80 backdrop-blur-sm z-50"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="bg-white dark:bg-ink-black-950 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-white/5 overflow-hidden transition-colors"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="px-8 py-6 border-b border-gray-100 dark:border-white/5 bg-gradient-to-r from-gold-500/10 to-transparent transition-colors">
                                    <h2 className="text-[10px] font-black text-ink-black-950 dark:text-white uppercase tracking-[0.2em] flex items-center gap-3 transition-colors">
                                        <div className="p-2 rounded-lg bg-gold-500/10 dark:bg-gold-400 text-gold-600 dark:text-ink-black-950">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        Initialize Fleet Node
                                    </h2>
                                    <p className="text-gray-500 text-[10px] font-black mt-2 ml-12 uppercase tracking-widest">Provision new environment and administrative protocols</p>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                                        <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-xl border border-gray-100 dark:border-white/5 transition-colors">
                                            <h4 className="text-sm font-semibold text-gold-600 dark:text-amber-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                                <Building2 className="w-4 h-4" />
                                                Company Information
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Company Designation</label>
                                                    <input
                                                        type="text" required
                                                        placeholder="BERLIN WINGS"
                                                        value={formData.name}
                                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                        className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-xl py-2.5 px-3 text-[10px] font-black uppercase tracking-widest text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-700"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Logic Slug</label>
                                                    <input
                                                        type="text" required
                                                        placeholder="berlin-wings"
                                                        value={formData.slug}
                                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/ /g, '-') })}
                                                        className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-xl py-2.5 px-3 text-[10px] font-black uppercase tracking-widest text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-700"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-xl border border-gray-100 dark:border-white/5 transition-colors">
                                            <h4 className="text-sm font-semibold text-gold-600 dark:text-amber-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                                <User className="w-4 h-4" />
                                                Fleet Manager Admin
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">First Name</label>
                                                    <input
                                                        type="text" required
                                                        placeholder="JOHN"
                                                        value={formData.adminFirstName}
                                                        onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                                                        className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-xl py-2.5 px-3 text-[10px] font-black uppercase tracking-widest text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-700"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Last Name</label>
                                                    <input
                                                        type="text" required
                                                        placeholder="DOE"
                                                        value={formData.adminLastName}
                                                        onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                                                        className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-xl py-2.5 px-3 text-[10px] font-black uppercase tracking-widest text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-700"
                                                    />
                                                </div>
                                                <div className="col-span-2 space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                                                    <div className="relative group">
                                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-gold-500 transition-colors" />
                                                        <input
                                                            type="email" required
                                                            placeholder="ADMIN@FLEET.COM"
                                                            value={formData.adminEmail}
                                                            onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                                                            className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-xl py-2.5 pl-10 pr-3 text-[10px] font-black uppercase tracking-widest text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-700"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Phone</label>
                                                    <div className="relative group">
                                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-gold-500 transition-colors" />
                                                        <input
                                                            type="text" required
                                                            placeholder="+1 234 567 890"
                                                            value={formData.adminPhone}
                                                            onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                                                            className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-xl py-2.5 pl-10 pr-3 text-[10px] font-black uppercase tracking-widest text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-700"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Temporary Password</label>
                                                    <div className="relative group">
                                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-gold-500 transition-colors" />
                                                        <input
                                                            type="password" required
                                                            placeholder="••••••••"
                                                            value={formData.adminPassword}
                                                            onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                                                            className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-xl py-2.5 pl-10 pr-3 text-[10px] font-black uppercase tracking-widest text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-700"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-8 py-6 bg-gray-50 dark:bg-ink-black-950 border-t border-gray-100 dark:border-white/5 flex justify-end gap-4 backdrop-blur-md transition-colors">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-ink-black-950 dark:hover:text-white transition-colors"
                                        >
                                            Abort
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2.5 bg-gold-400 hover:bg-gold-500 text-ink-black-950 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_10px_15px_-3px_rgba(234,179,8,0.2)] active:scale-95"
                                        >
                                            Engage Orbital Link
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
