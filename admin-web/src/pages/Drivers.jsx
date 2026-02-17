import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import AvailabilityBadge from '../components/AvailabilityBadge';
import DriverDetailsModal from '../components/DriverDetailsModal';
import CreateDriverModal from '../components/CreateDriverModal';
import SuspendDriverModal from '../components/SuspendDriverModal';
import { Plus, Ban, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Drivers() {
    const [drivers, setDrivers] = useState([]);
    const [allDrivers, setAllDrivers] = useState([]); // Store unfiltered list
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFleet, setSelectedFleet] = useState('all'); // Fleet filter (Company Name)
    const [selectedDriverId, setSelectedDriverId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [driverToSuspend, setDriverToSuspend] = useState(null);
    const [tenants, setTenants] = useState([]);

    // Fetch Tenants for Filter
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
                    includeStale: true,
                    limit: 100 // Increase limit to ensure we get enough data for filtering
                }
            });
            setAllDrivers(response.data.data);

            // Apply fleet filter
            let filtered = response.data.data;
            if (selectedFleet !== 'all') {
                // Filter by tenant_id (ensure robust comparison)
                filtered = filtered.filter(d => String(d.tenant_id) === String(selectedFleet));
            }
            setDrivers(filtered);
        } catch (err) {
            console.error('Failed to fetch drivers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDrivers();
        }, 300); // Debounce search
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Driver Management</h1>

                <div className="flex gap-3 w-full sm:w-auto flex-wrap">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Driver
                    </button>

                    {/* Fleet Filter Dropdown */}
                    <select
                        value={selectedFleet}
                        onChange={(e) => setSelectedFleet(e.target.value)}
                        className="px-4 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm cursor-pointer"
                    >
                        <option value="all">All Fleets</option>
                        {tenants.map(tenant => (
                            <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                        ))}
                    </select>

                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Search name or plate..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        />
                        <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Driver</th>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Vehicle</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Acceptance</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                        Loading drivers...
                                    </td>
                                </tr>
                            ) : drivers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        No drivers found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                drivers.map((driver) => (
                                    <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    {driver.first_name} {driver.last_name}
                                                </span>
                                                <span className="text-xs text-slate-500">{driver.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                {driver.company_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                                    {driver.license_plate}
                                                </span>
                                                <span className="text-xs text-slate-500 uppercase">{driver.vehicle_type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <AvailabilityBadge
                                                availability={driver.availability}
                                                isStale={new Date() - new Date(driver.location_updated_at) > 300000}
                                                suspended={!!driver.suspension}
                                            />
                                            {driver.suspension && (
                                                <div className="text-[10px] text-red-500 font-bold mt-1 uppercase truncate max-w-[120px]" title={driver.suspension.reason}>
                                                    Reason: {driver.suspension.reason}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{driver.acceptance_rate}%</span>
                                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-1">
                                                    <div
                                                        className="bg-sky-500 h-1 rounded-full transition-all"
                                                        style={{ width: `${driver.acceptance_rate}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {driver.suspension ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUnsuspend(driver.id);
                                                        }}
                                                        className="p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
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
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
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
                                                    className="px-3 py-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-lg transition-colors"
                                                >
                                                    Details
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
