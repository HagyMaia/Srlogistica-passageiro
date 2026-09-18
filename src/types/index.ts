export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  address?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
}

export type UserRole = 'passenger' | 'driver' | 'admin';
export type AccountStatus = 'active' | 'pending' | 'rejected' | 'blocked';
export type PassengerAccountType = 'particular' | 'empresa';

export interface PartnerCompany {
  id: string;
  name: string;
  trade_name?: string;
  cnpj: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  billing_cycle?: 'QUINZENAL' | 'MENSAL';
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

export type PhotoApprovalStatus = 'Pendente' | 'Aprovada' | 'Rejeitada' | 'pending' | 'approved' | 'rejected';

export interface PassengerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  avatar_url?: string;
  foto_url?: string;
  foto_status?: string;
  photo_status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  motivo_rejeicao?: string;
  voucher_habilitado?: boolean;
  role: 'passenger' | 'driver' | 'admin';
  account_type?: PassengerAccountType;
  rating?: number;
  total_rides?: number;
  payment_preference?: 'PIX' | 'VOUCHER';
  corporate_company?: string;
  company?: string;
  company_cnpj?: string;
  partner_company_id?: string;
  cost_center?: string;
  department?: string;
  employee_registration?: string;
  shift?: string;
  pickup_address?: string;
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
  category_type?: 'particular' | 'empresa';
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

export const SR_PIX_CONFIG = {
  keyRaw: '52967828000117',
  keyFormatted: '52.967.828/0001-17',
  keyType: 'CNPJ',
  beneficiaryName: 'SR LOGÍSTICA E TRANSPORTES',
  city: 'Manaus - AM',
  description: 'Pagamento de Corrida - SR Logística'
};

export const SR_SUPPORT_CONFIG = {
  phone1: '(92) 98492-3316',
  phone1Raw: '559284923316',
  phone2: '(92) 99130-6160',
  phone2Raw: '5592991306160',
  pixKey: '52967828000117',
  pixKeyFormatted: '52.967.828/0001-17',
  websiteUrl: 'https://www.srlogisticatrasporte.com.br/',
  adminUrl: 'https://www.srlogisticatrasporte.com.br/admin.html',
  city: 'Manaus - AM',
  emergencyPolice: '190',
  emergencySamu: '192'
};
