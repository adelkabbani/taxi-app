import { User, MessageCircle, Phone } from 'lucide-react';

export default function CustomerContactBar({ customer }) {
    const handleWhatsApp = () => {
        const phoneNumber = customer.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phoneNumber}`, '_blank');
    };

    const handleCall = () => {
        window.location.href = `tel:${customer.phone}`;
    };

    return (
        <div className="flex items-center justify-between mb-6 p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                    <User className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                    <p className="font-bold text-white text-sm">{customer.name}</p>
                    <p className="text-xs text-slate-400">{customer.phone}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={handleWhatsApp}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors active:scale-95"
                >
                    <MessageCircle className="w-5 h-5 text-emerald-400" />
                </button>
                <button
                    onClick={handleCall}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors active:scale-95"
                >
                    <Phone className="w-5 h-5 text-sky-400" />
                </button>
            </div>
        </div>
    );
}
