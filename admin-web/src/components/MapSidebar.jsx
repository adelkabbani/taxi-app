import { useState, useMemo } from 'react';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Navigation,
    MapPin,
    Users,
    Flag,
    Clock,
    XCircle,
    Radio,
    CheckCircle,
    Briefcase,
    Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MapSidebar({ drivers = [], tenants, filters, setFilters, onSelectDriver, selectedDriverId }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        'Available': true,
        'Dispatching': true,
        'Driver on the way': true,
        'Arrived and waiting': true,
        'P.O.B': true,
        'Dropped off': true,
        'Waiting for process': true,
        'Unavailable': false
    });

    const statusConfig = {
        'Available': { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', icon: CheckCircle },
        'Dispatching': { color: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/30', icon: Radio },
        'Driver on the way': { color: 'text-gold-400', bg: 'bg-gold-500/20', border: 'border-gold-500/30', icon: Navigation },
        'Arrived and waiting': { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', icon: MapPin },
        'P.O.B': { color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', icon: Users },
        'Dropped off': { color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/30', icon: Flag },
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
        <>
            {/* Toggle Button (Visible when collapsed or expanded) */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`fixed top-24 right-4 z-[600] p-2 rounded-full glass-panel border border-obsidian-700 text-gold-400 hover:text-white shadow-lg transition-all ${!isCollapsed ? 'right-[420px]' : 'right-4'}`}
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                {isCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </motion.button>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed top-4 right-4 bottom-4 w-[400px] flex flex-col glass-panel rounded-2xl border border-obsidian-700/50 shadow-2xl z-[500] overflow-hidden"
                    >
                        {/* Header / Dropdowns */}
                        <div className="p-4 flex gap-3 border-b border-white/5 bg-obsidian-900/40">
                            <div className="flex-1">
                                <select
                                    value={filters.vehicleType}
                                    onChange={handleVehicleChange}
                                    className="w-full appearance-none px-3 py-2.5 rounded-xl bg-obsidian-800 border border-obsidian-700 text-sm font-medium hover:border-gold-500/50 transition-colors text-gray-200 outline-none focus:ring-1 focus:ring-gold-500/50"
                                >
                                    <option value="all">All cars</option>
                                    {vehicleTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1">
                                <select
                                    value={filters.tenantId || 'all'}
                                    onChange={handleTenantChange}
                                    className="w-full appearance-none px-3 py-2.5 rounded-xl bg-obsidian-800 border border-obsidian-700 text-sm font-medium hover:border-gold-500/50 transition-colors text-gray-200 outline-none focus:ring-1 focus:ring-gold-500/50"
                                >
                                    <option value="all">All Fleets</option>
                                    {tenants.map(tenant => (
                                        <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Stats Area */}
                        <div className="p-5 flex gap-4 border-b border-white/5 bg-gradient-to-b from-obsidian-800/20 to-transparent">
                            {/* Total Count Card */}
                            <div className="w-36 bg-obsidian-800/60 rounded-2xl flex flex-col items-center justify-center border border-white/5 shrink-0 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gold-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Active Units</span>
                                <span className="text-4xl font-black text-white tracking-tighter text-glow">{filteredDrivers.length}</span>
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Live
                                </div>
                            </div>

                            {/* Status Toggles */}
                            <div className="flex-1 flex flex-col min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Statuses</span>
                                    <button onClick={toggleAll} className="text-[10px] font-bold text-gold-400 hover:text-gold-300 transition-colors uppercase">
                                        {Object.values(activeFilters).every(Boolean) ? 'Clear' : 'All'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 custom-scrollbar max-h-[120px]">
                                    {Object.entries(statusConfig).map(([status, config]) => {
                                        if (!['Available', 'Dispatching', 'Driver on the way', 'Arrived and waiting', 'P.O.B', 'Dropped off'].includes(status) && !drivers.some(d => d.detailedStatus === status)) return null;

                                        return (
                                            <button
                                                key={status}
                                                onClick={() => toggleFilter(status)}
                                                className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all ${activeFilters[status]
                                                    ? `${config.bg} ${config.border} ring-1 ring-inset ring-white/5 shadow-sm`
                                                    : 'bg-obsidian-800/30 border-transparent opacity-40 hover:opacity-70 grayscale'
                                                    }`}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeFilters[status] ? config.color.replace('text-', 'bg-') : 'bg-slate-500'}`} />
                                                <span className={`text-[9px] font-bold leading-tight text-left truncate ${activeFilters[status] ? 'text-gray-200' : 'text-gray-500'}`}>
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
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-gold-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search driver, plate..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-obsidian-950/50 border border-obsidian-700/50 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-200 outline-none focus:border-gold-500/30 focus:bg-obsidian-900 transition-all placeholder:text-gray-600"
                                />
                            </div>
                        </div>

                        {/* Driver List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {filteredDrivers.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                                    <Users className="w-8 h-8 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-wider">No drivers found</p>
                                </div>
                            ) : (
                                filteredDrivers.map(driver => {
                                    const status = driver.detailedStatus || 'Unavailable';
                                    const config = statusConfig[status] || statusConfig['Unavailable'];

                                    return (
                                        <motion.button
                                            layout
                                            key={driver.id}
                                            onClick={() => onSelectDriver(driver)}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={`w-full group text-left p-3 rounded-xl border transition-all ${selectedDriverId === driver.id
                                                ? 'bg-gradient-to-r from-obsidian-800 to-obsidian-800/50 border-gold-500/40 shadow-lg shadow-gold-900/5'
                                                : 'bg-transparent border-white/5 hover:bg-white/5 hover:border-white/10'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className={`font-bold text-sm ${selectedDriverId === driver.id ? 'text-gold-400' : 'text-gray-300'}`}>
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
                                                    <div className="px-1.5 py-0.5 rounded bg-obsidian-950 border border-obsidian-800 text-[10px] text-gray-400 font-mono tracking-tight group-hover:border-obsidian-700 transition-colors">
                                                        {driver.plate}
                                                    </div>
                                                    <span className="block text-[10px] text-gray-500 mt-1">{driver.vehicle}</span>
                                                </div>
                                            </div>
                                            {filters.tenantId === 'all' && driver.companyName && (
                                                <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
                                                    <Briefcase className="w-3 h-3 text-gold-500/40" />
                                                    {driver.companyName}
                                                </div>
                                            )}
                                            {selectedDriverId === driver.id && (
                                                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 animate-fade-in">
                                                    <span className="flex items-center gap-1 text-gold-400/80">
                                                        <Activity className="w-3 h-3" />
                                                        Tracking
                                                    </span>
                                                    <span className="font-mono text-[10px]">
                                                        {driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}
                                                    </span>
                                                </div>
                                            )}
                                        </motion.button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
