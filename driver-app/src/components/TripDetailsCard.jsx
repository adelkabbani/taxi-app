import { User, Briefcase, Clock, Navigation2, MapPin } from 'lucide-react';
import Badge from './Badge';

export default function TripDetailsCard({ booking }) {
    const handleNavigate = () => {
        // Open default maps app with destination
        const destination = encodeURIComponent(booking.dropoff);
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
        window.open(url, '_blank');
    };

    return (
        <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 mb-6 relative overflow-hidden">
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-3xl pointer-events-none" />

            {/* Booking Reference & Time */}
            <div className="flex justify-between items-center mb-4 relative z-10">
                <p className="text-slate-400 text-xs">{booking.date}</p>
                <p className="text-slate-300 font-mono text-xs bg-slate-800/50 px-2 py-1 rounded">
                    {booking.id}
                </p>
            </div>

            {/* Passenger Info Badges */}
            <div className="flex gap-2 mb-6 relative z-10">
                <Badge icon={<User size={14} />} label={`${booking.passengers} Pax`} />
                <Badge icon={<Briefcase size={14} />} label={`${booking.luggage} Bags`} />
                <Badge icon={<Clock size={14} />} label={booking.vehicle} />
            </div>

            {/* Location Timeline */}
            <div className="space-y-4 relative z-10 mb-6">
                <div className="absolute left-[11px] top-6 bottom-6 w-[2px] bg-slate-700" />

                {/* Pickup */}
                <div className="relative pl-8">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] z-10 grid place-items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-3 h-3 text-red-400" />
                            <p className="text-xs text-red-400 font-bold uppercase tracking-wider">
                                Pickup
                            </p>
                        </div>
                        <p className="text-sm font-medium text-slate-200 leading-snug">
                            {booking.pickup}
                        </p>
                        {booking.pickupTime && (
                            <p className="text-xs text-slate-500 mt-1">{booking.pickupTime}</p>
                        )}
                    </div>
                </div>

                {/* Dropoff */}
                <div className="relative pl-8">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] z-10 grid place-items-center">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                                Dropoff
                            </p>
                        </div>
                        <p className="text-sm font-medium text-slate-200 leading-snug">
                            {booking.dropoff}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigate Button */}
            <button
                onClick={handleNavigate}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg relative z-10"
            >
                <Navigation2 className="w-5 h-5" />
                Navigate
            </button>

            {/* Fare Display */}
            {booking.price && (
                <div className="mt-4 text-center relative z-10">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Estimated Fare</p>
                    <p className="text-2xl font-bold text-white">€{booking.price.toFixed(2)}</p>
                </div>
            )}
        </div>
    );
}
