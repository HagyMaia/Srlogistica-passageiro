'use client';

import dynamic from 'next/dynamic';
import type { LocationCoordinates, DriverInfo } from '@/types';

export interface PassengerMapProps {
  origin: LocationCoordinates | null;
  destination: LocationCoordinates | null;
  liveGpsCoords?: { latitude: number; longitude: number; accuracy?: number | null } | null;
  routeCoordinates?: Array<[number, number]>;
  pickupRouteCoordinates?: Array<[number, number]>;
  tripStatus?: string;
  driver?: DriverInfo | null;
  nearbyDrivers?: Array<{ id: string; latitude: number; longitude: number }>;
  accuracy?: number | null;
  onMapClick?: (coords: [number, number]) => void;
  onOriginDragEnd?: (coords: [number, number]) => void;
  onDestinationDragEnd?: (coords: [number, number]) => void;
  onDragStart?: () => void;
  isPinDraggable?: boolean;
  isDestinationDraggable?: boolean;
  pinLabel?: string;
  focusRouteTrigger?: number;
  autoFollowOrigin?: boolean;
  className?: string;
}

const DynamicPassengerMap = dynamic(
  () => import('./PassengerMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-slate-100 dark:bg-dark-950/80 animate-pulse">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-brand border-t-transparent animate-spin" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Carregando mapa interativo...</span>
        </div>
      </div>
    )
  }
);

export function PassengerMapWrapper(props: PassengerMapProps) {
  return <DynamicPassengerMap {...props} />;
}
