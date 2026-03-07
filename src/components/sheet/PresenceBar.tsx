'use client';

import { useState } from 'react';
import type { PresenceUser } from '@/types/presence';

interface PresenceBarProps {
  users: PresenceUser[];
  currentUserId: string;
}

const MAX_VISIBLE = 5;

export function PresenceBar({ users, currentUserId }: PresenceBarProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Current user first, then others
  const sorted = [
    ...users.filter((u) => u.uid === currentUserId),
    ...users.filter((u) => u.uid !== currentUserId),
  ];

  const visible = sorted.slice(0, MAX_VISIBLE);
  const overflow = sorted.length - MAX_VISIBLE;

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {/* Online indicator */}
      <div className="flex items-center gap-1.5 mr-2">
        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-gray-400">
          {users.length} online
        </span>
      </div>

      {/* Avatars */}
      <div className="flex items-center -space-x-2">
        {visible.map((user) => (
          <div
            key={user.uid}
            className="relative"
            onMouseEnter={() => setShowTooltip(user.uid)}
            onMouseLeave={() => setShowTooltip(null)}
          >
            {/* Avatar */}
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white cursor-default transition-transform hover:scale-110 hover:z-10 relative"
              style={{ backgroundColor: user.color }}
            >
              {user.displayName.charAt(0).toUpperCase()}

              {/* You badge */}
              {user.uid === currentUserId && (
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-1 ring-white" />
              )}
            </div>

            {/* Tooltip */}
            {showTooltip === user.uid && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg z-50">
                {user.displayName}
                {user.uid === currentUserId && ' (you)'}
                {user.activeCellId && (
                  <span className="ml-1 text-gray-400">
                    · {user.activeCellId}
                  </span>
                )}
                {/* Tooltip arrow */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
              </div>
            )}
          </div>
        ))}

        {/* Overflow badge */}
        {overflow > 0 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600 ring-2 ring-white">
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}