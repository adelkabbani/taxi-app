import React from 'react';

const AvailabilityBadge = ({ availability, isStale, suspended }) => {
    if (suspended) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 ring-1 ring-slate-900 dark:ring-white">
                <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                SUSPENDED
            </span>
        );
    }

    if (isStale && availability !== 'offline') {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-500"></span>
                Stale (No Signal)
            </span>
        );
    }

    switch (availability) {
        case 'available':
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
                    Available
                </span>
            );
        case 'busy':
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-blue-500"></span>
                    Busy
                </span>
            );
        case 'on_break':
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-slate-400"></span>
                    On Break
                </span>
            );
        case 'offline':
        default:
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-red-500"></span>
                    Offline
                </span>
            );
    }
};

export default AvailabilityBadge;
