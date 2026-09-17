'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { LocationCoordinates } from '@/types';
import { reverseGeocode } from '@/services/geocoding';

// Padrão Manaus - AM (Adrianópolis / Manauara)
const DEFAULT_MANAUS_LOCATION: LocationCoordinates = {
  latitude: -3.1037,
  longitude: -60.0125,
  street: 'Av. Mário Ypiranga',
  number: '1300',
  address: 'Av. Mário Ypiranga, 1300',
  neighborhood: 'Adrianópolis',
  city: 'Manaus'
};

const LAST_LOCATION_STORAGE_KEY = 'sr_passenger_last_location';

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function getInitialCachedLocation(): LocationCoordinates | null {
  if (typeof window === 'undefined') return DEFAULT_MANAUS_LOCATION;
  try {
    const raw = localStorage.getItem(LAST_LOCATION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.latitude && parsed?.longitude) {
        return parsed;
      }
    }
  } catch (_) {}
  return DEFAULT_MANAUS_LOCATION;
}

export interface LiveCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading?: number | null;
  speed?: number | null;
}

export function usePassengerLocation() {
  const [location, setLocation] = useState<LocationCoordinates | null>(getInitialCachedLocation);
  const [liveCoords, setLiveCoords] = useState<LiveCoords | null>(null);
  const [hasRealGPS, setHasRealGPS] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const lastGeocodedCoords = useRef<{ lat: number; lng: number } | null>(null);
  const isGeocodingInProgress = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  // Busca reversa de endereço com debounce inteligente por distância
  const handleReverseGeocode = useCallback(async (lat: number, lng: number, force = false) => {
    if (isGeocodingInProgress.current && !force) return;

    if (!force && lastGeocodedCoords.current) {
      const dist = calculateDistanceMeters(
        lastGeocodedCoords.current.lat,
        lastGeocodedCoords.current.lng,
        lat,
        lng
      );
      // Se moveu menos de 10 metros e já tem endereço, não precisa re-executar reverse geocode na API
      if (dist < 10) return;
    }

    isGeocodingInProgress.current = true;
    setIsResolvingAddress(true);
    try {
      const geoData = await reverseGeocode(lat, lng);
      lastGeocodedCoords.current = { lat, lng };

      const updatedLocation: LocationCoordinates = {
        latitude: lat,
        longitude: lng,
        street: geoData.street,
        number: geoData.number,
        address: geoData.address,
        neighborhood: geoData.neighborhood,
        city: geoData.city
      };

      setLocation(updatedLocation);

      // Salva último local resolvido para carregamento instantâneo
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LAST_LOCATION_STORAGE_KEY, JSON.stringify(updatedLocation));
        } catch (_) {}
      }
    } catch {
      // mantém coordenadas reais
    } finally {
      isGeocodingInProgress.current = false;
      setIsResolvingAddress(false);
    }
  }, []);

  // Callback de sucesso da geolocalização do navegador
  const handlePositionSuccess = useCallback(
    (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy: acc, heading, speed } = pos.coords;
      const roundedAcc = Math.round(acc);

      setPermissionGranted(true);
      setGpsError(null);
      setLoading(false);
      setHasRealGPS(true);
      setIsLiveTracking(true);
      setAccuracy(roundedAcc);

      setLiveCoords({
        latitude,
        longitude,
        accuracy: roundedAcc,
        heading: heading ?? null,
        speed: speed ?? null
      });

      // Atualiza coordenadas no estado imediatamente com as coordenadas REAIS do aparelho
      setLocation((prev) => {
        const nextLoc: LocationCoordinates = {
          latitude,
          longitude,
          street: prev?.street,
          number: prev?.number,
          address:
            prev?.address && prev.latitude === latitude && prev.longitude === longitude
              ? prev.address
              : (prev?.address || 'Identificando endereço da sua localização...'),
          neighborhood: prev?.neighborhood || '',
          city: prev?.city || 'Manaus'
        };
        return nextLoc;
      });

      // Faz o reverse geocode em tempo real para obter a rua e número
      handleReverseGeocode(latitude, longitude);
    },
    [handleReverseGeocode]
  );

  // Callback de erro da geolocalização com estratégia de fallback
  const handlePositionError = useCallback(
    (err: GeolocationPositionError) => {
      console.warn('Erro GPS (Alta Precisão):', err.message);

      // Se for timeout ou sinal fraco, tenta obter modo padrão (rede/wifi)
      if (err.code === 3 || err.code === 2) {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            handlePositionSuccess,
            (fallbackErr) => {
              console.warn('Erro GPS (Modo Rede/Fallback):', fallbackErr.message);
              setLoading(false);
              setPermissionGranted(false);
              setGpsError('Sinal GPS indisponível. Toque no mapa para marcar sua localização.');
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
          );
          return;
        }
      }

      setLoading(false);
      setPermissionGranted(false);
      setGpsError(
        err.code === 1
          ? 'Permissão de localização não autorizada. Marque no mapa onde você está.'
          : 'Sinal GPS fraco. Use o alfinete para marcar o local exato no mapa.'
      );
    },
    [handlePositionSuccess]
  );

  // Inicia o rastreamento contínuo em tempo real (watchPosition)
  const startWatchingLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLoading(false);
      setGpsError('Geolocalização não suportada neste dispositivo.');
      return;
    }

    setLoading(true);

    // 1. Obtém posição inicial rápida com alta precisão
    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      handlePositionError,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 }
    );

    // 2. Limpa monitoramento anterior se houver
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // 3. Inicia rastreamento contínuo em tempo real (atualiza conforme o passageiro se desloca)
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionSuccess,
        handlePositionError,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000
        }
      );
    } catch (e) {
      console.warn('Erro ao registrar watchPosition:', e);
    }
  }, [handlePositionSuccess, handlePositionError]);

  // Efeito de inicialização
  useEffect(() => {
    startWatchingLocation();

    // Monitora mudanças de permissão se a API for suportada
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permissionStatus) => {
          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') {
              startWatchingLocation();
            } else if (permissionStatus.state === 'denied') {
              setPermissionGranted(false);
              setIsLiveTracking(false);
            }
          };
        })
        .catch(() => {});
    }

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [startWatchingLocation]);

  const updateManualLocation = (newLoc: LocationCoordinates) => {
    setLocation(newLoc);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LAST_LOCATION_STORAGE_KEY, JSON.stringify(newLoc));
      } catch (_) {}
    }
  };

  const forceResolveCurrentAddress = () => {
    if (location?.latitude && location?.longitude) {
      handleReverseGeocode(location.latitude, location.longitude, true);
    }
  };

  return {
    location,
    liveCoords,
    hasRealGPS,
    accuracy,
    loading,
    isResolvingAddress,
    isLiveTracking,
    permissionGranted,
    gpsError,
    refreshLocation: startWatchingLocation,
    forceResolveAddress: forceResolveCurrentAddress,
    setLocation: updateManualLocation
  };
}
