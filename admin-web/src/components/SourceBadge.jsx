import React from 'react';

// Source configuration with unique colors and icons for each booking source
const sourceConfig = {
    'booking.com': {
        bg: 'bg-blue-600',
        text: 'text-white',
        label: 'Booking.com',
        icon: '🅱️'
    },
    'welcome': {
        bg: 'bg-orange-500',
        text: 'text-white',
        label: 'Welcome',
        icon: '👋'
    },
    'getyourguide': {
        bg: 'bg-red-500',
        text: 'text-white',
        label: 'GetYourGuide',
        icon: '🎫'
    },
    'viator': {
        bg: 'bg-green-600',
        text: 'text-white',
        label: 'Viator',
        icon: '🌍'
    },
    'hotel': {
        bg: 'bg-purple-600',
        text: 'text-white',
        label: 'Hotel',
        icon: '🏨'
    },
    'manual': {
        bg: 'bg-slate-600',
        text: 'text-white',
        label: 'Manual',
        icon: '✏️'
    },
    'api': {
        bg: 'bg-violet-600',
        text: 'text-white',
        label: 'API',
        icon: '🔗'
    },
    'partner': {
        bg: 'bg-emerald-600',
        text: 'text-white',
        label: 'Partner',
        icon: '🤝'
    },
    'phone': {
        bg: 'bg-amber-600',
        text: 'text-white',
        label: 'Phone',
        icon: '📞'
    },
    'app': {
        bg: 'bg-sky-600',
        text: 'text-white',
        label: 'App',
        icon: '📱'
    },
    'website': {
        bg: 'bg-indigo-600',
        text: 'text-white',
        label: 'Website',
        icon: '🌐'
    }
};

// Helper to detect source from partner name
const detectSourceFromPartnerName = (partnerName) => {
    const name = partnerName.toLowerCase();

    if (name.includes('booking')) return 'booking.com';
    if (name.includes('welcome')) return 'welcome';
    if (name.includes('getyourguide') || name.includes('gyg')) return 'getyourguide';
    if (name.includes('viator')) return 'viator';
    if (name.includes('hotel') || name.includes('ritz') || name.includes('adlon') || name.includes('marriott') || name.includes('hilton')) return 'hotel';

    return 'partner'; // Default for unknown partners
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
        displayName = sourceConfig[sourceKey]?.label || source;
    }

    const config = sourceConfig[sourceKey] || sourceConfig.manual;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} shadow-sm`}
            title={`Source: ${displayName}`}
        >
            <span className="text-sm">{config.icon}</span>
            <span className="truncate max-w-[180px] whitespace-nowrap">{displayName}</span>
        </span>
    );
};

export default SourceBadge;
