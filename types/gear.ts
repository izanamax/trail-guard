export type GearCategory = 'dynamic_rope' | 'harness' | 'helmet' | 'boots';

export type GearStatus = 'Safe' | 'Warning' | 'Retire Soon' | 'Expired' | 'Manually Retired';

export interface GearItem {
  id: string;
  userId?: string;
  name: string;
  category: GearCategory;
  purchaseDate: string;
  manufactureDate: string;
  photoUri?: string;
  retiredAt?: string;
  retirementNote?: string;
  createdAt: string;
}

export interface GearStatusResult {
  percentageUsed: number;
  daysRemaining: number;
  status: GearStatus;
}

export const GEAR_CATEGORY_LABELS: Record<GearCategory, string> = {
  dynamic_rope: 'Dynamic Rope',
  harness: 'Harness',
  helmet: 'Helmet',
  boots: 'Boots',
};

export const GEAR_CATEGORIES: GearCategory[] = ['dynamic_rope', 'harness', 'helmet', 'boots'];
