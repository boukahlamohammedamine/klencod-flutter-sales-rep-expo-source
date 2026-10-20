import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Customer, DebtPayment, Expense, PriceType, Product, SalesData, Settings, StockReplenishment, CartLine, Sale } from "@/lib/sales-domain";
import { createDemoData, DATA_KEYS, nowISO, saleTotals, todayISO } from "@/lib/sales-domain";
import { mergeBackupRecords } from "@/lib/backup-utils";

const STORAGE_KEY = "sales-rep-data-v1";
type ImportMode = "merge" | "replace";
type NewProduct = Omit<Product, "id" | "createdAt"> & { id?: number; createdAt?: string };
type NewCustomer = Omit<Customer, "id" | "createdAt"> & { id?: number; createdAt?: string };
type StoreApi = SalesData & {
  ready: boolean;
  saveSettings: (settings: Settings) => void;
  saveProduct: (product: NewProduct) => number;
  deleteProduct: (id: number) => void;
  replenish: (input: Omit<StockReplenishment, "id">) => void;
  saveCustomer: (customer: NewCustomer) => number;
  deleteCustomer: (id: number) => void;
  addDebtPayment: (payment: Omit<DebtPayment, "id" | "createdAt">) => void;
  createSale: (input: { customerId: number | null; priceType: PriceType; cart: CartLine[]; discount: number; paid: number; paymentType: string; notes: string }) => Sale;
  deleteSale: (id: number) => void;
  saveExpense: (expense: Omit<Expense, "id" | "createdAt"> & { id?: number }) => number;
  deleteExpense: (id: number) => void;
  backup: () => object;
  importBackup: (backup: Record<string, unknown>, mode: ImportMode, importSettings: boolean) => number;
  clearAll: () => void;
};
const StoreContext = createContext<StoreApi | null>(null);
const idFor = (items: { id: number }[]) => items.length ? Math.max(...items.map((item) => item.id || 0)) + 1 : 1;

export function SalesStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SalesData>(() => createDemoData());
  const [ready, setReady] = useState(false);
  const stateRef = useRef(data);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<SalesData>;
          const demo = createDemoData();
          const restored = { ...demo, ...saved, settings: { ...demo.settings, ...(saved.settings || {}) } } as SalesData;
          if (mounted) { stateRef.current = restored; setData(restored); }
        } else {
          const demo = createDemoData();
          stateRef.current = demo; setData(demo);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
        }
      } catch {
        // Keep a usable local demo if the device store is not readable yet.
      } finally { if (mounted) setReady(true); }
    })();
    return () => { mounted = false; };
  }, []);
  const commit = useCallback((mutate: (current: SalesData) => SalesData) => {
    const next = mutate(stateRef.current);
    stateRef.current = next;
    setData(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);
  const saveSettings = useCallback((settings: Settings) => commit((d) => ({ ...d, settings })), [commit]);
  const saveProduct = useCallback((input: NewProduct) => {
    const current = stateRef.current;
    const id = input.id ?? idFor(current.products);
    const prior = current.products.find((product) => product.id === id);
    const product: Product = { ...input, id, name: input.name.trim(), createdAt: input.createdAt || prior?.createdAt || nowISO() };
    commit((d) => ({ ...d, products: prior ? d.products.map((p) => p.id === id ? product : p) : [...d.products, product] }));
    return id;
  }, [commit]);
  const deleteProduct = useCallback((id: number) => commit((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) })), [commit]);
  const replenish = useCallback((input: Omit<StockReplenishment, "id">) => {
    commit((d) => ({
      ...d,
      products: d.products.map((p) => ({ ...p, stock: p.stock + (input.items.find((i) => i.productId === p.id)?.qty || 0) })),
      stock_replenishments: [...d.stock_replenishments, { ...input, id: idFor(d.stock_replenishments) }],
    }));
  }, [commit]);
  const saveCustomer = useCallback((input: NewCustomer) => {
    const current = stateRef.current; const id = input.id ?? idFor(current.customers);
    const prior = current.customers.find((c) => c.id === id);
    const customer: Customer = { ...input, id, name: input.name.trim(), createdAt: input.createdAt || prior?.createdAt || nowISO() };
    commit((d) => ({ ...d, customers: prior ? d.customers.map((c) => c.id === id ? customer : c) : [...d.customers, customer] }));
    return id;
  }, [commit]);
  const deleteCustomer = useCallback((id: number) => commit((d) => ({ ...d, customers: d.customers.filter((c) => c.id !== id) })), [commit]);
  const addDebtPayment = useCallback((input: Omit<DebtPayment, "id" | "createdAt">) => commit((d) => ({
    ...d, debt_payments: [...d.debt_payments, { ...input, id: idFor(d.debt_payments), createdAt: nowISO() }],
  })), [commit]);
  const createSale = useCallback((input: { customerId: number | null; priceType: PriceType; cart: CartLine[]; discount: number; paid: number; paymentType: string; notes: string }) => {
    const current = stateRef.current;
    if (!input.cart.length) throw new Error("أضف منتجًا واحدًا على الأقل");
    for (const line of input.cart) {
      const available = current.products.find((p) => p.id === line.product.id)?.stock ?? 0;
      if (line.quantity > available) throw new Error(`الكمية تتجاوز مخزون ${line.product.name}`);
    }
    const totals = saleTotals(input.cart, input.discount, input.paid);
    const customer = current.customers.find((c) => c.id === input.customerId);
    const sale: Sale = {
      id: idFor(current.sales), customerId: input.customerId, customerName: customer?.name || "عميل عرضي",
      items: input.cart.map(({ product, quantity, price }) => ({
        productId: product.id, name: product.name, unit: product.unit || "قطعة", qty: quantity,
        price, factoryPrice: product.factoryPrice || 0, total: quantity * price,
        profit: (price - (product.factoryPrice || 0)) * quantity,
      })),
      subtotal: totals.subtotal, discount: Number(input.discount) || 0, total: totals.total,
      grossProfit: totals.grossProfit, paid: totals.paid, remaining: totals.remaining,
      paymentType: input.paymentType, priceType: input.priceType, notes: input.notes, date: nowISO(),
    };
    commit((d) => ({
      ...d,
      products: d.products.map((p) => ({ ...p, stock: Math.max(0, p.stock - (input.cart.find((line) => line.product.id === p.id)?.quantity || 0)) })),
      sales: [...d.sales, sale],
    }));
    return sale;
  }, [commit]);
  const deleteSale = useCallback((id: number) => {
    const sale = stateRef.current.sales.find((item) => item.id === id);
    if (!sale) return;
    commit((d) => ({
      ...d,
      products: d.products.map((product) => {
        const returned = sale.items.reduce((sum, item) => sum + (Number(item.productId) === product.id ? Number(item.qty) || 0 : 0), 0);
        return returned ? { ...product, stock: product.stock + returned } : product;
      }),
      sales: d.sales.filter((item) => item.id !== id),
    }));
  }, [commit]);
  const saveExpense = useCallback((input: Omit<Expense, "id" | "createdAt"> & { id?: number }) => {
    const current = stateRef.current; const id = input.id ?? idFor(current.expenses);
    const prior = current.expenses.find((e) => e.id === id);
    const expense: Expense = { ...input, id, createdAt: prior?.createdAt || nowISO() };
    commit((d) => ({ ...d, expenses: prior ? d.expenses.map((e) => e.id === id ? expense : e) : [...d.expenses, expense] }));
    return id;
  }, [commit]);
  const deleteExpense = useCallback((id: number) => commit((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) })), [commit]);
  const backup = useCallback(() => ({ ...stateRef.current, exportedAt: nowISO(), appVersion: "3.0" }), []);
  const importBackup = useCallback((backupData: Record<string, unknown>, mode: ImportMode, importSettings: boolean) => {
    const current = stateRef.current;
    const hasData = DATA_KEYS.some((key) => Array.isArray(backupData[key]));
    if (!hasData) throw new Error("الملف لا يحتوي على بيانات صالحة");
    let next: SalesData = { ...current };
    if (mode === "replace") {
      for (const key of DATA_KEYS) (next as unknown as Record<string, unknown>)[key] = Array.isArray(backupData[key]) ? backupData[key] : [];
    } else {
      next = mergeBackupRecords(current, backupData);
    }
    if (importSettings && backupData.settings && typeof backupData.settings === "object") {
      next.settings = { ...next.settings, ...(backupData.settings as Partial<Settings>) };
    }
    commit(() => next);
    return DATA_KEYS.reduce((count, key) => count + (Array.isArray(backupData[key]) ? (backupData[key] as unknown[]).length : 0), 0);
  }, [commit]);
  const clearAll = useCallback(() => commit((d) => ({ ...d, products: [], customers: [], sales: [], expenses: [], stock_replenishments: [], debt_payments: [] })), [commit]);
  const value = useMemo<StoreApi>(() => ({ ...data, ready, saveSettings, saveProduct, deleteProduct, replenish, saveCustomer, deleteCustomer, addDebtPayment, createSale, deleteSale, saveExpense, deleteExpense, backup, importBackup, clearAll }), [data, ready, saveSettings, saveProduct, deleteProduct, replenish, saveCustomer, deleteCustomer, addDebtPayment, createSale, deleteSale, saveExpense, deleteExpense, backup, importBackup, clearAll]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useSalesStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useSalesStore must be used within SalesStoreProvider");
  return value;
}
