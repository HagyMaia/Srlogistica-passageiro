import type { PassengerTripStatus } from './passenger-trip.types';

const allowedTransitions: Record<PassengerTripStatus, PassengerTripStatus[]> = {
  IDLE: [
    'SELECTING_DESTINATION',
    'SEARCHING_DRIVER',
    'SCHEDULED'
  ],

  SELECTING_DESTINATION: [
    'IDLE',
    'SEARCHING_DRIVER',
    'SCHEDULED'
  ],

  SCHEDULED: [
    'SEARCHING_DRIVER',
    'CANCELLED',
    'IDLE'
  ],

  SEARCHING_DRIVER: [
    'DRIVER_ASSIGNED',
    'DRIVER_ARRIVING',
    'DRIVER_ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'IDLE'
  ],

  DRIVER_ASSIGNED: [
    'DRIVER_ARRIVING',
    'DRIVER_ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'IDLE'
  ],

  DRIVER_ARRIVING: [
    'DRIVER_ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'IDLE'
  ],

  DRIVER_ARRIVED: [
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'IDLE'
  ],

  IN_PROGRESS: [
    'COMPLETED',
    'CANCELLED',
    'IDLE'
  ],

  COMPLETED: [
    'IDLE'
  ],

  CANCELLED: [
    'IDLE'
  ]
};

export function canChangeTripStatus(
  currentStatus: PassengerTripStatus,
  nextStatus: PassengerTripStatus
): boolean {
  if (currentStatus === nextStatus) return true;
  if (nextStatus === 'COMPLETED' || nextStatus === 'CANCELLED' || nextStatus === 'IDLE') return true;
  return allowedTransitions[currentStatus]?.includes(nextStatus) ?? true;
}

export function validateTripStatusChange(
  currentStatus: PassengerTripStatus,
  nextStatus: PassengerTripStatus
): void {
  const isAllowed = canChangeTripStatus(currentStatus, nextStatus);

  if (!isAllowed) {
    console.warn(`Transição de status forçada no app do passageiro: ${currentStatus} -> ${nextStatus}`);
  }
}
