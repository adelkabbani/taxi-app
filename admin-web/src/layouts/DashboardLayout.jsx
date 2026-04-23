import { Fragment, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Dialog, Transition } from '@headlessui/react'
import {
    Home,
    Map,
    Users,
    Calendar,
    Menu,
    X,
    LogOut,
    Bell,
    Shield,
    FileText,
    TrendingUp,
    Zap,
    Briefcase,
    Receipt,
    Sun,
    Moon,
    MonitorPlay
} from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from 'react-hot-toast'
import api from '../lib/api'

const navigation = [
    { name: 'Dashboard',    href: '/dashboard',   icon: Home },
    { name: 'Live Map',     href: '/live-map',    icon: Map },
    { name: 'Analytics',    href: '/analytics',   icon: TrendingUp },
    { name: 'Bookings',     href: '/bookings',    icon: Calendar },
    { name: 'Drivers',      href: '/drivers',     icon: Users },
    { name: 'Documents',    href: '/documents',   icon: FileText, adminOnly: true },
    { name: 'Fleet Mgmt',   href: '/tenants',     icon: Briefcase, adminOnly: true },
    { name: 'B2B Pricing',  href: '/pricing',     icon: Zap },
    { name: 'Invoices',     href: '/invoices',    icon: Receipt, adminOnly: true },
    { name: 'Media Manager', href: '/tablet-ads', icon: MonitorPlay, adminOnly: true },
]

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [notifOpen, setNotifOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const notifRef = useRef(null)
    const navigate = useNavigate()
    const location = useLocation()
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') !== 'light'
        }
        return true
    })

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }, [isDark])

    const user = JSON.parse(localStorage.getItem('user') || '{}')

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications?limit=15')
            setNotifications(res.data.data)
            setUnreadCount(res.data.unreadCount)
        } catch (_) {}
    }

    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handleClick = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const markAllRead = async () => {
        try {
            await api.patch('/notifications/read-all')
            setUnreadCount(0)
            setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
        } catch (_) {}
    }

    const markRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (_) {}
    }

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout', { userId: user.id });
        } catch (error) {
            console.error('Logout error', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            toast.success('Logged out successfully');
            navigate('/login');
        }
    };

    return (
        <div className="h-screen flex overflow-hidden bg-[#e8eef8] dark:bg-ink-black-950 text-ink-black-950 dark:text-slate-100 transition-colors duration-300">
            {/* Mobile sidebar */}
            <Transition.Root show={sidebarOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
                    <Transition.Child
                        as={Fragment}
                        enter="transition-opacity ease-linear duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition-opacity ease-linear duration-300"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-ink-black-950/80 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 flex">
                        <Transition.Child
                            as={Fragment}
                            enter="transition ease-in-out duration-300 transform"
                            enterFrom="-translate-x-full"
                            enterTo="translate-x-0"
                            leave="transition ease-in-out duration-300 transform"
                            leaveFrom="translate-x-0"
                            leaveTo="-translate-x-full"
                        >
                            <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                                <div className="absolute top-0 left-full flex w-16 justify-center pt-5">
                                    <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                                        <X className="h-6 w-6 text-white" />
                                    </button>
                                </div>
                                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[#001d3d] dark:bg-ink-black-900 px-6 pb-4 border-r border-[#002d55] dark:border-white/5 transition-colors">
                                    <div className="flex h-24 shrink-0 items-center justify-center">
                                        <motion.img
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ 
                                                scale: [1, 1.05, 1],
                                                opacity: 1,
                                                filter: ['drop-shadow(0 0 0px rgba(14,165,233,0))', 'drop-shadow(0 0 10px rgba(14,165,233,0.5))', 'drop-shadow(0 0 0px rgba(14,165,233,0))']
                                            }}
                                            whileHover={{ scale: 1.1, filter: 'drop-shadow(0 0 20px rgba(14,165,233,0.6))' }}
                                            transition={{ 
                                                duration: 4, 
                                                repeat: Infinity,
                                                repeatType: "reverse",
                                                ease: "easeInOut"
                                            }}
                                            src="/logo.png"
                                            alt="DriveZFlight"
                                            className="h-16 w-auto cursor-pointer"
                                        />
                                    </div>
                                    <nav className="flex flex-1 flex-col">
                                        <ul role="list" className="flex flex-1 flex-col gap-y-7">
                                            <li>
                                                <ul role="list" className="-mx-2 space-y-1">
                                                    {navigation
                                                        .filter(item => !item.adminOnly || user.role === 'admin')
                                                        .map((item) => (
                                                            <li key={item.name}>
                                                                <NavLink
                                                                    to={item.href}
                                                                    className={({ isActive }) =>
                                                                        cn(
                                                                            isActive
                                                                                ? 'bg-gold-500/15 text-gold-400 border-r-2 border-gold-400'
                                                                                : 'text-white/60 dark:text-gray-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/5',
                                                                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all'
                                                                        )
                                                                    }
                                                                >
                                                                    <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                                                    {item.name}
                                                                </NavLink>
                                                            </li>
                                                        ))}
                                                </ul>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition.Root>

            {/* Static sidebar for desktop (Auto-Hide) */}
            <div className="hidden lg:flex fixed inset-y-0 left-0 z-50 group pointer-events-none hover:pointer-events-auto">
                {/* Hover Trigger Strip */}
                <div className="absolute inset-y-0 left-0 w-4 bg-transparent pointer-events-auto" />

                {/* Sidebar Content */}
                <div className="flex w-72 flex-col -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out shadow-xl h-full pointer-events-auto">
                    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[#001d3d] dark:bg-ink-black-900/95 backdrop-blur-xl px-6 pb-4 border-r border-[#002d55] dark:border-white/5 transition-colors sidebar-light-gradient">
                        <div className="flex h-24 shrink-0 items-center justify-center py-4">
                            <motion.img
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ 
                                    scale: [1, 1.03, 1],
                                    opacity: 1,
                                    filter: ['drop-shadow(0 0 5px rgba(14,165,233,0.2))', 'drop-shadow(0 0 20px rgba(14,165,233,0.5))', 'drop-shadow(0 0 5px rgba(14,165,233,0.2))']
                                }}
                                whileHover={{ scale: 1.05, filter: 'drop-shadow(0 0 30px rgba(14,165,233,0.7))' }}
                                transition={{ 
                                    scale: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                                    filter: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                                    duration: 1
                                }}
                                src="/logo.png"
                                alt="DriveZFlight"
                                className="h-20 w-auto cursor-pointer"
                            />
                        </div>
                        <nav className="flex flex-1 flex-col">
                            <ul role="list" className="flex flex-1 flex-col gap-y-7">
                                <li>
                                    <ul role="list" className="-mx-2 space-y-1">
                                        {navigation
                                            .filter(item => !item.adminOnly || user.role === 'admin')
                                            .map((item) => (
                                                <li key={item.name}>
                                                    <NavLink
                                                        to={item.href}
                                                        className={({ isActive }) =>
                                                            cn(
                                                                isActive
                                                                    ? 'bg-gold-500/15 text-gold-400 border-r-2 border-gold-400'
                                                                    : 'text-white/60 dark:text-gray-400 hover:text-white dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/5',
                                                                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all'
                                                            )
                                                        }
                                                    >
                                                        <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                                        {item.name}
                                                    </NavLink>
                                                </li>
                                            ))}
                                    </ul>
                                </li>
                                <li className="mt-auto">
                                    <div className="flex items-center gap-x-4 py-3 text-sm font-semibold leading-6 text-white dark:text-white bg-white/10 dark:bg-white/5 border border-white/15 dark:border-white/10 rounded-xl p-3">
                                        <div className="h-8 w-8 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-xs text-gold-400 font-black">
                                            {user.firstName?.[0]}{user.lastName?.[0]}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="sr-only">Your profile</span>
                                            <span aria-hidden="true">{user.firstName} {user.lastName}</span>
                                            <span className="text-xs text-white/50 dark:text-slate-400 font-normal">{user.role}</span>
                                        </div>
                                        <button onClick={handleLogout} className="ml-auto text-white/50 hover:text-gold-400 transition-colors">
                                            <LogOut className="h-5 w-5" />
                                        </button>
                                    </div>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>

            <div className="w-full flex flex-col h-full overflow-hidden">
                {/* Impersonation Banner */}
                {localStorage.getItem('tenantOverride') && (
                    <div className="bg-amber-500 text-white px-6 py-2 flex justify-between items-center text-sm font-bold animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            YOU ARE VIEWING: {localStorage.getItem('tenantOverrideName')} (Console)
                        </div>
                        <button
                            onClick={() => {
                                localStorage.removeItem('tenantOverride');
                                localStorage.removeItem('tenantOverrideName');
                                window.location.reload();
                            }}
                            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all"
                        >
                            Exit Console
                        </button>
                    </div>
                )}

                <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-regal-navy/10 dark:border-white/5 bg-white/92 dark:bg-ink-black-900/80 backdrop-blur-md px-4 shadow-[0_1px_0_0_rgba(0,53,102,0.08),0_2px_20px_0_rgba(0,29,61,0.07)] dark:shadow-2xl sm:gap-x-6 sm:px-6 lg:px-8 transition-colors">
                    <button
                        type="button"
                        className="-m-2.5 p-2.5 text-gray-400 lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <span className="sr-only">Open sidebar</span>
                        <Menu className="h-6 w-6" aria-hidden="true" />
                    </button>

                    <div className="h-6 w-px bg-white/5 lg:hidden" aria-hidden="true" />

                    <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                        <div className="flex flex-1"></div>
                        <div className="flex items-center gap-x-4 lg:gap-x-6">
                            {/* Theme Toggle */}
                            <button
                                onClick={() => setIsDark(!isDark)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-regal-navy/15 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:text-gold-500 hover:border-gold-500/50 transition-all shadow-sm active:scale-95 group"
                                title="Toggle Theme"
                            >
                                {isDark ? (
                                    <>
                                        <Sun className="h-4 w-4 transition-transform group-hover:rotate-12" />
                                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Light</span>
                                    </>
                                ) : (
                                    <>
                                        <Moon className="h-4 w-4 transition-transform group-hover:-rotate-12" />
                                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Dark</span>
                                    </>
                                )}
                            </button>
                            <div className="relative" ref={notifRef}>
                                <button
                                    type="button"
                                    onClick={() => { setNotifOpen(o => !o); if (!notifOpen) fetchNotifications(); }}
                                    className="-m-2.5 p-2.5 text-gray-400 hover:text-gold-400 transition-colors relative"
                                >
                                    <span className="sr-only">View notifications</span>
                                    <Bell className="h-6 w-6" aria-hidden="true" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-gold-500 text-ink-black-950 text-[9px] font-black rounded-full flex items-center justify-center shadow-lg shadow-gold-500/20">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {notifOpen && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-ink-black-900 border border-regal-navy/12 dark:border-white/10 rounded-2xl shadow-[0_8px_40px_rgba(0,29,61,0.14)] dark:shadow-2xl z-50 overflow-hidden transition-colors">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-regal-navy/8 dark:border-white/5">
                                            <span className="text-sm font-black text-ink-black-800 dark:text-white uppercase tracking-widest">Notifications</span>
                                            {unreadCount > 0 && (
                                                <button onClick={markAllRead} className="text-xs text-gold-400 hover:text-gold-300 font-semibold transition-colors">
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-96 overflow-y-auto divide-y divide-regal-navy/6 dark:divide-white/5">
                                            {notifications.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                                                    <Bell className="w-8 h-8 mb-2 opacity-30" />
                                                    <p className="text-xs">No notifications</p>
                                                </div>
                                            ) : notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => markRead(n.id)}
                                                    className={`px-4 py-3 cursor-pointer hover:bg-regal-navy/5 dark:hover:bg-white/5 transition-colors ${!n.read_at ? 'bg-gold-500/5' : ''}`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        {!n.read_at && <div className="w-2 h-2 rounded-full bg-gold-500 shrink-0 mt-2" />}
                                                        <div className={!n.read_at ? '' : 'pl-4'}>
                                                            <p className="text-sm font-black text-ink-black-800 dark:text-white leading-tight">{n.title || 'Notification'}</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-2 font-bold uppercase tracking-widest">
                                                                {new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <main className={`flex-1 bg-[#e8eef8] dark:bg-ink-black-950 transition-colors duration-300 ${location.pathname === '/live-map'
                    ? 'overflow-hidden p-0'
                    : 'overflow-auto p-4 sm:p-6 lg:p-8'
                    }`}>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
