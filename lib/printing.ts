import * as Print from "expo-print";
import type { ReportSummary, Sale, Settings } from "@/lib/sales-domain";
import { EXPENSE_CATEGORIES, money, PRICE_LABEL } from "@/lib/sales-domain";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
const documentHtml = (title: string, body: string) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}body{font-family:Arial,Tahoma,sans-serif;color:#172019;margin:24px;direction:rtl}h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 8px}.muted{color:#637064;font-size:12px}.head{border-bottom:2px solid #798d51;padding-bottom:14px;margin-bottom:16px}.meta{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #ddd}.strong{font-weight:700}.summary{background:#eef2e6;border-radius:10px;padding:12px;margin-top:14px}.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e2e5df}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}th{background:#eef2e6}th,td{text-align:right;padding:7px 5px;border-bottom:1px solid #dce1da}.total{font-size:17px;font-weight:bold}.foot{text-align:center;color:#637064;font-size:11px;margin-top:25px}@media print{body{margin:12mm}}
</style><title>${escapeHtml(title)}</title></head><body>${body}</body></html>`;

export async function printSaleReceipt(sale: Sale, settings: Settings) {
  const rows = sale.items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.qty} ${escapeHtml(item.unit)}</td><td>${money(item.price, settings.currency)}</td><td>${money(item.total, settings.currency)}</td></tr>`).join("");
  const html = documentHtml(`فاتورة ${sale.id}`, `<header class="head"><h1>${escapeHtml(settings.company || "الشركة")}</h1><div class="muted">المندوب: ${escapeHtml(settings.repName || "—")} ${settings.phone ? `· ${escapeHtml(settings.phone)}` : ""}</div></header>
    <div class="meta"><span>فاتورة رقم <b>#${sale.id}</b></span><span>${escapeHtml(new Date(sale.date).toLocaleString("ar-DZ"))}</span></div>
    <div class="meta"><span>العميل: ${escapeHtml(sale.customerName || "عميل عرضي")}</span><span>السعر: ${PRICE_LABEL[sale.priceType]}</span></div>
    <div class="meta"><span>طريقة الدفع: ${escapeHtml(sale.paymentType)}</span><span></span></div>
    <table><thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr></thead><tbody>${rows}</tbody></table>
    <section class="summary">${sale.discount > 0 ? `<div class="row"><span>المجموع</span><span>${money(sale.subtotal, settings.currency)}</span></div><div class="row"><span>الخصم</span><span>− ${money(sale.discount, settings.currency)}</span></div>` : ""}
    <div class="row total"><span>الإجمالي</span><span>${money(sale.total, settings.currency)}</span></div>
    <div class="row"><span>المدفوع</span><span>${money(sale.paid, settings.currency)}</span></div>${sale.remaining > 0 ? `<div class="row"><span>الباقي</span><span>${money(sale.remaining, settings.currency)}</span></div>` : ""}</section>
    ${sale.notes ? `<p class="muted">ملاحظة: ${escapeHtml(sale.notes)}</p>` : ""}<div class="foot">شكرًا لتعاملكم</div>`);
  await Print.printAsync({ html });
}

export async function printPeriodReport(report: ReportSummary, settings: Settings) {
  const salesRows = [...report.sales].sort((a, b) => b.id - a.id).map((sale) => {
    const margin = sale.total > 0 ? ((sale.grossProfit || 0) / sale.total) * 100 : 0;
    return `<tr><td>#${sale.id}</td><td>${escapeHtml(sale.customerName)}</td><td>${escapeHtml(sale.date.slice(0, 10))}</td><td>${PRICE_LABEL[sale.priceType]}</td><td>${escapeHtml(sale.paymentType)}</td><td>${money(sale.total, settings.currency)}</td><td>${money(sale.grossProfit, settings.currency)}</td><td>${margin.toFixed(1)}%</td><td>${money(sale.remaining, settings.currency)}</td></tr>`;
  }).join("");
  const expenseRows = report.expenses.map((expense) => `<tr><td>${escapeHtml(expense.date)}</td><td>${EXPENSE_CATEGORIES.find((category) => category.key === expense.category)?.label || "أخرى"}</td><td>${escapeHtml(expense.description || "—")}</td><td>${money(expense.amount, settings.currency)}</td></tr>`).join("");
  const expenseTotals = report.expenseBreakdown.map((entry) => `<tr><td>${EXPENSE_CATEGORIES.find((category) => category.key === entry.category)?.label || "أخرى"}</td><td>${money(entry.amount, settings.currency)}</td></tr>`).join("");
  const itemRows = report.topItems.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.qty}</td><td>${money(item.revenue, settings.currency)}</td><td>${money(item.profit, settings.currency)}</td></tr>`).join("");
  const html = documentHtml("تقرير المبيعات", `<header class="head"><h1>${escapeHtml(settings.company || "الشركة")} · تقرير المبيعات</h1><div class="muted">المندوب: ${escapeHtml(settings.repName)} · الفترة: ${escapeHtml(report.from)} — ${escapeHtml(report.to)}</div></header>
    <section class="summary"><div class="row"><span>إجمالي المبيعات</span><span>${money(report.totalRevenue, settings.currency)}</span></div><div class="row"><span>تكلفة البضاعة المباعة</span><span>− ${money(report.totalCostOfGoods, settings.currency)}</span></div><div class="row"><span>ربح المبيعات</span><span>${money(report.totalGrossProfit, settings.currency)}</span></div><div class="row"><span>المصاريف</span><span>− ${money(report.totalExpenses, settings.currency)}</span></div><div class="row total"><span>صافي الربح</span><span>${money(report.netProfit, settings.currency)}</span></div><div class="row"><span>هامش الربح</span><span>${report.grossMarginPct.toFixed(1)}% (هدف ${settings.marginTarget || 20}%)</span></div><div class="row"><span>التحصيل النقدي</span><span>${money(report.cashIn, settings.currency)}</span></div><div class="row"><span>المصاريف المدفوعة</span><span>− ${money(report.totalExpenses, settings.currency)}</span></div><div class="row"><span>مبيعات آجلة متبقية</span><span>${money(report.creditOut, settings.currency)}</span></div><div class="row"><span>إجمالي ديون العملاء</span><span>${money(report.totalDebtAll, settings.currency)}</span></div></section>
    <h2>المبيعات حسب نوع السعر</h2><table><thead><tr><th>النوع</th><th>عدد الفواتير</th><th>المبيعات</th><th>الربح</th></tr></thead><tbody>${report.byPrice.map((item) => `<tr><td>${PRICE_LABEL[item.type]}</td><td>${item.count}</td><td>${money(item.revenue, settings.currency)}</td><td>${money(item.profit, settings.currency)}</td></tr>`).join("")}</tbody></table>
    <h2>الفواتير (${report.sales.length})</h2><table><thead><tr><th>رقم</th><th>العميل</th><th>التاريخ</th><th>نوع السعر</th><th>الدفع</th><th>الإجمالي</th><th>الربح</th><th>الهامش</th><th>المتبقي</th></tr></thead><tbody>${salesRows || "<tr><td colspan='9'>لا توجد فواتير في الفترة</td></tr>"}</tbody></table>
    <h2>أعلى المنتجات ربحًا</h2><table><thead><tr><th>المنتج</th><th>الكمية</th><th>المبيعات</th><th>الربح</th></tr></thead><tbody>${itemRows || "<tr><td colspan='4'>—</td></tr>"}</tbody></table>
    <h2>المصاريف حسب الفئة</h2><table><thead><tr><th>الفئة</th><th>المجموع</th></tr></thead><tbody>${expenseTotals || "<tr><td colspan='2'>لا توجد مصاريف</td></tr>"}</tbody></table>
    <h2>تفاصيل المصاريف (${report.expenses.length})</h2><table><thead><tr><th>التاريخ</th><th>الفئة</th><th>الوصف</th><th>المبلغ</th></tr></thead><tbody>${expenseRows || "<tr><td colspan='4'>لا توجد مصاريف في الفترة</td></tr>"}</tbody></table><div class="foot">تم إنشاء التقرير من تطبيق مندوب المبيعات</div>`);
  await Print.printAsync({ html });
}
