'use client';

import * as flags from 'country-flag-icons/react/3x2';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code, e.g. "CN", "HK", "SG". */
  country: string;
  className?: string;
}

/**
 * Renders an SVG country flag from its ISO 2-letter code.
 * SVG-based so it renders consistently across platforms (Windows emoji
 * flags don't render). Falls back to a lucide globe icon — never an emoji.
 */
export function CountryFlag({ country, className }: CountryFlagProps) {
  const Flag = flags[country?.toUpperCase() as keyof typeof flags];
  const cls = className || 'w-6 h-4 rounded-sm';

  if (!Flag) {
    return (
      <Globe
        className={cn('text-muted-foreground', cls)}
        aria-label="Unknown region"
      />
    );
  }
  return <Flag className={cls} title={country} aria-label={country} />;
}
