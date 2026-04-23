import { User, MessageCircle, Phone } from 'lucide-react';

export default function CustomerContactBar({ customer }) {
    if (!customer) return null;

    const handleWhatsApp = () => {
        if (!customer.phone) return;
        const phoneNumber = customer.phone.replace(/\D/g, '');
        if (!phoneNumber) return;
        window.open(`https://wa.me/${phoneNumber}`, '_blank');
    };

    const handleCall = () => {
        if (!customer.phone) return;
        window.location.href = `tel:${customer.phone}`;
    };

    return (
        <div className="flex items-center justify-between mb-6 p-4 bg-ink-black-900/60 backdrop-blur-xl border border-white/5 rounded-3xl">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gold-500/10 flex items-center justify-center border border-gold-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                    <User className="w-6 h-6 text-gold-400" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 leading-none">Passenger</p>
                    <p className="text-[11px] font-black text-white uppercase tracking-widest leading-none">{customer.name || 'GUEST'}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={handleWhatsApp}
                    disabled={!customer.phone || customer.phone === 'N/A'}
                    className={`p-3.5 border border-white/5 rounded-2xl transition-all active:scale-95 group ${(!customer.phone || customer.phone === 'N/A') ? 'opacity-20 cursor-not-allowed' : 'bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/30'}`}
                >
                    <MessageCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                </button>
                <button
                    onClick={handleCall}
                    disabled={!customer.phone || customer.phone === 'N/A'}
                    className={`p-3.5 border border-white/5 rounded-2xl transition-all active:scale-95 group ${(!customer.phone || customer.phone === 'N/A') ? 'opacity-20 cursor-not-allowed' : 'bg-white/5 hover:bg-gold-500/20 hover:border-gold-500/30'}`}
                >
                    <Phone className="w-5 h-5 text-gold-400 group-hover:scale-110 transition-transform" />
                </button>
            </div>
        </div>
    );
}
