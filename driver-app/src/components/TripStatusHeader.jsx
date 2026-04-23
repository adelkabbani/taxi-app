import { motion } from 'framer-motion';

const statusStyles = {
    assigned: {
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        text: 'text-indigo-400',
        label: 'Assigned'
    },
    accepted: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        text: 'text-blue-400',
        label: 'Accepted'
    },
    started: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        text: 'text-blue-400',
        label: 'On My Way'
    },
    arrived: {
        bg: 'bg-[#ff6b6b]/10',
        border: 'border-[#ff6b6b]/20',
        text: 'text-[#ff6b6b]',
        label: 'Arrived'
    },
    received: {
        bg: 'bg-[#60d62a]/10',
        border: 'border-[#60d62a]/20',
        text: 'text-[#60d62a]',
        label: 'Received'
    },
    completed: {
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500/40',
        text: 'text-emerald-500',
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
