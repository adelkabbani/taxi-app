import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Camera, MapPin, Clock, CheckCircle, RotateCcw, Upload, Shield } from 'lucide-react';
import TripStatusHeader from './components/TripStatusHeader';
import CustomerContactBar from './components/CustomerContactBar';
import TripDetailsCard from './components/TripDetailsCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get GPS from browser / Capacitor */
const getGPS = () =>
    new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
            reject,
            { enableHighAccuracy: true, timeout: 15000 }
        )
    );

/** Reverse-geocode via OpenStreetMap Nominatim (no key required) */
const reverseGeocode = async (lat, lng) => {
    try {
        const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const d = await r.json();
        return d.display_name?.split(',').slice(0, 3).join(',').trim() ||
            `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
};

/**
 * Burn a bottom-right timestamp + GPS overlay onto an image blob.
 * Returns a new JPEG blob.
 */
const burnOverlay = (blob, gps, addressLabel) =>
    new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);

            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const lines = [
                `${dateStr}  ${timeStr}`,
                gps ? `GPS: ${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}` : 'GPS: unavailable',
                addressLabel || '',
            ].filter(Boolean);

            const fontSize = Math.max(14, canvas.width / 38);
            ctx.font = `bold ${fontSize}px monospace`;
            const pad = fontSize * 0.55;
            const lh = fontSize * 1.5;
            const boxW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
            const boxH = lines.length * lh + pad * 2;
            const bx = canvas.width - boxW - 12;
            const by = canvas.height - boxH - 12;

            ctx.fillStyle = 'rgba(0,0,0,0.78)';
            ctx.fillRect(bx, by, boxW, boxH);
            ctx.fillStyle = '#EAB308';
            ctx.textBaseline = 'top';
            lines.forEach((line, i) => ctx.fillText(line, bx + pad, by + pad + i * lh));

            canvas.toBlob(resolve, 'image/jpeg', 0.90);
        };
        img.src = url;
    });

/**
 * Generate a canvas-based GPS Proof Card (no camera needed).
 * Returns a JPEG blob.
 */
const generateLocationCard = (gps, addressLabel, bookingRef) =>
    new Promise((resolve) => {
        const W = 900, H = 520;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#0A0A14';
        ctx.fillRect(0, 0, W, H);

        // Gold border
        ctx.strokeStyle = '#EAB308';
        ctx.lineWidth = 5;
        ctx.strokeRect(12, 12, W - 24, H - 24);

        // Inner faint lines
        ctx.strokeStyle = 'rgba(234,179,8,0.12)';
        ctx.lineWidth = 1;
        for (let y = 40; y < H; y += 28) {
            ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(W - 12, y); ctx.stroke();
        }

        // Logo strip
        ctx.fillStyle = '#EAB308';
        ctx.fillRect(12, 12, W - 24, 56);
        ctx.fillStyle = '#0A0A14';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ANTIGRAVITY DISPATCH  ·  DRIVER LOCATION CERTIFICATE', W / 2, 40);

        // Divider
        ctx.fillStyle = 'rgba(234,179,8,0.25)';
        ctx.fillRect(12, 68, W - 24, 2);

        // Data rows
        const now = new Date();
        const rows = [
            ['BOOKING REF', bookingRef || 'N/A'],
            ['DATE', now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
            ['TIME (LOCAL)', now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })],
            ['LATITUDE', gps ? gps.lat.toFixed(8) : 'UNAVAILABLE'],
            ['LONGITUDE', gps ? gps.lng.toFixed(8) : 'UNAVAILABLE'],
            ['GPS ACCURACY', gps ? `± ${Math.round(gps.accuracy || 0)} m` : 'N/A'],
            ['ADDRESS', addressLabel || 'N/A'],
        ];

        rows.forEach(([key, val], i) => {
            const y = 100 + i * 54;
            // Key
            ctx.font = '14px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#6B7280';
            ctx.fillText(key, 40, y);
            // Value
            ctx.font = 'bold 18px monospace';
            ctx.fillStyle = i < 3 ? '#E5E7EB' : '#EAB308';
            // Truncate long address
            const maxW = W - 260;
            let text = val;
            while (ctx.measureText(text).width > maxW && text.length > 10) {
                text = text.slice(0, -4) + '...';
            }
            ctx.fillText(text, 220, y);
            // Row divider
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(40, y + 22, W - 80, 1);
        });

        // Footer
        ctx.font = '13px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#374151';
        ctx.fillText(
            'This certificate was automatically generated by the dispatch system and cannot be altered.',
            W / 2, H - 22
        );

        canvas.toBlob(resolve, 'image/jpeg', 0.93);
    });

// ─── Main Component ────────────────────────────────────────────────────────────

function BookingFlow({ booking, onBack, user, onActionComplete }) {
    const [status, setStatus] = useState(booking.status || 'assigned');
    const [isLoading, setIsLoading] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    // No-show evidence state
    const [noShowOpen, setNoShowOpen] = useState(false);
    const [gps, setGps] = useState(null);
    const [gpsLabel, setGpsLabel] = useState('');
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState('');
    const [pickupPhoto, setPickupPhoto] = useState(null);   // { blob, preview }
    const [locationCard, setLocationCard] = useState(null); // { blob, preview }
    const [evidenceStep, setEvidenceStep] = useState('idle'); // idle | gps | photos | uploading | done
    const [uploadProgress, setUploadProgress] = useState('');

    const [isPriceHidden, setIsPriceHidden] = useState(false);

    useEffect(() => {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
    }, []);

    useEffect(() => {
        if (booking.status && booking.status !== status) setStatus(booking.status);
    }, [booking.status]);

    // ── Core booking actions ──────────────────────────────────────────────────

    const handleAction = async (action) => {
        if (!booking.numericId) return;
        setIsLoading(true);
        try {
            if (action === 'accept') {
                await axios.patch(`/api/bookings/${booking.numericId}/accept`);
                setStatus('accepted');
            } else if (action === 'start') {
                await axios.patch(`/api/bookings/${booking.numericId}/start`);
                setStatus('started');
            } else if (action === 'arrive') {
                await axios.patch(`/api/bookings/${booking.numericId}/arrive`, {
                    lat: 52.5200, lng: 13.4050, accuracy: 10
                });
                setStatus('arrived');
            } else if (action === 'receive') {
                await axios.patch(`/api/bookings/${booking.numericId}/receive`);
                setStatus('received');
            } else if (action === 'complete') {
                await axios.patch(`/api/bookings/${booking.numericId}/complete`, { fareFinal: booking.price });
                setStatus('completed');
                setTimeout(onBack, 5000);
            } else if (action === 'reject') {
                await axios.patch(`/api/bookings/${booking.numericId}/reject`, {
                    reason: rejectionReason || 'Rejected by driver app'
                });
                setShowRejectModal(false);
                onBack();
            }
            if (onActionComplete) onActionComplete();
        } catch (err) {
            alert(`Failed to ${action}: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // ── No-Show evidence flow ─────────────────────────────────────────────────

    const openNoShow = () => {
        setNoShowOpen(true);
        setEvidenceStep('gps');
        setPickupPhoto(null);
        setLocationCard(null);
        setGps(null);
        setGpsLabel('');
        setGpsError('');
        captureGPS();
    };

    const captureGPS = async () => {
        setGpsLoading(true);
        setGpsError('');
        try {
            const coords = await getGPS();
            setGps(coords);
            const label = await reverseGeocode(coords.lat, coords.lng);
            setGpsLabel(label);
            setEvidenceStep('photos');
        } catch (err) {
            setGpsError('Could not get GPS. Check location permissions and try again.');
        } finally {
            setGpsLoading(false);
        }
    };

    const handlePickupPhotoSelected = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const stamped = await burnOverlay(file, gps, gpsLabel);
        setPickupPhoto({ blob: stamped, preview: URL.createObjectURL(stamped) });
        e.target.value = '';
    };

    const generateLocationProofCard = async () => {
        const blob = await generateLocationCard(gps, gpsLabel, booking.booking_reference);
        setLocationCard({ blob, preview: URL.createObjectURL(blob) });
    };

    const uploadEvidence = async (blob, assetType) => {
        const now = new Date().toISOString();
        const fd = new FormData();
        fd.append('photo', blob, `evidence-${assetType}-${Date.now()}.jpg`);
        fd.append('bookingId', String(booking.numericId));
        fd.append('assetType', assetType);
        fd.append('capturedAt', now);
        fd.append('gpsLat', String(gps?.lat ?? 0));
        fd.append('gpsLng', String(gps?.lng ?? 0));
        fd.append('gpsAccuracy', String(gps?.accuracy ?? 0));
        fd.append('pickupLabel', gpsLabel);
        const res = await axios.post('/api/evidence', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data.data.id;
    };

    const submitNoShow = async () => {
        if (!pickupPhoto || !locationCard) return;
        setEvidenceStep('uploading');
        try {
            setUploadProgress('Uploading pickup photo…');
            const pickupId = await uploadEvidence(pickupPhoto.blob, 'pickup_photo');

            setUploadProgress('Uploading location proof…');
            const locationId = await uploadEvidence(locationCard.blob, 'location_screenshot');

            setUploadProgress('Submitting no-show report…');
            await axios.post(`/api/bookings/${booking.numericId}/no-show-request`, {
                evidenceIds: [pickupId, locationId],
                notes: 'Passenger did not show up. Evidence submitted.'
            });

            setEvidenceStep('done');
            if (onActionComplete) onActionComplete();
            setTimeout(() => { setNoShowOpen(false); setStatus('no_show_requested'); onBack(); }, 2500);
        } catch (err) {
            alert(`Failed: ${err.response?.data?.message || err.message}`);
            setEvidenceStep('photos');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="p-4 flex flex-col h-full bg-ink-black-950 pb-6 relative"
        >
            <div className="absolute top-0 left-0 w-full h-64 bg-gold-400/5 blur-[80px] pointer-events-none" />

            <TripStatusHeader status={status} />
            {booking.customer && <CustomerContactBar customer={booking.customer} />}
            <TripDetailsCard
                booking={booking}
                isPriceHidden={isPriceHidden}
                onTogglePrice={() => setIsPriceHidden(!isPriceHidden)}
            />

            {/* ── NO-SHOW EVIDENCE MODAL ── */}
            <AnimatePresence>
                {noShowOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] bg-ink-black-950 flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-5 pt-8 pb-4 border-b border-white/10 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-rose-400" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-rose-400 uppercase tracking-[0.35em]">No-Show Protocol</p>
                                <h2 className="text-white font-black text-base leading-tight">Evidence Required</h2>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                            {/* GPS capture step */}
                            <div className={`rounded-2xl border p-4 transition-all ${gps ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${gps ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                                        <MapPin className={`w-5 h-5 ${gps ? 'text-emerald-400' : 'text-gray-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-1">Step 1 — Location Lock</p>
                                        {gpsLoading && (
                                            <p className="text-gray-400 text-xs flex items-center gap-2">
                                                <span className="w-3 h-3 border border-gold-500 border-t-transparent rounded-full animate-spin inline-block" />
                                                Acquiring GPS…
                                            </p>
                                        )}
                                        {gpsError && (
                                            <div className="space-y-2">
                                                <p className="text-rose-400 text-xs">{gpsError}</p>
                                                <button onClick={captureGPS} className="text-gold-400 text-xs font-bold flex items-center gap-1">
                                                    <RotateCcw className="w-3 h-3" /> Retry GPS
                                                </button>
                                            </div>
                                        )}
                                        {gps && !gpsLoading && (
                                            <div>
                                                <p className="text-emerald-400 text-xs font-bold">GPS Locked ✓</p>
                                                <p className="text-gray-400 text-[10px] font-mono mt-0.5">{gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}</p>
                                                <p className="text-gray-500 text-[10px] mt-0.5 leading-snug">{gpsLabel}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Pickup photo */}
                            <div className={`rounded-2xl border p-4 transition-all ${pickupPhoto ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                                {/* Camera input — MUST use label for reliable camera access on mobile */}
                                <input
                                    id="pickup-camera-input"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handlePickupPhotoSelected}
                                />
                                <div className="flex items-start gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${pickupPhoto ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                                        <Camera className={`w-5 h-5 ${pickupPhoto ? 'text-emerald-400' : 'text-gray-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-1">Step 2 — Pickup Location Photo</p>
                                        <p className="text-gray-500 text-[10px] leading-snug mb-3">
                                            Take a photo of the pickup location entrance / street. GPS + timestamp will be stamped automatically.
                                        </p>
                                        {pickupPhoto ? (
                                            <div className="relative">
                                                <img src={pickupPhoto.preview} alt="Pickup" className="w-full rounded-xl object-cover" />
                                                <label
                                                    htmlFor="pickup-camera-input"
                                                    className="absolute top-2 right-2 bg-black/70 rounded-full p-2 cursor-pointer active:scale-95 transition-transform"
                                                    onClick={() => setPickupPhoto(null)}
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5 text-white" />
                                                </label>
                                            </div>
                                        ) : (
                                            <label
                                                htmlFor="pickup-camera-input"
                                                className={`w-full py-5 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer active:border-gold-500/60 transition-all select-none
                                                    ${gps ? 'border-white/30 text-gray-300' : 'border-white/10 text-gray-600 pointer-events-none opacity-40'}`}
                                            >
                                                <Camera className="w-5 h-5" />
                                                <span className="text-sm font-bold">
                                                    {gps ? 'Tap to Open Camera' : 'Waiting for GPS…'}
                                                </span>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Location proof card */}
                            <div className={`rounded-2xl border p-4 transition-all ${locationCard ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${locationCard ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                                        <MapPin className={`w-5 h-5 ${locationCard ? 'text-emerald-400' : 'text-gray-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-1">Step 3 — GPS Location Certificate</p>
                                        <p className="text-gray-500 text-[10px] leading-snug mb-3">
                                            Auto-generates a signed certificate with your exact GPS coordinates, address, and timestamp.
                                        </p>
                                        {locationCard ? (
                                            <div className="relative">
                                                <img src={locationCard.preview} alt="Location proof" className="w-full rounded-xl" />
                                                <button
                                                    onClick={() => { setLocationCard(null); generateLocationProofCard(); }}
                                                    className="absolute top-2 right-2 bg-black/70 rounded-full p-2 cursor-pointer active:scale-95 transition-transform"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5 text-white" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                disabled={!gps}
                                                onClick={generateLocationProofCard}
                                                className={`w-full py-5 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all select-none
                                                    ${gps ? 'border-white/30 text-gray-300 cursor-pointer active:border-gold-500/60' : 'border-white/10 text-gray-600 opacity-40 cursor-not-allowed'}`}
                                            >
                                                <Shield className="w-5 h-5" />
                                                <span className="text-sm font-bold">
                                                    {gps ? 'Generate Certificate' : 'Waiting for GPS…'}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Uploading / done */}
                            {evidenceStep === 'uploading' && (
                                <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-5 flex items-center gap-4">
                                    <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin shrink-0" />
                                    <p className="text-gold-400 text-sm font-bold">{uploadProgress}</p>
                                </div>
                            )}
                            {evidenceStep === 'done' && (
                                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 flex items-center gap-4">
                                    <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
                                    <div>
                                        <p className="text-emerald-400 font-black text-sm">No-Show Reported</p>
                                        <p className="text-gray-500 text-xs mt-0.5">Evidence submitted. Awaiting admin confirmation.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom buttons */}
                        {evidenceStep !== 'uploading' && evidenceStep !== 'done' && (
                            <div className="p-5 border-t border-white/5 bg-ink-black-950/90 backdrop-blur-xl flex flex-col gap-3">
                                <button
                                    disabled={!pickupPhoto || !locationCard}
                                    onClick={submitNoShow}
                                    className="w-full py-5 rounded-2xl bg-rose-500 text-white font-black text-[11px] uppercase tracking-[0.25em] shadow-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Submit No-Show with Evidence
                                </button>
                                <button
                                    onClick={() => setNoShowOpen(false)}
                                    className="w-full py-4 text-gray-500 font-bold text-[10px] uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── REJECT MODAL ── */}
            {showRejectModal && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="fixed inset-4 bg-ink-black-900/95 backdrop-blur-2xl border border-white/10 rounded-[40px] p-8 z-[60] flex flex-col items-center justify-center text-center shadow-2xl"
                >
                    <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle className="w-10 h-10 text-rose-500 animate-pulse" />
                    </div>
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-3">Reject Mission</h3>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest leading-relaxed mb-6">
                        Provide reason for protocol termination:
                    </p>
                    <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-xs font-medium focus:outline-none focus:border-gold-500/50 mb-6 min-h-[100px]"
                        placeholder="Reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={() => setShowRejectModal(false)}
                            className="bg-white/5 border border-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleAction('reject')}
                            disabled={isLoading}
                            className="bg-rose-500 text-white font-black text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'TERMINATING...' : 'Confirm Rejection'}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* ── BOTTOM ACTION BAR ── */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-ink-black-950/80 backdrop-blur-xl border-t border-white/5 z-50">
                <div className="max-w-md mx-auto flex flex-col gap-3">
                    <div className="flex gap-3 h-12">
                        {status === 'assigned' && (
                            <button
                                onClick={() => setShowRejectModal(true)}
                                disabled={isLoading}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-rose-500 font-black text-[9px] uppercase tracking-[0.2em] rounded-xl border border-white/5 transition-all active:scale-95"
                            >
                                Reject Request
                            </button>
                        )}
                    </div>

                    {status === 'arrived' && !noShowOpen && (
                        <div className="flex gap-3">
                            <button
                                onClick={openNoShow}
                                disabled={isLoading}
                                className="flex-1 py-5 rounded-2xl font-bold text-lg text-white shadow-2xl active:scale-[0.98] transition-all bg-[#ff6b6b]"
                            >
                                No Show
                            </button>
                            <button
                                onClick={() => handleAction('receive')}
                                disabled={isLoading}
                                className="flex-1 py-5 rounded-2xl font-bold text-lg text-white shadow-2xl active:scale-[0.98] transition-all bg-[#60d62a]"
                            >
                                Received
                            </button>
                        </div>
                    )}

                    {status !== 'arrived' && status !== 'completed' && status !== 'no_show_requested' && (
                        <button
                            onClick={() => {
                                if (status === 'assigned') handleAction('accept');
                                else if (status === 'accepted') handleAction('start');
                                else if (status === 'started') handleAction('arrive');
                                else if (status === 'received') handleAction('complete');
                            }}
                            disabled={isLoading}
                            className={`w-full py-5 rounded-2xl font-bold text-lg text-white transition-all shadow-2xl flex items-center justify-center gap-2 ${status === 'assigned' ? 'bg-indigo-500' : 'bg-[#60d62a]'}`}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin" />
                            ) : (
                                <>
                                    {status === 'assigned' && 'Accept'}
                                    {status === 'accepted' && 'On My Way'}
                                    {status === 'started' && 'Arrived'}
                                    {status === 'received' && 'Complete'}
                                </>
                            )}
                        </button>
                    )}

                    {status === 'completed' && (
                        <div className="w-full py-8 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-500 font-black text-xl text-center shadow-lg flex flex-col items-center gap-2">
                            <span className="text-3xl">✓</span>
                            <span>Mission Successful</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default BookingFlow;
