import { motion } from 'framer-motion';

export default function Badge({ icon, label, color = 'slate' }) {
    const colorStyles = {
        slate: 'bg-slate-800 text-slate-300',
        sky: 'bg-sky-500/20 text-sky-400',
        emerald: 'bg-emerald-500/20 text-emerald-400',
    };

    return (
        <div className={`${colorStyles[color]} px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium`}>
            {icon && <span className="opacity-70">{icon}</span>}
            <span>{label}</span>
        </div>
    );
}
