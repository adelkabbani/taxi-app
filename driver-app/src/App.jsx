import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
    Menu, Globe, LogOut, Phone, MessageCircle,
    Navigation2, User, Calendar, Clock, Camera,
    FileText, ArrowRightLeft, X, MapPin, Zap, Plane, Briefcase, ChevronRight, Check, XCircle, Share, Lock, Mail, ArrowRight,
    LayoutGrid, Wallet, Tag, ShoppingBag, Bus, RefreshCw, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BookingFlow from './BookingFlow';

export default function App() {
    // Connect to the backend
    // On a real Android device (Capacitor), localhost means the phone itself — use the PC's LAN IP instead.
    const getBackendUrl = () => {
        const hostname = window.location.hostname;
        const isDevice = hostname === 'localhost' || hostname === '0.0.0.0' || hostname === '127.0.0.1';
        if (isDevice) {
            // PC's LAN IP — phone must be on the same WiFi network
            return 'http://192.168.178.152:3002';
        }
        return `http://${hostname}:3002`;
    };

    const backendUrl = getBackendUrl();
    axios.defaults.baseURL = backendUrl;

    const [user, setUser] = useState(null); // Auth User

    // --- MAGIC LOGIN HANDOVER ---
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const magicToken = urlParams.get('token');
        
        if (magicToken) {
            console.log('✨ Magic Token detected. Initializing impersonation...');
            localStorage.setItem('token', magicToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${magicToken}`;
            
            // Clean the URL without refreshing
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);

            // Fetch profile immediately to log user in
            const initUser = async () => {
                setIsLoading(true);
                try {
                    const res = await axios.get('/api/drivers/me/profile');
                    if (res.data.success) {
                        setUser(res.data.data.user || res.data.data);
                        console.log('✅ Magic Login Success!');
                    }
                } catch (err) {
                    console.error('❌ Magic Login Failed:', err);
                    localStorage.removeItem('token');
                    setAuthError('Magic login failed. Please try again.');
                } finally {
                    setIsLoading(false);
                }
            };
            initUser();
        }
    }, []);

    const [currentPage, setCurrentPage] = useState('home'); // home, menu, booking, completed, cancelled, shuttles, workshift, qr
    const [isOnline, setIsOnline] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [gpsStatus, setGpsStatus] = useState('initializing'); // initializing, active, blocked, unavailable
    const [uplinkStatus, setUplinkStatus] = useState('connected'); // connected, disconnected
    const [locationError, setLocationError] = useState(null);

    // Login State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [socket, setSocket] = useState(null);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [booking, setBooking] = useState(null);
    const [authError, setAuthError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setAuthError('');
        try {
            const res = await axios.post('/api/auth/login', {
                email: loginEmail,
                password: loginPassword
            });
            if (res.data.success) {
                setIsSuccess(true);
                const userData = res.data.data.user;
                const token = res.data.data.token;
                
                localStorage.setItem('token', token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                
                setTimeout(() => {
                    setUser(userData);
                }, 1500);
            }
        } catch (err) {
            setAuthError(err.response?.data?.message || 'Login failed');
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
    const [driverBookings, setDriverBookings] = useState([]); // List of current active/assigned bookings
    const [driverStats, setDriverStats] = useState({ lifetime_completed: 0, lifetime_cancelled: 0, monthly_income: 0 });
    const [homeTab, setHomeTab] = useState('offers'); // 'offers' | 'planned' | 'market' | 'shuttles'
    const [marketBookings, setMarketBookings] = useState([]);
    const [homeShuttles, setHomeShuttles] = useState([]);

    const mapBookingData = (b) => {
        if (!b) return null;
        return {
            id: b.booking_reference || `TX-REF-${b.id}`,
            numericId: b.id,
            date: b.scheduled_pickup_time ? new Date(b.scheduled_pickup_time).toLocaleString() : 'N/A',
            price: parseFloat(b.fare_estimate || 0),
            passengers: b.passengers_count || 1,
            luggage: b.luggage_count || 1,
            vehicle: b.vehicle_type || 'Standard',
            pickup: b.pickup_address || 'N/A',
            pickupTime: b.scheduled_pickup_time 
                ? new Date(b.scheduled_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                : 'N/A',
            dropoff: b.dropoff_address || 'N/A',
            customer: {
                name: b.passenger_name || 'Guest',
                phone: b.passenger_phone || 'N/A'
            },
            status: b.status
        };
    };

    const fetchDriverBookings = async () => {
        if (!user) return;
        try {
            const res = await axios.get('/api/bookings/driver/me');
            if (res.data.success) {
                setDriverBookings(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch driver bookings', err);
        }
    };

    const fetchDriverStats = async () => {
        if (!user) return;
        try {
            const res = await axios.get('/api/drivers/stats');
            if (res.data.success) {
                setDriverStats(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch driver stats', err);
        }
    };

    const fetchMarketBookings = async () => {
        try {
            const res = await axios.get('/api/bookings?status=pending&limit=30');
            if (res.data.success) setMarketBookings(res.data.data);
        } catch (err) {
            console.error('Failed to fetch market', err);
        }
    };

    const fetchHomeShuttles = async () => {
        try {
            const res = await axios.get('/api/drivers/me/trips?type=shuttles&limit=30');
            if (res.data.success) setHomeShuttles(res.data.data);
        } catch (err) {
            console.error('Failed to fetch shuttles', err);
        }
    };

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
        fetchDriverBookings();
        fetchDriverStats();
        fetchMarketBookings();
        fetchHomeShuttles();
    }, [user]);

    useEffect(() => {
        if (currentPage === 'market') fetchMarketBookings();
        if (currentPage === 'shuttles') fetchHomeShuttles();
    }, [currentPage]);



    useEffect(() => {
        if (user && !socket) {
            const newSocket = io(backendUrl);
            newSocket.on('connect', () => {
                console.log('Socket connected:', newSocket.id);
                // Authenticate to join user-specific room
                newSocket.emit('authenticate', {
                    token: localStorage.getItem('token'),
                    userId: user.id,
                    role: user.role
                });
            });

            newSocket.on('authenticated', () => {
                console.log('Socket authenticated successfully');
                setIsSocketConnected(true);
            });

            newSocket.on('connect_error', (err) => {
                console.error('Socket connection error:', err);
                setIsSocketConnected(false);
            });

            newSocket.on('disconnect', () => {
                console.log('Socket disconnected');
                setIsSocketConnected(false);
            });

            newSocket.on('booking_assigned', async (data) => {
                console.log('Booking Assigned Event Received:', data);
                
                // Fetch latest bookings to show in Offers
                fetchDriverBookings();
                
                // Voice Notification Alert
                if ('speechSynthesis' in window) {
                    const msg = new SpeechSynthesisUtterance("New tour assigned. Please check your screen.");
                    msg.lang = 'en-US';
                    msg.rate = 1.0;
                    window.speechSynthesis.speak(msg);
                }

                try {
                    const res = await axios.get(`/api/bookings/${data.bookingId}`);
                    if (res.data.success) {
                        setBooking(mapBookingData(res.data.data));
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

    // Real Location Tracking
    useEffect(() => {
        let watchId;
        
        if (isOnline && driver) {
            const handleLocationUpdate = async (position) => {
                const { latitude, longitude, heading, speed, accuracy } = position.coords;
                setGpsStatus('active');
                setLocationError(null);
                
                try {
                    await axios.post('/api/drivers/location', {
                        lat: latitude,
                        lng: longitude,
                        accuracy,
                        heading: heading || 0,
                        speed: speed || 0
                    });
                    setUplinkStatus('connected');
                    console.log(`GPS Lock & Uplink: [${latitude.toFixed(6)}, ${longitude.toFixed(6)}]`);
                } catch (err) {
                    console.error('Failed to broadcast location:', err);
                    setUplinkStatus('disconnected');
                }
            };

            const handleError = (error) => {
                console.error('Geolocation Error:', error.code, error.message);
                
                if (error.code === 1) { // PERMISSION_DENIED
                    setGpsStatus('blocked');
                } else {
                    setGpsStatus('unavailable');
                }
                
                setLocationError(error.message);
            };

            const startWatching = async () => {
                watchId = await Geolocation.watchPosition({
                    enableHighAccuracy: true,
                    maximumAge: 10000,
                    timeout: 5000
                }, (position, err) => {
                    if (err) {
                        handleError(err);
                        return;
                    }
                    handleLocationUpdate(position);
                });
            };
            startWatching();
        }

        return () => {
            if (watchId) {
                Geolocation.clearWatch({ id: watchId });
            }
        };
    }, [isOnline, driver]);

    const toggleOnlineStatus = async () => {
        if (!driver) return;

        const newStatus = !isOnline;
        
        // --- AUDIO WARM-UP ---
        // Browser policies block autoplay unless user interacts. 
        // Warming up speechSynthesis here "unlocks" it for future automated alerts.
        if (newStatus && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(""); // Silent utterance
            window.speechSynthesis.speak(utterance);
            console.log('Audio Context Warmed Up');
        }

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
    // (booking state declared at top)

    const [completedTrips, setCompletedTrips] = useState([]);
    const [cancelledTrips, setCancelledTrips] = useState([]);
    const [shuttles, setShuttles] = useState([]);
    const [tripsLoading, setTripsLoading] = useState(false);

    const fetchTrips = async (type, setter) => {
        setTripsLoading(true);
        try {
            const res = await axios.get(`/api/drivers/me/trips?type=${type}&limit=50`);
            if (res.data.success) setter(res.data.data);
        } catch (err) {
            console.error(`Failed to fetch ${type} trips:`, err);
        } finally {
            setTripsLoading(false);
        }
    };

    useEffect(() => {
        if (currentPage === 'completed') fetchTrips('completed', setCompletedTrips);
        if (currentPage === 'cancelled') fetchTrips('cancelled', setCancelledTrips);
        if (currentPage === 'shuttles') fetchTrips('shuttles', setShuttles);
    }, [currentPage]);

    const navTo = (page) => {
        window.scrollTo(0, 0);
        setCurrentPage(page);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setDriver(null);
        setBooking(null);
        if (socket) { socket.disconnect(); setSocket(null); }
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
            <div className={`flex flex-col h-full bg-ink-black-950 text-white font-sans relative p-6 justify-center ${isSuccess ? '' : 'overflow-hidden'}`}>
                {/* Background Ambient Glows */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-[120px]" />
                </div>

                <div className="relative z-10 w-full max-w-sm mx-auto">
                    <motion.div 
                        animate={isSuccess ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
                        className="mb-12 text-center"
                    >
                        <div className="mb-10 flex justify-center py-4">
                            <motion.img
                                initial="initial"
                                animate={isSuccess ? "success" : "animate"}
                                variants={{
                                    initial: { scale: 0.8, opacity: 0 },
                                    animate: { 
                                        scale: [1, 1.05, 1],
                                        opacity: 1,
                                        filter: ['drop-shadow(0 0 5px rgba(234,179,8,0.2))', 'drop-shadow(0 0 25px rgba(234,179,8,0.5))', 'drop-shadow(0 0 5px rgba(234,179,8,0.2))']
                                    },
                                    success: {
                                        scale: 15,
                                        y: -1000,
                                        opacity: 0,
                                        transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1] }
                                    }
                                }}
                                whileHover={!isSuccess ? { scale: 1.1, filter: 'drop-shadow(0 0 40px rgba(234,179,8,0.7))' } : {}}
                                transition={{ 
                                    scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                                    filter: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                                    duration: 1
                                }}
                                src="/logo.png"
                                alt="DriveZFlight"
                                className="h-28 w-auto cursor-pointer relative z-50"
                            />
                        </div>
                        <h1 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-2 leading-none">Driver Command</h1>
                        <p className="text-gold-400 text-xs font-black uppercase tracking-widest opacity-80">Orbital Uplink Interface</p>
                    </motion.div>

                    <motion.form 
                        onSubmit={handleLogin} 
                        className="space-y-4"
                        animate={isSuccess ? { opacity: 0, y: 20, pointerEvents: 'none' } : { opacity: 1, y: 0 }}
                    >
                        <div className="bg-ink-black-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 flex items-center gap-3 focus-within:border-gold-500/50 transition-all">
                            <Mail className="text-gray-600" size={20} />
                            <input
                                type="email"
                                placeholder="PERSONNEL-ID"
                                value={loginEmail}
                                onChange={e => setLoginEmail(e.target.value.toLowerCase())}
                                className="bg-transparent border-none outline-none text-white font-black text-[10px] tracking-widest w-full placeholder:text-gray-800"
                                required
                            />
                        </div>

                        <div className="bg-ink-black-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 flex items-center gap-3 focus-within:border-gold-500/50 transition-all">
                            <Lock className="text-gray-600" size={20} />
                            <input
                                type="password"
                                placeholder="ACCESS-PROTOCOL"
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                                className="bg-transparent border-none outline-none text-white font-black text-[10px] uppercase tracking-widest w-full placeholder:text-gray-800"
                                required
                            />
                        </div>

                        {authError && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[10px] font-black uppercase tracking-widest text-center">
                                {authError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gold-400 hover:bg-gold-500 text-ink-black-950 font-black text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl shadow-[0_10px_25px_rgba(234,179,8,0.2)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
                        >
                            {isLoading ? 'INITIATING...' : 'Initialize Logic'} <ArrowRight size={20} />
                        </button>
                    </motion.form>

                    <p className="text-center text-gray-600 text-[9px] font-black uppercase tracking-widest mt-12">
                        Restricted Node • Authorized Personnel Only
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-ink-black-950 text-white font-sans relative overflow-hidden select-none">

            {/* Background Ambient Glows */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gold-500/5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-full h-96 bg-cyan-500/5 blur-[100px] pointer-events-none" />

            {/* Header — hidden on menu page (menu has its own hero) */}
            {currentPage !== 'menu' && (
                <header className="px-5 pt-5 pb-3 flex items-center justify-between relative z-20 shrink-0">
                    {/* Status dots left */}
                    <div className="flex items-center gap-1.5 w-10">
                        <div className={`w-2 h-2 rounded-full ${gpsStatus === 'active' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]'}`} title={`GPS: ${gpsStatus}`} />
                        <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.5)]'}`} title={isSocketConnected ? 'Uplink OK' : 'Uplink Lost'} />
                    </div>

                    {/* Logo centred */}
                    <motion.img
                        animate={{
                            filter: ['drop-shadow(0 0 0px rgba(255,195,0,0))', 'drop-shadow(0 0 10px rgba(255,195,0,0.4))', 'drop-shadow(0 0 0px rgba(255,195,0,0))']
                        }}
                        transition={{ filter: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
                        src="/logo.png"
                        alt="Logo"
                        className="h-14 w-auto"
                    />

                    {/* Menu button right */}
                    <button
                        onClick={() => navTo(currentPage === 'home' ? 'menu' : 'home')}
                        className="w-10 h-10 bg-ink-black-900 border border-white/8 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
                    >
                        {currentPage === 'home' ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5 text-slate-400" />}
                    </button>
                </header>
            )}

            {/* GPS Warning Banner */}
            <AnimatePresence>
                {(gpsStatus === 'blocked' || gpsStatus === 'unavailable') && isOnline && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-rose-500/10 border-y border-rose-500/20 px-6 py-3 flex items-start gap-4 relative z-20"
                    >
                        <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest mb-1">GPS Signal Blocked</h4>
                            <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                                {gpsStatus === 'blocked' 
                                    ? "Location permissions are denied. Please enable them in your browser settings."
                                    : "Geolocation is restricted. Please ensure you are using a Secure Connection (HTTPS) or testing on localhost."
                                }
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                            className="flex flex-col pb-28 overflow-y-auto scrollbar-hide"
                        >
                            {/* Hero Status Card */}
                            <div className="px-4 pt-1 pb-4">
                                <div className="relative rounded-3xl overflow-hidden p-5"
                                    style={{ background: 'linear-gradient(135deg, #001d3d 0%, #002952 50%, #000f1f 100%)' }}>

                                    {/* Gold ambient glow bottom-left */}
                                    <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-full pointer-events-none"
                                        style={{ background: 'radial-gradient(circle, rgba(255,214,10,0.12) 0%, transparent 70%)' }} />
                                    {/* Subtle grid lines */}
                                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                                        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />

                                    {/* Top row: refresh + status pill */}
                                    <div className="flex justify-between items-center mb-6 relative z-10">
                                        <button onClick={() => { fetchDriverBookings(); fetchMarketBookings(); fetchHomeShuttles(); }}
                                            className="w-8 h-8 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-slate-400 active:scale-95 transition-all">
                                            <RefreshCw size={13} />
                                        </button>
                                        <button onClick={toggleOnlineStatus}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all active:scale-95 ${isOnline ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400' : 'bg-white/5 border-white/12 text-slate-500'}`}>
                                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                                            {isOnline ? 'Online' : 'Offline'}
                                        </button>
                                    </div>

                                    {/* Greeting */}
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gold-500 mb-1">
                                            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}
                                        </p>
                                        <h2 className="text-2xl font-black text-white font-heading leading-tight mb-4">
                                            {user?.firstName} {user?.lastName}
                                        </h2>
                                        {/* Gold divider */}
                                        <div className="w-10 h-[2px] bg-gold-500 rounded-full mb-3 shadow-[0_0_8px_rgba(255,214,10,0.5)]" />
                                        <p className="text-[11px] text-slate-400 font-medium">
                                            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Active offer alert OR empty state */}
                            {driverBookings.filter(b => b.status === 'assigned').length === 0 ? (
                                <div className="px-5 pb-4 text-center">
                                    <p className="text-[15px] font-black text-white leading-snug mb-1">There aren't any upcoming tours</p>
                                    <p className="text-[12px] text-slate-500 leading-relaxed">New ride requests will appear here in real-time.</p>
                                </div>
                            ) : (
                                <div className="px-4 pb-3 space-y-2">
                                    {driverBookings.filter(b => b.status === 'assigned').map(b => (
                                        <div key={b.id} onClick={() => { setBooking(mapBookingData(b)); navTo('booking'); }}
                                            className="rounded-2xl p-4 active:scale-[0.98] transition-all cursor-pointer border border-white/5"
                                            style={{ background: 'rgba(255,214,10,0.06)', borderLeft: '3px solid #ffd60a' }}>
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-[10px] font-black text-gold-400 uppercase tracking-widest">{b.booking_reference}</p>
                                                <span className="bg-gold-500/15 text-gold-400 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">New Offer</span>
                                            </div>
                                            <p className="text-white font-bold mb-2">{new Date(b.scheduled_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            <div className="space-y-1 pl-3 border-l border-gold-500/25">
                                                <p className="text-xs text-slate-300 truncate">{b.pickup_address}</p>
                                                <p className="text-xs text-slate-500 truncate">{b.dropoff_address}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 2×2 Stat Tiles */}
                            {(() => {
                                const todayStr = new Date().toDateString();
                                const offersCount = driverBookings.filter(b => b.status === 'assigned').length;
                                const tiles = [
                                    { key: 'planned',  label: 'Planned',  value: driverBookings.filter(b => b.status !== 'assigned' && new Date(b.scheduled_pickup_time).toDateString() === todayStr).length, icon: Calendar,    accent: '#ffd60a' },
                                    { key: 'offers',   label: 'Offers',   value: offersCount,           icon: Tag,         accent: '#10b981', hot: offersCount > 0 },
                                    { key: 'market',   label: 'Market',   value: marketBookings.length, icon: ShoppingBag, accent: '#38bdf8' },
                                    { key: 'shuttles', label: 'Shuttles', value: homeShuttles.length,   icon: Bus,         accent: '#ffd60a' },
                                ];
                                return (
                                    <div className="px-4 grid grid-cols-2 gap-3">
                                        {tiles.map(t => {
                                            const Icon = t.icon;
                                            return (
                                                <button key={t.key} onClick={() => navTo(t.key)}
                                                    className="relative rounded-2xl p-4 text-left active:scale-[0.97] transition-all overflow-hidden border border-white/[0.06]"
                                                    style={{ background: '#0b111d', borderLeft: `3px solid ${t.accent}` }}>
                                                    {t.hot && (
                                                        <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full animate-pulse"
                                                            style={{ background: t.accent, boxShadow: `0 0 8px ${t.accent}` }} />
                                                    )}
                                                    <div className="flex justify-between items-start mb-5">
                                                        <span className="text-[34px] font-black text-white font-heading leading-none">{t.value}</span>
                                                        <Icon size={17} style={{ color: t.accent, opacity: 0.5, marginTop: 4 }} />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{t.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </motion.div>
                    )}

                    {/* OFFERS PAGE */}
                    {currentPage === 'offers' && (
                        <motion.div key="offers" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="p-4 pb-28 space-y-3">
                            <div className="flex items-center gap-3 mb-4">
                                <button onClick={() => navTo('home')} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400"><ArrowLeft size={16}/></button>
                                <h2 className="text-sm font-black text-white uppercase tracking-widest">Offers</h2>
                            </div>
                            {driverBookings.filter(b => b.status === 'assigned').length > 0
                                ? driverBookings.filter(b => b.status === 'assigned').map(b => (
                                    <div key={b.id} onClick={() => { setBooking(mapBookingData(b)); navTo('booking'); }}
                                        className="bg-white/[0.04] border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-all cursor-pointer"
                                        style={{ borderLeft: '3px solid #3b82f6' }}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{b.booking_reference}</p>
                                                <p className="text-white font-bold">{new Date(b.scheduled_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase border border-blue-500/20">New</span>
                                        </div>
                                        <div className="space-y-1 pl-3 border-l border-blue-500/20">
                                            <p className="text-xs text-slate-300 truncate">{b.pickup_address}</p>
                                            <p className="text-xs text-slate-500 truncate">{b.dropoff_address}</p>
                                        </div>
                                    </div>
                                ))
                                : <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                    <Tag size={36} className="mb-3 text-slate-600" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">No Offers Right Now</p>
                                  </div>
                            }
                        </motion.div>
                    )}

                    {/* PLANNED PAGE */}
                    {currentPage === 'planned' && (
                        <motion.div key="planned" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="p-4 pb-28 space-y-3">
                            <div className="flex items-center gap-3 mb-4">
                                <button onClick={() => navTo('home')} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400"><ArrowLeft size={16}/></button>
                                <h2 className="text-sm font-black text-white uppercase tracking-widest">Planned Tours</h2>
                            </div>
                            {(() => {
                                const todayStr = new Date().toDateString();
                                const planned = driverBookings.filter(b => b.status !== 'assigned' && new Date(b.scheduled_pickup_time).toDateString() === todayStr);
                                return planned.length > 0
                                    ? planned.map(b => (
                                        <div key={b.id} onClick={() => { setBooking(mapBookingData(b)); navTo('booking'); }}
                                            className="bg-white/[0.04] border border-white/5 rounded-2xl p-4 active:scale-[0.98] transition-all cursor-pointer"
                                            style={{ borderLeft: '3px solid #6366f1' }}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{b.booking_reference}</p>
                                                    <p className="text-white font-bold">{new Date(b.scheduled_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                                <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase border border-indigo-500/20">{b.status}</span>
                                            </div>
                                            <div className="space-y-1 pl-3 border-l border-indigo-500/20">
                                                <p className="text-xs text-slate-300 truncate">{b.pickup_address}</p>
                                                <p className="text-xs text-slate-500 truncate">{b.dropoff_address}</p>
                                            </div>
                                        </div>
                                    ))
                                    : <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                        <Calendar size={36} className="mb-3 text-slate-600" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">No Tours Today</p>
                                        <p className="text-[9px] text-slate-600 mt-1">There aren't any upcoming tours</p>
                                      </div>;
                            })()}
                        </motion.div>
                    )}

                    {/* MARKET PAGE */}
                    {currentPage === 'market' && (
                        <motion.div key="market" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                            className="p-4 pb-28 space-y-3">
                            <div className="flex items-center gap-3 mb-4">
                                <button onClick={() => navTo('home')} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400"><ArrowLeft size={16}/></button>
                                <h2 className="text-sm font-black text-white uppercase tracking-widest">Market</h2>
                            </div>
                            {marketBookings.length > 0
                                ? marketBookings.map(b => (
                                    <div key={b.id}
                                        className="bg-white/[0.04] border border-white/5 rounded-2xl p-4"
                                        style={{ borderLeft: '3px solid #ec4899' }}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1">{b.booking_reference}</p>
                                                <p className="text-white font-bold">{new Date(b.scheduled_pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                <p className="text-[9px] text-slate-500">{new Date(b.scheduled_pickup_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                                            </div>
                                            <span className="bg-pink-500/10 text-pink-400 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase border border-pink-500/20">Available</span>
                                        </div>
                                        <div className="space-y-1 pl-3 border-l border-pink-500/20">
                                            <p className="text-xs text-slate-300 truncate">{b.pickup_address}</p>
                                            <p className="text-xs text-slate-500 truncate">{b.dropoff_address}</p>
                                        </div>
                                    </div>
                                ))
                                : <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                    <ShoppingBag size={36} className="mb-3 text-slate-600" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Market Empty</p>
                                    <p className="text-[9px] text-slate-600 mt-1">No available bookings right now</p>
                                  </div>
                            }
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
                            {tripsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                    <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Loading...</p>
                                </div>
                            ) : (
                                <>
                                    {currentPage === 'completed' && (
                                        completedTrips.length > 0
                                            ? completedTrips.map(trip => <TripCard key={trip.id} trip={trip} status="completed" />)
                                            : <EmptyState label="No Completed Trips" />
                                    )}
                                    {currentPage === 'cancelled' && (
                                        cancelledTrips.length > 0
                                            ? cancelledTrips.map(trip => <TripCard key={trip.id} trip={trip} status="cancelled" />)
                                            : <EmptyState label="No Cancelled Trips" />
                                    )}
                                    {currentPage === 'shuttles' && (
                                        shuttles.length > 0
                                            ? shuttles.map((trip, i) => <ShuttleCard key={i} trip={trip} />)
                                            : <EmptyState label="No Shuttle Trips" />
                                    )}
                                </>
                            )}
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

                    {/* MENU PAGE */}
                    {currentPage === 'menu' && (
                        <motion.div
                            key="menu"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            className="h-full relative overflow-y-auto scrollbar-hide pb-12"
                            style={{ background: '#000814' }}
                        >
                            {/* Profile Header */}
                            <div className="relative px-5 pt-6 pb-6 overflow-hidden"
                                style={{ background: 'linear-gradient(160deg, #001d3d 0%, #002040 60%, #000814 100%)' }}>
                                {/* Gold glow */}
                                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
                                    style={{ background: 'radial-gradient(circle, rgba(255,214,10,0.08) 0%, transparent 70%)' }} />

                                {/* Close */}
                                <button onClick={() => navTo('home')}
                                    className="absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 active:scale-95 transition-all border border-white/10"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <X size={16} />
                                </button>

                                {/* Avatar row */}
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="relative shrink-0">
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                            style={{ background: '#0b111d', border: '2px solid rgba(255,214,10,0.35)', boxShadow: '0 0 20px rgba(255,214,10,0.12)' }}>
                                            <span className="text-xl font-black font-heading" style={{ color: '#ffd60a' }}>
                                                {(user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')}
                                            </span>
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#000814] ${isOnline ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-lg font-black text-white font-heading leading-tight truncate">
                                            {user?.firstName} {user?.lastName}
                                        </h2>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span style={{ color: '#ffd60a' }} className="text-xs leading-none">★★★★★</span>
                                            <span className="text-slate-500 text-[11px] font-bold">5.0</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{user?.email}</p>
                                    </div>
                                </div>

                                {/* Status row */}
                                <div className="mt-4 flex items-center gap-2 relative z-10">
                                    <button onClick={toggleOnlineStatus}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${isOnline ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                                        {isOnline ? 'On Duty' : 'Off Duty'}
                                    </button>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/8 text-[10px] font-bold text-slate-500"
                                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                                        <Globe size={10} /> EN · DE
                                    </div>
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="px-4 py-4 grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Completed', value: driverStats.lifetime_completed, page: 'completed' },
                                    { label: 'Cancelled',  value: driverStats.lifetime_cancelled, page: 'cancelled' },
                                    { label: 'Shuttles',   value: homeShuttles.length,             page: 'shuttles'  },
                                ].map(s => (
                                    <button key={s.label} onClick={() => navTo(s.page)}
                                        className="rounded-2xl p-3 flex flex-col items-center justify-center active:scale-95 transition-all border border-white/[0.06]"
                                        style={{ background: '#0b111d' }}>
                                        <span className="text-2xl font-black font-heading text-white">{s.value}</span>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="px-4 space-y-2.5">

                                {/* Income + Vehicle — side by side */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    {/* Monthly Income */}
                                    <div className="rounded-2xl p-4 border border-white/[0.06]" style={{ background: '#0b111d' }}>
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                                            style={{ background: 'rgba(255,214,10,0.12)', border: '1px solid rgba(255,214,10,0.2)' }}>
                                            <span className="text-xs font-black" style={{ color: '#ffd60a' }}>€</span>
                                        </div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Income</p>
                                        <p className="text-base font-black font-heading" style={{ color: '#ffd60a' }}>
                                            €{parseFloat(driverStats.monthly_income || 0).toFixed(2)}
                                        </p>
                                        <p className="text-[9px] text-slate-600 mt-0.5">This month</p>
                                    </div>

                                    {/* Vehicle */}
                                    <div className="rounded-2xl p-4 border border-white/[0.06]" style={{ background: '#0b111d' }}>
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <Navigation2 size={14} className="text-slate-400" />
                                        </div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Vehicle</p>
                                        <p className="text-sm font-black text-white leading-tight">
                                            {driver?.vehicle_make || '—'} {driver?.vehicle_model || ''}
                                        </p>
                                        <p className="text-[9px] font-mono text-slate-500 mt-0.5">{driver?.license_plate || '—'}</p>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div className="rounded-2xl overflow-hidden border border-white/[0.06]" style={{ background: '#0b111d' }}>
                                    {[
                                        { icon: Calendar, label: 'Tour Calendar',  sub: 'Upcoming bookings', action: null },
                                        { icon: Clock,    label: 'Workshift',      sub: 'Schedule & hours',  action: () => navTo('workshift') },
                                        { icon: Camera,   label: 'Car Photos',     sub: 'Vehicle documents', action: null },
                                        { icon: FileText, label: 'Privacy Policy', sub: 'Legal & terms',     action: null },
                                    ].map(({ icon: Icon, label, sub, action }, i, arr) => (
                                        <button key={label} onClick={action}
                                            className={`flex items-center gap-3.5 w-full px-4 py-3.5 active:bg-white/[0.03] transition-colors text-left ${i < arr.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                                <Icon size={15} className="text-slate-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white">{label}</p>
                                                <p className="text-[10px] text-slate-500">{sub}</p>
                                            </div>
                                            <ChevronRight size={15} className="text-slate-700 shrink-0" />
                                        </button>
                                    ))}
                                </div>

                                {/* Share QR Code */}
                                <button onClick={() => navTo('qr')}
                                    className="w-full font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                                    style={{ background: 'linear-gradient(90deg, #ffc300, #ffd60a)', color: '#000814', boxShadow: '0 8px 24px rgba(255,195,0,0.2)' }}>
                                    <Share size={17} />
                                    Share My QR Code
                                </button>

                                {/* Sign Out */}
                                <button onClick={handleLogout}
                                    className="w-full text-sm font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all border border-white/[0.06] text-slate-400"
                                    style={{ background: '#0b111d' }}>
                                    <LogOut size={15} />
                                    Sign Out
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
                            onActionComplete={() => {
                                fetchDriverBookings();
                                fetchDriverStats();
                            }}
                        />
                    )}

                </AnimatePresence>
            </main>

            {/* Bottom Navigation Bar */}
            {!['menu', 'booking', 'qr', 'workshift'].includes(currentPage) && (
                <nav className="shrink-0 relative z-30 bg-ink-black-900/95 border-t border-white/[0.06] backdrop-blur-xl pb-safe">
                    <div className="flex items-center justify-around px-2 py-2">
                        {[
                            { key: 'home',      icon: LayoutGrid, label: 'Home'     },
                            { key: 'workshift', icon: Calendar,   label: 'Schedule' },
                            { key: 'completed', icon: Wallet,     label: 'Earnings' },
                            { key: 'menu',      icon: User,       label: 'Account'  },
                        ].map(item => {
                            const Icon = item.icon;
                            const isActive = currentPage === item.key;
                            const isHomePage = currentPage === 'home' && item.key === 'home';
                            return (
                                <button key={item.key} onClick={() => navTo(item.key)}
                                    className="flex flex-col items-center gap-1 py-1 px-3 transition-all active:scale-95">
                                    {isHomePage
                                        ? <div className="w-12 h-12 rounded-full bg-[#2563eb] flex items-center justify-center shadow-[0_4px_20px_rgba(37,99,235,0.45)]">
                                            <Icon size={20} className="text-white" />
                                          </div>
                                        : <>
                                            <Icon size={20} className={isActive ? 'text-white' : 'text-slate-600'} />
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-slate-300' : 'text-slate-600'}`}>{item.label}</span>
                                          </>
                                    }
                                </button>
                            );
                        })}
                    </div>
                </nav>
            )}
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

function EmptyState({ label }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <Clock size={40} className="mb-4 text-gray-600" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{label}</p>
        </div>
    );
}

function TripCard({ trip, status }) {
    const isCancelled = status === 'cancelled';
    const isFailed = isCancelled;
    const borderColor = isFailed
        ? 'border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
        : 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]';

    const dateStr = trip.scheduled_pickup_time
        ? new Date(trip.scheduled_pickup_time).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        : '—';

    const price = trip.fare_final ?? trip.fare_estimate;

    return (
        <div className={`bg-slate-900/40 border ${borderColor} rounded-2xl p-4 relative overflow-hidden`}>
            {isCancelled && (
                <div className="bg-rose-500 text-white text-[10px] font-bold py-1 px-3 absolute top-0 text-center w-full left-0">
                    {trip.status === 'no_show_confirmed' ? 'No Show' : 'Cancelled'}
                </div>
            )}

            <div className={`flex justify-between items-start mb-4 ${isFailed ? 'mt-4' : ''}`}>
                <p className="text-slate-400 text-xs">{dateStr}</p>
                <p className="text-[10px] text-slate-600">{trip.booking_reference || `#${trip.id}`}</p>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
                {trip.flight_number && (
                    <div className="bg-slate-800 px-2 py-1 rounded text-slate-300 text-xs flex items-center gap-1">
                        <Plane size={12} /> {trip.flight_number}
                    </div>
                )}
                <div className="bg-slate-800 px-2 py-1 rounded text-slate-300 text-xs flex items-center gap-1">
                    <User size={12} /> {trip.passenger_count ?? 1}
                </div>
                {trip.luggage_count > 0 && (
                    <div className="bg-slate-800 px-2 py-1 rounded text-slate-300 text-xs flex items-center gap-1">
                        <Briefcase size={12} /> {trip.luggage_count}
                    </div>
                )}
            </div>

            <div className="relative pl-4 space-y-4">
                <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-slate-800">
                    <div className={`absolute top-0 -left-[1px] w-1 h-1 rounded-full ${isCancelled ? 'bg-rose-500' : 'bg-red-400'}`} />
                    <div className={`absolute bottom-0 -left-[1px] w-1 h-1 rounded-full ${isCancelled ? 'bg-rose-500' : 'bg-green-400'}`} />
                </div>
                <p className="text-xs font-medium text-slate-300 truncate">{trip.pickup_address}</p>
                <p className="text-xs font-medium text-slate-300 truncate">{trip.dropoff_address}</p>
            </div>

            {!isCancelled && price != null && (
                <div className="bg-emerald-500 text-white font-bold text-sm px-3 py-1 rounded absolute top-4 right-4">
                    € {parseFloat(price).toFixed(1)}
                </div>
            )}
        </div>
    );
}

function ShuttleCard({ trip }) {
    const dateStr = trip.scheduled_pickup_time
        ? new Date(trip.scheduled_pickup_time).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        : '—';

    const price = trip.fare_final ?? trip.fare_estimate;

    return (
        <div className="bg-[#b45309] rounded-2xl p-0 overflow-hidden relative">
            <div className="bg-amber-600/20 p-3 flex justify-between items-center">
                <span className="font-bold text-white text-sm truncate">{trip.pickup_address}</span>
                <Plane className="text-white shrink-0 ml-2" size={16} />
            </div>
            <div className="bg-white p-3">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-slate-400 text-xs">{dateStr}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{trip.booking_reference || `#${trip.id}`}</p>
                </div>
                <div className="flex justify-between items-end">
                    <div className="flex gap-2">
                        <div className="bg-slate-100 px-2 py-1 rounded text-slate-500 text-xs flex items-center gap-1">
                            <User size={12} /> {trip.passenger_count ?? 1}
                        </div>
                        {trip.luggage_count > 0 && (
                            <div className="bg-slate-100 px-2 py-1 rounded text-slate-500 text-xs flex items-center gap-1">
                                <Briefcase size={12} /> {trip.luggage_count}
                            </div>
                        )}
                    </div>
                    {price != null && (
                        <div className="bg-[#65d01e] text-white font-bold text-sm px-3 py-1 rounded">
                            € {parseFloat(price).toFixed(1)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

