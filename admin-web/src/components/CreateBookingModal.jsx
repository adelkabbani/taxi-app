import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, User, Phone, Car, FileText, DollarSign, Briefcase, Plane, Luggage, Star, Calendar, Plus, Search } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const vehicleTypes = [
    { value: 'sedan', label: 'Sedan (4 pax)', icon: Car },
    { value: 'van', label: 'Van (6-8 pax)', icon: Car },
    { value: 'business_van', label: 'Business Van', icon: Briefcase },
    { value: 'luxury', label: 'Luxury', icon: Star },
    { value: 'accessible', label: 'Accessible', icon: User }
];

const serviceTypes = [
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' },
    { value: 'executive', label: 'Executive' },
    { value: 'airport_transfer', label: 'Airport Transfer' },
    { value: 'meet_and_greet', label: 'Meet & Greet' }
];

const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'card_in_car', label: 'Card in Car' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'partner_paid', label: 'Partner Paid' }
];

const CreateBookingModal = ({ isOpen, onClose, onCreated }) => {
    const [loading, setLoading] = useState(false);
    const [partners, setPartners] = useState([]);
    const [formData, setFormData] = useState({
        passengerName: '',
        passengerPhone: '',
        pickupAddress: '',
        pickupLat: 52.5200,
        pickupLng: 13.4050,
        dropoffAddress: '',
        dropoffLat: null,
        dropoffLng: null,
        scheduledPickupTime: '',
        serviceType: 'standard',
        vehicleType: 'sedan',
        passengerCount: 1,
        luggageCount: 1,
        fareEstimate: '',
        paymentMethod: 'cash',
        passengerNotes: '',
        partnerId: '',
        flightNumber: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchPartners();
            const defaultTime = new Date(Date.now() + 30 * 60000);
            setFormData(prev => ({
                ...prev,
                scheduledPickupTime: defaultTime.toISOString().slice(0, 16)
            }));
        }
    }, [isOpen]);

    const fetchPartners = async () => {
        try {
            const response = await api.get('/partners');
            setPartners(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch partners:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || '' : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                passengerName: formData.passengerName,
                passengerPhone: formData.passengerPhone,
                pickupAddress: formData.pickupAddress,
                pickupLat: formData.pickupLat,
                pickupLng: formData.pickupLng,
                dropoffAddress: formData.dropoffAddress || null,
                dropoffLat: formData.dropoffLat || null,
                dropoffLng: formData.dropoffLng || null,
                scheduledPickupTime: formData.scheduledPickupTime ? new Date(formData.scheduledPickupTime).toISOString() : null,
                fareEstimate: formData.fareEstimate || null,
                paymentMethod: formData.paymentMethod,
                passengerNotes: formData.passengerNotes || null,
                partnerId: formData.partnerId || null,
                flightNumber: formData.flightNumber || null,
                serviceType: formData.serviceType || 'standard',
                requirements: {
                    vehicleType: formData.vehicleType,
                    passengerCount: formData.passengerCount,
                    luggageCount: formData.luggageCount
                }
            };

            await api.post('/bookings', payload);
            toast.success('Booking created successfully!');
            onCreated?.();
            onClose();

            setFormData({
                passengerName: '',
                passengerPhone: '',
                pickupAddress: '',
                pickupLat: 52.5200,
                pickupLng: 13.4050,
                dropoffAddress: '',
                dropoffLat: null,
                dropoffLng: null,
                scheduledPickupTime: '',
                serviceType: 'standard',
                vehicleType: 'sedan',
                passengerCount: 1,
                luggageCount: 1,
                fareEstimate: '',
                paymentMethod: 'cash',
                passengerNotes: '',
                partnerId: '',
                flightNumber: ''
            });
        } catch (err) {
            console.error('Failed to create booking:', err);
            toast.error(err.response?.data?.message || 'Failed to create booking');
        } finally {
            setLoading(false);
        }
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
                            className="bg-[#0f1115] w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-amber-500/20 overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-amber-500/10 to-transparent flex-shrink-0">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500">
                                        <Car className="w-5 h-5" />
                                    </div>
                                    Create New Booking
                                </h3>
                                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Form Body */}
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="p-6 space-y-6">
                                    {/* Passenger Info */}
                                    <div className="glass-panel p-4 rounded-xl border border-white/5 bg-white/5">
                                        <h4 className="text-sm font-semibold text-amber-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                            <User className="w-4 h-4" />
                                            Passenger Information
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-medium ml-1">Name *</label>
                                                <input
                                                    type="text"
                                                    name="passengerName"
                                                    value={formData.passengerName}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-slate-600"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-medium ml-1">Phone *</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                                    <input
                                                        type="tel"
                                                        name="passengerPhone"
                                                        value={formData.passengerPhone}
                                                        onChange={handleChange}
                                                        required
                                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-slate-600"
                                                        placeholder="+49 123 456 7890"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Locations */}
                                    <div className="glass-panel p-4 rounded-xl border border-white/5 bg-white/5">
                                        <h4 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                            <MapPin className="w-4 h-4" />
                                            Locations
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-medium ml-1">Pickup Address *</label>
                                                <input
                                                    type="text"
                                                    name="pickupAddress"
                                                    value={formData.pickupAddress}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                                                    placeholder="Berlin Brandenburg Airport (BER), Terminal 1"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-medium ml-1">Dropoff Address</label>
                                                <input
                                                    type="text"
                                                    name="dropoffAddress"
                                                    value={formData.dropoffAddress}
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                                                    placeholder="Hotel Adlon, Unter den Linden 77"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timing & Details */}
                                    <div className="glass-panel p-4 rounded-xl border border-white/5 bg-white/5">
                                        <h4 className="text-sm font-semibold text-blue-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                            <Clock className="w-4 h-4" />
                                            Timing & Details
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-medium ml-1">Pickup Time *</label>
                                                <input
                                                    type="datetime-local"
                                                    name="scheduledPickupTime"
                                                    value={formData.scheduledPickupTime}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all [color-scheme:dark]"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-medium ml-1">Flight Number (Optional)</label>
                                                <div className="relative">
                                                    <Plane className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                                    <input
                                                        type="text"
                                                        name="flightNumber"
                                                        value={formData.flightNumber}
                                                        onChange={handleChange}
                                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                                                        placeholder="LH123"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vehicle & Payment */}
                                    <div className="glass-panel p-4 rounded-xl border border-white/5 bg-white/5">
                                        <h4 className="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                            <Car className="w-4 h-4" />
                                            Vehicle & Payment
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-medium ml-1">Service Level</label>
                                                <select
                                                    name="serviceType"
                                                    value={formData.serviceType}
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                                >
                                                    {serviceTypes.map(type => (
                                                        <option key={type.value} value={type.value}>{type.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-medium ml-1">Vehicle Type</label>
                                                <select
                                                    name="vehicleType"
                                                    value={formData.vehicleType}
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                                >
                                                    {vehicleTypes.map(type => (
                                                        <option key={type.value} value={type.value}>{type.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-medium ml-1">Fare Estimate (€)</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                                    <input
                                                        type="number"
                                                        name="fareEstimate"
                                                        value={formData.fareEstimate}
                                                        onChange={handleChange}
                                                        step="0.01"
                                                        min="0"
                                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                                                        placeholder="45.00"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-medium ml-1">Passengers</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                                    <input
                                                        type="number"
                                                        name="passengerCount"
                                                        value={formData.passengerCount}
                                                        onChange={handleChange}
                                                        min="1"
                                                        max="8"
                                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-medium ml-1">Luggage</label>
                                                <div className="relative">
                                                    <Luggage className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                                    <input
                                                        type="number"
                                                        name="luggageCount"
                                                        value={formData.luggageCount}
                                                        onChange={handleChange}
                                                        min="0"
                                                        max="10"
                                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Partner & Notes */}
                                    <div className="glass-panel p-4 rounded-xl border border-white/5 bg-white/5">
                                        <h4 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                                            <FileText className="w-4 h-4" />
                                            Additional Info
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-medium ml-1">Payment Method</label>
                                                <select
                                                    name="paymentMethod"
                                                    value={formData.paymentMethod}
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all"
                                                >
                                                    {paymentMethods.map(method => (
                                                        <option key={method.value} value={method.value}>{method.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs text-slate-400 font-medium ml-1">Partner (Optional)</label>
                                                <select
                                                    name="partnerId"
                                                    value={formData.partnerId}
                                                    onChange={handleChange}
                                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all"
                                                >
                                                    <option value="">Direct Booking</option>
                                                    {partners.map(partner => (
                                                        <option key={partner.id} value={partner.id}>{partner.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs text-slate-400 font-medium ml-1">Notes</label>
                                            <textarea
                                                name="passengerNotes"
                                                value={formData.passengerNotes}
                                                onChange={handleChange}
                                                rows="3"
                                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all resize-none placeholder:text-slate-600"
                                                placeholder="Special requirements, wheelchair access, car seat needed, etc."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </form>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-slate-900/80 border-t border-white/5 flex justify-end gap-3 flex-shrink-0 backdrop-blur-md">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold rounded-lg text-sm shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Car className="w-4 h-4" />
                                            Create Booking
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

export default CreateBookingModal;
