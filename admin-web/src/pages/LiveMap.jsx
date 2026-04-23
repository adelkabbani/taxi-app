import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '../lib/socket';
import { Navigation, Users, MapPin, Clock, CreditCard } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import MapControlPanel from '../components/MapControlPanel';
import MapSidebar from '../components/MapSidebar';

// Fix for Leaflet default icon issues
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
});

// Custom icons
const driverIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1995/1995956.png', // Yellow Taxi
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

const activeDriverIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1995/1995956.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    className: 'filter hue-rotate-180 brightness-125' // Just CSS filter for color change
});

const pickupIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3477/3477419.png', // Green pin
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

const dropoffIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/854/854878.png', // Red flag
    iconSize: [32, 32],
    iconAnchor: [4, 32],
    popupAnchor: [0, -32],
});

// Component to handle map center updates
function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 15, { duration: 1.5 });
        }
    }, [center, map]);
    return null;
}

export default function LiveMap() {
    const socket = useSocket();
    const [drivers, setDrivers] = useState({}); // Hash map by driverId
    const [activeBookings, setActiveBookings] = useState([]);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [mapCenter, setMapCenter] = useState([52.5200, 13.4050]); // Default: Berlin

    // UI State
    const [mapMode, setMapMode] = useState('street');
    const [showTraffic, setShowTraffic] = useState(false);
    const [filters, setFilters] = useState({
        showAvailable: true,
        showBusy: true,
        vehicleType: 'all',
        tenantId: localStorage.getItem('tenantOverride') || 'all'
    });

    const [tenants, setTenants] = useState([]);

    // Fetch initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [driversRes, bookingsRes, tenantsRes] = await Promise.all([
                    api.get('/drivers', { params: { limit: 100 } }),
                    api.get('/bookings', {
                        params: {
                            status: 'assigned,arrived,started,waiting_started,received',
                            limit: 50
                        }
                    }),
                    api.get('/tenants')
                ]);

                // Process drivers — safe array access regardless of API shape
                const rawDrivers = driversRes.data?.data || driversRes.data?.drivers || [];
                const driverMap = {};
                rawDrivers.forEach(d => {
                    const lat = parseFloat(d.current_lat);
                    const lng = parseFloat(d.current_lng);
                    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                        driverMap[String(d.id)] = {
                            id: String(d.id),
                            name: d.driver_name || `${d.first_name || ''} ${d.last_name || ''} `.trim() || 'Unknown Driver',
                            vehicle: d.vehicle_type || 'Unknown',
                            plate: d.license_plate || '',
                            lat,
                            lng,
                            heading: d.heading || 0,
                            status: d.availability || 'unavailable',
                            currentBookingId: d.current_booking_id,
                            updatedAt: d.location_updated_at,
                            tenantId: d.tenant_id,
                            companyName: d.company_name || '',
                        };
                    }
                });
                setDrivers(driverMap);

                // Safe tenant array access
                const rawTenants = tenantsRes.data?.data || tenantsRes.data?.tenants || [];
                setTenants(rawTenants);

                // Process bookings
                const rawBookings = bookingsRes.data?.data || bookingsRes.data?.bookings || [];
                const validBookings = rawBookings.filter(
                    b => b.pickup_lat && b.pickup_lng
                );
                setActiveBookings(validBookings);

                // Center map if we have data
                if (validBookings.length > 0) {
                    setMapCenter([parseFloat(validBookings[0].pickup_lat), parseFloat(validBookings[0].pickup_lng)]);
                } else if (Object.values(driverMap).length > 0) {
                    const first = Object.values(driverMap)[0];
                    setMapCenter([first.lat, first.lng]);
                }

            } catch (error) {
                if (error.response?.status === 401) {
                    toast.error('Session expired. Please log in again to see drivers.');
                } else {
                    console.error('Failed to fetch initial map data', error);
                }
            }
        };

        fetchInitialData();
    }, [filters.tenantId]);

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;

        const handleLocationUpdate = (data) => {
            if (!data.driverId || isNaN(parseFloat(data.lat)) || isNaN(parseFloat(data.lng))) return;
            setDrivers(prev => ({
                ...prev,
                [String(data.driverId)]: {
                    // Start with defaults and existing state
                    id: String(data.driverId),
                    name: 'Driver',
                    vehicle: 'Unknown',
                    plate: '',
                    status: 'available',
                    ...prev[String(data.driverId)],
                    // Override with new real-time data from socket
                    lat: parseFloat(data.lat),
                    lng: parseFloat(data.lng),
                    heading: data.heading || 0,
                    updatedAt: data.timestamp,
                    ...(data.name && { name: data.name }),
                    ...(data.vehicle && { vehicle: data.vehicle }),
                    ...(data.plate && { plate: data.plate }),
                    ...(data.tenantId && { tenantId: data.tenantId })
                }
            }));
        };

        const handleBookingUpdate = (data) => {
            // Refresh bookings on status change
            api.get('/bookings', {
                params: {
                    status: 'assigned,arrived,started,waiting_started,received',
                    limit: 50
                }
            }).then(res => {
                const validBookings = res.data.data.filter(b => b.pickup_lat && b.pickup_lng);
                setActiveBookings(validBookings);
            });
        };

        socket.on('driver_location', handleLocationUpdate);
        socket.on('booking_updated', handleBookingUpdate);
        socket.on('booking_created', handleBookingUpdate);

        return () => {
            socket.off('driver_location', handleLocationUpdate);
            socket.off('booking_updated', handleBookingUpdate);
            socket.off('booking_created', handleBookingUpdate);
        };
    }, [socket]);

    // Filter drivers
    const filteredDrivers = useMemo(() => {
        return Object.values(drivers).filter(d => {
            if (!filters.showAvailable && d.status === 'available') return false;
            if (!filters.showBusy && d.status !== 'available') return false;

            // Vehicle Type Filter (Safe check)
            if (filters.vehicleType && filters.vehicleType !== 'all') {
                if (!d.vehicle || d.vehicle.toLowerCase() !== filters.vehicleType.toLowerCase()) return false;
            }

            // Tenant Filter
            if (filters.tenantId && filters.tenantId !== 'all' && String(d.tenantId) !== String(filters.tenantId)) return false;

            return true;
        });
    }, [drivers, filters]);

    // Get active booking for selected driver
    const selectedBooking = useMemo(() => {
        if (!selectedDriver) return null;
        // Find booking where driver is assigned
        // In real app, driver object might have current_booking_id
        return activeBookings.find(b => b.driver_id === selectedDriver.id && ['assigned', 'arrived', 'started', 'waiting_started', 'received'].includes(b.status));
    }, [selectedDriver, activeBookings]);

    // Enriched Drivers (for UI/Map) - Derived from FILTERED drivers
    const enrichedDrivers = useMemo(() => {
        return filteredDrivers.map(d => {
            // Convert ID to string to prevent charCodeAt crashes on integers
            const idStr = String(d.id);
            const seed = idStr.charCodeAt(0) + idStr.charCodeAt(idStr.length - 1);

            let detailedStatus = 'Unavailable';
            if (d.status === 'available') {
                detailedStatus = seed % 10 === 0 ? 'Waiting for process' : 'Available';
            } else {
                // Map 'busy' to various active states
                const statuses = ['Dispatching', 'Driver on the way', 'Arrived and waiting', 'P.O.B', 'Dropped off'];
                const index = seed % statuses.length;
                detailedStatus = statuses[index];
            }

            return { ...d, detailedStatus };
        });
    }, [filteredDrivers]);

    return (
        <div className="h-full flex overflow-hidden bg-gray-50 dark:bg-ink-black-950 transition-colors duration-300">

            {/* Map Area */}
            <div className="flex-1 relative h-full">
                <MapControlPanel
                    mapMode={mapMode}
                    setMapMode={setMapMode}
                    showTraffic={showTraffic}
                    setShowTraffic={setShowTraffic}
                    filters={filters}
                    setFilters={setFilters}
                />

                <MapContainer
                    center={mapCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    {/* Base Layer */}
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url={mapMode === 'satellite'
                            ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        }
                    />

                    {/* Traffic Layer (Mock overlay or real if available) */}
                    {showTraffic && mapMode === 'street' && (
                        <TileLayer
                            url="https://tiles.radar.io/v1/traffic/{z}/{x}/{y}.png?publishableKey=prj_test_pk_..."
                            opacity={0.6}
                        />
                    )}

                    <MapUpdater center={selectedDriver ? [selectedDriver.lat, selectedDriver.lng] : null} />

                    {/* Render Active Trips (Polylines) */}
                    {selectedBooking && selectedBooking.dropoff_lat && (
                        <>
                            <Polyline
                                positions={[
                                    [selectedDriver.lat, selectedDriver.lng], // Driver
                                    [selectedBooking.pickup_lat, selectedBooking.pickup_lng], // Pickup
                                    [selectedBooking.dropoff_lat, selectedBooking.dropoff_lng] // Dropoff
                                ]}
                                color="#0ea5e9" // sky-500
                                weight={4}
                                opacity={0.7}
                                dashArray="10, 10"
                            />
                            <Marker position={[selectedBooking.pickup_lat, selectedBooking.pickup_lng]} icon={pickupIcon}>
                                <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent>
                                    Pickup: {selectedBooking.passenger_name}
                                </Tooltip>
                            </Marker>
                            <Marker position={[selectedBooking.dropoff_lat, selectedBooking.dropoff_lng]} icon={dropoffIcon}>
                                <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                                    Dropoff
                                </Tooltip>
                            </Marker>
                        </>
                    )}

                    {/* Render Drivers — only those with valid coords */}
                    {enrichedDrivers
                        .filter(driver => !isNaN(driver.lat) && !isNaN(driver.lng) && driver.lat && driver.lng)
                        .map(driver => (
                            <Marker
                                key={driver.id}
                                position={[driver.lat, driver.lng]}
                                icon={selectedDriver?.id === driver.id ? activeDriverIcon : driverIcon}
                                eventHandlers={{
                                    click: () => setSelectedDriver(driver),
                                }}
                            >
                                <Popup className="custom-popup">
                                    <div className="p-3 min-w-[200px] bg-white dark:bg-ink-black-900 border border-gray-200 dark:border-white/10 rounded-lg shadow-xl shadow-ink-black-950/20 dark:shadow-none transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-ink-black-950 dark:text-white transition-colors">{driver.name}</h3>
                                            <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full border transition-colors ${driver.status === 'available' 
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                                driver.status === 'busy' 
                                                ? 'bg-gold-500/10 text-gold-600 dark:text-gold-400 border-gold-500/20' 
                                                : 'bg-white/5 text-gray-500 dark:text-gray-400 border-white/10'
                                                }`}>
                                                {driver.detailedStatus}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1 transition-colors">
                                            <p className="flex items-center gap-2">
                                                <Navigation className="w-3 h-3 text-gold-500" />
                                                {driver.vehicle} • {driver.plate}
                                            </p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest transition-colors">
                                                Updated: {new Date(driver.updatedAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                </MapContainer>

                {/* Selected Booking Info (Floating Card) */}
                {selectedDriver && selectedBooking && (
                    <div className="absolute top-4 right-4 z-[400] bg-white/95 dark:bg-ink-black-900/80 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 w-84 transition-all">
                        <h4 className="text-[10px] font-black text-gold-600 dark:text-gold-400 uppercase tracking-widest mb-3 flex items-center gap-2 transition-colors">
                            <Clock className="w-3.5 h-3.5" />
                            Active Mission
                        </h4>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Pickup</p>
                                    <p className="text-sm font-bold text-ink-black-950 dark:text-white line-clamp-1">{selectedBooking.pickup_address}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Dropoff</p>
                                    <p className="text-sm font-bold text-ink-black-950 dark:text-white line-clamp-1">{selectedBooking.dropoff_address || 'Not specified'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-3 border-t border-white/5 mt-2">
                                <span className="px-2 py-0.5 bg-gold-500 text-ink-black-950 rounded text-[10px] font-black uppercase tracking-tight">
                                    {selectedBooking.status}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono ml-auto">REF: {selectedBooking.booking_reference}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Draggable Pickup Marker Control (Demo) */}
                <div className="absolute bottom-6 left-6 z-[400] bg-white/95 dark:bg-ink-black-900/80 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 animate-in slide-in-from-bottom-4 transition-all">
                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 transition-colors">Commander Tools</p>
                    <button className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-ink-black-950 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-gold-500/10 active:scale-95">
                        <MapPin className="w-4 h-4" />
                        Set Pickup Node
                    </button>
                </div>
            </div>

            {/* Right Sidebar (Self-Managing) */}
            <MapSidebar
                drivers={enrichedDrivers}
                tenants={tenants}
                filters={filters}
                setFilters={setFilters}
                onSelectDriver={setSelectedDriver}
                selectedDriverId={selectedDriver?.id}
            />
        </div>
    );
}
