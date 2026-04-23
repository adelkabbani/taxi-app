import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, Image, Trash2, Wifi, WifiOff,
    AlertTriangle, Search, X, Monitor, RefreshCw,
    Tv2, Radio, Zap, Play, LayoutGrid
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SLIDE_INTERVAL = 4000;

const SEED_DEVICES = [
    { id: 'TBL-001', car: 'DZF-221', online: true,  lastPing: Date.now() - 8000  },
    { id: 'TBL-002', car: 'DZF-105', online: true,  lastPing: Date.now() - 18000 },
    { id: 'TBL-003', car: 'DZF-348', online: false, lastPing: Date.now() - 95000 },
    { id: 'TBL-004', car: 'DZF-007', online: true,  lastPing: Date.now() - 5000  },
    { id: 'TBL-005', car: 'DZF-512', online: true,  lastPing: Date.now() - 12000 },
    { id: 'TBL-006', car: 'DZF-088', online: true,  lastPing: Date.now() - 25000 },
    { id: 'TBL-007', car: 'DZF-299', online: true,  lastPing: Date.now() - 3000  },
    { id: 'TBL-008', car: 'DZF-416', online: true,  lastPing: Date.now() - 9000  },
];

const msAgo = (ts) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)   return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
};

const isStale = (ts) => Date.now() - ts > 60000;

// ─── Upload Progress ──────────────────────────────────────────────────────────
function UploadProgress({ file, progress }) {
    return (
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
            <Image className="w-4 h-4 text-gold-500 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-ink-black-950 dark:text-white truncate mb-1">{file}</p>
                <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            </div>
            <span className="text-[10px] font-black text-gold-500 shrink-0">{progress}%</span>
        </div>
    );
}

// ─── Live View Modal ──────────────────────────────────────────────────────────
function LiveViewModal({ device, activeAds, onClose }) {
    const stale = isStale(device.lastPing);
    const [idx, setIdx] = useState(0);

    useEffect(() => {
        if (activeAds.length <= 1) return;
        const t = setInterval(() => setIdx(i => (i + 1) % activeAds.length), SLIDE_INTERVAL);
        return () => clearInterval(t);
    }, [activeAds.length]);

    // Reset slide index if ads change
    useEffect(() => { setIdx(0); }, [activeAds.length]);

    const currentAd = activeAds[idx] || null;
    const isOnline = device.online && !stale;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.85, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.85, y: 30, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="w-full max-w-3xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gold-500/15 border border-gold-500/30 rounded-xl">
                            <Tv2 className="w-5 h-5 text-gold-500" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white uppercase tracking-widest">Live View — {device.id}</h2>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                                Car {device.car} • Ping {msAgo(device.lastPing)}
                                {activeAds.length > 0 && ` • ${activeAds.length} ad${activeAds.length > 1 ? 's' : ''} in queue`}
                            </p>
                        </div>
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isOnline ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                            {isOnline
                                ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />Online</>
                                : <><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Offline</>}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tablet Frame */}
                <div
                    className="relative bg-gray-950 border-[14px] border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden mx-auto"
                    style={{ maxWidth: '600px', aspectRatio: '16/10' }}
                >
                    {/* Status bar */}
                    <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-5 py-2.5 bg-black/50 backdrop-blur-md">
                        <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{device.id} · {device.car}</span>
                        <div className="flex items-center gap-2">
                            {activeAds.length > 0 && isOnline && (
                                <span className="text-[9px] text-gold-400 font-black">{idx + 1} / {activeAds.length}</span>
                            )}
                            {isOnline
                                ? <Wifi className="w-3 h-3 text-emerald-400" />
                                : <WifiOff className="w-3 h-3 text-red-400" />}
                            <span className="text-[9px] text-white/40 font-black uppercase">DriveZFlight</span>
                        </div>
                    </div>

                    {/* Content */}
                    <AnimatePresence mode="wait">
                        {isOnline && currentAd ? (
                            <motion.div
                                key={currentAd.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.7 }}
                                className="w-full h-full"
                            >
                                <img src={currentAd.preview} alt={currentAd.name} className="w-full h-full object-cover" />
                                {/* Caption bar */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5">
                                    <p className="text-white text-xs font-black uppercase tracking-widest truncate">{currentAd.name}</p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="none"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#001d3d] to-[#000814]"
                            >
                                {!isOnline ? (
                                    <>
                                        <WifiOff className="w-14 h-14 text-red-400/50 mb-4" />
                                        <p className="text-white/30 text-[11px] font-black uppercase tracking-widest">Device Offline</p>
                                        <p className="text-gray-600 text-[9px] mt-2">Last seen {msAgo(device.lastPing)}</p>
                                    </>
                                ) : (
                                    <>
                                        <Monitor className="w-14 h-14 text-gold-500/20 mb-4" />
                                        <p className="text-white/20 text-[11px] font-black uppercase tracking-widest">No Showcase Active</p>
                                        <p className="text-gray-600 text-[9px] mt-2 text-center">Upload images and press "Push to All Tablets"</p>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Offline overlay */}
                    {!isOnline && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                            <WifiOff className="w-12 h-12 text-red-400" />
                            <p className="text-white text-sm font-black uppercase tracking-widest">Device Offline</p>
                        </div>
                    )}

                    {/* Slide dots */}
                    {isOnline && activeAds.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
                            {activeAds.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setIdx(i)}
                                    className={`rounded-full transition-all duration-300 ${i === idx ? 'w-5 h-1.5 bg-gold-500' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Thumbnail strip */}
                {activeAds.length > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                        {activeAds.map((ad, i) => (
                            <button
                                key={ad.id}
                                onClick={() => setIdx(i)}
                                className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-gold-500 scale-110' : 'border-transparent opacity-40 hover:opacity-70'}`}
                            >
                                <img src={ad.preview} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
                <p className="mt-3 text-center text-[9px] text-gray-600 uppercase tracking-widest">Simulated Tablet Display • Updates every {SLIDE_INTERVAL / 1000}s</p>
            </motion.div>
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TabletAds() {
    const [ads, setAds]               = useState([]);
    const [devices, setDevices]       = useState(SEED_DEVICES);
    const [uploading, setUploading]   = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [search, setSearch]         = useState('');
    const [liveDevice, setLiveDevice] = useState(null);
    const [ticker, setTicker]         = useState(0);
    const fileInputRef = useRef(null);

    // ── Heartbeat (only nudge online pings, TBL-003 stays offline) ───────
    useEffect(() => {
        const t = setInterval(() => {
            setDevices(prev => prev.map(d => {
                if (!d.online) return d;
                return { ...d, lastPing: Date.now() - Math.floor(Math.random() * 20000 + 2000) };
            }));
            setTicker(n => n + 1);
        }, 5000);
        return () => clearInterval(t);
    }, []);

    // ── All uploaded ads are ALWAYS live — no button needed ─────────────
    const activeAds = ads;
    const onlineCount  = devices.filter(d => d.online).length;
    const offlineCount = devices.length - onlineCount;

    // ── File processing ──────────────────────────────────────────────────
    const processFiles = useCallback((files) => {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const id = `ad-${Date.now()}-${Math.random()}`;
            setUploading(prev => [...prev, { name: file.name, progress: 0 }]);
            const reader = new FileReader();
            reader.onload = (e) => {
                let prog = 0;
                const iv = setInterval(() => {
                    prog = Math.min(prog + Math.floor(Math.random() * 30 + 10), 100);
                    setUploading(prev => prev.map(u => u.name === file.name ? { ...u, progress: prog } : u));
                    if (prog >= 100) {
                        clearInterval(iv);
                        setTimeout(() => {
                            setAds(prev => [...prev, { id, name: file.name, size: file.size, preview: e.target.result }]);
                            setUploading(prev => prev.filter(u => u.name !== file.name));
                        }, 300);
                    }
                }, 160);
            };
            reader.readAsDataURL(file);
        });
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault(); setIsDragging(false);
        processFiles(e.dataTransfer.files);
    }, [processFiles]);

    const deleteAd = (id) => {
        setAds(prev => prev.filter(a => a.id !== id));
    };

    const filteredDevices = devices.filter(d =>
        d.id.toLowerCase().includes(search.toLowerCase()) ||
        d.car.toLowerCase().includes(search.toLowerCase())
    );

    const staleCount = devices.filter(d => isStale(d.lastPing)).length;

    return (
        <div className="space-y-6">
            {/* ── Page Header ───────────────────────────────────────── */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-[0.25em] mb-1">Tablet Fleet</p>
                    <h1 className="text-3xl font-black text-ink-black-950 dark:text-white tracking-tight">Media Manager</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">{onlineCount} Online</span>
                    </div>
                    <div className="px-4 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">{offlineCount} Offline</span>
                    </div>
                </div>
            </div>

            {/* ── Stats ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Tablets',  value: devices.length, icon: Monitor,     iconColor: 'text-blue-500',    iconBg: 'bg-blue-50 dark:bg-blue-500/10'    },
                    { label: 'Online Now',     value: onlineCount,    icon: Wifi,         iconColor: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-500/10' },
                    { label: 'Ads in Library', value: ads.length,     icon: LayoutGrid,   iconColor: 'text-gold-600 dark:text-gold-400',    iconBg: 'bg-amber-50 dark:bg-gold-500/10'   },
                    { label: 'Warnings',       value: staleCount,     icon: AlertTriangle, iconColor: 'text-red-600 dark:text-red-400',    iconBg: 'bg-red-50 dark:bg-red-500/10'      },
                ].map(({ label, value, icon: Icon, iconColor, iconBg }) => (
                    <div key={label} className="bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm dark:shadow-none">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest">{label}</p>
                            <div className={`p-2 rounded-xl ${iconBg}`}><Icon className={`w-4 h-4 ${iconColor}`} /></div>
                        </div>
                        <p className="text-3xl font-black text-ink-black-950 dark:text-white">{value}</p>
                    </div>
                ))}
            </div>

            {/* ── Live Broadcast Status Banner ────────────────────── */}
            {ads.length > 0 && (
                <div className="rounded-2xl border-2 bg-gold-500/10 border-gold-500/40 p-5 flex items-center gap-5">
                    <div className="p-3.5 rounded-2xl bg-gold-500 shrink-0">
                        <Radio className="w-6 h-6 text-ink-black-950 animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-base font-black text-gold-600 dark:text-gold-400 uppercase tracking-widest mb-0.5">
                            Live — Broadcasting to {onlineCount} tablets
                        </h2>
                        <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                            {ads.length} ad{ads.length !== 1 ? 's' : ''} cycling every {SLIDE_INTERVAL / 1000}s on all online tablets
                        </p>
                    </div>
                    <button
                        onClick={() => setAds([])}
                        className="shrink-0 px-5 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Clear All
                    </button>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                UPLOAD + AD LIBRARY
            ═══════════════════════════════════════════════════════ */}
            <div className="bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-amber-50 dark:bg-gold-500/10 border border-amber-200 dark:border-gold-500/20 rounded-xl">
                        <Upload className="w-5 h-5 text-gold-600 dark:text-gold-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest">Step 1</p>
                        <p className="text-base font-black text-ink-black-950 dark:text-white">Upload Your Ad Images</p>
                    </div>
                </div>

                {/* Drop Zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                        isDragging
                            ? 'border-gold-500 bg-amber-50 dark:bg-gold-500/5 scale-[1.01]'
                            : 'border-gray-300 dark:border-white/10 hover:border-gold-500/60 hover:bg-amber-50/50 dark:hover:bg-gold-500/5'
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                        onChange={e => { processFiles(e.target.files); e.target.value = ''; }}
                    />
                    <motion.div
                        animate={isDragging ? { scale: 1.2, rotate: 10 } : { scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className="p-4 bg-amber-50 dark:bg-gold-500/10 border border-amber-200 dark:border-gold-500/20 rounded-2xl mb-5"
                    >
                        <Upload className="w-8 h-8 text-gold-600 dark:text-gold-500" />
                    </motion.div>
                    <p className="text-base font-black text-ink-black-950 dark:text-white mb-1.5">
                        {isDragging ? 'Drop to add to showcase' : 'Drag & drop ad images here'}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">
                        JPG · PNG · WebP · GIF · Upload as many as you like
                    </p>
                    <p className="mt-2 text-[10px] text-gray-300 dark:text-gray-600 uppercase tracking-widest">or click anywhere to browse files</p>
                </div>

                {/* Progress bars */}
                {uploading.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {uploading.map(u => <UploadProgress key={u.name} file={u.name} progress={u.progress} />)}
                    </div>
                )}

                {/* Ad Library Grid */}
                {ads.length > 0 && (
                    <div className="mt-7">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <p className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest">
                                    Ad Library — {ads.length} image{ads.length !== 1 ? 's' : ''}
                                </p>
                                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gold-500/10 border border-gold-500/30 rounded-full text-[9px] font-black text-gold-600 dark:text-gold-400 uppercase tracking-widest">
                                    <Radio className="w-2.5 h-2.5 animate-pulse" />
                                    All live on tablets
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            <AnimatePresence>
                                {ads.map((ad, i) => (
                                    <motion.div
                                        key={ad.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.85 }}
                                        className="relative group rounded-2xl overflow-hidden bg-gray-100 dark:bg-white/5 border-2 border-gold-500 shadow-lg shadow-gold-500/20 transition-all"
                                    >
                                        <div className="aspect-square overflow-hidden">
                                            <img src={ad.preview} alt={ad.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        </div>

                                        {/* Live badge — always shown since all uploads are live */}
                                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-gold-500 text-ink-black-950 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full">
                                            <Radio className="w-2 h-2 animate-pulse" />
                                            Live #{i + 1}
                                        </div>

                                        {/* Overlay controls */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-3 gap-2">
                                            <p className="text-[9px] font-black text-white truncate w-full text-center">{ad.name}</p>
                                            <button
                                                onClick={() => deleteAd(ad.id)}
                                                className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-300 text-[9px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {ads.length === 0 && uploading.length === 0 && (
                    <div className="mt-6 flex flex-col items-center py-4">
                        <Image className="w-8 h-8 text-gray-200 dark:text-white/10 mb-2" />
                        <p className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest">No images uploaded yet</p>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════
                DEVICE MONITORING TABLE
            ═══════════════════════════════════════════════════════ */}
            <div className="bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl">
                            <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest">Step 2</p>
                            <p className="text-base font-black text-ink-black-950 dark:text-white">Fleet Tablet Status</p>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tablet ID or car..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2.5 text-[11px] font-black bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-ink-black-950 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:border-gold-500/50 transition-all w-60"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-white/5">
                                {['Tablet', 'Car', 'Status', 'Last Ping', 'Now Showing', 'Alert', 'View'].map(h => (
                                    <th key={h} className="px-5 py-4 text-left text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.15em]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                            {filteredDevices.map((device, idx) => {
                                const stale   = isStale(device.lastPing);
                                const offline = !device.online || stale;
                                // Which ad this device would show right now in the cycle
                                const cycleIdx = ticker % Math.max(activeAds.length, 1);
                                const nowShowing = !offline && activeAds.length > 0 ? activeAds[cycleIdx] : null;

                                return (
                                    <motion.tr
                                        key={device.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                        className={`transition-colors ${offline ? 'bg-red-50/60 dark:bg-red-500/5' : 'hover:bg-gray-50/80 dark:hover:bg-white/3'}`}
                                    >
                                        {/* Tablet ID */}
                                        <td className="px-5 py-4">
                                            <span className="text-[11px] font-black text-ink-black-950 dark:text-white font-mono">{device.id}</span>
                                        </td>
                                        {/* Car */}
                                        <td className="px-5 py-4">
                                            <span className="px-2.5 py-1 rounded-full bg-[#001d3d]/10 dark:bg-white/5 border border-[#001d3d]/10 dark:border-white/10 text-[10px] font-black text-[#001d3d] dark:text-gray-300 uppercase tracking-wider">
                                                {device.car}
                                            </span>
                                        </td>
                                        {/* Status */}
                                        <td className="px-5 py-4">
                                            {device.online && !stale ? (
                                                <span className="flex items-center gap-1.5">
                                                    <span className="relative flex h-2.5 w-2.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                                    </span>
                                                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Online</span>
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                                                    <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Offline</span>
                                                </span>
                                            )}
                                        </td>
                                        {/* Last Ping */}
                                        <td className="px-5 py-4">
                                            <span className={`text-[10px] font-black font-mono ${offline ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {msAgo(device.lastPing)}
                                            </span>
                                        </td>
                                        {/* Now Showing */}
                                        <td className="px-5 py-4">
                                            {nowShowing ? (
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden border-2 border-gold-500/50 shrink-0">
                                                        <img src={nowShowing.preview} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gold-600 dark:text-gold-400 leading-tight truncate max-w-[100px]">
                                                            {nowShowing.name.length > 14 ? nowShowing.name.slice(0, 14) + '…' : nowShowing.name}
                                                        </p>
                                                        <p className="text-[9px] text-gray-400 dark:text-gray-600">
                                                            {cycleIdx + 1}/{activeAds.length}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-300 dark:text-gray-700 uppercase tracking-widest font-black">—</span>
                                            )}
                                        </td>
                                        {/* Alert */}
                                        <td className="px-5 py-4">
                                            {offline ? (
                                                <span className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                                                    <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                                                    <span className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Stale</span>
                                                </span>
                                            ) : (
                                                <span className="text-gray-200 dark:text-gray-700 text-[10px]">—</span>
                                            )}
                                        </td>
                                        {/* Live View */}
                                        <td className="px-5 py-4">
                                            <button
                                                onClick={() => setLiveDevice(device)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/20 hover:border-gold-500/50 text-gold-600 dark:text-gold-400 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                            >
                                                <Play className="w-3 h-3" />
                                                View
                                            </button>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="px-5 py-3 border-t border-gray-50 dark:border-white/5 flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 text-gray-300 dark:text-gray-700" />
                    <p className="text-[9px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest">
                        Heartbeat every 5s · Tick #{ticker} · Only TBL-003 is permanently offline
                    </p>
                </div>
            </div>

            {/* Live View Modal */}
            <AnimatePresence>
                {liveDevice && (
                    <LiveViewModal
                        device={liveDevice}
                        activeAds={activeAds}
                        onClose={() => setLiveDevice(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
