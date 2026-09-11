'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { LocationCoordinates } from '@/types';
import { reverseGeocode } from '@/services/geocoding';

// Padrão Manaus - AM (Adrianópolis / Manauara)
const DEFAULT_MANAUS_LOCATION: LocationCoordinates = {
  latitude: -3.1037,
  longitude: -60.0125,
  address: 'Av. Mário Ypiranga, 1300',
  neighborhood: 'Adrianópolis',
  city: 'Manaus'
};

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

export function usePassengerLocation() {
  const [location, setLocation] = useState<LocationCoordinates>(DEFAULT_MANAUS_LOCATION);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const lastGeocodedCoords = useRef<{ lat: number; lng: number } | null>(null);
  const isGeocodingInProgress = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  // Busca reversa de endereço com debounce inteligente por distância
  const handleReverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (isGeocodingInProgress.current) return;

    if (lastGeocodedCoords.current) {
      const dist = calculateDistanceMeters(
        lastGeocodedCoords.current.lat,
        lastGeocodedCoords.current.lng,
        lat,
        lng
      );
      // Se moveu menos de 30 metros, não precisa re-executar reverse geocode na API
      if (dist < 30) return;
    }

    isGeocodingInProgress.current = true;
    try {
      const geoData = await reverseGeocode(lat, lng);
      lastGeocodedCoords.current = { lat, lng };
      setLocation((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        address: geoData.address || prev.address,
        neighborhood: geoData.neighborhood || prev.neighborhood,
        city: geoData.city || prev.city
      }));
    } catch {
      // mantém coordenadas mesmo se api de nome falhar
    } finally {
      isGeocodingInProgress.current = false;
    }
  }, []);

  // Callback de sucesso da geolocalização do navegador
  const handlePositionSuccess = useCallback(
    (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy: acc } = pos.coords;

      setPermissionGranted(true);
      setGpsError(null);
      setLoading(false);
      setIsLiveTracking(true);
      setAccuracy(Math.round(acc));

      // Atualiza coordenadas no estado imediatamente
      setLocation((prev) => ({
        ...prev,
        latitude,
        longitude
      }));

      // Faz o reverse geocode em segundo plano
      handleReverseGeocode(latitude, longitude);
    },
    [handleReverseGeocode]
  );

  // Callback de erro da geolocalização com estratégia de fallback
  const handlePositionError = useCallback(
    (err: GeolocationPositionError) => {
      console.warn('Erro GPS (Alta Precisão):', err.message);

      // Se for timeout ou indisponível, tenta com precisão padrão (rede/wifi)
      if (err.code === 3 || err.code === 2) {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            handlePositionSuccess,
            (fallbackErr) => {
              console.warn('Erro GPS (Modo Rede/Fallback):', fallbackErr.message);
              setLoading(false);
              setPermissionGranted(false);
              setGpsError('Não foi possível obter a localização exata.');
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
          ? 'Permissão de localização negada pelo usuário.'
          : 'Sinal GPS fraco ou indisponível no momento.'
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

    // 1. Obtém posição inicial rápida
    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      handlePositionError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // 2. Limpa monitoramento anterior se houver
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // 3. Inicia rastreamento contínuo em tempo real
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionSuccess,
        handlePositionError,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 3000
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
  };

  return {
    location,
    accuracy,
    loading,
    isLiveTracking,
    permissionGranted,
    gpsError,
    refreshLocation: startWatchingLocation,
    setLocation: updateManualLocation
  };
}
