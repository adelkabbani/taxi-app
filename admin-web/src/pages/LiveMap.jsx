import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '../lib/socket';
import { Navigation, Users, MapPin, Clock, CreditCard } from 'lucide-react';
import api from '../lib/api';
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
        vehicleType: 'all'
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
                            status: 'assigned,arrived,started,waiting_started',
                            limit: 50
                        }
                    }),
                    api.get('/tenants')
                ]);

                // Process drivers
                const driverMap = {};
                driversRes.data.data.forEach(d => {
                    if (d.current_lat && d.current_lng) {
                        driverMap[d.id] = {
                            id: d.id,
                            name: `${d.first_name} ${d.last_name}`,
                            vehicle: d.vehicle_type,
                            plate: d.license_plate,
                            lat: d.current_lat,
                            lng: d.current_lng,
                            heading: d.heading || 0,
                            status: d.availability,
                            currentBookingId: d.current_booking_id,
                            updatedAt: d.location_updated_at,
                            tenantId: d.tenant_id, // Ensure this exists
                            companyName: d.company_name, // Ensure this exists from backend
                        };
                    }
                });
                setDrivers(driverMap);
                setTenants(tenantsRes.data.data);

                // ... rest of logic

                // Process bookings (only those with coords)
                const validBookings = bookingsRes.data.data.filter(
                    b => b.pickup_lat && b.pickup_lng
                );
                setActiveBookings(validBookings);

                // Center map if we have data
                if (validBookings.length > 0) {
                    setMapCenter([validBookings[0].pickup_lat, validBookings[0].pickup_lng]);
                } else if (Object.values(driverMap).length > 0) {
                    const first = Object.values(driverMap)[0];
                    setMapCenter([first.lat, first.lng]);
                }

            } catch (error) {
                console.error('Failed to fetch initial map data', error);
            }
        };

        fetchInitialData();
    }, []);

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;

        const handleLocationUpdate = (data) => {
            setDrivers(prev => ({
                ...prev,
                [data.driverId]: {
                    ...prev[data.driverId],
                    lat: data.lat,
                    lng: data.lng,
                    heading: data.heading,
                    updatedAt: data.timestamp
                }
            }));
        };

        const handleBookingUpdate = (data) => {
            // Refresh bookings on status change
            api.get('/bookings', {
                params: {
                    status: 'assigned,arrived,started,waiting_started',
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
            if (filters.vehicleType !== 'all' && d.vehicle.toLowerCase() !== filters.vehicleType.toLowerCase()) return false;
            return true;
        });
    }, [drivers, filters]);

    // Get active booking for selected driver
    const selectedBooking = useMemo(() => {
        if (!selectedDriver) return null;
        // Find booking where driver is assigned
        // In real app, driver object might have current_booking_id
        return activeBookings.find(b => b.driver_id === selectedDriver.id && ['assigned', 'arrived', 'started', 'waiting_started'].includes(b.status));
    }, [selectedDriver, activeBookings]);

    // Enrich drivers with detailed status for UI (Mock logic since API only returns available/busy)
    const enrichedDrivers = useMemo(() => {
        return Object.values(drivers).map(d => {
            // Stable random based on ID to keep status consistent across renders unless real status changes
            const seed = d.id.charCodeAt(0) + d.id.charCodeAt(d.id.length - 1);

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
    }, [drivers]);

    return (
        <div className="h-[calc(100vh-100px)] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 flex shadow-inner">

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
                            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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

                    {/* Render Drivers */}
                    {enrichedDrivers.map(driver => (
                        <Marker
                            key={driver.id}
                            position={[driver.lat, driver.lng]}
                            icon={selectedDriver?.id === driver.id ? activeDriverIcon : driverIcon}
                            eventHandlers={{
                                click: () => setSelectedDriver(driver),
                            }}
                        >
                            <Popup className="custom-popup">
                                <div className="p-3 min-w-[200px]">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-900">{driver.name}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${driver.status === 'available' ? 'bg-green-100 text-green-700' :
                                            driver.status === 'busy' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100'
                                            }`}>
                                            {driver.detailedStatus}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-600 space-y-1">
                                        <p className="flex items-center gap-2">
                                            <Navigation className="w-3 h-3" />
                                            {driver.vehicle} • {driver.plate}
                                        </p>
                                        <p className="text-xs text-slate-400">
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
                    <div className="absolute top-4 right-4 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 w-80">
                        <h4 className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase mb-2 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Current Job
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-500">Pickup</p>
                                    <p className="font-medium text-slate-900 dark:text-white line-clamp-1">{selectedBooking.pickup_address}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-500">Dropoff</p>
                                    <p className="font-medium text-slate-900 dark:text-white line-clamp-1">{selectedBooking.dropoff_address || 'Not specified'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1 border-t border-sky-200 dark:border-sky-800 mt-2">
                                <span className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded text-xs font-bold shadow-sm">
                                    {selectedBooking.status}
                                </span>
                                <span className="text-xs text-slate-500 ml-auto">id: {selectedBooking.booking_reference}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Draggable Pickup Marker Control (Demo) */}
                <div className="absolute bottom-6 left-6 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-4">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Dispatcher Tools</p>
                    <button className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all">
                        <MapPin className="w-4 h-4" />
                        Set Pickup Location
                    </button>
                </div>
            </div>

            {/* Right Sidebar (Auto-Hide) */}
            <div className="fixed inset-y-0 right-0 z-[500] pointer-events-none group hover:pointer-events-auto flex items-stretch">
                {/* Trigger Strip - Invisible area to catch hover */}
                <div className="w-4 h-full bg-transparent pointer-events-auto cursor-w-resize" />

                {/* Sidebar Content */}
                <div className="h-full translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out shadow-2xl pointer-events-auto bg-slate-900 border-l border-slate-800">
                    <MapSidebar
                        drivers={enrichedDrivers}
                        tenants={tenants}
                        filters={filters}
                        setFilters={setFilters}
                        onSelectDriver={setSelectedDriver}
                        selectedDriverId={selectedDriver?.id}
                    />
                </div>
            </div>
        </div>
    );
}
