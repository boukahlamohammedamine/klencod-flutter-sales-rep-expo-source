export type PriceType = "factory" | "wholesale" | "retail";
export type ExpenseCategory = "fuel" | "food" | "phone" | "transport" | "other";

export type Product = {
  id: number; name: string; unit: string; stock: number; minStock: number;
  factoryPrice: number; wholesalePrice: number; retailPrice: number; createdAt: string;
};
export type Customer = {
  id: number; name: string; phone?: string; type?: string; address?: string; createdAt: string;
};
export type SaleItem = {
  productId: number; name: string; unit: string; qty: number; price: number;
  factoryPrice: number; total: number; profit: number;
};
export type Sale = {
  id: number; customerId: number | null; customerName: string; items: SaleItem[];
  subtotal: number; discount: number; total: number; grossProfit: number; paid: number;
  remaining: number; paymentType: string; priceType: PriceType; notes: string; date: string;
};
export type Expense = {
  id: number; category: ExpenseCategory; date: string; amount: number; description: string; createdAt: string;
};
export type StockItem = { productId: number; name: string; qty: number };
export type StockReplenishment = { id: number; date: string; voucher: string; note: string; items: StockItem[] };
export type DebtPayment = { id: number; customerId: number; amount: number; date: string; note: string; createdAt: string };
export type Settings = { repName: string; company: string; phone: string; currency: string; marginTarget: number };
export type SalesData = {
  products: Product[]; customers: Customer[]; sales: Sale[]; expenses: Expense[];
  stock_replenishments: StockReplenishment[]; debt_payments: DebtPayment[]; settings: Settings;
};

export const DATA_KEYS = ["products", "customers", "sales", "expenses", "stock_replenishments", "debt_payments"] as const;
export const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string; icon: string }[] = [
  { key: "fuel", label: "وقود", icon: "gas-station" },
  { key: "food", label: "طعام", icon: "food" },
  { key: "phone", label: "اتصال", icon: "cellphone" },
  { key: "transport", label: "نقل", icon: "bus" },
  { key: "other", label: "أخرى", icon: "bookmark" },
];
export const PRICE_LABEL: Record<PriceType, string> = { factory: "مصنع", wholesale: "جملة", retail: "تجزئة" };
export const DEFAULT_SETTINGS: Settings = { repName: "أحمد بوزيد", company: "شركة الفجر للتوزيع", phone: "0555-123-456", currency: "دج", marginTarget: 20 };

export const nowISO = () => new Date().toISOString();
export const todayISO = () => new Date().toISOString().slice(0, 10);
export function money(value: number | null | undefined, currency = "دج") {
  return `${Number(value || 0).toFixed(2).replace(/\.00$/, "")} ${currency}`;
}
export function marginPercent(cost: number, sell: number) {
  return sell > 0 ? ((sell - cost) / sell) * 100 : 0;
}
export function marginAmount(cost: number, sell: number, quantity = 1) {
  return (sell - cost) * quantity;
}
export function productPrice(product: Product, type: PriceType) {
  if (type === "factory") return product.factoryPrice || 0;
  if (type === "wholesale") return product.wholesalePrice || 0;
  return product.retailPrice || 0;
}
export function customerDebt(data: Pick<SalesData, "sales" | "debt_payments">, customerId: number) {
  const invoiceBalances = data.sales.filter((sale) => Number(sale.customerId) === customerId)
    .reduce((sum, sale) => sum + (sale.remaining || 0), 0);
  const payments = data.debt_payments.filter((payment) => Number(payment.customerId) === customerId)
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);
  return invoiceBalances - payments;
}
export function totalDebt(data: SalesData) {
  return data.customers.reduce((sum, customer) => sum + Math.max(0, customerDebt(data, customer.id)), 0);
}

export type CartLine = { product: Product; quantity: number; price: number };
export type SaleTotals = { subtotal: number; total: number; grossProfit: number; paid: number; remaining: number };
export function saleTotals(cart: CartLine[], discount: number, paid: number): SaleTotals {
  const subtotal = cart.reduce((sum, line) => sum + line.quantity * line.price, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const grossProfit = cart.reduce((sum, line) => sum + marginAmount(line.product.factoryPrice || 0, line.price, line.quantity), 0) - (Number(discount) || 0);
  const remaining = total - (Number(paid) || 0);
  return { subtotal, total, grossProfit, paid: Number(paid) || 0, remaining };
}

export type ReportSummary = {
  from: string; to: string; sales: Sale[]; expenses: Expense[]; totalRevenue: number;
  totalGrossProfit: number; totalCostOfGoods: number; totalExpenses: number; netProfit: number; grossMarginPct: number;
  cashIn: number; creditOut: number; totalDebtAll: number;
  byPrice: { type: PriceType; count: number; revenue: number; profit: number }[];
  topItems: { name: string; qty: number; revenue: number; profit: number }[];
  expenseBreakdown: { category: ExpenseCategory; amount: number }[];
};
export function buildReport(data: SalesData, from: string, to: string): ReportSummary {
  const sales = data.sales.filter((sale) => { const date = (sale.date || "").slice(0, 10); return date >= from && date <= to; });
  const expenses = data.expenses.filter((expense) => expense.date >= from && expense.date <= to);
  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalGrossProfit = sales.reduce((sum, sale) => sum + (sale.grossProfit || 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const itemMap = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
  for (const sale of sales) for (const item of sale.items || []) {
    const current = itemMap.get(item.name) || { name: item.name, qty: 0, revenue: 0, profit: 0 };
    current.qty += item.qty || 0; current.revenue += item.total || 0; current.profit += item.profit || 0;
    itemMap.set(item.name, current);
  }
  const categoryMap = new Map<ExpenseCategory, number>();
  for (const expense of expenses) categoryMap.set(expense.category, (categoryMap.get(expense.category) || 0) + (expense.amount || 0));
  const byPrice = (["factory", "wholesale", "retail"] as PriceType[]).map((type) => {
    const set = sales.filter((sale) => sale.priceType === type);
    return { type, count: set.length, revenue: set.reduce((n, sale) => n + (sale.total || 0), 0), profit: set.reduce((n, sale) => n + (sale.grossProfit || 0), 0) };
  });
  return {
    from, to, sales, expenses, totalRevenue, totalGrossProfit, totalExpenses,
    totalCostOfGoods: totalRevenue - totalGrossProfit,
    netProfit: totalGrossProfit - totalExpenses,
    grossMarginPct: totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0,
    cashIn: sales.filter((sale) => sale.paymentType === "نقدي").reduce((sum, sale) => sum + (sale.paid || 0), 0),
    creditOut: sales.filter((sale) => sale.paymentType === "آجل").reduce((sum, sale) => sum + (sale.remaining || 0), 0),
    totalDebtAll: totalDebt(data), byPrice,
    topItems: [...itemMap.values()].sort((a, b) => b.profit - a.profit).slice(0, 5),
    expenseBreakdown: [...categoryMap.entries()].map(([category, amount]) => ({ category, amount })),
  };
}

export function createDemoData(): SalesData {
  const stamp = nowISO();
  return {
    settings: { ...DEFAULT_SETTINGS },
    products: [
      { id: 1, name: "زيت الطاولة 1L", unit: "قطعة", stock: 80, minStock: 15, factoryPrice: 220, wholesalePrice: 255, retailPrice: 290, createdAt: stamp },
      { id: 2, name: "سكر أبيض 1Kg", unit: "كيس", stock: 120, minStock: 25, factoryPrice: 75, wholesalePrice: 88, retailPrice: 100, createdAt: stamp },
      { id: 3, name: "حليب مبستر 1L", unit: "قطعة", stock: 8, minStock: 20, factoryPrice: 80, wholesalePrice: 92, retailPrice: 105, createdAt: stamp },
      { id: 4, name: "قهوة نسكافيه 200g", unit: "علبة", stock: 0, minStock: 10, factoryPrice: 320, wholesalePrice: 370, retailPrice: 420, createdAt: stamp },
      { id: 5, name: "مسحوق غسيل 1Kg", unit: "علبة", stock: 45, minStock: 10, factoryPrice: 180, wholesalePrice: 210, retailPrice: 240, createdAt: stamp },
    ],
    customers: [
      { id: 1, name: "متجر الأمانة", phone: "0551-234-567", type: "جملة", address: "حي النصر", createdAt: stamp },
      { id: 2, name: "محل بركات", phone: "0661-345-678", type: "تجزئة", address: "السوق المركزي", createdAt: stamp },
      { id: 3, name: "سوبرماركت الفرح", phone: "0771-456-789", type: "جملة", address: "شارع الاستقلال", createdAt: stamp },
    ], sales: [], expenses: [], stock_replenishments: [], debt_payments: [],
  };
}
