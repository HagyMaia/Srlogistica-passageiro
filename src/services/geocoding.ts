import type { LocationCoordinates } from '@/types';

export interface PlaceSuggestion {
  id: string;
  title: string;
  subtitle: string;
  coordinates: LocationCoordinates;
}

const POPULAR_MANAUS_PLACES: PlaceSuggestion[] = [
  {
    id: 'p-1',
    title: 'Manauara Shopping',
    subtitle: 'Av. Mário Ypiranga, 1300 - Adrianópolis, Manaus - AM',
    coordinates: {
      latitude: -3.1037,
      longitude: -60.0125,
      address: 'Av. Mário Ypiranga, 1300',
      neighborhood: 'Adrianópolis',
      city: 'Manaus'
    }
  },
  {
    id: 'p-2',
    title: 'Amazonas Shopping',
    subtitle: 'Av. Djalma Batista, 482 - Parque 10 de Novembro, Manaus - AM',
    coordinates: {
      latitude: -3.0975,
      longitude: -60.0238,
      address: 'Av. Djalma Batista, 482',
      neighborhood: 'Parque 10 de Novembro',
      city: 'Manaus'
    }
  },
  {
    id: 'p-3',
    title: 'Aeroporto Internacional Eduardo Gomes',
    subtitle: 'Av. Santos Dumont, 1350 - Tarumã, Manaus - AM',
    coordinates: {
      latitude: -3.0386,
      longitude: -60.0497,
      address: 'Av. Santos Dumont, 1350',
      neighborhood: 'Tarumã',
      city: 'Manaus'
    }
  },
  {
    id: 'p-4',
    title: 'Teatro Amazonas / Largo de São Sebastião',
    subtitle: 'Praça São Sebastião, s/n - Centro, Manaus - AM',
    coordinates: {
      latitude: -3.1302,
      longitude: -60.0234,
      address: 'Praça São Sebastião, s/n',
      neighborhood: 'Centro',
      city: 'Manaus'
    }
  },
  {
    id: 'p-5',
    title: 'Praia da Ponta Negra',
    subtitle: 'Av. Coronel Teixeira - Ponta Negra, Manaus - AM',
    coordinates: {
      latitude: -3.0617,
      longitude: -60.1039,
      address: 'Av. Coronel Teixeira',
      neighborhood: 'Ponta Negra',
      city: 'Manaus'
    }
  },
  {
    id: 'p-6',
    title: 'Shopping Ponta Negra',
    subtitle: 'Av. Coronel Teixeira, 5705 - Ponta Negra, Manaus - AM',
    coordinates: {
      latitude: -3.0768,
      longitude: -60.0817,
      address: 'Av. Coronel Teixeira, 5705',
      neighborhood: 'Ponta Negra',
      city: 'Manaus'
    }
  },
  {
    id: 'p-7',
    title: 'Sumaúma Park Shopping',
    subtitle: 'Av. Noel Nutels, 1762 - Cidade Nova, Manaus - AM',
    coordinates: {
      latitude: -3.0335,
      longitude: -59.9774,
      address: 'Av. Noel Nutels, 1762',
      neighborhood: 'Cidade Nova',
      city: 'Manaus'
    }
  },
  {
    id: 'p-8',
    title: 'Porto de Manaus / Roadway',
    subtitle: 'Rua Taqueirinha, 25 - Centro, Manaus - AM',
    coordinates: {
      latitude: -3.1389,
      longitude: -60.0272,
      address: 'Rua Taqueirinha, 25',
      neighborhood: 'Centro',
      city: 'Manaus'
    }
  }
];

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return POPULAR_MANAUS_PLACES.slice(0, 4);
  }

  const cleanQuery = query.toLowerCase().trim();

  // Filtragem local prioritária
  const localMatches = POPULAR_MANAUS_PLACES.filter(
    (p) =>
      p.title.toLowerCase().includes(cleanQuery) ||
      p.subtitle.toLowerCase().includes(cleanQuery) ||
      p.coordinates.neighborhood?.toLowerCase().includes(cleanQuery)
  );

  if (localMatches.length >= 3) {
    return localMatches;
  }

  // Busca remota no OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query + ', Manaus, Brasil'
    )}&addressdetails=1&limit=5`;

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'User-Agent': 'SrLogisticaPassengerApp/1.0'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const nominatimSuggestions: PlaceSuggestion[] = data.map((item: any) => {
        const addr = item.address || {};
        const road = addr.road || addr.pedestrian || addr.suburb || item.display_name.split(',')[0];
        const suburb = addr.suburb || addr.neighbourhood || addr.city_district || 'Manaus';
        const houseNumber = addr.house_number ? `, ${addr.house_number}` : '';

        return {
          id: `nom-${item.place_id}`,
          title: `${road}${houseNumber}`,
          subtitle: item.display_name,
          coordinates: {
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            address: `${road}${houseNumber}`,
            neighborhood: suburb,
            city: addr.city || 'Manaus'
          }
        };
      });

      const combined = [...localMatches, ...nominatimSuggestions];
      const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
      return unique.slice(0, 6);
    }
  } catch {
    // Se a API externa falhar, retorna os locais locais
  }

  return localMatches.length > 0 ? localMatches : POPULAR_MANAUS_PLACES.slice(0, 4);
}

export async function reverseGeocode(lat: number, lng: number): Promise<LocationCoordinates> {
  // Verificação de proximidade com pontos conhecidos
  for (const place of POPULAR_MANAUS_PLACES) {
    const dLat = Math.abs(place.coordinates.latitude - lat);
    const dLng = Math.abs(place.coordinates.longitude - lng);
    if (dLat < 0.003 && dLng < 0.003) {
      return place.coordinates;
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'User-Agent': 'SrLogisticaPassengerApp/1.0'
      }
    });

    if (res.ok) {
      const item = await res.json();
      const addr = item.address || {};
      const road = addr.road || addr.pedestrian || 'Rua não identificada';
      const houseNumber = addr.house_number ? `, ${addr.house_number}` : '';
      const suburb = addr.suburb || addr.neighbourhood || 'Manaus';

      return {
        latitude: lat,
        longitude: lng,
        address: `${road}${houseNumber}`,
        neighborhood: suburb,
        city: addr.city || 'Manaus'
      };
    }
  } catch {
    // fallback
  }

  return {
    latitude: lat,
    longitude: lng,
    address: 'Localização Atual Selecionada',
    neighborhood: 'Centro / Adrianópolis',
    city: 'Manaus'
  };
}
