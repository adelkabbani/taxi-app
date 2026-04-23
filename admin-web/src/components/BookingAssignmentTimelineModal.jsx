import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Clock, User, Shield, AlertCircle, CheckCircle, 
    ArrowRight, History, Zap, ShieldAlert, Car 
} from 'lucide-react';
import api from '../lib/api';

export default function BookingAssignmentTimelineModal({ isOpen, onClose, bookingId }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && bookingId) {
            fetchLogs();
        }
    }, [isOpen, bookingId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/bookings/${bookingId}/assignment-logs`);
            setLogs(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch assignment logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const getEventIcon = (type) => {
        switch (type) {
            case 'assigned': return <User className="w-4 h-4 text-cyan-400" />;
            case 'accepted': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
            case 'rejected': return <AlertCircle className="w-4 h-4 text-rose-400" />;
            case 'system_re-queue': return <Zap className="w-4 h-4 text-gold-400" />;
            case 'auto_failed': return <ShieldAlert className="w-4 h-4 text-rose-600" />;
            default: return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink-black-950/80 backdrop-blur-sm transition-opacity" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white dark:bg-ink-black-900 w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl overflow-hidden border border-gray-100 dark:border-white/5 shadow-2xl transition-all"
                    >
                        {/* Header */}
                        <div className="p-6 bg-gray-50 dark:bg-ink-black-950/50 border-b border-gray-100 dark:border-white/5 flex justify-between items-center transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-gold-500 rounded-xl shadow-lg shadow-gold-500/20">
                                    <History className="w-6 h-6 text-ink-black-950" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-ink-black-950 dark:text-white tracking-tight uppercase">Assignment Audit Trail</h2>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Booking ID: #{bookingId}</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 hover:text-ink-black-950 dark:hover:text-white transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-10 h-10 border-t-2 border-gold-500 rounded-full animate-spin"></div>
                                    <p className="text-xs font-black text-gold-500 uppercase tracking-[0.2em] animate-pulse">Scanning Logs...</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="text-center py-20 opacity-30 text-ink-black-950 dark:text-white transition-colors">
                                    <Shield className="w-16 h-16 mx-auto mb-4" />
                                    <p className="text-lg font-bold">No assignment events recorded yet</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    {/* Timeline line */}
                                    <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-white/5"></div>

                                    <div className="space-y-8">
                                        {logs.map((log, index) => (
                                            <motion.div 
                                                key={log.id || index}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="relative pl-14"
                                            >
                                                {/* Dot icon */}
                                                <div className={`absolute left-3.5 -translate-x-1/2 p-2 rounded-full z-10 border shadow-lg transition-all ${
                                                    log.event_type === 'rejected' ? 'bg-rose-500/20 border-rose-500/50' : 
                                                    log.event_type === 'accepted' ? 'bg-emerald-500/20 border-emerald-500/50' :
                                                    'bg-white dark:bg-ink-black-950 border-gray-100 dark:border-white/10'
                                                }`}>
                                                    {getEventIcon(log.event_type)}
                                                </div>

                                                <div className="bg-gray-50 dark:bg-ink-black-950/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gold-500/30 transition-all group overflow-hidden relative">
                                                    {/* Background Glow */}
                                                    <div className={`absolute -right-10 -top-10 w-32 h-32 blur-3xl rounded-full opacity-10 pointer-events-none ${
                                                        log.event_type === 'rejected' ? 'bg-rose-500' : 
                                                        log.event_type === 'accepted' ? 'bg-emerald-500' :
                                                        'bg-gold-500'
                                                    }`}></div>

                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex flex-col">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                                log.event_type === 'rejected' ? 'text-rose-400' :
                                                                log.event_type === 'accepted' ? 'text-emerald-400' :
                                                                'text-gold-400'
                                                            }`}>
                                                                {log.event_type.replace('_', ' ')}
                                                            </span>
                                                            <span className="text-sm font-bold text-ink-black-950 dark:text-white mt-0.5 transition-colors">
                                                                {log.actor_name || (log.actor_id === 0 ? 'AI Assignment Engine' : 'Admin')}
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] text-gray-500 font-mono">
                                                                {new Date(log.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                            </p>
                                                            <p className="text-[9px] text-gray-400 font-bold">
                                                                {new Date(log.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {(log.driver_name || log.driver_id) && (
                                                        <div className="flex items-center gap-2 mt-3 pb-3 border-b border-gray-100 dark:border-white/5">
                                                            <div className="p-1.5 bg-white dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                                                                <Car className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-ink-black-900 dark:text-gray-300 transition-colors">
                                                                <span className="text-gold-500 font-mono text-[10px] px-1 bg-gold-500/10 rounded">DRV-{log.driver_id}</span>
                                                                {log.driver_name && <span>{log.driver_name}</span>}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {log.reason && (
                                                        <div className="mt-3">
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic bg-white dark:bg-white/5 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 transition-colors">
                                                                "{log.reason}"
                                                            </p>
                                                        </div>
                                                    )}

                                                    {log.details && Object.keys(log.details || {}).length > 0 && (
                                                        <div className="mt-3 flex gap-2 flex-wrap">
                                                            {Object.entries(log.details).map(([key, value]) => (
                                                                <span key={key} className="text-[9px] font-black uppercase bg-gray-100 dark:bg-ink-black-950 text-gray-500 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-white/5 transition-colors">
                                                                    {key}: {value}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 dark:bg-ink-black-950/80 border-t border-gray-100 dark:border-white/5 text-center transition-colors">
                            <p className="text-[9px] text-gray-400 dark:text-gray-600 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                                <Shield className="w-3 h-3" />
                                Immutable System Audit Log — Authorized Access Only
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
