'use client';

import { useSheetStore } from '@/store/sheetStore';
import { cn } from '@/lib/utils/cn';
import { Cloud, CloudOff, Loader2, Check } from 'lucide-react';
import type { SaveState } from '@/store/sheetStore';

interface ConfigItem {
  label: string;
  className: string;
  icon: 'cloud' | 'loader' | 'check' | 'cloudoff';
}

const CONFIG: Record<SaveState, ConfigItem> = {
  idle: {
    label: 'All changes saved',
    icon: 'cloud',
    className: 'text-gray-400',
  },
  saving: {
    label: 'Saving...',
    icon: 'loader',
    className: 'text-blue-500',
  },
  saved: {
    label: 'Saved',
    icon: 'check',
    className: 'text-green-500',
  },
  error: {
    label: 'Save failed',
    icon: 'cloudoff',
    className: 'text-red-500',
  },
};

function Icon({ type }: { type: ConfigItem['icon'] }) {
  if (type === 'loader') return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  if (type === 'check') return <Check className="h-3.5 w-3.5" />;
  if (type === 'cloudoff') return <CloudOff className="h-3.5 w-3.5" />;
  return <Cloud className="h-3.5 w-3.5" />;
}

export function SaveIndicator() {
  const saveState = useSheetStore((s) => s.saveState);
  const config = CONFIG[saveState];

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium transition-all duration-300',
        config.className
      )}
    >
      <Icon type={config.icon} />
      <span>{config.label}</span>
    </div>
  );
}