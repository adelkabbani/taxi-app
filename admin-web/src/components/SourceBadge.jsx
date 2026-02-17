import React from 'react';
import { Globe, Smartphone, Phone, User, Calendar, Map, Briefcase, Box } from 'lucide-react';

// Source configuration with Nano Gold theme
const sourceConfig = {
    'booking.com': {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/20',
        icon: Globe,
        label: 'Booking.com'
    },
    'welcome': {
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
        border: 'border-orange-500/20',
        icon: Briefcase,
        label: 'Welcome Pickups'
    },
    'getyourguide': {
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/20',
        icon: Map,
        label: 'GetYourGuide'
    },
    'viator': {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/20',
        icon: Globe,
        label: 'Viator'
    },
    'hotel': {
        bg: 'bg-indigo-500/10',
        text: 'text-indigo-400',
        border: 'border-indigo-500/20',
        icon: Briefcase,
        label: 'Hotel Concierge'
    },
    'manual': {
        bg: 'bg-slate-500/10',
        text: 'text-slate-400',
        border: 'border-slate-500/20',
        icon: User,
        label: 'Manual Entry'
    },
    'api': {
        bg: 'bg-violet-500/10',
        text: 'text-violet-400',
        border: 'border-violet-500/20',
        icon: Box,
        label: 'External API'
    },
    'partner': {
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-400',
        border: 'border-cyan-500/20',
        icon: Briefcase,
        label: 'Partner Network'
    },
    'phone': {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/20',
        icon: Phone,
        label: 'Phone Booking'
    },
    'app': {
        bg: 'bg-sky-500/10',
        text: 'text-sky-400',
        border: 'border-sky-500/20',
        icon: Smartphone,
        label: 'Passenger App'
    },
    'website': {
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        border: 'border-purple-500/20',
        icon: Globe,
        label: 'Website'
    }
};

// Helper to detect source from partner name
const detectSourceFromPartnerName = (partnerName) => {
    if (!partnerName) return 'manual';
    const name = partnerName.toLowerCase();

    if (name.includes('booking')) return 'booking.com';
    if (name.includes('welcome')) return 'welcome';
    if (name.includes('getyourguide') || name.includes('gyg')) return 'getyourguide';
    if (name.includes('viator')) return 'viator';
    if (name.includes('hotel') || name.includes('ritz') || name.includes('adlon') || name.includes('marriott') || name.includes('hilton')) return 'hotel';

    return 'partner';
};

const SourceBadge = ({ source, partnerName }) => {
    // Determine the source type
    let sourceKey = 'manual';
    let displayName = 'Manual';

    if (partnerName) {
        sourceKey = detectSourceFromPartnerName(partnerName);
        displayName = partnerName;
    } else if (source) {
        sourceKey = source.toLowerCase();
        // displayName = sourceConfig[sourceKey]?.label || source;
        // Keep original source name if it's not a standard key, otherwise use label
        displayName = sourceConfig[sourceKey] ? sourceConfig[sourceKey].label : source;
    }

    const config = sourceConfig[sourceKey] || sourceConfig.manual;
    const Icon = config.icon || User;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border} shadow-sm backdrop-blur-sm`}
            title={`Source: ${displayName}`}
        >
            <Icon className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{displayName}</span>
        </span>
    );
};

export default SourceBadge;
