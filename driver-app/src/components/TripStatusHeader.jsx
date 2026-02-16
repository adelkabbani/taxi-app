import { motion } from 'framer-motion';

const statusStyles = {
    assigned: {
        bg: 'bg-amber-500/20',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        label: 'Incoming Request'
    },
    accepted: {
        bg: 'bg-slate-500/20',
        border: 'border-slate-500/30',
        text: 'text-slate-300',
        label: 'Accepted'
    },
    started: {
        bg: 'bg-sky-500/20',
        border: 'border-sky-500/30',
        text: 'text-sky-400',
        label: 'On My Way'
    },
    arrived: {
        bg: 'bg-indigo-500/20',
        border: 'border-indigo-500/30',
        text: 'text-indigo-400',
        label: 'Arrived'
    },
    received: {
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        label: 'Received'
    },
    completed: {
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        label: 'Completed'
    }
};

export default function TripStatusHeader({ status }) {
    const style = statusStyles[status] || statusStyles.assigned;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${style.bg} ${style.border} border-2 rounded-2xl p-4 mb-4`}
        >
            <p className={`${style.text} text-sm font-bold uppercase tracking-wider text-center`}>
                {style.label}
            </p>
        </motion.div>
    );
}
