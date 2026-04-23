import React, { useState, useEffect } from 'react';
import { X, Search, Star, Clock, MapPin, Phone, Car } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
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
            const response = await api.get(`/drivers/assignment/${booking.id}`);
            setDrivers(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch drivers:', err);
            toast.error('Failed to load available drivers');
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (driverId) => {
        setAssigning(true);
        try {
            await api.patch(`/bookings/${booking.id}/assign`, { driverId });
            toast.success('Driver assigned successfully');
            onAssigned();
            onClose();
        } catch (err) {
            console.error('Failed to assign driver:', err);
            toast.error(err.response?.data?.message || 'Failed to assign driver');
        } finally {
            setAssigning(false);
        }
    };

    const filteredDrivers = drivers.filter(driver =>
        driver.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.license_plate?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-black-950/80 backdrop-blur-sm transition-opacity" onClick={onClose}>
            <div className="bg-white dark:bg-ink-black-900 border border-gray-100 dark:border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl shadow-ink-black-950/20 overflow-hidden flex flex-col max-h-[90vh] transition-all" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5 transition-colors">
                    <div>
                        <h3 className="text-lg font-black text-ink-black-950 dark:text-white uppercase tracking-tight">Assign Driver</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">Booking: {booking?.booking_reference}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all text-gray-400 hover:text-ink-black-950 dark:hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-ink-black-900/50 transition-colors">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or license plate..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-ink-black-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all placeholder:text-gray-400"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500 mx-auto"></div>
                            <p className="text-gray-500 text-sm mt-4">Finding available drivers...</p>
                        </div>
                    ) : filteredDrivers.length === 0 ? (
                        <div className="py-20 text-center text-gray-500">
                            <Car className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No available drivers found nearby.</p>
                        </div>
                    ) : (
                        filteredDrivers.map((driver) => (
                            <div
                                key={`${driver.user_id}-${driver.id}`}
                                className={`p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden ${selectedDriver?.id === driver.id || selectedDriver?.user_id === driver.user_id
                                    ? 'bg-gold-500/10 border-gold-500 shadow-[0_0_20px_rgba(255,214,10,0.1)]'
                                    : 'bg-white dark:bg-white/2 border-gray-100 dark:border-white/5 hover:border-gold-500/30'
                                    } ${driver.bookingAvailability === 'busy' ? 'opacity-60 grayscale' : ''}`}
                                onClick={() => setSelectedDriver(driver)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gold-500 flex items-center justify-center shadow-lg shadow-gold-500/20">
                                            <Car className="w-6 h-6 text-ink-black-950" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-black text-ink-black-950 dark:text-white uppercase tracking-tight transition-colors">
                                                    {driver.driver_name}
                                                </h4>
                                                {driver.onlineStatus === 'offline' && (
                                                    <span className="px-1.5 py-0.5 rounded-md bg-gray-500/10 text-gray-400 text-[8px] font-black uppercase tracking-tighter border border-gray-500/20">
                                                        OFFLINE
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-xs text-gold-600 dark:text-gold-500 flex items-center gap-1 font-bold">
                                                    <Star className="w-3 h-3 fill-current" />
                                                    4.9
                                                </span>
                                                <span className="text-gray-300">|</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                                    {driver.company_name || 'Individual'}
                                                </span>
                                                <span className="text-gray-300">|</span>
                                                <span className="text-[10px] font-mono text-ink-black-900 dark:text-gray-400">
                                                    {driver.license_plate || 'No vehicle'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <AvailabilityBadge availability={driver.bookingAvailability === 'busy' ? 'busy' : 'available'} />
                                        <p className="text-[10px] text-gray-500 mt-2 font-mono uppercase tracking-widest">
                                            {driver.vehicle_type || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 flex gap-3 transition-colors">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-ink-black-950 dark:hover:text-white transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!selectedDriver || assigning || selectedDriver.bookingAvailability === 'busy'}
                        onClick={() => handleAssign(selectedDriver.id || selectedDriver.user_id)}
                        className="flex-[2] bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-ink-black-950 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2 active:scale-95"
                    >
                        {assigning ? (
                            <div className="w-5 h-5 border-2 border-ink-black-950/30 border-t-ink-black-950 rounded-full animate-spin"></div>
                        ) : (
                            <>Assign Driver</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignDriverModal;
