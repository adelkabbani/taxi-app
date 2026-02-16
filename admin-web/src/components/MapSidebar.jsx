import { useState, useMemo } from 'react';
import {
    Search,
    Filter,
    ChevronDown,
    CheckCircle,
    Radio,
    Navigation,
    MapPin,
    Users,
    Flag,
    Clock,
    XCircle,
    Car,
    Briefcase // Added Briefcase icon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MapSidebar({ drivers = [], tenants, filters, setFilters, onSelectDriver, selectedDriverId }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState({
        'Available': true,
        'Dispatching': true,
        'Driver on the way': true,
        'Arrived and waiting': true,
        'P.O.B': true,
        'Dropped off': true,
        'Waiting for process': true,
        'Unavailable': false // Changed to false
    });

    const statusConfig = {
        'Available': { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', icon: CheckCircle },
        'Dispatching': { color: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/30', icon: Radio },
        'Driver on the way': { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', icon: Navigation },
        'Arrived and waiting': { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', icon: MapPin },
        'P.O.B': { color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', icon: Users },
        'Dropped off': { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: Flag },
        'Waiting for process': { color: 'text-pink-400', bg: 'bg-pink-500/20', border: 'border-pink-500/30', icon: Clock },
        'Unavailable': { color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30', icon: XCircle },
    };

    const toggleFilter = (status) => {
        setActiveFilters(prev => ({
            ...prev,
            [status]: !prev[status]
        }));
    };

    const toggleAll = () => {
        const allSelected = Object.values(activeFilters).every(Boolean);
        const newState = {};
        Object.keys(activeFilters).forEach(key => newState[key] = !allSelected);
        setActiveFilters(newState);
    };

    // Extract unique vehicle types
    const vehicleTypes = useMemo(() => {
        const types = new Set(drivers.map(d => d.vehicle));
        return Array.from(types).filter(Boolean);
    }, [drivers]);

    const filteredDrivers = useMemo(() => {
        return drivers.filter(driver => {
            const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                driver.plate.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = activeFilters[driver.detailedStatus || 'Unavailable'];
            const matchesTenant = filters.tenantId === 'all' || !filters.tenantId || String(driver.tenantId) === String(filters.tenantId);
            const matchesVehicle = filters.vehicleType === 'all' || driver.vehicle === filters.vehicleType;

            return matchesSearch && matchesStatus && matchesTenant && matchesVehicle;
        });
    }, [drivers, searchTerm, activeFilters, filters.tenantId, filters.vehicleType]);

    const handleTenantChange = (e) => {
        setFilters(prev => ({ ...prev, tenantId: e.target.value }));
    };

    const handleVehicleChange = (e) => {
        setFilters(prev => ({ ...prev, vehicleType: e.target.value }));
    };

    return (
        <div className="h-full flex flex-col bg-slate-900/95 backdrop-blur-xl border-l border-white/10 text-slate-100 w-[400px] shadow-2xl font-sans">
            {/* Header / Dropdowns */}
            <div className="p-4 flex gap-3 border-b border-white/5 bg-slate-900/50">
                <div className="flex-1 relative">
                    <select
                        value={filters.vehicleType}
                        onChange={handleVehicleChange}
                        className="w-full appearance-none px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm font-medium hover:bg-slate-800 transition-colors text-slate-200 outline-none focus:ring-1 focus:ring-sky-500"
                    >
                        <option value="all">All cars</option>
                        {vehicleTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                <div className="flex-1 relative">
                    <select
                        value={filters.tenantId || 'all'}
                        onChange={handleTenantChange}
                        className="w-full appearance-none px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm font-medium hover:bg-slate-800 transition-colors text-slate-200 outline-none focus:ring-1 focus:ring-sky-500"
                    >
                        <option value="all">All company</option>
                        {tenants.map(tenant => (
                            <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Stats Area */}
            <div className="p-5 flex gap-4 border-b border-white/5">
                {/* Total Count Card - Left */}
                <div className="w-40 bg-slate-800/40 rounded-2xl flex flex-col items-center justify-center border border-white/5 aspect-square shrink-0">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Total Drivers</span>
                    <span className="text-5xl font-bold text-white tracking-tighter">{filteredDrivers.length}</span>
                </div>

                {/* Status Toggles - Right */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400">Filter Status</span>
                        <button onClick={toggleAll} className="text-[10px] font-medium text-sky-400 hover:text-sky-300 transition-colors">
                            {Object.values(activeFilters).every(Boolean) ? 'Uncheck All' : 'Check All'}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 h-full content-start custom-scrollbar max-h-[140px]">
                        {Object.entries(statusConfig).map(([status, config]) => {
                            // Only show the main ones from screenshot or active ones
                            if (!['Available', 'Dispatching', 'Driver on the way', 'Arrived and waiting', 'P.O.B', 'Dropped off'].includes(status) && !drivers.some(d => d.detailedStatus === status)) return null;

                            return (
                                <button
                                    key={status}
                                    onClick={() => toggleFilter(status)}
                                    className={`flex items-start gap-2 p-2 rounded-lg border transition-all h-full ${activeFilters[status]
                                        ? `${config.bg} ${config.border} ring-1 ring-inset ring-white/5`
                                        : 'bg-slate-800/30 border-transparent opacity-40 hover:opacity-60 grayscale'
                                        }`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${activeFilters[status] ? config.color.replace('text-', 'bg-') : 'bg-slate-500'}`} />
                                    <span className={`text-[10px] font-bold leading-tight text-left ${activeFilters[status] ? 'text-white' : 'text-slate-400'}`}>
                                        {status}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="p-4 pb-2">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-slate-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="search car/driver name"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-slate-600 focus:bg-slate-800 transition-all placeholder:text-slate-600"
                    />
                </div>
            </div>

            {/* Driver List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {filteredDrivers.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600">
                        <p className="text-sm font-medium">No drivers found</p>
                    </div>
                ) : (
                    filteredDrivers.map(driver => {
                        const status = driver.detailedStatus || 'Unavailable';
                        const config = statusConfig[status] || statusConfig['Unavailable'];
                        const Icon = config.icon;

                        return (
                            <motion.button
                                layout
                                key={driver.id}
                                onClick={() => onSelectDriver(driver)}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`w-full group text-left p-3 rounded-xl border transition-all ${selectedDriverId === driver.id
                                    ? 'bg-gradient-to-r from-slate-800 to-slate-800/50 border-sky-500/50 shadow-lg shadow-sky-900/10'
                                    : 'bg-transparent border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h4 className={`font-semibold text-sm ${selectedDriverId === driver.id ? 'text-sky-400' : 'text-slate-300'}`}>
                                            {driver.name}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border bg-opacity-10 ${config.color} ${config.border} border-opacity-20`}>
                                                <div className={`w-1 h-1 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                                                {status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-mono tracking-tight">
                                            {driver.plate}
                                        </div>
                                        <span className="block text-[10px] text-slate-600 mt-1">{driver.vehicle}</span>
                                    </div>
                                </div>
                                {filters.tenantId === 'all' && driver.companyName && (
                                    <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" />
                                        {driver.companyName}
                                    </div>
                                )}
                                {selectedDriverId === driver.id && (
                                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Navigation className="w-3 h-3" />
                                            Tracking active
                                        </span>
                                        <span className="font-mono">
                                            {driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}
                                        </span>
                                    </div>
                                )}
                            </motion.button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
