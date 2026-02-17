import React from 'react';
import { Activity, Radio, Coffee, Slash, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

const StatusBadge = ({ status }) => {
    const config = {
        pending: {
            bg: 'bg-amber-500/10',
            text: 'text-amber-400',
            border: 'border-amber-500/20',
            shadow: 'shadow-[0_0_10px_rgba(245,158,11,0.2)]',
            icon: Clock,
            label: 'Pending',
            animate: true
        },
        assigned: {
            bg: 'bg-blue-500/10',
            text: 'text-blue-400',
            border: 'border-blue-500/20',
            shadow: 'shadow-[0_0_10px_rgba(59,130,246,0.2)]',
            icon: Radio,
            label: 'Assigned',
            animate: true
        },
        accepted: {
            bg: 'bg-indigo-500/10',
            text: 'text-indigo-400',
            border: 'border-indigo-500/20',
            shadow: 'shadow-[0_0_10px_rgba(99,102,241,0.2)]',
            icon: CheckCircle2,
            label: 'Accepted'
        },
        arrived: {
            bg: 'bg-purple-500/10',
            text: 'text-purple-400',
            border: 'border-purple-500/20',
            shadow: 'shadow-[0_0_10px_rgba(168,85,247,0.2)]',
            icon: Activity,
            label: 'Arrived'
        },
        waiting_started: {
            bg: 'bg-orange-500/10',
            text: 'text-orange-400',
            border: 'border-orange-500/20',
            shadow: 'shadow-[0_0_10px_rgba(249,115,22,0.2)]',
            icon: Clock,
            label: 'Waiting',
            animate: true
        },
        started: {
            bg: 'bg-sky-500/10',
            text: 'text-sky-400',
            border: 'border-sky-500/20',
            shadow: 'shadow-[0_0_10px_rgba(14,165,233,0.2)]',
            icon: Activity,
            label: 'In Progress',
            animate: true
        },
        completed: {
            bg: 'bg-emerald-500/10',
            text: 'text-emerald-400',
            border: 'border-emerald-500/20',
            shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.2)]',
            icon: CheckCircle2,
            label: 'Completed'
        },
        cancelled: {
            bg: 'bg-slate-500/10',
            text: 'text-slate-400',
            border: 'border-slate-500/20',
            shadow: 'shadow-none',
            icon: XCircle,
            label: 'Cancelled'
        },
        no_show_requested: {
            bg: 'bg-rose-500/10',
            text: 'text-rose-400',
            border: 'border-rose-500/20',
            shadow: 'shadow-[0_0_10px_rgba(244,63,94,0.2)]',
            icon: AlertCircle,
            label: 'No-Show Pending',
            animate: true
        },
        no_show_confirmed: {
            bg: 'bg-rose-500/10',
            text: 'text-red-400',
            border: 'border-red-500/20',
            shadow: 'shadow-[0_0_10px_rgba(239,68,68,0.2)]',
            icon: AlertCircle,
            label: 'No-Show'
        },
        auto_released: {
            bg: 'bg-slate-500/10',
            text: 'text-slate-400',
            border: 'border-slate-500/20',
            shadow: 'shadow-none',
            icon: Slash,
            label: 'Auto Released'
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
