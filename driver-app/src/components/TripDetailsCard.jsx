import { User, Briefcase, Clock, Navigation2, MapPin, Eye, EyeOff } from 'lucide-react';
import Badge from './Badge';

export default function TripDetailsCard({ booking, isPriceHidden, onTogglePrice }) {
    if (!booking) return null;

    const handleNavigate = () => {
        // Open default maps app with destination
        if (!booking.dropoff) return;
        const destination = encodeURIComponent(booking.dropoff);
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
        window.open(url, '_blank');
    };

    return (
        <div className="bg-ink-black-900/40 border border-white/5 rounded-[32px] p-6 mb-6 relative overflow-hidden backdrop-blur-xl">
            {/* Decorative glow */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-gold-500/10 blur-[60px] pointer-events-none rounded-full" />

            {/* Booking Reference & Time */}
            <div className="flex justify-between items-center mb-6 relative z-10">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{booking.date || 'NOT SCHEDULED'}</p>
                <p className="text-[10px] font-black text-gold-400 bg-gold-400/10 border border-gold-400/20 px-2 py-1 rounded-lg tracking-widest">
                    {booking.id || 'NO REF'}
                </p>
            </div>

            {/* Passenger Info Badges */}
            <div className="flex gap-2 mb-8 relative z-10 overflow-x-auto pb-2 scrollbar-hide">
                <Badge icon={<User size={14} />} label={`${booking.passengers || 0} PAX`} />
                <Badge icon={<Briefcase size={14} />} label={`${booking.luggage || 0} BAGS`} />
                <Badge icon={<Clock size={14} />} label={(booking.vehicle || 'Standard').toUpperCase()} />
            </div>

            {/* Location Timeline */}
            <div className="space-y-6 relative z-10 mb-8">
                <div className="absolute left-[11px] top-8 bottom-8 w-[1px] bg-white/5" />

                {/* Pickup */}
                <div className="relative pl-8">
                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-ink-black-950 border border-gold-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)] z-10 grid place-items-center">
                        <div className="w-1.5 h-1.5 bg-gold-500 rounded-full" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-[9px] font-black text-gold-500 uppercase tracking-[0.2em]">
                                Extraction Vector
                            </p>
                        </div>
                        <p className="text-xs font-black text-white uppercase tracking-widest leading-relaxed">
                            {booking.pickup || 'Address Pending'}
                        </p>
                        {booking.pickupTime && (
                            <p className="text-[10px] font-black text-gray-500 mt-1 uppercase tracking-widest">Scheduled: {booking.pickupTime}</p>
                        )}
                    </div>
                </div>

                {/* Dropoff */}
                <div className="relative pl-8">
                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-ink-black-950 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] z-10 grid place-items-center">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">
                                Mission Terminal
                            </p>
                        </div>
                        <p className="text-xs font-black text-white uppercase tracking-widest leading-relaxed">
                            {booking.dropoff || 'Address Pending'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigate Button */}
            <button
                onClick={handleNavigate}
                disabled={!booking.dropoff}
                className={`w-full font-black text-[10px] uppercase tracking-[0.3em] py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 border border-white/5 shadow-xl relative z-10 group ${!booking.dropoff ? 'opacity-20 cursor-not-allowed grayscale' : 'bg-white/5 hover:bg-white/10 text-white'}`}
            >
                <Navigation2 className="w-4 h-4 text-gold-500 group-hover:rotate-12 transition-transform" />
                Initiate Navigation
            </button>

            {/* Fare Display */}
            {typeof booking.price === 'number' && booking.price > 0 && (
                <div className="mt-8 pt-8 border-t border-white/5 relative z-10">
                    <div className="flex justify-between items-end mb-2">
                        <div className="text-left">
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Estimated Yield</p>
                            <p className={`text-3xl font-black text-white tracking-tighter italic transition-all duration-500 ${isPriceHidden ? 'blur-md opacity-20' : 'blur-0 opacity-100'}`}>
                                €{booking.price.toFixed(2)}
                            </p>
                        </div>
                        <button 
                            onClick={onTogglePrice}
                            className={`p-3 rounded-xl border transition-all flex items-center gap-2 group ${isPriceHidden ? 'bg-gold-500/20 border-gold-500/30 text-gold-500' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}
                        >
                            {isPriceHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                                {isPriceHidden ? 'Show' : 'Hide'}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
