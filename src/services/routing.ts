import type { LocationCoordinates } from '@/types';

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: Array<[number, number]>;
}

// Cálculo da distância euclidiana/haversine como base e fallback
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metros
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function calculateRoute(
  origin: LocationCoordinates,
  destination: LocationCoordinates
): Promise<RouteResult> {
  const straightDistance = haversineDistance(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude
  );

  // Fator de correção de malha viária urbana (geralmente ~1.3x a 1.4x a linha reta)
  const estimatedStreetMeters = Math.max(500, Math.round(straightDistance * 1.35));
  // Velocidade média urbana (~25 km/h = ~7 m/s)
  const estimatedSeconds = Math.max(120, Math.round(estimatedStreetMeters / 7));

  // Tenta consultar a API pública OSRM (Open Source Routing Machine)
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // OSRM retorna geojson [lng, lat] -> convertemos para Leaflet [lat, lng]
        const latLngs: Array<[number, number]> = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        return {
          distanceMeters: Math.round(route.distance),
          durationSeconds: Math.round(route.duration),
          coordinates: latLngs
        };
      }
    }
  } catch {
    // Falha de rede ou timeout - usa rota interpolada inteligente
  }

  // Gera pontos interpolados criando uma linha suave
  const steps = 12;
  const interpolated: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const lat = origin.latitude + (destination.latitude - origin.latitude) * ratio;
    const lng = origin.longitude + (destination.longitude - origin.longitude) * ratio;
    // Pequena curvatura natural
    const curveOffset = Math.sin(ratio * Math.PI) * 0.0012;
    interpolated.push([lat + curveOffset, lng - curveOffset]);
  }

  return {
    distanceMeters: estimatedStreetMeters,
    durationSeconds: estimatedSeconds,
    coordinates: interpolated
  };
}
