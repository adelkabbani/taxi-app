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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] flex flex-row gap-2 items-center">
            {/* Map Mode Toggle */}
            <div className="bg-white dark:bg-slate-900/90 backdrop-blur-sm p-1.5 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 flex gap-1">
                <button
                    onClick={() => setMapMode('street')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 ${mapMode === 'street'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    Map
                </button>
                <button
                    onClick={() => setMapMode('satellite')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 ${mapMode === 'satellite'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    Satellite
                </button>
            </div>

            {/* Traffic Toggle */}
            <button
                onClick={() => setShowTraffic(!showTraffic)}
                className={`bg-white dark:bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-2 ${showTraffic
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
            >
                <Car className="w-3.5 h-3.5" />
                Traffic: {showTraffic ? 'ON' : 'OFF'}
            </button>

            {/* Filters removed - relocated to Sidebar */}
        </div>
    );
}
