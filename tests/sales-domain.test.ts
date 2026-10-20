import { describe, expect, it } from "vitest";
import { buildReport, customerDebt, marginAmount, marginPercent, saleTotals } from "../lib/sales-domain";
import type { SalesData } from "../lib/sales-domain";
import { mergeBackupRecords } from "../lib/backup-utils";

const base: SalesData = {
  products: [], customers: [{ id: 1, name: "عميل", createdAt: "2026-01-01" }],
  sales: [{ id: 1, customerId: 1, customerName: "عميل", items: [{ productId: 3, name: "صنف", unit: "قطعة", qty: 2, price: 12, factoryPrice: 8, total: 24, profit: 8 }], subtotal: 24, discount: 2, total: 22, grossProfit: 6, paid: 10, remaining: 12, paymentType: "آجل", priceType: "retail", notes: "", date: "2026-06-10T10:00:00.000Z" }],
  expenses: [{ id: 1, category: "fuel", date: "2026-06-10", amount: 3, description: "", createdAt: "2026-06-10" }],
  stock_replenishments: [], debt_payments: [{ id: 1, customerId: 1, amount: 4, date: "2026-06-11", note: "", createdAt: "2026-06-11" }],
  settings: { repName: "مندوب", company: "شركة", phone: "", currency: "دج", marginTarget: 20 },
};

describe("sales domain compatibility", () => {
  it("uses sale price as the margin percentage denominator", () => {
    expect(marginPercent(80, 100)).toBe(20);
    expect(marginPercent(80, 0)).toBe(0);
    expect(marginAmount(80, 100, 3)).toBe(60);
  });
  it("calculates subtotal, discounted total, gross profit, and remaining balance", () => {
    const product = { id: 1, name: "صنف", unit: "قطعة", stock: 5, minStock: 1, factoryPrice: 8, wholesalePrice: 10, retailPrice: 12, createdAt: "2026-01-01" };
    expect(saleTotals([{ product, quantity: 2, price: 12 }], 2, 10)).toEqual({ subtotal: 24, total: 22, grossProfit: 6, paid: 10, remaining: 12 });
  });
  it("subtracts registered debt payments from invoice balances", () => {
    expect(customerDebt(base, 1)).toBe(8);
  });
  it("builds the requested period's profit and expense summary", () => {
    const report = buildReport(base, "2026-06-01", "2026-06-30");
    expect(report.totalRevenue).toBe(22);
    expect(report.totalGrossProfit).toBe(6);
    expect(report.totalExpenses).toBe(3);
    expect(report.netProfit).toBe(3);
    expect(report.topItems[0]).toMatchObject({ name: "صنف", qty: 2, profit: 8 });
  });
  it("preserves customer and product links when backup records receive new IDs", () => {
    const current: SalesData = {
      ...base,
      products: [{ id: 5, name: "قديم", unit: "قطعة", stock: 0, minStock: 0, factoryPrice: 1, wholesalePrice: 1, retailPrice: 1, createdAt: "2026-01-01" }],
      customers: [{ id: 8, name: "موجود", createdAt: "2026-01-01" }], sales: [], stock_replenishments: [], debt_payments: [],
    };
    const imported: Record<string, unknown> = {
      products: [{ id: 2, name: "جديد", unit: "قطعة", stock: 10, minStock: 1, factoryPrice: 8, wholesalePrice: 10, retailPrice: 12, createdAt: "2026-01-02" }],
      customers: [{ id: 3, name: "مستورَد", createdAt: "2026-01-02" }],
      sales: [{ id: 4, customerId: 3, customerName: "مستورَد", items: [{ productId: 2, name: "جديد", unit: "قطعة", qty: 1, price: 12, factoryPrice: 8, total: 12, profit: 4 }], subtotal: 12, discount: 0, total: 12, grossProfit: 4, paid: 2, remaining: 10, paymentType: "آجل", priceType: "retail", notes: "", date: "2026-06-10" }],
      debt_payments: [{ id: 6, customerId: 3, amount: 2, date: "2026-06-11", note: "", createdAt: "2026-06-11" }],
      stock_replenishments: [{ id: 7, date: "2026-06-12", voucher: "R-7", note: "", items: [{ productId: 2, name: "جديد", qty: 1 }] }],
    };
    const result = mergeBackupRecords(current, imported);
    const sale = result.sales[0];
    expect(sale.customerId).toBe(9);
    expect(sale.items[0].productId).toBe(6);
    expect(result.debt_payments[0].customerId).toBe(9);
    expect(result.stock_replenishments[0].items[0].productId).toBe(6);
    expect(customerDebt(result, 9)).toBe(8);
  });
});
