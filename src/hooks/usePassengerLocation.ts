'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LocationCoordinates } from '@/types';
import { reverseGeocode } from '@/services/geocoding';

// Manaus - AM (Adrianópolis / Manauara)
const DEFAULT_MANAUS_LOCATION: LocationCoordinates = {
  latitude: -3.1037,
  longitude: -60.0125,
  address: 'Av. Mário Ypiranga, 1300',
  neighborhood: 'Adrianópolis',
  city: 'Manaus'
};

export function usePassengerLocation() {
  const [location, setLocation] = useState<LocationCoordinates>(DEFAULT_MANAUS_LOCATION);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const fetchAddressForCoords = useCallback(async (lat: number, lng: number) => {
    try {
      const geoData = await reverseGeocode(lat, lng);
      setLocation((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        address: geoData.address,
        neighborhood: geoData.neighborhood,
        city: geoData.city
      }));
    } catch {
      setLocation((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    }
  }, []);

  const requestCurrentPosition = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLoading(false);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPermissionGranted(true);
        await fetchAddressForCoords(latitude, longitude);
        setLoading(false);
      },
      () => {
        setPermissionGranted(false);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  }, [fetchAddressForCoords]);

  useEffect(() => {
    requestCurrentPosition();
  }, [requestCurrentPosition]);

  const updateManualLocation = (newLoc: LocationCoordinates) => {
    setLocation(newLoc);
  };

  return {
    location,
    loading,
    permissionGranted,
    refreshLocation: requestCurrentPosition,
    setLocation: updateManualLocation
  };
}
