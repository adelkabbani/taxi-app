import { useState } from 'react';
import { X, AlertOctagon, Calendar, Clock, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';

export default function SuspendDriverModal({ isOpen, onClose, driver, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        reason: '',
        expiresAt: '',
    });

    if (!isOpen || !driver) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/drivers/${driver.id}/suspend`, formData);
            toast.success(`${driver.first_name} has been suspended.`);
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to suspend driver');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-ink-black-950/80 backdrop-blur-md" onClick={onClose} />

                <div className="relative w-full max-w-lg transform overflow-hidden rounded-[2.5rem] bg-white dark:bg-ink-black-900 shadow-2xl transition-all border border-gray-100 dark:border-rose-500/20 p-8">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="p-4 bg-rose-500/10 text-rose-500 rounded-3xl mb-4 border border-rose-500/20 shadow-lg shadow-rose-500/5 transition-colors">
                            <ShieldAlert className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-ink-black-950 dark:text-white uppercase tracking-tighter transition-colors">Restrict Access</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm transition-colors">
                            You are about to stop <span className="font-black text-ink-black-950 dark:text-white">{driver.first_name} {driver.last_name}</span> from working.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1 mb-2 block transition-colors">Reason for Suspension</label>
                            <textarea
                                required
                                rows="3"
                                placeholder="e.g. Documentation expired, safety violation, or requested leave..."
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-ink-black-950 border border-gray-100 dark:border-white/5 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all text-sm text-ink-black-950 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1 mb-2 block transition-colors">Expires At (Optional)</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                                <input
                                    type="datetime-local"
                                    value={formData.expiresAt}
                                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-ink-black-950 border border-gray-100 dark:border-white/5 focus:ring-1 focus:ring-rose-500 text-sm text-ink-black-950 dark:text-white appearance-none transition-colors"
                                />
                            </div>
                            <p className="text-[10px] text-gray-600 mt-2 px-1 italic">Leave empty for indefinite suspension.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="py-4 rounded-2xl border border-gray-100 dark:border-white/5 text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 dark:hover:bg-white/5 hover:text-ink-black-950 dark:hover:text-white transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : 'Confirm Restriction'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
