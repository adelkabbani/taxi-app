import { Layers, Car, Filter, Truck } from 'lucide-react';

export default function MapControlPanel({
    mapMode,
    setMapMode,
    showTraffic,
    setShowTraffic,
    filters,
    setFilters
}) {
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] flex flex-row gap-3 items-center">
            {/* Map Mode Toggle */}
            <div className="bg-white/95 dark:bg-ink-black-900/80 backdrop-blur-md p-1 rounded-xl shadow-xl border border-gray-200 dark:border-white/10 flex gap-1 transition-all">
                <button
                    onClick={() => setMapMode('street')}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${mapMode === 'street'
                        ? 'bg-gold-500 text-ink-black-950 shadow-md'
                        : 'text-gray-500 dark:text-gray-400 hover:text-ink-black-950 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    Street
                </button>
                <button
                    onClick={() => setMapMode('satellite')}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${mapMode === 'satellite'
                        ? 'bg-gold-500 text-ink-black-950 shadow-md'
                        : 'text-gray-500 dark:text-gray-400 hover:text-ink-black-950 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    Satellite
                </button>
            </div>

            {/* Traffic Toggle */}
            <button
                onClick={() => setShowTraffic(!showTraffic)}
                className={`bg-white/95 dark:bg-ink-black-900/80 backdrop-blur-md px-4 py-2 rounded-xl shadow-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${showTraffic
                    ? 'bg-gold-500 text-ink-black-950 border-gold-500'
                    : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:text-ink-black-950 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
            >
                <Car className="w-4 h-4" />
                Traffic: {showTraffic ? 'Active' : 'Offline'}
            </button>
        </div>
    );
}
