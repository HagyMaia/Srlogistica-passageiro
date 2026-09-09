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
    'CANCELLED',
    'IDLE'
  ],

  DRIVER_ASSIGNED: [
    'DRIVER_ARRIVING',
    'DRIVER_ARRIVED',
    'IN_PROGRESS',
    'CANCELLED'
  ],

  DRIVER_ARRIVING: [
    'DRIVER_ARRIVED',
    'IN_PROGRESS',
    'CANCELLED'
  ],

  DRIVER_ARRIVED: [
    'IN_PROGRESS',
    'CANCELLED'
  ],

  IN_PROGRESS: [
    'COMPLETED',
    'CANCELLED'
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
  return allowedTransitions[currentStatus]?.includes(nextStatus) ?? false;
}

export function validateTripStatusChange(
  currentStatus: PassengerTripStatus,
  nextStatus: PassengerTripStatus
): void {
  const isAllowed = canChangeTripStatus(currentStatus, nextStatus);

  if (!isAllowed) {
    throw new Error(`Transição de status inválida no app do passageiro: ${currentStatus} -> ${nextStatus}`);
  }
}
