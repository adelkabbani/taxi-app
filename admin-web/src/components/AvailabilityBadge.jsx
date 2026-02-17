import React from 'react';
import { Activity, Radio, Coffee, Slash, AlertCircle } from 'lucide-react';

const AvailabilityBadge = ({ availability, detailedStatus, isStale, suspended }) => {
    // Priority 1: Suspension
    if (suspended) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                <AlertCircle className="w-3 h-3 animate-pulse" />
                SUSPENDED
            </span>
        );
    }

    // Priority 2: Stale Signal
    if (isStale && availability !== 'offline') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                <Radio className="w-3 h-3 animate-pulse" />
                No Signal
            </span>
        );
    }

    // Use detailed status if available (matches MapSidebar), otherwise fallback to availability
    const status = detailedStatus || availability;

    const config = {
        'available': {
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.2)]',
            icon: Activity,
            label: 'Available'
        },
        'Available': {
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.2)]',
            icon: Activity,
            label: 'Available'
        },

        'busy': {
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
            shadow: 'shadow-none',
            icon: Radio,
            label: 'Busy'
        },
        'Dispatching': {
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
            shadow: 'shadow-[0_0_10px_rgba(99,102,241,0.2)]',
            icon: Radio,
            label: 'Dispatching'
        },
        'P.O.B': {
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/10',
            border: 'border-cyan-500/20',
            shadow: 'shadow-[0_0_10px_rgba(6,182,212,0.2)]',
            icon: Activity,
            label: 'On Trip'
        },

        'on_break': {
            color: 'text-slate-400',
            bg: 'bg-slate-500/10',
            border: 'border-slate-500/20',
            shadow: 'shadow-none',
            icon: Coffee,
            label: 'On Break'
        },

        'offline': {
            color: 'text-slate-500',
            bg: 'bg-white/5',
            border: 'border-white/5',
            shadow: 'shadow-none',
            icon: Slash,
            label: 'Offline'
        },
        'Unavailable': {
            color: 'text-slate-500',
            bg: 'bg-white/5',
            border: 'border-white/5',
            shadow: 'shadow-none',
            icon: Slash,
            label: 'Offline'
        }
    };

    // Default to offline config if status not found
    const style = config[status] || config['offline'];
    const Icon = style.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.color} ${style.border} border ${style.shadow || ''} backdrop-blur-md`}>
            <Icon className="w-3 h-3" />
            {style.label}
        </span>
    );
};

export default AvailabilityBadge;
