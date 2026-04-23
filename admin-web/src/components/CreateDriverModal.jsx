import { useState } from 'react';
import { X, User, Car, Shield, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';

export default function CreateDriverModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        licensePlate: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        vehicleType: 'sedan',
        licenseNumber: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/drivers', formData);
            toast.success('Driver and Vehicle created successfully!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create driver:', error);
            toast.error(error.response?.data?.message || 'Failed to create driver');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-ink-black-950/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

                <div className="relative w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white dark:bg-ink-black-900 shadow-2xl transition-all border border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 px-6 py-5 bg-gray-50 dark:bg-ink-black-950/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gold-500 rounded-xl text-ink-black-950 shadow-lg shadow-gold-500/20">
                                <User className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-black text-ink-black-950 dark:text-white uppercase tracking-widest transition-colors">Register New Driver</h3>
                        </div>
                        <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-ink-black-950 dark:hover:text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {/* Section 1: Personal Info */}
                        <div>
                            <div className="flex items-center gap-2 mb-6 text-gold-600 dark:text-gold-500 transition-colors">
                                <User className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Personal Details</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 pl-1 transition-colors">First Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 pl-1 transition-colors">Last Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 pl-1 transition-colors">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 pl-1 transition-colors">Phone Number</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 pl-1 transition-colors">Temporary Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Vehicle Info */}
                        <div>
                            <div className="flex items-center gap-2 mb-6 text-cyan-600 dark:text-cyan-400 transition-colors">
                                <Car className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Vehicle Information</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 pl-1 transition-colors">License Plate</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.licensePlate}
                                        onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 pl-1 transition-colors">Vehicle Type</label>
                                    <select
                                        value={formData.vehicleType}
                                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all text-sm appearance-none"
                                    >
                                        <option value="sedan">Sedan</option>
                                        <option value="van">Van</option>
                                        <option value="business_van">Business Van</option>
                                        <option value="luxury">Luxury</option>
                                        <option value="accessible">Accessible</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 pl-1 transition-colors">Make / Brand</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Toyota"
                                        value={formData.make}
                                        onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 pl-1 transition-colors">Model</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Camry"
                                        value={formData.model}
                                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Compliance */}
                        <div>
                            <div className="flex items-center gap-2 mb-6 text-emerald-600 dark:text-emerald-400 transition-colors">
                                <Shield className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Registration Requirements</span>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest mb-2 pl-1 transition-colors">Tax / License Number</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.licenseNumber}
                                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-ink-black-950 text-ink-black-950 dark:text-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-6">
                             <button
                                 type="button"
                                 onClick={onClose}
                                 className="flex-1 px-6 py-4 rounded-2xl border border-gray-100 dark:border-white/5 text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 dark:hover:bg-white/5 hover:text-ink-black-950 dark:hover:text-white transition-all shadow-sm"
                             >
                                 Cancel
                             </button>
                             <button
                                 type="submit"
                                 disabled={loading}
                                 className="flex-1 px-6 py-4 rounded-2xl bg-gold-500 hover:bg-gold-400 text-ink-black-950 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-gold-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                             >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-ink-black-950/30 border-t-ink-black-950 rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Complete Registration
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
