export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  address?: string;
  neighborhood?: string;
  city?: string;
}

export type UserRole = 'passenger' | 'driver' | 'admin';
export type AccountStatus = 'active' | 'pending' | 'rejected' | 'blocked';

export interface PassengerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: 'passenger';
  rating?: number;
  total_rides?: number;
  payment_preference?: 'PIX' | 'VOUCHER';
  corporate_company?: string;
  cost_center?: string;
  status?: AccountStatus;
  is_approved?: boolean;
  approved_at?: string;
  created_at: string;
}

export interface DriverInfo {
  id: string;
  name: string;
  avatar_url?: string;
  phone: string;
  rating: number;
  total_rides: number;
  vehicle: {
    brand: string;
    model: string;
    color: string;
    plate: string;
    category: string;
  };
  current_location?: LocationCoordinates;
}

export type PaymentMethod = 'PIX' | 'VOUCHER';

export interface CorporateVoucherConfig {
  companyName: string;
  cnpj?: string;
  costCenter?: string;
  employeeRegistration?: string;
  billingCycle: 'QUINZENAL';
  isActive: boolean;
}

export const SR_SUPPORT_CONFIG = {
  phone1: '(92) 98492-3316',
  phone1Raw: '559284923316',
  phone2: '(92) 99130-6160',
  phone2Raw: '5592991306160',
  websiteUrl: 'https://srlogisticatrasporte.vercel.app/',
  adminUrl: 'https://srlogisticatrasporte.vercel.app/admin.html',
  city: 'Manaus - AM',
  emergencyPolice: '190',
  emergencySamu: '192'
};
