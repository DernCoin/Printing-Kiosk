import { db } from '../utils/db/index.js';

interface SettingRow {
  value: string;
}

export interface PricingInfo {
  bwPerPage: number;    // cents
  colorPerPage: number; // cents
}

export function getPricing(): PricingInfo {
  const bw = db.prepare("SELECT value FROM settings WHERE key = 'pricing_bw_per_page'").get() as SettingRow | undefined;
  const color = db.prepare("SELECT value FROM settings WHERE key = 'pricing_color_per_page'").get() as SettingRow | undefined;

  return {
    bwPerPage: bw ? parseInt(bw.value, 10) : 10,
    colorPerPage: color ? parseInt(color.value, 10) : 25,
  };
}

export function calculateJobCost(
  pageCount: number,
  copies: number,
  colorMode: 'bw' | 'color',
  pageRangeStart: number | null,
  pageRangeEnd: number | null,
): number {
  const pricing = getPricing();
  const start = pageRangeStart ?? 1;
  const end = pageRangeEnd ?? pageCount;
  const pagesToPrint = Math.max(0, end - start + 1);
  const pricePerPage = colorMode === 'color' ? pricing.colorPerPage : pricing.bwPerPage;

  return pagesToPrint * copies * pricePerPage;
}
