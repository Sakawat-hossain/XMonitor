'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Server } from '@/types/server';
import { CountryFlag } from '@/components/ui/country-flag';
import { StatusDot } from '@/components/shared/status-dot';

// Rough center coordinates per country code (enough for marker placement)
const COUNTRY_COORDS: Record<string, [number, number]> = {
  US: [39.8, -98.6], CN: [35.9, 104.2], HK: [22.3, 114.2], SG: [1.35, 103.8],
  JP: [36.2, 138.3], KR: [35.9, 127.8], TW: [23.7, 121.0], DE: [51.2, 10.4],
  GB: [54.0, -2.5], FR: [46.6, 2.2], NL: [52.1, 5.3], IN: [21.0, 78.0],
  BD: [23.7, 90.4], AU: [-25.3, 133.8], CA: [56.1, -106.3], RU: [61.5, 105.3],
  BR: [-14.2, -51.9],
};

export default function WorldMap({ servers }: { servers: Server[] }) {
  // Group servers by country
  const byCountry = servers.reduce<Record<string, Server[]>>((acc, s) => {
    (acc[s.country] ||= []).push(s);
    return acc;
  }, {});

  return (
    <MapContainer
      center={[25, 60]}
      zoom={2}
      minZoom={2}
      scrollWheelZoom
      className="h-[520px] w-full rounded-lg border z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {Object.entries(byCountry).map(([country, list]) => {
        const coords = COUNTRY_COORDS[country];
        if (!coords) return null;
        const online = list.filter((s) => s.status === 'online').length;
        const color =
          online === list.length ? '#10b981' : online > 0 ? '#f59e0b' : '#ef4444';
        return (
          <CircleMarker
            key={country}
            center={coords}
            radius={10 + Math.min(10, list.length * 2)}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.5, weight: 2 }}
          >
            <Popup>
              <div className="space-y-1 min-w-40">
                <p className="font-semibold flex items-center gap-1.5">
                  <CountryFlag country={country} className="w-5 h-3.5 rounded-[2px]" />
                  {country} — {list.length} server{list.length > 1 ? 's' : ''}
                </p>
                {list.map((s) => (
                  <span key={s.id} className="text-xs flex items-center justify-between gap-3">
                    <span>{s.name}</span>
                    <StatusDot status={s.status} />
                  </span>
                ))}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
