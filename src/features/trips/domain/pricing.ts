import type { TripCategory, FareCalculation, CategoryOption } from './passenger-trip.types';

interface CategoryRate {
  baseFare: number;
  perKm: number;
  perMinute: number;
  minFare: number;
  name: string;
  description: string;
  capacity: string;
  icon: string;
}

export const CATEGORY_RATES: Record<TripCategory, CategoryRate> = {
  POPULAR: {
    baseFare: 5.50,
    perKm: 2.10,
    perMinute: 0.35,
    minFare: 9.00,
    name: 'SR Pop',
    description: 'Carros compactos e econômicos para o dia a dia',
    capacity: '4 pessoas',
    icon: 'car'
  },
  CONFORT: {
    baseFare: 8.00,
    perKm: 2.80,
    perMinute: 0.50,
    minFare: 14.00,
    name: 'SR Confort',
    description: 'Carros mais espaçosos e com ar-condicionado premium',
    capacity: '4 pessoas',
    icon: 'shield-check'
  },
  MOTO: {
    baseFare: 4.00,
    perKm: 1.40,
    perMinute: 0.20,
    minFare: 6.50,
    name: 'SR Moto',
    description: 'Chegue mais rápido evitando o trânsito pesado',
    capacity: '1 pessoa',
    icon: 'bike'
  },
  ENTREGA: {
    baseFare: 6.00,
    perKm: 1.80,
    perMinute: 0.30,
    minFare: 10.00,
    name: 'SR Entrega',
    description: 'Envio rápido de pequenos pacotes e encomendas',
    capacity: 'Até 15kg',
    icon: 'package'
  }
};

export function calculateFare({
  distanceMeters,
  durationSeconds,
  category = 'POPULAR',
  surgeMultiplier = 1.0
}: {
  distanceMeters: number;
  durationSeconds: number;
  category?: TripCategory;
  surgeMultiplier?: number;
}): FareCalculation {
  const rate = CATEGORY_RATES[category] || CATEGORY_RATES.POPULAR;
  const distanceKm = Math.max(0.1, distanceMeters / 1000);
  const durationMin = Math.max(1, Math.round(durationSeconds / 60));

  const kmCost = distanceKm * rate.perKm;
  const minuteCost = durationMin * rate.perMinute;
  const subtotal = rate.baseFare + kmCost + minuteCost;
  const rawTotal = subtotal * surgeMultiplier;
  const totalFare = Math.max(rate.minFare, Math.round(rawTotal * 100) / 100);

  return {
    baseFare: rate.baseFare,
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin,
    kmCost: Math.round(kmCost * 100) / 100,
    minuteCost: Math.round(minuteCost * 100) / 100,
    surgeMultiplier,
    totalFare,
    category
  };
}

export function getAvailableCategories({
  distanceMeters,
  durationSeconds,
  surgeMultiplier = 1.0
}: {
  distanceMeters: number;
  durationSeconds: number;
  surgeMultiplier?: number;
}): CategoryOption[] {
  const categories: TripCategory[] = ['POPULAR', 'CONFORT', 'MOTO', 'ENTREGA'];

  return categories.map((catKey) => {
    const rate = CATEGORY_RATES[catKey];
    const calc = calculateFare({ distanceMeters, durationSeconds, category: catKey, surgeMultiplier });
    const etaVariation = catKey === 'MOTO' ? -2 : catKey === 'CONFORT' ? 1 : 0;
    const baseEta = Math.max(2, Math.round(durationSeconds / 300) + etaVariation);

    return {
      id: catKey,
      name: rate.name,
      description: rate.description,
      etaMinutes: baseEta,
      price: calc.totalFare,
      icon: rate.icon,
      capacity: rate.capacity
    };
  });
}
