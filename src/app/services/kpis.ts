import type { KPIData } from '../types';
import { mockKPIData, mockPriorityDistribution } from '../data/mockData';
import { apiEndpoints } from '../api/endpoints';
import { getJson } from '../api/http';

export type PriorityDistributionItem = {
  name: string;
  value: number;
  color: string;
};

/**
 * Mock-backed KPI service.
 *
 * Later, replace implementations here with API calls (e.g. GET /dashboard/kpis).
 */
export function getKpis(): KPIData {
  return mockKPIData;
}

/**
 * Mock-backed chart data for the dashboard.
 */
export function getPriorityDistribution(): PriorityDistributionItem[] {
  return mockPriorityDistribution;
}

/**
 * Async API-backed variant of {@link getKpis}.
 *
 * Not used by pages yet; safe to add for incremental backend adoption.
 */
export async function getKpisAsync(init?: Omit<RequestInit, 'method'>): Promise<KPIData> {
  return getJson<KPIData>(apiEndpoints.dashboardKpis, init);
}

/**
 * Async API-backed variant of {@link getPriorityDistribution}.
 *
 * Endpoint naming is intentionally simple and can be adjusted once backend routes are finalized.
 */
export async function getPriorityDistributionAsync(
  init?: Omit<RequestInit, 'method'>,
): Promise<PriorityDistributionItem[]> {
  return getJson<PriorityDistributionItem[]>(`${apiEndpoints.dashboardKpis}/priority-distribution`, init);
}
