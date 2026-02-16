import React from 'react';

const statusConfig = {
    pending: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-800 dark:text-amber-400',
        dot: 'bg-amber-500',
        label: 'Pending',
        animate: true
    },
    assigned: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-400',
        dot: 'bg-blue-500',
        label: 'Assigned',
        animate: true
    },
    accepted: {
        bg: 'bg-indigo-100 dark:bg-indigo-900/30',
        text: 'text-indigo-800 dark:text-indigo-400',
        dot: 'bg-indigo-500',
        label: 'Accepted'
    },
    arrived: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-800 dark:text-purple-400',
        dot: 'bg-purple-500',
        label: 'Arrived'
    },
    waiting_started: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-800 dark:text-orange-400',
        dot: 'bg-orange-500',
        label: 'Waiting',
        animate: true
    },
    started: {
        bg: 'bg-sky-100 dark:bg-sky-900/30',
        text: 'text-sky-800 dark:text-sky-400',
        dot: 'bg-sky-500',
        label: 'In Progress',
        animate: true
    },
    completed: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-800 dark:text-emerald-400',
        dot: 'bg-emerald-500',
        label: 'Completed'
    },
    cancelled: {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        dot: 'bg-slate-400',
        label: 'Cancelled'
    },
    no_show_requested: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-400',
        dot: 'bg-red-500',
        label: 'No-Show Pending',
        animate: true
    },
    no_show_confirmed: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-400',
        dot: 'bg-red-500',
        label: 'No-Show'
    },
    auto_released: {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        dot: 'bg-slate-400',
        label: 'Auto Released'
    }
};

const StatusBadge = ({ status }) => {
    const config = statusConfig[status] || statusConfig.pending;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${config.dot} ${config.animate ? 'animate-pulse' : ''}`}></span>
            {config.label}
        </span>
    );
};

export default StatusBadge;
