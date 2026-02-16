import { Fragment, useState } from 'react'
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
    Settings,
    Briefcase,
    Shield,
    FileText,
    TrendingUp
} from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from 'react-hot-toast'
import api from '../lib/api'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Live Map', href: '/live-map', icon: Map },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp },
    { name: 'Bookings', href: '/bookings', icon: Calendar },
    { name: 'Drivers', href: '/drivers', icon: Users },
    { name: 'Documents', href: '/documents', icon: FileText, adminOnly: true },
    { name: 'Fleet Mgmt', href: '/tenants', icon: Briefcase, adminOnly: true },
]

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    const user = JSON.parse(localStorage.getItem('user') || '{}')

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
        <div className="h-screen flex overflow-hidden bg-slate-50 dark:bg-dark-bg">
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
                        <div className="fixed inset-0 bg-slate-900/80" />
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
                                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900 px-6 pb-4 ring-1 ring-white/10">
                                    <div className="flex h-16 shrink-0 items-center">
                                        <span className="text-xl font-bold text-sky-500">Taxi Dispatch</span>
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
                                                                                ? 'bg-sky-500 text-white'
                                                                                : 'text-slate-400 hover:text-white hover:bg-slate-800',
                                                                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
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
                <div className="flex w-72 flex-col -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out shadow-2xl h-full pointer-events-auto">
                    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900 px-6 pb-4 border-r border-slate-800">
                        <div className="flex h-16 shrink-0 items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold text-lg">T</div>
                            <span className="text-xl font-bold text-white">Taxi Dispatch</span>
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
                                                                    ? 'bg-sky-600 text-white'
                                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800',
                                                                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors'
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
                                    <div className="flex items-center gap-x-4 py-3 text-sm font-semibold leading-6 text-white bg-slate-800 rounded-lg p-3">
                                        <div className="h-8 w-8 rounded-full bg-sky-500 flex items-center justify-center text-xs">
                                            {user.firstName?.[0]}{user.lastName?.[0]}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="sr-only">Your profile</span>
                                            <span aria-hidden="true">{user.firstName} {user.lastName}</span>
                                            <span className="text-xs text-slate-400 font-normal">{user.role}</span>
                                        </div>
                                        <button onClick={handleLogout} className="ml-auto text-slate-400 hover:text-white">
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

                <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        className="-m-2.5 p-2.5 text-slate-700 lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <span className="sr-only">Open sidebar</span>
                        <Menu className="h-6 w-6" aria-hidden="true" />
                    </button>

                    <div className="h-6 w-px bg-slate-200 lg:hidden" aria-hidden="true" />

                    <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                        <div className="flex flex-1"></div>
                        <div className="flex items-center gap-x-4 lg:gap-x-6">
                            <button type="button" className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-500">
                                <span className="sr-only">View notifications</span>
                                <Bell className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>

                <main className="flex-1 overflow-auto bg-slate-50 dark:bg-dark-bg p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
