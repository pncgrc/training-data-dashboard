'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Sport } from '@/lib/helpers/sports';
import { sportColor } from '@/lib/helpers/theme';

interface LeafletMapProps {
  points: [lat: number, lon: number][];
  sport: Sport;
  className?: string;
}

// OpenStreetMap tiles with the route drawn in the sport color.
export default function LeafletMap({ points, sport, className }: LeafletMapProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    const line = L.polyline(points, { color: sportColor(sport), weight: 3 }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [16, 16] });
    return () => { map.remove(); };
  }, [points, sport]);

  return <div ref={container} className={className} />;
}
