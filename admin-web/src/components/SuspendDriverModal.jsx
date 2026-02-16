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
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />

                <div className="relative w-full max-w-lg transform overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-2xl transition-all border border-red-100 dark:border-red-900/30 p-8">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-3xl mb-4">
                            <ShieldAlert className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">Restrict Driver Access</h3>
                        <p className="text-slate-500 mt-2">
                            You are about to stop <span className="font-bold text-slate-900 dark:text-white">{driver.first_name} {driver.last_name}</span> from working.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Reason for Suspension</label>
                            <textarea
                                required
                                rows="3"
                                placeholder="e.g. Documentation expired, safety violation, or requested leave..."
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-red-500 transition-all text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block">Expires At (Optional)</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="datetime-local"
                                    value={formData.expiresAt}
                                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-red-500 text-sm"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 px-1 italic">Leave empty for indefinite suspension.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="py-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-xl shadow-red-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? 'Processing...' : 'Confirm Stop'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
