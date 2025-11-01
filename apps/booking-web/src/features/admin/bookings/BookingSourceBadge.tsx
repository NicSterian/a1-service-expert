import React from 'react';

interface BookingSourceBadgeProps {
  source: 'ONLINE' | 'MANUAL';
  className?: string;
}

export function BookingSourceBadge({ source, className = '' }: BookingSourceBadgeProps) {
  if (source === 'ONLINE') {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${className} bg-green-500/20 text-green-300 border-green-500/30`}
      >
        ONLINE BOOKING
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${className} bg-blue-500/20 text-blue-300 border-blue-500/30`}
    >
      LOCAL BOOKING
    </span>
  );
}
