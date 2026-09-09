'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocationCoordinates, DriverInfo } from '@/types';

// Ícones Customizados Leaflet
const createPassengerIcon = () =>
  L.divIcon({
    className: 'custom-passenger-pin',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping"></div>
        <div class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-white text-[12px] font-black">
          ●
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const createDestinationIcon = () =>
  L.divIcon({
    className: 'custom-destination-pin',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-8 h-8 rounded-full bg-amber-500 border-2 border-dark-900 shadow-xl flex items-center justify-center text-dark-950 font-black text-xs">
          🏁
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const createCarIcon = (isAssigned = false) =>
  L.divIcon({
    className: 'custom-car-pin',
    html: `
      <div class="relative flex items-center justify-center ${isAssigned ? 'scale-125 transition-transform' : ''}">
        <div class="w-8 h-8 rounded-2xl ${isAssigned ? 'bg-brand text-dark-950 border-2 border-dark-900 shadow-2xl' : 'bg-slate-900 text-brand border border-slate-700 shadow-md'} flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C1.4 11.2 1 12 1 13v3c0 .6.4 1 1 1h2c0 1.7 1.3 3 3 3s3-1.3 3-3h4c0 1.7 1.3 3 3 3s3-1.3 3-3zM7 18.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm10 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM6.5 10l1-2h4.5l1.5 2H6.5z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

function MapController({
  origin,
  destination,
  routeCoordinates,
  driverLocation
}: {
  origin: LocationCoordinates | null;
  destination: LocationCoordinates | null;
  routeCoordinates?: Array<[number, number]>;
  driverLocation?: LocationCoordinates | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 1) {
      const bounds = L.latLngBounds(routeCoordinates);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else if (origin && destination) {
      const bounds = L.latLngBounds([
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude]
      ]);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
    } else if (origin) {
      map.setView([origin.latitude, origin.longitude], 15, { animate: true });
    }
  }, [origin, destination, routeCoordinates, map]);

  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (coords: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    }
  });
  return null;
}

interface PassengerMapProps {
  origin: LocationCoordinates | null;
  destination: LocationCoordinates | null;
  routeCoordinates?: Array<[number, number]>;
  driver?: DriverInfo | null;
  nearbyDrivers?: Array<{ id: string; latitude: number; longitude: number }>;
  onMapClick?: (coords: [number, number]) => void;
  className?: string;
}

export default function PassengerMap({
  origin,
  destination,
  routeCoordinates = [],
  driver,
  nearbyDrivers = [],
  onMapClick,
  className = 'w-full h-full'
}: PassengerMapProps) {
  // Posição inicial: Manaus - Adrianópolis
  const defaultCenter: [number, number] = [-3.1037, -60.0125];
  const center: [number, number] = origin
    ? [origin.latitude, origin.longitude]
    : defaultCenter;

  const passengerIcon = useMemo(() => createPassengerIcon(), []);
  const destinationIcon = useMemo(() => createDestinationIcon(), []);
  const assignedCarIcon = useMemo(() => createCarIcon(true), []);
  const roamingCarIcon = useMemo(() => createCarIcon(false), []);

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={center}
        zoom={15}
        zoomControl={false}
        className="w-full h-full min-h-[300px]"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <MapController
          origin={origin}
          destination={destination}
          routeCoordinates={routeCoordinates}
          driverLocation={driver?.current_location}
        />

        <MapClickHandler onMapClick={onMapClick} />

        {/* Linha da Rota */}
        {routeCoordinates.length > 0 && (
          <>
            <Polyline
              positions={routeCoordinates}
              pathOptions={{ color: '#0B1224', weight: 6, opacity: 0.8 }}
            />
            <Polyline
              positions={routeCoordinates}
              pathOptions={{ color: '#FFC800', weight: 4, opacity: 1 }}
            />
          </>
        )}

        {/* Marcador de Origem / Ponto de Embarque */}
        {origin && (
          <Marker
            position={[origin.latitude, origin.longitude]}
            icon={passengerIcon}
          />
        )}

        {/* Marcador de Destino */}
        {destination && (
          <Marker
            position={[destination.latitude, destination.longitude]}
            icon={destinationIcon}
          />
        )}

        {/* Marcador do Motorista Designado */}
        {driver?.current_location && (
          <Marker
            position={[driver.current_location.latitude, driver.current_location.longitude]}
            icon={assignedCarIcon}
          />
        )}

        {/* Marcadores de Motoristas Próximos Disponíveis (Radar Visual) */}
        {!driver &&
          nearbyDrivers.map((d) => (
            <Marker
              key={d.id}
              position={[d.latitude, d.longitude]}
              icon={roamingCarIcon}
            />
          ))}
      </MapContainer>
    </div>
  );
}
