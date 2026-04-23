import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import AvailabilityBadge from '../components/AvailabilityBadge';
import DriverDetailsModal from '../components/DriverDetailsModal';
import CreateDriverModal from '../components/CreateDriverModal';
import SuspendDriverModal from '../components/SuspendDriverModal';
import { Plus, Ban, RotateCcw, Search, Key } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Drivers() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [drivers, setDrivers] = useState([]);
    const [allDrivers, setAllDrivers] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFleet, setSelectedFleet] = useState('all'); 
    const [selectedDriverId, setSelectedDriverId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [driverToSuspend, setDriverToSuspend] = useState(null);
    const [tenants, setTenants] = useState([]);

    useEffect(() => {
        api.get('/tenants')
            .then(res => setTenants(res.data.data))
            .catch(err => console.error('Failed to fetch tenants', err));
    }, []);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/drivers', {
                params: {
                    search: searchTerm,
                    tenant_id: selectedFleet === 'all' ? undefined : selectedFleet,
                    includeStale: true,
                    limit: 100
                }
            });
            setDrivers(response.data.data);
            setAllDrivers(response.data.data);
        } catch (err) {
            console.error('Failed to fetch drivers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const tenantIdParam = searchParams.get('tenantId');
        if (tenantIdParam) {
            setSelectedFleet(tenantIdParam);
            localStorage.setItem('tenantOverride', tenantIdParam);
        } else {
            const savedFleet = localStorage.getItem('tenantOverride') || 'all';
            setSelectedFleet(savedFleet);
        }
    }, [searchParams]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDrivers();
        }, 300); 
        return () => clearTimeout(timer);
    }, [searchTerm, selectedFleet]);

    const openDetails = (id) => {
        setSelectedDriverId(id);
        setIsModalOpen(true);
    };

    const handleUnsuspend = async (id) => {
        try {
            await api.post(`/drivers/${id}/unsuspend`);
            toast.success('Driver access restored.');
            fetchDrivers();
        } catch (error) {
            toast.error('Failed to restore access.');
        }
    };

    const handleImpersonate = async (userId) => {
        const loadingToast = toast.loading('Initiating Magic Login...');
        try {
            const response = await api.post('/admin/impersonate', { userId });
            const token = response.data.token;
            const driverUrl = `http://localhost:5174/?token=${token}`;
            window.open(driverUrl, '_blank');
            toast.success('Magic Login Success!', { id: loadingToast });
        } catch (error) {
            console.error('Impersonation failed:', error);
            toast.error(error.response?.data?.message || 'Failed to initiate Magic Login.', { id: loadingToast });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Driver Management</h1>

                <div className="flex gap-3 w-full sm:w-auto flex-wrap">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-ink-black-950 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-gold-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add Driver
                    </button>

                    <select
                        value={selectedFleet}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSelectedFleet(val);
                            localStorage.setItem('tenantOverride', val);
                        }}
                        className="px-4 py-2 bg-white dark:bg-ink-black-900 border border-regal-navy/12 dark:border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-ink-black-950 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-gold-500/50 shadow-sm cursor-pointer hover:border-regal-navy/25 dark:hover:border-white/10 transition-all"
                    >
                        <option value="all">All Fleets</option>
                        {tenants.map(tenant => (
                            <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                        ))}
                    </select>

                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="SEARCH AGENT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-regal-navy/5 dark:bg-ink-black-900 border border-regal-navy/10 dark:border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-ink-black-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gold-500/50 transition-all"
                        />
                        <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-gray-600" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-ink-black-900/40 backdrop-blur-md rounded-2xl border border-regal-navy/10 dark:border-white/5 overflow-hidden shadow-[0_8px_40px_rgba(0,29,61,0.10)] dark:shadow-2xl transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-regal-navy/4 dark:bg-white/5 text-slate-500 dark:text-gray-500 uppercase text-[10px] font-black tracking-widest transition-colors">
                            <tr>
                                <th className="px-6 py-5">Ident Connection</th>
                                <th className="px-6 py-5">Fleet Node</th>
                                <th className="px-6 py-5">Unit Specs</th>
                                <th className="px-6 py-5">Operational Status</th>
                                <th className="px-6 py-5">Affinity</th>
                                <th className="px-6 py-5">Rejections</th>
                                <th className="px-6 py-5 text-right">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-regal-navy/6 dark:divide-white/[0.03]">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                        Loading drivers...
                                    </td>
                                </tr>
                            ) : drivers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                        No drivers found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                drivers.map((driver) => (
                                    <tr key={driver.id} className="hover:bg-regal-navy/4 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-ink-black-950 dark:text-white group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                                                    {driver.driver_name || (driver.first_name || driver.last_name ? `${driver.first_name || ''} ${driver.last_name || ''}`.trim() : 'Unnamed Driver')}
                                                </span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono tracking-tighter">{driver.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-regal-navy/6 dark:bg-white/5 text-regal-navy dark:text-gray-400 border border-regal-navy/10 dark:border-white/5 group-hover:border-gold-500/20 transition-all">
                                                {driver.company_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-ink-black-800 dark:text-gray-200 font-mono tracking-wider transition-colors">
                                                    {driver.license_plate}
                                                </span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest transition-colors">{driver.vehicle_type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <AvailabilityBadge
                                                availability={driver.availability}
                                                isStale={new Date() - new Date(driver.location_updated_at) > 300000}
                                                suspended={!!driver.suspension}
                                            />
                                            {driver.suspension && (
                                                <div className="text-[10px] text-rose-500 font-black mt-1 uppercase tracking-tighter truncate max-w-[120px]" title={driver.suspension.reason}>
                                                    RESTRICTED: {driver.suspension.reason}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col w-24">
                                                {(() => {
                                                    const accepted = parseInt(driver.accepted_bookings || 0);
                                                    const rejected = parseInt(driver.rejected_bookings || 0);
                                                    const affinity = (accepted + rejected) > 0 
                                                        ? Math.round((accepted / (accepted + rejected)) * 100) 
                                                        : 100;
                                                    return (
                                                        <>
                                                            <div className="flex justify-between items-end mb-1">
                                                                <span className="text-[10px] font-black text-gray-400 dark:text-gray-300 transition-colors">{affinity}%</span>
                                                            </div>
                                                            <div className="w-full bg-regal-navy/8 dark:bg-white/5 rounded-full h-1 overflow-hidden transition-colors">
                                                                <div
                                                                    className="bg-gold-500 h-1 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.4)] transition-all"
                                                                    style={{ width: `${affinity}%` }}
                                                                ></div>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-black ${driver.rejected_bookings > 5 ? 'text-rose-500' : driver.rejected_bookings > 0 ? 'text-amber-500' : 'text-gray-500'}`}>
                                                    {driver.rejected_bookings || 0}
                                                </span>
                                                {driver.rejected_bookings > 0 && (
                                                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-tighter">Declinature</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleImpersonate(driver.user_id);
                                                    }}
                                                    className="p-2 text-gold-500 hover:bg-gold-500/10 rounded-xl transition-all"
                                                    title="Magic Login (Impersonate)"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                {driver.suspension ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUnsuspend(driver.id);
                                                        }}
                                                        className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
                                                        title="Unsuspend/Restore Access"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDriverToSuspend(driver);
                                                            setIsSuspendModalOpen(true);
                                                        }}
                                                        className="p-2 text-gray-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                                        title="Suspend/Stop Driver"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openDetails(driver.id);
                                                    }}
                                                    className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-gold-600 dark:text-gold-400 hover:text-ink-black-950 dark:hover:text-white hover:bg-gold-500/10 rounded-lg border border-gold-500/20 transition-all"
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <DriverDetailsModal
                driverId={selectedDriverId}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onUpdate={fetchDrivers}
            />

            <CreateDriverModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchDrivers}
            />

            <SuspendDriverModal
                isOpen={isSuspendModalOpen}
                onClose={() => {
                    setIsSuspendModalOpen(false);
                    setDriverToSuspend(null);
                }}
                driver={driverToSuspend}
                onSuccess={fetchDrivers}
            />
        </div>
    );
}
