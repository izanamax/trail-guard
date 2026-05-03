import type { GearCategory, GearItem, GearStatus, GearStatusResult } from '@/types/gear';

const CATEGORY_LIFESPAN_YEARS: Record<GearCategory, number> = {
  dynamic_rope: 10,
  harness: 10,
  helmet: 5,
  boots: 3,
};

function parseDateOnly(input: string): Date {
  const [year, month, day] = input.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function resolveStatus(percentageUsed: number): GearStatus {
  if (percentageUsed < 80) return 'Safe';
  if (percentageUsed <= 94) return 'Warning';
  if (percentageUsed <= 99) return 'Retire Soon';
  return 'Expired';
}

export function calculateGearStatus(gearItem: GearItem): GearStatusResult {
  const baselineDate = gearItem.manufactureDate || gearItem.purchaseDate;
  const baseline = parseDateOnly(baselineDate);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const lifespanYears = CATEGORY_LIFESPAN_YEARS[gearItem.category];
  const totalDays = lifespanYears * 365;
  const usedDays = Math.floor((today.getTime() - baseline.getTime()) / (1000 * 60 * 60 * 24));

  const percentageUsed = Math.round((usedDays / totalDays) * 100);
  const daysRemaining = totalDays - usedDays;
  const status = resolveStatus(percentageUsed);

  return {
    percentageUsed,
    daysRemaining,
    status,
  };
}
