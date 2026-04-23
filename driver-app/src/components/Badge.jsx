import { motion } from 'framer-motion';

export default function Badge({ icon, label, color = 'slate' }) {
    const colorStyles = {
        slate: 'bg-white/5 text-gray-400 border border-white/5',
        gold: 'bg-gold-500/10 text-gold-400 border border-gold-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    };

    return (
        <div className={`${colorStyles[color]} px-3 py-1.5 rounded-xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest backdrop-blur-md`}>
            {icon && <span className="opacity-70">{icon}</span>}
            <span>{label}</span>
        </div>
    );
}
