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
                        className="fixed inset-0 bg-ink-black-950/60 dark:bg-ink-black-950/80 backdrop-blur-sm z-50 transition-colors"
                        onClick={onClose}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-ink-black-900 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-gray-200 dark:border-white/5 overflow-hidden transition-colors"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5 flex-shrink-0 transition-colors">
                                <h3 className="text-lg font-black text-ink-black-950 dark:text-white flex items-center gap-2 transition-colors uppercase tracking-tight">
                                    <div className="p-1.5 rounded-lg bg-gold-500 text-ink-black-950 shadow-lg shadow-gold-500/20">
                                        <Car className="w-5 h-5" />
                                    </div>
                                    Create Booking
                                </h3>
                                <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Form Body */}
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="p-6 space-y-6">
                                    {/* Passenger Info */}
                                    <div className="bg-gray-50 dark:bg-white/2 p-4 rounded-xl border border-gray-100 dark:border-white/5 transition-colors">
                                        <h4 className="text-[10px] font-black text-gold-600 dark:text-gold-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                            <User className="w-3.5 h-3.5" />
                                            Passenger Information
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Name *</label>
                                                <input
                                                    type="text"
                                                    name="passengerName"
                                                    value={formData.passengerName}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 px-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Phone *</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 transition-colors" />
                                                    <input
                                                        type="tel"
                                                        name="passengerPhone"
                                                        value={formData.passengerPhone}
                                                        onChange={handleChange}
                                                        required
                                                        className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 pl-10 pr-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                                                        placeholder="+49 123 456 7890"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Locations */}
                                    <div className="bg-gray-50 dark:bg-white/2 p-4 rounded-xl border border-gray-100 dark:border-white/5 transition-colors">
                                        <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                            <MapPin className="w-3.5 h-3.5" />
                                            Locations
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Pickup Address *</label>
                                                <input
                                                    type="text"
                                                    name="pickupAddress"
                                                    value={formData.pickupAddress}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 px-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                                                    placeholder="Berlin Brandenburg Airport (BER), Terminal 1"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Dropoff Address</label>
                                                <input
                                                    type="text"
                                                    name="dropoffAddress"
                                                    value={formData.dropoffAddress}
                                                    onChange={handleChange}
                                                    className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 px-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                                                    placeholder="Hotel Adlon, Unter den Linden 77"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timing & Details */}
                                    <div className="bg-gray-50 dark:bg-white/2 p-4 rounded-xl border border-gray-100 dark:border-white/5 transition-colors">
                                        <h4 className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                                            <Clock className="w-3.5 h-3.5" />
                                            Timing & Details
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Pickup Time *</label>
                                                <input
                                                    type="datetime-local"
                                                    name="scheduledPickupTime"
                                                    value={formData.scheduledPickupTime}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 px-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-all [color-scheme:light] dark:[color-scheme:dark] text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Flight Number (Optional)</label>
                                                <div className="relative">
                                                    <Plane className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 transition-colors" />
                                                    <input
                                                        type="text"
                                                        name="flightNumber"
                                                        value={formData.flightNumber}
                                                        onChange={handleChange}
                                                        className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 pl-10 pr-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                                                        placeholder="LH123"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vehicle & Payment */}
                                    <div className="bg-gray-50 dark:bg-white/2 p-4 rounded-xl border border-gray-100 dark:border-white/5 transition-colors">
                                        <h4 className="text-[10px] font-black text-rose-600 dark:text-rose-400 mb-4 flex items-center gap-2 uppercase tracking-widest transition-colors">
                                            <Car className="w-3.5 h-3.5" />
                                            Vehicle & Payment
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Service Level</label>
                                                    <select
                                                    name="serviceType"
                                                    value={formData.serviceType}
                                                    onChange={handleChange}
                                                    className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 px-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 transition-all text-sm appearance-none"
                                                >
                                                    {serviceTypes.map(type => (
                                                        <option key={type.value} value={type.value} className="bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white">{type.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Vehicle Type</label>
                                                <select
                                                    name="vehicleType"
                                                    value={formData.vehicleType}
                                                    onChange={handleChange}
                                                    className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 px-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 transition-all text-sm appearance-none"
                                                >
                                                    {vehicleTypes.map(type => (
                                                        <option key={type.value} value={type.value} className="bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white">{type.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Fare Estimate (€)</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-emerald-500" />
                                                    <input
                                                        type="number"
                                                        name="fareEstimate"
                                                        value={formData.fareEstimate}
                                                        onChange={handleChange}
                                                        step="0.01"
                                                        min="0"
                                                        className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 pl-10 pr-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                                                        placeholder="45.00"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Passengers</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 transition-colors" />
                                                    <input
                                                        type="number"
                                                        name="passengerCount"
                                                        value={formData.passengerCount}
                                                        onChange={handleChange}
                                                        min="1"
                                                        max="8"
                                                        className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 pl-10 pr-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 transition-all text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Luggage</label>
                                                <div className="relative">
                                                    <Luggage className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 transition-colors" />
                                                    <input
                                                        type="number"
                                                        name="luggageCount"
                                                        value={formData.luggageCount}
                                                        onChange={handleChange}
                                                        min="0"
                                                        max="10"
                                                        className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 pl-10 pr-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 transition-all text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Partner & Notes */}
                                    <div className="bg-gray-50 dark:bg-white/2 p-4 rounded-xl border border-gray-100 dark:border-white/5 transition-colors">
                                        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-2 uppercase tracking-widest transition-colors">
                                            <FileText className="w-3.5 h-3.5" />
                                            Additional Info
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Payment Method</label>
                                                    <select
                                                    name="paymentMethod"
                                                    value={formData.paymentMethod}
                                                    onChange={handleChange}
                                                    className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 px-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 transition-all text-sm appearance-none"
                                                >
                                                    {paymentMethods.map(method => (
                                                        <option key={method.value} value={method.value} className="bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white">{method.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Partner (Optional)</label>
                                                <select
                                                    name="partnerId"
                                                    value={formData.partnerId}
                                                    onChange={handleChange}
                                                    className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 px-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 transition-all text-sm appearance-none"
                                                >
                                                    <option value="" className="bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white">Direct Booking</option>
                                                    {partners.map(partner => (
                                                        <option key={partner.id} value={partner.id} className="bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white">{partner.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider ml-1">Notes</label>
                                            <textarea
                                                name="passengerNotes"
                                                value={formData.passengerNotes}
                                                onChange={handleChange}
                                                rows="3"
                                                className="w-full bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/5 rounded-lg py-2.5 px-3 text-ink-black-950 dark:text-white focus:outline-none focus:border-gold-400/50 transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
                                                placeholder="Special requirements, wheelchair access, car seat needed, etc."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </form>

                            {/* Footer */}                             <div className="px-6 py-4 bg-gray-50 dark:bg-ink-black-950 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 flex-shrink-0 backdrop-blur-md transition-colors">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-ink-black-950 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-ink-black-950 font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-gold-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-ink-black-950/30 border-t-ink-black-950"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Car className="w-3.5 h-3.5" />
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
