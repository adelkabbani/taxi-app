import React from 'react';
import { Activity, Radio, Coffee, Slash, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

const StatusBadge = ({ status }) => {
    const config = {
        pending: {
            bg: 'bg-gold-500/10',
            text: 'text-gold-600 dark:text-gold-400',
            border: 'border-gold-500/20',
            shadow: 'shadow-[0_0_10px_rgba(255,214,10,0.1)]',
            icon: Clock,
            label: 'Pending',
            animate: true
        },
        assigned: {
            bg: 'bg-cyan-500/10',
            text: 'text-cyan-600 dark:text-cyan-400',
            border: 'border-cyan-500/20',
            shadow: 'shadow-[0_0_10px_rgba(34,211,238,0.1)]',
            icon: Radio,
            label: 'Assigned',
            animate: true
        },
        accepted: {
            bg: 'bg-cyan-500/10',
            text: 'text-cyan-600 dark:text-cyan-400',
            border: 'border-cyan-500/20',
            shadow: 'shadow-[0_0_10px_rgba(34,211,238,0.1)]',
            icon: CheckCircle2,
            label: 'Accepted'
        },
        arrived: {
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-500/20',
            shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.1)]',
            icon: Activity,
            label: 'Arrived'
        },
        waiting_started: {
            bg: 'bg-gold-500/10',
            text: 'text-gold-600 dark:text-gold-400',
            border: 'border-gold-500/20',
            shadow: 'shadow-[0_0_10px_rgba(255,214,10,0.1)]',
            icon: Clock,
            label: 'Waiting',
            animate: true
        },
        started: {
            bg: 'bg-indigo-500/15',
            text: 'text-indigo-600 dark:text-indigo-400',
            border: 'border-indigo-500/30',
            shadow: 'shadow-[0_0_15px_rgba(34,211,238,0.2)]',
            icon: Activity,
            label: 'On The Way',
            animate: true
        },
        completed: {
            bg: 'bg-emerald-500/15',
            text: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-500/30',
            shadow: 'shadow-none',
            icon: CheckCircle2,
            label: 'Complete'
        },
        cancelled: {
            bg: 'bg-gray-100 dark:bg-white/5',
            text: 'text-gray-500 dark:text-gray-500',
            border: 'border-gray-200 dark:border-white/5',
            shadow: 'shadow-none',
            icon: XCircle,
            label: 'Cancelled'
        },
        expired: {
            bg: 'bg-gray-100 dark:bg-white/5',
            text: 'text-gray-500 dark:text-gray-500',
            border: 'border-gray-200 dark:border-white/5',
            shadow: 'shadow-none',
            icon: Slash,
            label: 'Expired'
        },
        no_show_requested: {
            bg: 'bg-rose-500/10',
            text: 'text-rose-600 dark:text-rose-400',
            border: 'border-rose-500/20',
            shadow: 'shadow-[0_0_10px_rgba(244,63,94,0.1)]',
            icon: AlertCircle,
            label: 'No-Show Pending',
            animate: true
        },
        no_show_confirmed: {
            bg: 'bg-rose-500/10',
            text: 'text-rose-600 dark:text-rose-500',
            border: 'border-rose-500/20',
            shadow: 'shadow-[0_0_10px_rgba(244,63,94,0.2)]',
            icon: AlertCircle,
            label: 'No-Show'
        },
        auto_released: {
            bg: 'bg-white/5',
            text: 'text-gray-500',
            border: 'border-white/5',
            shadow: 'shadow-none',
            icon: Slash,
            label: 'Auto Released'
        },
        rejected: {
            bg: 'bg-rose-500/10',
            text: 'text-rose-600 dark:text-rose-500',
            border: 'border-rose-500/30',
            shadow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]',
            icon: XCircle,
            label: 'Rejected',
            animate: true
        }
    };

    const style = config[status] || config.pending;
    const Icon = style.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text} ${style.border} border ${style.shadow || ''} backdrop-blur-md`}>
            {Icon && <Icon className={`w-3 h-3 ${style.animate ? 'animate-pulse' : ''}`} />}
            {style.label}
        </span>
    );
};

export default StatusBadge;
