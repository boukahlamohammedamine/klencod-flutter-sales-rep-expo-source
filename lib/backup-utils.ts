import type { SalesData } from "./sales-domain";
import { DATA_KEYS } from "./sales-domain";

type DataKey = (typeof DATA_KEYS)[number];

/** Merge a flat legacy JSON backup while keeping its customer/product references intact. */
export function mergeBackupRecords(current: SalesData, backup: Record<string, unknown>): SalesData {
  const next: SalesData = { ...current };
  const idMaps = new Map<DataKey, Map<string, number>>();
  const inputs = new Map<DataKey, Record<string, unknown>[]>();

  for (const key of DATA_KEYS) {
    const existing = current[key] as { id: number }[];
    const incoming = Array.isArray(backup[key]) ? backup[key] as Record<string, unknown>[] : [];
    const maximum = existing.length ? Math.max(...existing.map((record) => record.id || 0)) : 0;
    inputs.set(key, incoming);
    idMaps.set(key, new Map(incoming.map((record, index) => [String(record.id ?? index), maximum + index + 1])));
  }

  const remapReference = (key: DataKey, id: unknown) => {
    const mapped = idMaps.get(key)?.get(String(id));
    if (mapped !== undefined) return mapped;
    const original = Number(id);
    return Number.isFinite(original) ? original : 0;
  };

  for (const key of DATA_KEYS) {
    const incoming = inputs.get(key) || [];
    if (!incoming.length) continue;
    const idMap = idMaps.get(key)!;
    let merged: Record<string, unknown>[] = incoming.map((record, index) => ({
      ...record,
      id: idMap.get(String(record.id ?? index)) ?? index + 1,
      _imported: true,
    }));

    if (key === "sales") {
      merged = merged.map((record) => ({
        ...record,
        customerId: record.customerId === null || record.customerId === undefined ? null : remapReference("customers", record.customerId),
        items: Array.isArray(record.items) ? (record.items as Record<string, unknown>[]).map((item) => ({
          ...item,
          productId: remapReference("products", item.productId),
        })) : [],
      }));
    } else if (key === "debt_payments") {
      merged = merged.map((record) => ({ ...record, customerId: remapReference("customers", record.customerId) }));
    } else if (key === "stock_replenishments") {
      merged = merged.map((record) => ({
        ...record,
        items: Array.isArray(record.items) ? (record.items as Record<string, unknown>[]).map((item) => ({
          ...item,
          productId: remapReference("products", item.productId),
        })) : [],
      }));
    }
    (next as unknown as Record<string, unknown>)[key] = [...current[key], ...merged];
  }
  return next;
}
