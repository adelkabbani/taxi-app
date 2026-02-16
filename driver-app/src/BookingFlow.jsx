import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import TripStatusHeader from './components/TripStatusHeader';
import CustomerContactBar from './components/CustomerContactBar';
import TripDetailsCard from './components/TripDetailsCard';

function BookingFlow({ booking, onBack, user }) {
    const [status, setStatus] = useState('assigned'); // assigned, accepted, started, arrived, received, completed
    const [isLoading, setIsLoading] = useState(false);
    const [showNoShowConfirm, setShowNoShowConfirm] = useState(false);

    // Play notification sound when booking first loads
    useEffect(() => {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
    }, []);

    const handleAction = async (action) => {
        if (!booking.numericId) {
            console.error("Missing booking numeric ID");
            return;
        }

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
                // UI-only transition - passenger is on board
                setStatus('received');
            } else if (action === 'complete') {
                await axios.patch(`/api/bookings/${booking.numericId}/complete`, {
                    fareFinal: booking.price
                });
                setStatus('completed');
                setTimeout(onBack, 2000);
            }
        } catch (err) {
            console.error(`Failed to ${action}`, err);
            alert(`Failed to ${action}: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNoShow = async () => {
        if (!showNoShowConfirm) {
            setShowNoShowConfirm(true);
            return;
        }

        setIsLoading(true);
        try {
            // For now, just mark as no-show without evidence
            await axios.post(`/api/bookings/${booking.numericId}/no-show-request`, {
                evidenceIds: [],
                notes: 'Passenger did not show up'
            });
            setStatus('no_show_requested');
            setTimeout(onBack, 2000);
        } catch (err) {
            console.error('Failed to report no-show', err);
            alert(`Failed to report no-show: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsLoading(false);
            setShowNoShowConfirm(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="p-4 flex flex-col h-full pb-6"
        >
            {/* Status Header */}
            <TripStatusHeader status={status} />

            {/* Customer Contact Bar */}
            {booking.customer && (
                <CustomerContactBar customer={booking.customer} />
            )}

            {/* Trip Details Card */}
            <TripDetailsCard booking={booking} />

            {/* No-Show Confirmation Alert */}
            {showNoShowConfirm && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="fixed inset-4 bg-slate-900/95 backdrop-blur-xl border-2 border-red-500/30 rounded-3xl p-6 z-50 flex flex-col items-center justify-center"
                >
                    <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Confirm No-Show</h3>
                    <p className="text-slate-300 text-center mb-6">
                        Are you sure the passenger did not show up? This will end the trip.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={() => setShowNoShowConfirm(false)}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleNoShow}
                            disabled={isLoading}
                            className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Reporting...' : 'Confirm No-Show'}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* ACTION BUTTONS */}
            <div className="fixed bottom-6 left-4 right-4 flex gap-3 z-50">
                {status === 'assigned' && (
                    <button
                        onClick={() => handleAction('accept')}
                        disabled={isLoading}
                        className="flex-1 bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isLoading ? 'Accepting...' : 'Take The Tour'}
                    </button>
                )}

                {status === 'accepted' && (
                    <button
                        onClick={() => handleAction('start')}
                        disabled={isLoading}
                        className="flex-1 bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isLoading ? 'Starting...' : 'On My Way'}
                    </button>
                )}

                {status === 'started' && (
                    <button
                        onClick={() => handleAction('arrive')}
                        disabled={isLoading}
                        className="flex-1 bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isLoading ? 'Updating...' : 'Arrived'}
                    </button>
                )}

                {status === 'arrived' && !showNoShowConfirm && (
                    <>
                        <button
                            onClick={() => setShowNoShowConfirm(true)}
                            className="flex-1 bg-red-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-red-400 active:scale-95 transition-all"
                        >
                            No Show
                        </button>
                        <button
                            onClick={() => handleAction('receive')}
                            disabled={isLoading}
                            className="flex-[2] bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : 'Received'}
                        </button>
                    </>
                )}

                {(status === 'received' || status === 'started') && (
                    <button
                        onClick={() => handleAction('complete')}
                        disabled={isLoading}
                        className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(5,150,105,0.3)] hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isLoading ? 'Completing...' : 'Complete'}
                    </button>
                )}

                {status === 'completed' && (
                    <div className="flex-1 bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400 font-bold py-4 rounded-xl text-center">
                        ✓ Trip Completed
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default BookingFlow;
