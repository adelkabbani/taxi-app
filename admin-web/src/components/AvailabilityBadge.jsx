import React from 'react';

const AvailabilityBadge = ({ availability }) => {
  const getStatusStyles = () => {
    switch (availability?.toLowerCase()) {
      case 'available':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'busy':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'on_break':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'offline':
        return 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20';
    }
  };

  const getStatusLabel = () => {
    switch (availability?.toLowerCase()) {
      case 'available':
        return 'BOOKABLE';
      case 'busy':
        return 'CONFLICT';
      case 'on_break':
        return 'On Break';
      case 'offline':
        return 'Offline';
      default:
        return availability || 'Unknown';
    }
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyles()}`}>
      {getStatusLabel()}
    </span>
  );
};

export default AvailabilityBadge;
