import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Bookings from './pages/Bookings'
import BookingDetails from './pages/BookingDetails'
import Drivers from './pages/Drivers'
import Tenants from './pages/Tenants'
import TenantDetails from './pages/TenantDetails'
import LiveMap from './pages/LiveMap'
import Analytics from './pages/Analytics'
import Documents from './pages/Documents'

// Placeholder for protected route logic
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route path="/" element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="live-map" element={<LiveMap />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="bookings" element={<Bookings />} />
                    <Route path="bookings/:id" element={<BookingDetails />} />
                    <Route path="drivers" element={<Drivers />} />
                    <Route path="documents" element={<Documents />} />
                    <Route path="tenants" element={<Tenants />} />
                    <Route path="tenants/:id" element={<TenantDetails />} />
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
