import { LocationCoordinates, DriverInfo, PaymentMethod } from '@/types';

export type TripCategory = 'POPULAR' | 'CONFORT' | 'EXECUTIVO';

export type PassengerTripStatus =
  | 'IDLE'                  // Passageiro no mapa
  | 'SELECTING_DESTINATION' // Escolhendo origem/destino e categoria
  | 'SCHEDULED'            // Corrida agendada para data/hora futura
  | 'SEARCHING_DRIVER'      // Chamado emitido (REQUESTED) - radar buscando motorista
  | 'DRIVER_ASSIGNED'       // Motorista aceitou a corrida (ACCEPTED)
  | 'DRIVER_ARRIVING'       // Motorista a caminho do ponto de embarque
  | 'DRIVER_ARRIVED'        // Motorista chegou no local de embarque
  | 'IN_PROGRESS'           // Corrida em andamento (passageiro a bordo)
  | 'COMPLETED'             // Corrida finalizada com sucesso (recibo & avaliação)
  | 'CANCELLED';            // Corrida cancelada

export interface CategoryOption {
  id: TripCategory;
  name: string;
  description: string;
  etaMinutes: number;
  price: number;
  icon: string;
  capacity: string;
}

export interface FareCalculation {
  baseFare: number;
  distanceKm: number;
  durationMin: number;
  kmCost: number;
  minuteCost: number;
  surgeMultiplier: number;
  totalFare: number;
  category: TripCategory;
}

export interface PassengerTrip {
  id: string;
  status: PassengerTripStatus;
  passengerId: string;
  passengerName: string;
  passengerPhone?: string;
  origin: LocationCoordinates;
  destination: LocationCoordinates;
  routeCoordinates?: Array<[number, number]>;
  category: TripCategory;
  paymentMethod: PaymentMethod;
  estimatedDistanceMeters: number;
  estimatedDurationSeconds: number;
  estimatedFare: number;
  finalFare?: number;
  driver?: DriverInfo;
  requestedAt: string;
  isScheduled?: boolean;
  scheduledFor?: string; // Data e hora ISO ou formato legível do agendamento
  scheduledNotes?: string; // Observações como voo, malas, etc.
  notes?: string;
  driverAssignedAt?: string;
  driverArrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  rating?: number;
  feedback?: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  tripId: string;
  sender: 'passenger' | 'driver' | 'system';
  senderName: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

