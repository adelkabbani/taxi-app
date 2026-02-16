import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, User, Phone, Car, FileText, DollarSign } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';

const vehicleTypes = [
    { value: 'sedan', label: 'Sedan (4 pax)' },
    { value: 'van', label: 'Van (6-8 pax)' },
    { value: 'business_van', label: 'Business Van' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'accessible', label: 'Accessible' }
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
            // Set default scheduled time to 30 mins from now
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

            // Reset form
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-slate-900 opacity-75"></div>
                </div>

                <div className="inline-block align-bottom bg-white dark:bg-dark-card rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-slate-200 dark:border-slate-800">
                    <form onSubmit={handleSubmit}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-sky-500 to-blue-600">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Car className="w-5 h-5" />
                                Create New Booking
                            </h3>
                            <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="px-6 py-4 max-h-[calc(100vh-250px)] overflow-y-auto">
                            <div className="space-y-6">
                                {/* Passenger Info Section */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <User className="w-4 h-4 text-sky-500" />
                                        Passenger Information
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Name *
                                            </label>
                                            <input
                                                type="text"
                                                name="passengerName"
                                                value={formData.passengerName}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Phone *
                                            </label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="tel"
                                                    name="passengerPhone"
                                                    value={formData.passengerPhone}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                                    placeholder="+49 123 456 7890"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Location Section */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-emerald-500" />
                                        Locations
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Pickup Address *
                                            </label>
                                            <input
                                                type="text"
                                                name="pickupAddress"
                                                value={formData.pickupAddress}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                                placeholder="Berlin Brandenburg Airport (BER), Terminal 1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Dropoff Address
                                            </label>
                                            <input
                                                type="text"
                                                name="dropoffAddress"
                                                value={formData.dropoffAddress}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                                placeholder="Hotel Adlon, Unter den Linden 77"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Timing Section */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-amber-500" />
                                        Timing & Details
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Pickup Time *
                                            </label>
                                            <input
                                                type="datetime-local"
                                                name="scheduledPickupTime"
                                                value={formData.scheduledPickupTime}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Flight Number (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                name="flightNumber"
                                                value={formData.flightNumber}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                                placeholder="LH123"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Vehicle & Passengers Section */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <Car className="w-4 h-4 text-indigo-500" />
                                        Vehicle & Passengers
                                    </h4>


                                    // ... existing code ...

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Service Level
                                            </label>
                                            <select
                                                name="serviceType"
                                                value={formData.serviceType}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                            >
                                                {serviceTypes.map(type => (
                                                    <option key={type.value} value={type.value}>{type.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Vehicle Type
                                            </label>
                                            <select
                                                name="vehicleType"
                                                value={formData.vehicleType}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                            >
                                                {vehicleTypes.map(type => (
                                                    <option key={type.value} value={type.value}>{type.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Passengers
                                            </label>
                                            <input
                                                type="number"
                                                name="passengerCount"
                                                value={formData.passengerCount}
                                                onChange={handleChange}
                                                min="1"
                                                max="8"
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Luggage
                                            </label>
                                            <input
                                                type="number"
                                                name="luggageCount"
                                                value={formData.luggageCount}
                                                onChange={handleChange}
                                                min="0"
                                                max="10"
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Section */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-emerald-500" />
                                        Payment & Partner
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Payment Method
                                            </label>
                                            <select
                                                name="paymentMethod"
                                                value={formData.paymentMethod}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                            >
                                                {paymentMethods.map(method => (
                                                    <option key={method.value} value={method.value}>{method.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Fare Estimate (€)
                                            </label>
                                            <input
                                                type="number"
                                                name="fareEstimate"
                                                value={formData.fareEstimate}
                                                onChange={handleChange}
                                                step="0.01"
                                                min="0"
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                                placeholder="45.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Partner (Optional)
                                            </label>
                                            <select
                                                name="partnerId"
                                                value={formData.partnerId}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                            >
                                                <option value="">Direct Booking</option>
                                                {partners.map(partner => (
                                                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes Section */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-500" />
                                        Notes
                                    </h4>
                                    <textarea
                                        name="passengerNotes"
                                        value={formData.passengerNotes}
                                        onChange={handleChange}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                                        placeholder="Special requirements, wheelchair access, car seat needed, etc."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateBookingModal;
