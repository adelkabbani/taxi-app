import React, { useState, useEffect } from 'react';
import { X, Search, Star, Clock, MapPin, Phone, Car, Check, Calendar } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import AvailabilityBadge from './AvailabilityBadge';

const AssignDriverModal = ({ isOpen, onClose, booking, onAssigned }) => {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDriver, setSelectedDriver] = useState(null);

    useEffect(() => {
        if (isOpen && booking) {
            fetchAvailableDrivers();
        }
    }, [isOpen, booking]);

    const fetchAvailableDrivers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/drivers', {
                params: {
                    availability: 'available',
                    includeStale: false,
                    limit: 50
                }
            });
            setDrivers(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch drivers:', err);
            toast.error('Failed to load available drivers');
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedDriver) {
            toast.error('Please select a driver');
            return;
        }

        setAssigning(true);
        try {
            await api.patch(`/bookings/${booking.id}/assign`, {
                driverId: selectedDriver.id
            });
            toast.success(`Booking assigned to ${selectedDriver.first_name} ${selectedDriver.last_name}`);
            onAssigned?.();
            onClose();
        } catch (err) {
            console.error('Failed to assign driver:', err);
            toast.error(err.response?.data?.message || 'Failed to assign driver');
        } finally {
            setAssigning(false);
        }
    };

    const filteredDrivers = drivers.filter(driver => {
        const fullName = `${driver.first_name} ${driver.last_name}`.toLowerCase();
        const plate = (driver.license_plate || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return fullName.includes(term) || plate.includes(term);
    });

    const getDistance = (driver) => {
        if (!driver.current_lat || !booking?.pickup_lat) return null;
        const dLat = Math.abs(driver.current_lat - booking.pickup_lat);
        const dLng = Math.abs(driver.current_lng - booking.pickup_lng);
        const km = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
        return km.toFixed(1);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-[#0f1115] w-full max-w-xl rounded-2xl shadow-2xl border border-amber-500/20 overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-amber-500/10 to-transparent">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Car className="w-5 h-5 text-amber-500" />
                                        Assign Driver
                                    </h3>
                                    {booking && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                            <span className="bg-white/5 px-2 py-0.5 rounded text-white/70">
                                                #{booking.booking_reference}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Booking Snapshot */}
                            {booking && (
                                <div className="px-6 py-3 bg-white/5 border-b border-white/5">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-3">
                                            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-slate-200 text-sm font-medium">{booking.pickup_address}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-amber-400">
                                                        <Clock className="w-3 h-3" />
                                                        {booking.scheduled_pickup_time ? new Date(booking.scheduled_pickup_time).toLocaleString() : 'ASAP'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="p-6">
                                {/* Search */}
                                <div className="mb-4 relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or license plate..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                    />
                                </div>

                                {/* Driver List */}
                                <div className="h-64 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
                                    {loading ? (
                                        <div className="flex items-center justify-center h-full text-slate-500">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                                        </div>
                                    ) : filteredDrivers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                                            <Car className="w-8 h-8 opacity-20" />
                                            <span className="text-sm">No available drivers found</span>
                                        </div>
                                    ) : (
                                        filteredDrivers.map(driver => (
                                            <button
                                                key={driver.id}
                                                onClick={() => setSelectedDriver(driver)}
                                                className={`w-full p-3 rounded-xl border transition-all text-left group ${selectedDriver?.id === driver.id
                                                        ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                                        : 'bg-slate-800/30 border-white/5 hover:border-white/10 hover:bg-slate-800/50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${selectedDriver?.id === driver.id
                                                                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                                                : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
                                                            }`}>
                                                            {driver.first_name?.[0]}{driver.last_name?.[0]}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-white">
                                                                    {driver.first_name} {driver.last_name}
                                                                </span>
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-400">
                                                                    {driver.license_plate}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                                <span className="flex items-center gap-1">
                                                                    <Star className="w-3 h-3 text-amber-500" />
                                                                    {driver.acceptance_rate || 100}%
                                                                </span>
                                                                {getDistance(driver) && (
                                                                    <span className="flex items-center gap-1">
                                                                        <MapPin className="w-3 h-3" />
                                                                        ~{getDistance(driver)}km
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <AvailabilityBadge availability={driver.availability} isStale={driver.isStale} />
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-slate-900/50 border-t border-white/5 flex justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssign}
                                    disabled={!selectedDriver || assigning}
                                    className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold rounded-lg text-sm shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {assigning ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                                            Assigning...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Confirm Assignment
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AssignDriverModal;
