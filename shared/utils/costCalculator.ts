import type { ColorMode } from '../types/job';
import type { PricingConfig } from '../types/settings';

/**
 * Calculate the estimated cost of a print job in cents.
 *
 * @param pageCount - Total pages in the document
 * @param copies - Number of copies
 * @param colorMode - 'bw' or 'color'
 * @param pricing - Per-page pricing config
 * @param pageRangeStart - First page to print (1-based, null = all)
 * @param pageRangeEnd - Last page to print (1-based, null = all)
 * @returns Cost in cents
 */
export function calculateCost(
  pageCount: number,
  copies: number,
  colorMode: ColorMode,
  pricing: PricingConfig,
  pageRangeStart: number | null = null,
  pageRangeEnd: number | null = null,
): number {
  const start = pageRangeStart ?? 1;
  const end = pageRangeEnd ?? pageCount;
  const pagesToPrint = Math.max(0, end - start + 1);
  const pricePerPage = colorMode === 'color' ? pricing.colorPerPage : pricing.bwPerPage;

  return pagesToPrint * copies * pricePerPage;
}
