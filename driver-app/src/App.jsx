import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
    Menu, Globe, LogOut, Phone, MessageCircle,
    Navigation2, User, Calendar, Clock, Camera,
    FileText, ArrowRightLeft, X, MapPin, Zap, Plane, Briefcase, ChevronRight, Check, XCircle, Share, Lock, Mail, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BookingFlow from './BookingFlow';

export default function App() {
    const [user, setUser] = useState(null); // Auth User
    const [currentPage, setCurrentPage] = useState('home'); // home, menu, booking, completed, cancelled, shuttles, workshift, qr
    const [isOnline, setIsOnline] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Login State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setAuthError('');
        try {
            // Use relative path since we have proxy setup in vite.config.js
            const res = await axios.post('/api/auth/login', {
                email: loginEmail,
                password: loginPassword
            });
            if (res.data.success) {
                setUser(res.data.data.user);
                localStorage.setItem('token', res.data.data.token);
                // Setup default headers for future requests
                axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.data.token}`;
            }
        } catch (err) {
            setAuthError(err.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    // Workshift State
    const [workshiftView, setWorkshiftView] = useState('live'); // 'live' or 'planner'

    // Monthly Planner State
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [monthlySchedules, setMonthlySchedules] = useState({}); // { 'YYYY-MM-DD': { start, end, shiftType, isHoliday } }
    const [showShiftPicker, setShowShiftPicker] = useState(null); // 'YYYY-MM-DD'
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    // Helpers for Calendar Logic
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = [];
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const lastDateOfMonth = new Date(year, month + 1, 0).getDate();

        // Fill empty slots for start of month
        for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) {
            days.push(null);
        }

        for (let i = 1; i <= lastDateOfMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const fetchMonthlySchedules = async () => {
        if (!user) return;
        try {
            const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString();
            const end = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString();
            const res = await axios.get(`/api/driver-schedules/my-schedule?start_date=${start}&end_date=${end}`);
            if (res.data.success) {
                const scheduleMap = {};
                res.data.data.forEach(s => {
                    const dateKey = new Date(s.schedule_date).toISOString().split('T')[0];
                    scheduleMap[dateKey] = {
                        start: s.start_time.slice(0, 5),
                        end: s.end_time.slice(0, 5),
                        shiftType: s.shift_type,
                        isHoliday: s.is_holiday
                    };
                });
                setMonthlySchedules(scheduleMap);
            }
        } catch (err) {
            console.error('Failed to fetch schedules', err);
        }
    };

    useEffect(() => {
        if (workshiftView === 'planner') {
            fetchMonthlySchedules();
        }
    }, [selectedMonth, workshiftView]);

    const handleDayToggle = (dateStr) => {
        const current = monthlySchedules[dateStr];
        if (!current) {
            // Neutral -> Available (Open Shift Picker)
            setShowShiftPicker(dateStr);
        } else if (!current.isHoliday) {
            // Available -> Unavailable (Red/Gray)
            setMonthlySchedules(prev => ({
                ...prev,
                [dateStr]: { ...current, isHoliday: true, shiftType: 'OFF' }
            }));
        } else {
            // Unavailable -> Neutral (Remove)
            setMonthlySchedules(prev => {
                const next = { ...prev };
                delete next[dateStr];
                return next;
            });
        }
    };

    const applyShiftPreset = (dateStr, type) => {
        const presets = {
            AM: { start: '05:00', end: '14:00' },
            PM: { start: '14:00', end: '23:00' },
            FULL: { start: '05:00', end: '18:00' },
            CUSTOM: { start: '09:00', end: '17:00' }
        };
        setMonthlySchedules(prev => ({
            ...prev,
            [dateStr]: {
                ...presets[type],
                shiftType: type,
                isHoliday: false
            }
        }));
        setShowShiftPicker(null);
    };

    const batchSaveSchedules = async () => {
        setIsSavingSchedule(true);
        try {
            const schedulesToSave = Object.entries(monthlySchedules).map(([date, data]) => ({
                date,
                start: data.start + ':00',
                end: data.end + ':00',
                shiftType: data.shiftType,
                isHoliday: data.isHoliday
            }));
            await axios.post('/api/driver-schedules/batch', { schedules: schedulesToSave });
            alert('Schedule updated successfully!');
        } catch (err) {
            console.error('Failed to save schedule', err);
            alert('Failed to save schedule');
        } finally {
            setIsSavingSchedule(false);
        }
    };





    const [driver, setDriver] = useState(null); // Driver Profile
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Fetch driver profile when user is set
        const fetchDriverProfile = async () => {
            if (user) {
                try {
                    const res = await axios.get('/api/drivers/me/profile');
                    if (res.data.success) {
                        setDriver(res.data.data);
                        // Sync online status with backend availability
                        setIsOnline(res.data.data.availability === 'available');
                    }
                } catch (err) {
                    console.error('Failed to fetch driver profile', err);
                }
            }
        };
        fetchDriverProfile();
    }, [user]);



    useEffect(() => {
        if (user && !socket) {
            const newSocket = io();
            newSocket.on('connect', () => {
                console.log('Socket connected:', newSocket.id);
                // Authenticate to join user-specific room
                newSocket.emit('authenticate', {
                    token: localStorage.getItem('token'),
                    userId: user.id,
                    role: user.role
                });
            });

            newSocket.on('booking_assigned', async (data) => {
                console.log('Booking Assigned Event Received:', data);
                try {
                    const res = await axios.get(`/api/bookings/${data.bookingId}`);
                    if (res.data.success) {
                        const b = res.data.data;
                        const mappedBooking = {
                            id: b.booking_reference,
                            numericId: b.id,
                            date: new Date(b.scheduled_pickup_time).toLocaleString(),
                            price: parseFloat(b.fare_estimate || 0),
                            passengers: 1,
                            luggage: 1,
                            vehicle: 'Standard',
                            pickup: b.pickup_address,
                            pickupTime: new Date(b.scheduled_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            dropoff: b.dropoff_address,
                            customer: {
                                name: b.passenger_name || 'Guest',
                                phone: b.passenger_phone || 'N/A'
                            }
                        };
                        setBooking(mappedBooking);
                        navTo('booking');
                    }
                } catch (err) {
                    console.error('Failed to fetch assigned booking', err);
                }
            });

            setSocket(newSocket);
            return () => newSocket.disconnect();
        }
    }, [user]);

    // Location Simulation
    useEffect(() => {
        let locationInterval;
        if (isOnline && driver) {
            const sendLocation = async () => {
                try {
                    // Simulate slight movement around Berlin
                    const lat = 52.5200 + (Math.random() - 0.5) * 0.01;
                    const lng = 13.4050 + (Math.random() - 0.5) * 0.01;

                    await axios.post('/api/drivers/location', {
                        lat,
                        lng,
                        accuracy: 10,
                        heading: Math.floor(Math.random() * 360),
                        speed: 30
                    });
                    console.log('Location update sent for ' + driver.id);
                } catch (err) {
                    console.error('Failed to send location', err);
                }
            };

            sendLocation(); // Send immediately
            locationInterval = setInterval(sendLocation, 10000); // Send every 10s
        }

        return () => {
            if (locationInterval) clearInterval(locationInterval);
        };
    }, [isOnline, driver]);

    const toggleOnlineStatus = async () => {
        if (!driver) return;

        const newStatus = !isOnline;
        setIsOnline(newStatus);

        try {
            if (newStatus) {
                // Going Online: Start Shift -> Set Available
                console.log('Attempting to start shift for driver', driver.id);
                try {
                    await axios.post(`/api/drivers/${driver.id}/shift/start`);
                    console.log('Shift started successfully');
                } catch (shiftErr) {
                    // If shift already started, that's fine - just continue
                    if (shiftErr.response?.data?.message?.includes('already started')) {
                        console.log('Shift already active, continuing...');
                    } else {
                        throw shiftErr; // Re-throw if it's a different error
                    }
                }
                console.log('Setting availability to available');
                await axios.patch(`/api/drivers/${driver.id}/availability`, { availability: 'available' });
            } else {
                // Going Offline: Set Offline -> End Shift
                console.log('Setting availability to offline');
                await axios.patch(`/api/drivers/${driver.id}/availability`, { availability: 'offline' });
                console.log('Attempting to end shift');
                try {
                    await axios.post(`/api/drivers/${driver.id}/shift/end`);
                    console.log('Shift ended successfully');
                } catch (endErr) {
                    // If no shift to end, that's fine
                    if (endErr.response?.data?.message?.includes('No active shift')) {
                        console.log('No active shift to end, continuing...');
                    } else {
                        throw endErr;
                    }
                }
            }
            // Refresh profile to confirm state
            const res = await axios.get('/api/drivers/me/profile');
            setDriver(res.data.data);
            setIsOnline(res.data.data.availability === 'available');
            console.log('Status updated successfully!');

        } catch (err) {
            console.error('Failed to update status', err);
            console.error('Error details:', err.response?.data);
            setIsOnline(!newStatus);
            alert(`Failed to update status: ${err.response?.data?.message || err.message}`);
        }
    };



    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Mock Data
    // Booking Data State
    const [booking, setBooking] = useState({
        id: '#SUNTR_UN4694',
        date: '04:10, 4 Jan \'26',
        price: 40.0,
        passengers: 2,
        luggage: 2,
        vehicle: 'Economy Sedan',
        pickup: 'NH Collection Berlin Mitte',
        pickupTime: '04:10, 4 Jan \'26',
        dropoff: 'Berlin Brandenburg Airport (BER)',
        customer: { name: 'Carlos Florez', phone: '+52 33 1539 5714' }
    });

    const completedTrips = [
        { id: '243120386', date: '22:05, 26 Dec \'25', flight: 'FR3310', pax: 2, bags: 2, route: ['Berlin Brandenburg Airport (BER)', 'Adina Apartment Hotel Berlin Mitte'], price: 43.0 },
        { id: 'HBLOV-2666', date: '18:30, 26 Dec \'25', flight: 'FR145', pax: 2, bags: 2, route: ['Berlin Brandenburg Airport (BER)', 'NH Collection Berlin Mitte'], price: 38.5 },
        { id: 'BA-269692', date: '21:55, 20 Dec \'25', flight: 'BA0992', pax: 3, bags: 3, route: ['Berlin Brandenburg Airport (BER)', 'Park Inn by Radisson'], price: 45.0 },
    ];

    const cancelledTrips = [
        { id: '866117719', date: '15:30, 16 Dec \'25', flight: 'AF1234', pax: 2, bags: 2, route: ['Berlin Brandenburg Airport (BER)', 'Hilton Berlin'], type: 'Passenger Cancelled' },
        { id: '335103189', date: '14:15, 13 Dec \'25', flight: 'U22983', pax: 2, bags: 2, route: ['Berlin Brandenburg Airport (BER)', 'Quentin XL Potsdamer Platz'], type: 'Passenger Cancelled' },
    ];

    const shuttles = [
        { title: 'Amano Eastside Shuttle', date: '07.05.2024 13:45 Tue', price: 20.0, pax: 1, bags: 1 },
        { title: 'Holiday Inn Shuttle', date: '13.05.2024 04:00 Mon', price: 20.0, pax: 2, bags: 2 },
        { title: 'Holiday Inn Shuttle', date: '16.05.2024 07:00 Thu', price: 20.0, pax: 1, bags: 1 },
        { title: 'Holiday Inn Shuttle', date: '18.05.2024 04:00 Sat', price: 20.0, pax: 2, bags: 1 },
    ];

    const navTo = (page) => {
        window.scrollTo(0, 0); // Reset scroll
        setCurrentPage(page);
    };

    // Header Logic
    const getHeaderTitle = () => {
        switch (currentPage) {
            case 'home': return 'Fleet Command';
            case 'menu': return 'Menu';
            case 'booking': return 'Incoming Request';
            case 'completed': return 'Completed';
            case 'cancelled': return 'Cancelled';
            case 'shuttles': return 'Shuttles';
            case 'workshift': return 'Workshift';
            case 'qr': return 'Share QR';
            default: return 'Fleet Command';
        }
    };


    // LOGIN PAGE
    if (!user) {
        return (
            <div className="flex flex-col h-full bg-[#020617] text-slate-50 font-sans relative overflow-hidden p-6 justify-center">
                <div className="absolute top-0 left-0 w-full h-96 bg-emerald-500/10 blur-[100px] pointer-events-none" />

                <div className="relative z-10 w-full max-w-sm mx-auto">
                    <div className="mb-12 text-center">
                        <div className="w-20 h-20 bg-emerald-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                            <User className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold font-heading mb-2">Welcome Back</h1>
                        <p className="text-slate-400">Sign in to start your shift</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex items-center gap-3 focus-within:border-emerald-500/50 transition-colors">
                            <Mail className="text-slate-500" size={20} />
                            <input
                                type="email"
                                placeholder="Email"
                                value={loginEmail}
                                onChange={e => setLoginEmail(e.target.value)}
                                className="bg-transparent border-none outline-none text-white w-full placeholder:text-slate-600"
                                required
                            />
                        </div>

                        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex items-center gap-3 focus-within:border-emerald-500/50 transition-colors">
                            <Lock className="text-slate-500" size={20} />
                            <input
                                type="password"
                                placeholder="Password"
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                                className="bg-transparent border-none outline-none text-white w-full placeholder:text-slate-600"
                                required
                            />
                        </div>

                        {authError && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-medium text-center">
                                {authError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'} <ArrowRight size={20} />
                        </button>
                    </form>

                    <p className="text-center text-slate-500 text-xs mt-8">
                        Forgot password? Contact Fleet Manager
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#020617] text-slate-50 font-sans relative overflow-hidden select-none">

            {/* Background Ambient Glows */}
            <div className="absolute top-0 left-0 w-full h-96 bg-sky-500/10 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-full h-96 bg-indigo-500/10 blur-[100px] pointer-events-none" />

            {/* Dynamic Header */}
            <header className="px-6 py-5 flex justify-between items-center bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5 z-20 sticky top-0">
                {currentPage === 'home' ? (
                    <>
                        <button onClick={() => navTo('menu')} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
                            <Menu className="w-6 h-6 text-slate-300" />
                        </button>
                        <div className="text-center">
                            <h1 className="text-lg font-bold tracking-tight font-heading">{getHeaderTitle()}</h1>
                            <div className="flex items-center justify-center gap-2 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-500'}`} />
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Online</p>
                            </div>
                        </div>
                        <button className="p-2 -mr-2 hover:bg-white/5 rounded-full transition-colors relative">
                            <Zap className="w-6 h-6 text-sky-400 fill-sky-400/20" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-sky-500 rounded-full border-2 border-[#0f172a]" />
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => navTo(currentPage === 'booking' ? 'home' : 'menu')} className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
                            <X className="w-6 h-6 text-slate-400" />
                        </button>
                        <h1 className="text-lg font-bold text-slate-200 font-heading">{getHeaderTitle()}</h1>
                        <div className="w-10" />
                    </>
                )}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative scrollbar-hide">
                <AnimatePresence mode="wait">

                    {/* HOME PAGE */}
                    {currentPage === 'home' && (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="p-6 flex flex-col h-full"
                        >
                            {/* Central Status Toggle */}
                            <div className="flex-1 flex flex-col items-center justify-center -mt-10">
                                <button
                                    onClick={toggleOnlineStatus}
                                    className={`w-56 h-56 rounded-full border-8 flex flex-col items-center justify-center transition-all duration-500 relative z-10 group active:scale-95 ${isOnline
                                        ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.3)]'
                                        : 'border-slate-700 bg-slate-800/50'
                                        }`}
                                >
                                    <div className={`p-4 rounded-full mb-4 transition-colors duration-500 ${isOnline ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                        <Zap size={32} fill={isOnline ? "currentColor" : "none"} />
                                    </div>
                                    <span className="text-2xl font-bold text-white font-heading">
                                        {isOnline ? 'ON DUTY' : 'OFF DUTY'}
                                    </span>
                                    <span className={`text-xs font-bold uppercase tracking-wider mt-2 transition-colors duration-500 ${isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {isOnline ? 'Tracking Active' : 'Paused'}
                                    </span>
                                </button>

                                {isOnline && (
                                    <p className="text-slate-400 font-medium text-sm bg-slate-900/50 px-4 py-2 rounded-full border border-white/5 mt-8 animate-pulse">
                                        Scanning for nearby passengers...
                                    </p>
                                )}
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-24">
                                <StatCard value="0" label="Planned" color="text-slate-200" />
                                <StatCard value="0" label="Offers" color="text-emerald-400" />
                                <StatCard value="1" label="Market" color="text-amber-400" />
                                <StatCard value="0" label="Shuttles" color="text-indigo-400" />
                            </div>

                            {/* Slider Button */}
                            <div className="fixed bottom-6 left-6 right-6">
                                <button
                                    onClick={() => navTo('booking')}
                                    className="w-full group relative overflow-hidden bg-emerald-500 hover:bg-emerald-400 text-white font-bold font-heading text-lg py-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98]"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        Take The Tour <ArrowRightLeft className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* LIST PAGES (Completed, Cancelled, Shuttles) */}
                    {['completed', 'cancelled', 'shuttles'].includes(currentPage) && (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-4 space-y-4 pb-20"
                        >
                            {/* Filters */}
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                <FilterPill label="Sort" active />
                                <FilterPill label="First Date" />
                                <FilterPill label="Last Date" />
                            </div>

                            {/* Content */}
                            {currentPage === 'completed' && completedTrips.map(trip => (
                                <TripCard key={trip.id} trip={trip} status="completed" />
                            ))}

                            {currentPage === 'cancelled' && cancelledTrips.map(trip => (
                                <TripCard key={trip.id} trip={trip} status="cancelled" />
                            ))}

                            {currentPage === 'shuttles' && shuttles.map((trip, i) => (
                                <ShuttleCard key={i} trip={trip} />
                            ))}
                        </motion.div>
                    )}

                    {/* WORKSHIFT PAGE */}
                    {currentPage === 'workshift' && (
                        <motion.div
                            key="workshift"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-6 h-full flex flex-col relative overflow-hidden"
                        >
                            {/* Switcher */}
                            <div className="flex bg-slate-900/50 p-1 rounded-xl mb-6 border border-white/5 relative z-20">
                                <button
                                    onClick={() => setWorkshiftView('live')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${workshiftView === 'live' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Live Status
                                </button>
                                <button
                                    onClick={() => setWorkshiftView('planner')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${workshiftView === 'planner' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Schedule Planner
                                </button>
                            </div>

                            {workshiftView === 'live' ? (
                                /* LIVE CLOCK IN VIEW */
                                <div className="flex-1 flex flex-col items-center justify-center">
                                    {/* Background Pulse */}
                                    <div className={`absolute inset-0 transition-opacity duration-1000 ${isOnline ? 'opacity-100' : 'opacity-0'}`}>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 blur-[100px] rounded-full animate-pulse" />
                                    </div>

                                    {/* Clock Display */}
                                    <div className="text-center mb-12 relative z-10 w-full">
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Current Time</p>
                                        <p className="text-6xl font-bold text-white font-heading tracking-tight">
                                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-emerald-400 font-bold mt-2">
                                            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>

                                    {/* Main Action Button */}
                                    <button
                                        onClick={toggleOnlineStatus}
                                        className={`w-56 h-56 rounded-full border-8 flex flex-col items-center justify-center transition-all duration-500 relative z-10 group active:scale-95 ${isOnline
                                            ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_50px_rgba(16,185,129,0.3)]'
                                            : 'border-slate-700 bg-slate-800/50'
                                            }`}
                                    >
                                        <div className={`p-4 rounded-full mb-4 transition-colors duration-500 ${isOnline ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                            <Zap size={32} fill={isOnline ? "currentColor" : "none"} />
                                        </div>
                                        <span className="text-2xl font-bold text-white font-heading">
                                            {isOnline ? 'ON DUTY' : 'OFF DUTY'}
                                        </span>
                                        <span className={`text-xs font-bold uppercase tracking-wider mt-2 transition-colors duration-500 ${isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                                            {isOnline ? 'Tracking Active' : 'Paused'}
                                        </span>
                                    </button>

                                    {/* Shift Details */}
                                    <div className="mt-8 w-full bg-slate-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm relative z-10">
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-slate-400 text-sm font-bold">Shift Started</span>
                                            <span className="text-white font-bold">09:00 AM</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400 text-sm font-bold">Duration</span>
                                            <span className="text-emerald-400 font-bold">07h 20m</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* PLANNER VIEW - 30 DAY GRID */
                                <div className="flex-1 flex flex-col relative z-20 pb-24 overflow-y-auto">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">
                                                {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                            </h3>
                                            <p className="text-xs text-slate-400">Tap to toggle availability</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))}
                                                className="p-2 bg-slate-800 rounded-lg text-white"
                                            >
                                                <ChevronRight className="rotate-180" size={18} />
                                            </button>
                                            <button
                                                onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))}
                                                className="p-2 bg-slate-800 rounded-lg text-white"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Legend */}
                                    <div className="flex gap-4 mb-6 text-[10px] font-bold uppercase tracking-wider">
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500" /> Available</div>
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-700 opacity-50" /> Off</div>
                                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm border border-white/20" /> Neutral</div>
                                    </div>

                                    {/* Grid Header */}
                                    <div className="grid grid-cols-7 gap-2 mb-2">
                                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                            <div key={i} className="text-center text-[10px] font-bold text-slate-500">{d}</div>
                                        ))}
                                    </div>

                                    {/* Calendar Grid */}
                                    <div className="grid grid-cols-7 gap-2">
                                        {getDaysInMonth(selectedMonth).map((date, i) => {
                                            if (!date) return <div key={i} className="aspect-square" />;
                                            const dateStr = date.toISOString().split('T')[0];
                                            const schedule = monthlySchedules[dateStr];
                                            const isAvailable = schedule && !schedule.isHoliday;
                                            const isOff = schedule && schedule.isHoliday;

                                            return (
                                                <motion.button
                                                    key={i}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleDayToggle(dateStr)}
                                                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative transition-all ${isAvailable ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' :
                                                        isOff ? 'bg-slate-700/50 border-white/5 opacity-50' :
                                                            'bg-slate-800/40 border-white/10'
                                                        }`}
                                                >
                                                    <span className={`text-sm font-bold ${isAvailable ? 'text-white' : 'text-slate-300'}`}>
                                                        {date.getDate()}
                                                    </span>
                                                    {isAvailable && (
                                                        <span className="text-[8px] font-black absolute bottom-1 text-white/80">
                                                            {schedule.shiftType}
                                                        </span>
                                                    )}
                                                </motion.button>
                                            );
                                        })}
                                    </div>

                                    {/* SHIFT PICKER OVERLAY */}
                                    <AnimatePresence>
                                        {showShiftPicker && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 50 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 50 }}
                                                className="absolute inset-x-0 bottom-0 z-50 p-6"
                                            >
                                                <div className="bg-slate-900 border border-white/10 rounded-[32px] p-6 shadow-2xl backdrop-blur-xl">
                                                    <div className="flex justify-between items-center mb-6">
                                                        <h4 className="text-lg font-bold text-white">Select Shift</h4>
                                                        <button onClick={() => setShowShiftPicker(null)} className="p-2 bg-slate-800 rounded-full text-slate-400">
                                                            <X size={18} />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                                        {[
                                                            { id: 'AM', name: 'Morning', time: '05:00 - 14:00', icon: <Zap size={16} /> },
                                                            { id: 'PM', name: 'Afternoon', time: '14:00 - 23:00', icon: <Clock size={16} /> },
                                                            { id: 'FULL', name: 'Full Day', time: '05:00 - 18:00', icon: <Calendar size={16} /> },
                                                            { id: 'CUSTOM', name: 'Custom', time: 'Manual entry', icon: <FileText size={16} /> }
                                                        ].map((s) => (
                                                            <button
                                                                key={s.id}
                                                                onClick={() => applyShiftPreset(showShiftPicker, s.id)}
                                                                className="flex flex-col items-start p-4 bg-slate-800 border border-white/5 rounded-2xl hover:border-emerald-500/50 transition-colors"
                                                            >
                                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                                                                    {s.icon}
                                                                </div>
                                                                <span className="text-white font-bold text-sm mb-1">{s.name}</span>
                                                                <span className="text-slate-500 text-[10px] font-medium">{s.time}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        onClick={batchSaveSchedules}
                                        disabled={isSavingSchedule}
                                        className="fixed bottom-6 right-6 left-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all z-30 flex items-center justify-center gap-2"
                                    >
                                        {isSavingSchedule ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={20} />}
                                        Submit Changes
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* MENUPAGE */}
                    {currentPage === 'menu' && (
                        <motion.div
                            key="menu"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            className="p-6 h-full bg-[#0f172a] relative overflow-y-auto"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => navTo('home')}
                                className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white z-20"
                            >
                                <X size={24} />
                            </button>

                            {/* Profile */}
                            <div className="bg-slate-900/50 border border-white/5 rounded-[24px] p-6 mb-6 mt-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-indigo-500 p-0.5 overflow-hidden">
                                        <User className="w-full h-full p-2 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white font-heading">{user?.firstName} {user?.lastName}</h2>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="text-amber-400 text-sm">★★★★★</span>
                                            <span className="text-slate-400 text-xs font-bold">5.0 (1)</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Details */}
                                <div className="mt-6 flex flex-col gap-2">
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <User size={14} className="text-sky-500" /> <span>{user?.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <span className="text-lg leading-none">🚗</span> <span>Vehicle Assigned</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <Globe size={14} className="text-sky-500" /> <span>English • German</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Clickable */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <MenuStatBlock onClick={() => navTo('completed')} value="3236" label="Completed" color="text-emerald-400" />
                                <MenuStatBlock onClick={() => navTo('cancelled')} value="130" label="Cancelled" color="text-rose-400" />
                                <MenuStatBlock onClick={() => navTo('shuttles')} value="212" label="Shuttles" color="text-slate-200" />
                            </div>

                            {/* Monthly Income */}
                            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 mb-4 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-slate-200 text-sm">Monthly Income</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">since 1 Jan</p>
                                </div>
                                <p className="text-xl font-bold text-amber-400 font-heading">€ 0.00</p>
                            </div>

                            {/* Vehicle */}
                            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 mb-6 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-sky-400 text-sm">Toyota Corolla</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded border border-white/5">X 321</span>
                                        <span className="text-slate-500 text-xs font-medium">TF-TP1012</span>
                                    </div>
                                </div>
                                <ArrowRightLeft className="text-slate-600" size={16} />
                            </div>

                            {/* Menu Items */}
                            <div className="space-y-2 mb-8">
                                <MenuItem icon={<Calendar className="text-slate-400" />} label="Tour Calendar" compact />
                                <MenuItem onClick={() => navTo('workshift')} icon={<Clock className="text-slate-400" />} label="Workshift" compact />
                                <MenuItem icon={<Camera className="text-slate-400" />} label="Car photos" compact />
                                <MenuItem icon={<FileText className="text-slate-400" />} label="Privacy Policy" compact />
                            </div>

                            <div className="fixed bottom-6 right-6 z-30">
                                <button
                                    onClick={() => navTo('qr')}
                                    className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-6 py-3 rounded-full shadow-[0_0_20px_rgba(251,191,36,0.3)] flex items-center gap-3 transition-colors active:scale-95">
                                    <div className="grid grid-cols-2 gap-[2px] opacity-80">
                                        <div className="w-1 h-1 bg-black"></div><div className="w-1 h-1 bg-black"></div>
                                        <div className="w-1 h-1 bg-black"></div><div className="w-1 h-1 bg-black"></div>
                                    </div>
                                    Share QR
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* QR SHARE PAGE */}
                    {currentPage === 'qr' && (
                        <motion.div
                            key="qr"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="p-6 h-full flex flex-col items-center justify-center relative overflow-hidden bg-[#0f172a]"
                        >
                            {/* Close Button */}
                            <button onClick={() => navTo('menu')} className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white z-20">
                                <X size={24} />
                            </button>

                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-[#0f172a]/50 to-[#0f172a]" />

                            <div className="relative z-10 w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 flex flex-col items-center text-center shadow-2xl">
                                <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-indigo-500 p-1 mb-4">
                                    <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                                        <User size={32} className="text-indigo-400" />
                                    </div>
                                </div>

                                <h2 className="text-xl font-bold text-white font-heading">{user?.firstName} {user?.lastName}</h2>
                                <p className="text-slate-400 text-sm mb-6">Scan to book me directly</p>

                                {/* QR Code */}
                                <div className="p-4 bg-white rounded-2xl shadow-lg mb-8">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://taxi.com/book/driver/${user?.id || 'unknown'}&color=000000&bgcolor=ffffff`}
                                        alt="Driver QR Code"
                                        className="w-48 h-48"
                                    />
                                </div>

                                <div className="text-slate-500 text-xs font-mono mb-6 bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">
                                    ID: {user?.id || 'Allocating...'}
                                </div>

                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => {
                                            if (navigator.share) {
                                                navigator.share({
                                                    title: `Book ${user?.firstName}`,
                                                    text: `Scan my QR code to book a ride with ${user?.firstName}!`,
                                                    url: `https://taxi.com/book/driver/${user?.id}`
                                                }).catch(console.error);
                                            } else {
                                                navigator.clipboard.writeText(`https://taxi.com/book/driver/${user?.id}`);
                                                alert('Link copied to clipboard!');
                                            }
                                        }}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95">
                                        <Share size={18} /> Share
                                    </button>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`https://taxi.com/book/driver/${user?.id}`);
                                            alert('Link copied to clipboard!');
                                        }}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95">
                                        Copy Link
                                    </button>
                                </div>
                            </div>

                            <p className="mt-8 text-slate-500 text-xs font-medium uppercase tracking-widest relative z-10">
                                Tepecars Partner
                            </p>
                        </motion.div>
                    )}

                    {/* BOOKING DETAILS */}
                    {currentPage === 'booking' && booking && (
                        <BookingFlow
                            booking={booking}
                            onBack={() => navTo('home')}
                            user={user}
                        />
                    )}

                </AnimatePresence>
            </main>
        </div>
    );
}

// Subcomponents
function FilterPill({ label, active }) {
    return (
        <button className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition-colors ${active ? 'bg-amber-400 border-amber-400 text-black' : 'bg-transparent border-slate-700 text-slate-400'}`}>
            {label}
        </button>
    )
}

function TripCard({ trip, status }) {
    const isCancelled = status === 'cancelled';
    const borderColor = isCancelled ? 'border-rose-500/20' : 'border-white/5';

    return (
        <div className={`bg-slate-900/40 border ${borderColor} rounded-2xl p-4 relative overflow-hidden`}>
            {isCancelled && <div className="bg-rose-500 text-white text-[10px] font-bold py-1 px-3 absolute top-0 text-center w-full left-0">Passenger Cancelled</div>}

            <div className={`flex justify-between items-start mb-4 ${isCancelled ? 'mt-4' : ''}`}>
                <div>
                    <p className="text-slate-400 text-xs">{trip.date}</p>
                </div>
                <p className="text-[10px] text-slate-600">{trip.id}</p>
            </div>

            <div className="flex gap-2 mb-4">
                <div className="bg-slate-800 px-2 py-1 rounded text-slate-300 text-xs flex items-center gap-1"><Plane size={12} /> {trip.flight}</div>
                <div className="bg-slate-800 px-2 py-1 rounded text-slate-300 text-xs flex items-center gap-1"><User size={12} /> {trip.pax}</div>
                <div className="bg-slate-800 px-2 py-1 rounded text-slate-300 text-xs flex items-center gap-1"><Briefcase size={12} /> {trip.bags}</div>
                <div className="bg-slate-800 px-2 py-1 rounded text-slate-300 text-xs ml-auto">Economy Sedan</div>
            </div>

            <div className="relative pl-4 space-y-4">
                <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-slate-800">
                    <div className={`absolute top-0 -left-[1px] w-1 h-1 rounded-full ${isCancelled ? 'bg-rose-500' : 'bg-red-400'}`} />
                    <div className={`absolute bottom-0 -left-[1px] w-1 h-1 rounded-full ${isCancelled ? 'bg-rose-500' : 'bg-green-400'}`} />
                </div>
                {trip.route.map((stop, i) => (
                    <p key={i} className="text-xs font-medium text-slate-300 truncate">{stop}</p>
                ))}
                <div className="flex items-center gap-1 text-[10px] text-slate-500 pl-1"><Clock size={10} /> {trip.date}</div>
            </div>

            {!isCancelled && (
                <div className="bg-emerald-500 text-white font-bold text-sm px-3 py-1 rounded absolute top-4 right-4">
                    € {trip.price.toFixed(1)}
                </div>
            )}
        </div>
    )
}

function ShuttleCard({ trip }) {
    return (
        <div className="bg-[#b45309] rounded-2xl p-0 overflow-hidden relative">
            <div className="bg-amber-600/20 p-3 flex justify-between items-center">
                <span className="font-bold text-white text-sm">{trip.title}</span>
                <Plane className="text-white" size={16} />
            </div>
            <div className="bg-white p-3">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-slate-400 text-xs">{trip.date}</p>
                    <p className="text-xs text-slate-400 text-right uppercase">{trip.title}</p>
                </div>
                <div className="flex justify-between items-end">
                    <div className="flex gap-2">
                        <div className="bg-slate-100 px-2 py-1 rounded text-slate-500 text-xs flex items-center gap-1"><User size={12} /> {trip.pax}</div>
                        <div className="bg-slate-100 px-2 py-1 rounded text-slate-500 text-xs flex items-center gap-1"><Briefcase size={12} /> {trip.bags}</div>
                    </div>
                    <div className="bg-[#65d01e] text-white font-bold text-sm px-3 py-1 rounded">
                        € {trip.price.toFixed(1)}
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ value, label, color }) {
    return (
        <div className="bg-slate-900/50 backdrop-blur rounded-[20px] p-5 flex flex-col items-center justify-center border border-white/5 hover:border-white/10 transition-colors cursor-pointer aspect-[4/3] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className={`text-2xl font-bold mb-1 font-heading ${color}`}>{value}</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        </div>
    );
}

function MenuStatBlock({ value, label, color, onClick }) {
    return (
        <button onClick={onClick} className="bg-slate-900/50 rounded-2xl p-3 flex flex-col items-center justify-center border border-white/5 aspect-square hover:bg-white/5 transition-colors w-full">
            <span className={`text-xl font-bold mb-1 font-heading ${color}`}>{value}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
            {label === 'Completed' && <div className="h-1 w-4 bg-emerald-500/20 rounded-full mt-1" />}
        </button>
    );
}

function DetailBadge({ icon, label }) {
    return (
        <div className="flex flex-col items-center justify-center p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="text-slate-400 mb-1">{icon}</div>
            <span className="text-xs font-bold text-slate-300">{label}</span>
        </div>
    )
}

function ActionButton({ icon }) {
    return (
        <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white border border-white/5 transition-colors">
            {icon}
        </button>
    )
}

function MenuItem({ icon, label, sub, compact, onClick }) {
    if (compact) {
        return (
            <button onClick={onClick} className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 w-full text-left">
                <div className="text-slate-400">
                    {icon}
                </div>
                <span className="font-medium text-slate-300 flex-1">{label}</span>
                <ChevronRight size={16} className="text-slate-600" />
            </button>
        );
    }
}
