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
    title: 'Manauara Shopping, 1300',
    subtitle: 'Av. Mário Ypiranga, 1300 - Adrianópolis, Manaus - AM',
    coordinates: {
      latitude: -3.1037,
      longitude: -60.0125,
      street: 'Av. Mário Ypiranga',
      number: '1300',
      address: 'Av. Mário Ypiranga, 1300',
      neighborhood: 'Adrianópolis',
      city: 'Manaus'
    }
  },
  {
    id: 'p-2',
    title: 'Amazonas Shopping, 482',
    subtitle: 'Av. Djalma Batista, 482 - Parque 10 de Novembro, Manaus - AM',
    coordinates: {
      latitude: -3.0975,
      longitude: -60.0238,
      street: 'Av. Djalma Batista',
      number: '482',
      address: 'Av. Djalma Batista, 482',
      neighborhood: 'Parque 10 de Novembro',
      city: 'Manaus'
    }
  },
  {
    id: 'p-3',
    title: 'Aeroporto Internacional Eduardo Gomes, 1350',
    subtitle: 'Av. Santos Dumont, 1350 - Tarumã, Manaus - AM',
    coordinates: {
      latitude: -3.0386,
      longitude: -60.0497,
      street: 'Av. Santos Dumont',
      number: '1350',
      address: 'Av. Santos Dumont, 1350',
      neighborhood: 'Tarumã',
      city: 'Manaus'
    }
  },
  {
    id: 'p-4',
    title: 'Teatro Amazonas / Largo São Sebastião',
    subtitle: 'Praça São Sebastião, s/n - Centro, Manaus - AM',
    coordinates: {
      latitude: -3.1302,
      longitude: -60.0234,
      street: 'Praça São Sebastião',
      number: 's/n',
      address: 'Praça São Sebastião, s/n',
      neighborhood: 'Centro',
      city: 'Manaus'
    }
  },
  {
    id: 'p-5',
    title: 'Praia da Ponta Negra',
    subtitle: 'Av. Coronel Teixeira, s/n - Ponta Negra, Manaus - AM',
    coordinates: {
      latitude: -3.0617,
      longitude: -60.1039,
      street: 'Av. Coronel Teixeira',
      number: 's/n',
      address: 'Av. Coronel Teixeira, s/n',
      neighborhood: 'Ponta Negra',
      city: 'Manaus'
    }
  },
  {
    id: 'p-6',
    title: 'Shopping Ponta Negra, 5705',
    subtitle: 'Av. Coronel Teixeira, 5705 - Ponta Negra, Manaus - AM',
    coordinates: {
      latitude: -3.0768,
      longitude: -60.0817,
      street: 'Av. Coronel Teixeira',
      number: '5705',
      address: 'Av. Coronel Teixeira, 5705',
      neighborhood: 'Ponta Negra',
      city: 'Manaus'
    }
  },
  {
    id: 'p-7',
    title: 'Sumaúma Park Shopping, 1762',
    subtitle: 'Av. Noel Nutels, 1762 - Cidade Nova, Manaus - AM',
    coordinates: {
      latitude: -3.0335,
      longitude: -59.9774,
      street: 'Av. Noel Nutels',
      number: '1762',
      address: 'Av. Noel Nutels, 1762',
      neighborhood: 'Cidade Nova',
      city: 'Manaus'
    }
  },
  {
    id: 'p-8',
    title: 'Porto de Manaus / Roadway, 25',
    subtitle: 'Rua Taqueirinha, 25 - Centro, Manaus - AM',
    coordinates: {
      latitude: -3.1389,
      longitude: -60.0272,
      street: 'Rua Taqueirinha',
      number: '25',
      address: 'Rua Taqueirinha, 25',
      neighborhood: 'Centro',
      city: 'Manaus'
    }
  }
];

// Formata número de casa brasileiro limpo, ignorando CEPs e prefixos desnecessários
export function cleanHouseNumber(numStr?: string): string {
  if (!numStr) return '';
  let trimmed = numStr.trim();

  // Remove prefixos como "Nº", "N.", "nº", "n.", "Num", "num."
  trimmed = trimmed.replace(/^(n[º°.]?|num\.?|n\b)\s*/i, '').trim();

  // Se for CEP (ex: 69000-000, 69057-002 ou 69057002), não é número de casa
  if (/^\d{5}-?\d{3}$/.test(trimmed) || /^69\d{6}$/.test(trimmed)) {
    return '';
  }

  // Se for "s/n", "sn", "s.n."
  if (/^(s\/?n|sem\s+n[uú]mero)$/i.test(trimmed)) {
    return 's/n';
  }

  // Se for numeração válida (ex: "15", "1500", "15-A", "45 B", "Bloco 2")
  if (/^(\d{1,5}\s*[-/]?\s*[a-zA-Z0-9]?)$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

// Extrai número digitado pelo usuário na busca (ex: "Rua Aparecida 15", "Rua Aparecida, 15", "Av Djalma 1000")
export function extractNumberFromQuery(query: string): string | null {
  if (!query) return null;
  const match = query.match(/(?:n[º°.]?\s*|,\s*|\s+)(\d{1,5}\s*[a-zA-Z]?)(?:\b|$)/i);
  if (match && match[1]) {
    const num = match[1].trim();
    if (!/^\d{5}/.test(num)) {
      return cleanHouseNumber(num);
    }
  }
  return null;
}

// Constrói string padronizada com Rua e Número (Exemplo: "Rua Aparecida, 15")
export function formatStreetAndNumber(
  street: string,
  number?: string,
  venue?: string
): string {
  const cleanRoad = street ? street.trim() : '';
  const cleanNum = cleanHouseNumber(number);

  let baseFormatted = cleanRoad;
  if (cleanNum) {
    if (cleanRoad.toLowerCase().includes(`, ${cleanNum.toLowerCase()}`) || cleanRoad.toLowerCase().endsWith(` ${cleanNum.toLowerCase()}`)) {
      baseFormatted = cleanRoad;
    } else {
      baseFormatted = `${cleanRoad}, ${cleanNum}`;
    }
  }

  if (venue && venue !== cleanRoad && !cleanRoad.toLowerCase().includes(venue.toLowerCase())) {
    return `${baseFormatted} (${venue})`;
  }

  return baseFormatted;
}

// Formata endereço completo para exibição clara
export function formatFullDisplayAddress(coords: Partial<LocationCoordinates>): string {
  const road = coords.street || coords.address || 'Ponto no Mapa';
  const num = cleanHouseNumber(coords.number);
  const neighborhood = coords.neighborhood ? ` - ${coords.neighborhood}` : '';
  const city = coords.city ? `, ${coords.city}` : '';

  if (num && !road.includes(num)) {
    return `${road}, ${num}${neighborhood}${city}`;
  }
  return `${road}${neighborhood}${city}`;
}

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return POPULAR_MANAUS_PLACES.slice(0, 4);
  }

  const cleanQuery = query.toLowerCase().trim();
  const queryNumber = extractNumberFromQuery(query);

  // 1. Filtragem local prioritária
  const localMatches = POPULAR_MANAUS_PLACES.filter(
    (p) =>
      p.title.toLowerCase().includes(cleanQuery) ||
      p.subtitle.toLowerCase().includes(cleanQuery) ||
      p.coordinates.street?.toLowerCase().includes(cleanQuery) ||
      p.coordinates.neighborhood?.toLowerCase().includes(cleanQuery)
  );

  if (localMatches.length >= 3) {
    return localMatches;
  }

  // 2. Busca remota no OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query + ', Manaus, Amazonas, Brasil'
    )}&addressdetails=1&limit=6`;

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'User-Agent': 'SrLogisticaPassengerApp/1.0 (srlogistica21@gmail.com)'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const nominatimSuggestions: PlaceSuggestion[] = data.map((item: any) => {
        const addr = item.address || {};
        const road =
          addr.road ||
          addr.street ||
          addr.pedestrian ||
          addr.footway ||
          addr.avenue ||
          addr.residential ||
          item.display_name.split(',')[0];
        const rawNum = addr.house_number || queryNumber || '';
        const houseNum = cleanHouseNumber(rawNum);
        const venue = addr.shop || addr.amenity || addr.building || addr.office || addr.leisure || addr.tourism || '';
        const suburb = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || 'Manaus';
        const city = addr.city || addr.town || 'Manaus';

        const formattedAddress = formatStreetAndNumber(road, houseNum, venue);
        const titleText = houseNum && !road.toLowerCase().includes(houseNum.toLowerCase())
          ? `${road}, ${houseNum}`
          : road;

        return {
          id: `nom-${item.place_id}`,
          title: venue ? `${venue} (${titleText})` : titleText,
          subtitle: `${suburb}, ${city} - AM`,
          coordinates: {
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            street: road,
            number: houseNum || undefined,
            address: formattedAddress,
            neighborhood: suburb,
            city: city
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
  // 1. Provedor Primário: OpenStreetMap Nominatim com zoom detalhado de rua e número
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'User-Agent': 'SrLogisticaPassengerApp/1.0 (srlogistica21@gmail.com)'
      }
    });

    if (res.ok) {
      const item = await res.json();
      const addr = item.address || {};

      const venue = addr.shop || addr.amenity || addr.building || addr.office || addr.leisure || addr.tourism || '';
      const road = addr.road || addr.street || addr.pedestrian || addr.footway || addr.avenue || addr.residential || venue || '';
      const rawNum = addr.house_number || addr.street_number || addr.building_number || '';
      const houseNumber = cleanHouseNumber(rawNum);
      const suburb = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || 'Manaus';
      const city = addr.city || addr.town || addr.municipality || 'Manaus';

      if (road) {
        const addressText = formatStreetAndNumber(road, houseNumber, venue);

        return {
          latitude: lat,
          longitude: lng,
          street: road,
          number: houseNumber || undefined,
          address: addressText,
          neighborhood: suburb,
          city: city
        };
      }
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode indisponível, tentando Photon...', err);
  }

  // 2. Provedor Secundário: Photon Geocoding API (Komoot)
  try {
    const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`;
    const photonRes = await fetch(photonUrl);
    if (photonRes.ok) {
      const data = await photonRes.json();
      const feat = data.features && data.features[0];
      if (feat && feat.properties) {
        const p = feat.properties;
        const venue = p.name && p.name !== p.street ? p.name : '';
        const road = p.street || p.name || '';
        const houseNumber = cleanHouseNumber(p.housenumber);
        const suburb = p.district || p.suburb || p.locality || 'Manaus';
        const city = p.city || 'Manaus';

        if (road && !/^\d{5}-?\d{3}$/.test(road)) {
          const addressText = formatStreetAndNumber(road, houseNumber, venue);

          return {
            latitude: lat,
            longitude: lng,
            street: road,
            number: houseNumber || undefined,
            address: addressText,
            neighborhood: suburb,
            city: city
          };
        }
      }
    }
  } catch (err) {
    console.warn('Photon reverse geocode indisponível...', err);
  }

  // 3. Provedor Terciário: BigDataCloud Client Reverse Geocode
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`;
    const bdcRes = await fetch(bdcUrl);
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const locality = bdcData.locality || bdcData.city || 'Manaus';
      const suburb = bdcData.localityInfo?.administrative?.find((a: any) => a.adminLevel >= 8)?.name || locality;
      const streetName = bdcData.localityInfo?.administrative?.find((a: any) => a.adminLevel >= 9)?.name || '';

      const mainStreet = streetName || `Ponto em ${suburb}`;
      return {
        latitude: lat,
        longitude: lng,
        street: mainStreet,
        address: mainStreet,
        neighborhood: suburb,
        city: bdcData.city || 'Manaus'
      };
    }
  } catch (err) {
    console.warn('BigDataCloud indisponível...', err);
  }

  // Fallback real baseado nas coordenadas físicas
  return {
    latitude: lat,
    longitude: lng,
    street: `Local Marcado (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    address: `Local Marcado (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    neighborhood: 'Ponto no Mapa',
    city: 'Manaus'
  };
}
