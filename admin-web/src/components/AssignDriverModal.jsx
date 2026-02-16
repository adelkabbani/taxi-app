import React, { useState, useEffect } from 'react';
import { X, Search, User, Car, MapPin, Star, Clock } from 'lucide-react';
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

    // Calculate rough distance (for display only - real calc would use Haversine)
    const getDistance = (driver) => {
        if (!driver.current_lat || !booking?.pickup_lat) return null;
        const dLat = Math.abs(driver.current_lat - booking.pickup_lat);
        const dLng = Math.abs(driver.current_lng - booking.pickup_lng);
        const km = Math.sqrt(dLat * dLat + dLng * dLng) * 111; // Rough km estimate
        return km.toFixed(1);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-slate-900 opacity-75"></div>
                </div>

                <div className="inline-block align-bottom bg-white dark:bg-dark-card rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full border border-slate-200 dark:border-slate-800">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-500 to-teal-600">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Assign Driver
                                </h3>
                                {booking && (
                                    <p className="text-emerald-100 text-sm mt-1">
                                        Booking #{booking.booking_reference}
                                    </p>
                                )}
                            </div>
                            <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Booking Summary */}
                    {booking && (
                        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-start">
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                    <div className="text-sm">
                                        <p className="text-slate-900 dark:text-white font-medium truncate">{booking.pickup_address}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">
                                            <Clock className="w-3 h-3 inline mr-1" />
                                            {booking.scheduled_pickup_time ? new Date(booking.scheduled_pickup_time).toLocaleString() : 'ASAP'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 capitalize">
                                        {booking.service_type?.replace(/_/g, ' ') || 'Standard'}
                                    </span>
                                    {booking.vehicle_type && (
                                        <p className="text-xs text-slate-500 mt-1 capitalize">
                                            Req: {booking.vehicle_type}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name or license plate..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Driver List */}
                    <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                            </div>
                        ) : filteredDrivers.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No available drivers found</p>
                                <p className="text-xs mt-1">Try adjusting your search or wait for drivers to become available</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredDrivers.map(driver => {
                                    const distance = getDistance(driver);
                                    const isSelected = selectedDriver?.id === driver.id;

                                    return (
                                        <button
                                            key={driver.id}
                                            onClick={() => setSelectedDriver(driver)}
                                            className={`w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500' : ''
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${isSelected ? 'bg-emerald-500' : 'bg-slate-400'
                                                        }`}>
                                                        {driver.first_name?.[0]}{driver.last_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">
                                                            {driver.first_name} {driver.last_name}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                            <span className="flex items-center gap-1">
                                                                <Car className="w-3 h-3" />
                                                                {driver.license_plate}
                                                            </span>
                                                            <span className="uppercase">{driver.vehicle_type}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <AvailabilityBadge availability={driver.availability} isStale={driver.isStale} />
                                                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                                        <div className="flex items-center gap-1">
                                                            <Star className="w-3 h-3 text-amber-500" />
                                                            {driver.acceptance_rate || 100}%
                                                        </div>
                                                        {distance && (
                                                            <span>~{distance}km</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                        <span className="text-sm text-slate-500">
                            {filteredDrivers.length} driver{filteredDrivers.length !== 1 ? 's' : ''} available
                        </span>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={!selectedDriver || assigning}
                                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {assigning ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Assigning...
                                    </>
                                ) : (
                                    <>
                                        <User className="w-4 h-4" />
                                        Assign Driver
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignDriverModal;
