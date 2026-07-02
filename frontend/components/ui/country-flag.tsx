'use client';

import * as flags from 'country-flag-icons/react/3x2';

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code, e.g. "CN", "HK", "SG". */
  country: string;
  className?: string;
}

/**
 * Renders an SVG country flag from its ISO 2-letter code.
 * SVG-based so it renders consistently across platforms (Windows emoji
 * flags don't render). Falls back to a globe glyph for unknown codes.
 */
export function CountryFlag({ country, className }: CountryFlagProps) {
  const Flag = flags[country?.toUpperCase() as keyof typeof flags];
  if (!Flag) {
    return (
      <span className={className} role="img" aria-label="Unknown region">
        🌐
      </span>
    );
  }
  return (
    <Flag
      className={className || 'w-6 h-4 rounded-sm shadow-sm'}
      title={country}
      aria-label={country}
    />
  );
}
