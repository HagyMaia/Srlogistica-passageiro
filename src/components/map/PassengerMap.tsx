'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocationCoordinates, DriverInfo } from '@/types';

// Alfinete Executivo de Embarque (Pickup Pin) com agulha de precisão e balão de endereço
const createPickupAlfineteIcon = (label?: string) =>
  L.divIcon({
    className: 'custom-pickup-alfinete',
    html: `
      <div style="position: relative; width: 140px; height: 90px; margin-left: -70px; margin-top: -90px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; pointer-events: none; user-select: none;">
        <!-- Balão com Nome do Local ou Dica de Arraste -->
        <div style="background: rgba(11, 18, 36, 0.96); color: #ffffff; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); border: 1.5px solid #10b981; margin-bottom: 6px; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; pointer-events: auto;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; display: inline-block; animation: pulse 1.5s infinite;"></span>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${label || 'Ponto de Embarque'}</span>
        </div>

        <!-- Cabeça do Alfinete Executivo -->
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 32px; height: 32px; border-radius: 10px 10px 10px 2px; transform: rotate(-45deg); background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: 2.5px solid #ffffff; box-shadow: 0 8px 18px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: #ffffff; transform: rotate(45deg); box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);"></div>
          </div>
        </div>

        <!-- Agulha Metálica do Alfinete apontando para o chão exato -->
        <div style="width: 2.5px; height: 16px; background: linear-gradient(to bottom, #059669, #0f172a); margin-top: -2px;"></div>
        
        <!-- Sombra no Chão (Ponto Zero do GPS) -->
        <div style="width: 8px; height: 4px; border-radius: 50%; background: rgba(0, 0, 0, 0.5); filter: blur(1px); margin-top: -1px;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });

// Alfinete de Destino (Flag)
const createDestinationIcon = () =>
  L.divIcon({
    className: 'custom-destination-pin',
    html: `
      <div style="position: relative; width: 120px; height: 80px; margin-left: -60px; margin-top: -80px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; pointer-events: none;">
        <div style="background: rgba(11, 18, 36, 0.95); color: #FFC800; padding: 3px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; border: 1.5px solid #FFC800; margin-bottom: 4px; box-shadow: 0 8px 20px rgba(0,0,0,0.4);">
          🏁 Destino
        </div>
        <div style="width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #FFC800 0%, #F59E0B 100%); border: 2.5px solid #0B1224; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; color: #0B1224; box-shadow: 0 6px 16px rgba(0,0,0,0.35);">
          🏁
        </div>
        <div style="width: 2px; height: 14px; background: #0B1224; margin-top: -1px;"></div>
        <div style="width: 6px; height: 3px; border-radius: 50%; background: rgba(0,0,0,0.5); filter: blur(1px);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
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
    iconAnchor: [16, 16]
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
      map.panTo([origin.latitude, origin.longitude], { animate: true, duration: 0.8 });
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

export interface PassengerMapProps {
  origin: LocationCoordinates | null;
  destination: LocationCoordinates | null;
  routeCoordinates?: Array<[number, number]>;
  driver?: DriverInfo | null;
  nearbyDrivers?: Array<{ id: string; latitude: number; longitude: number }>;
  accuracy?: number | null;
  onMapClick?: (coords: [number, number]) => void;
  onOriginDragEnd?: (coords: [number, number]) => void;
  isPinDraggable?: boolean;
  pinLabel?: string;
  className?: string;
}

export default function PassengerMap({
  origin,
  destination,
  routeCoordinates = [],
  driver,
  nearbyDrivers = [],
  accuracy,
  onMapClick,
  onOriginDragEnd,
  isPinDraggable = true,
  pinLabel,
  className = 'w-full h-full'
}: PassengerMapProps) {
  // Posição padrão de Manaus como centro de visualização
  const defaultCenter: [number, number] = [-3.1037, -60.0125];
  const center: [number, number] = origin
    ? [origin.latitude, origin.longitude]
    : defaultCenter;

  const alfineteIcon = useMemo(
    () => createPickupAlfineteIcon(pinLabel || (origin?.address ? origin.address.split(',')[0] : 'Embarque Aqui')),
    [pinLabel, origin?.address]
  );
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

        {/* Raio de Precisão do GPS em Tempo Real */}
        {origin && accuracy && accuracy > 0 && accuracy < 200 && (
          <Circle
            center={[origin.latitude, origin.longitude]}
            radius={accuracy}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.12,
              weight: 1
            }}
          />
        )}

        {/* Alfinete de Embarque (Draggable e Interativo) */}
        {origin && (
          <Marker
            position={[origin.latitude, origin.longitude]}
            icon={alfineteIcon}
            draggable={isPinDraggable}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const latlng = marker.getLatLng();
                if (onOriginDragEnd) {
                  onOriginDragEnd([latlng.lat, latlng.lng]);
                } else if (onMapClick) {
                  onMapClick([latlng.lat, latlng.lng]);
                }
              }
            }}
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
