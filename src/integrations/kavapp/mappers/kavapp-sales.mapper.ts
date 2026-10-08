import { discountToPaidRatio, percent, round } from "../../../common/lib/math";
import type {
    KavappCheckItem,
    KavappDailySalesRaw,
    KavappHourlyReportItem,
} from "../types/sales/kavapp-sales-raw.types";
import type {
    CashAuditSummary,
    CategorySalesSummary,
    DiscountStats,
    DiscountSummaryById,
    HourlySalesSummary,
    KavappDailySalesAnalytics,
    MorningPromoStats,
    ProductSalesSummary,
} from "../types/sales/kavapp-sales-analytics.types";
import { isNumber, isString } from "common/utils/guards";

const kavappCheckStatuses = {
    completed: "3",
    cancelled: "0",
} as const;

const morningPromo = {
    from: "08:00",
    to: "11:00",
    discountPercent: 20,
} as const;

type KavappCheckStatus = (typeof kavappCheckStatuses)[keyof typeof kavappCheckStatuses];

type CheckItem = KavappDailySalesRaw["checksReport"][number];
type ReportItem = KavappDailySalesRaw["reportNew"][number];
type FinanceItem = NonNullable<KavappDailySalesRaw["financeReport"]>[number];
type ProductsAnalytics = KavappDailySalesAnalytics["products"];

interface PaymentTotals {
    totalRevenue: number;
    cashTotal: number;
    terminalTotal: number;
    cashAudit?: CashAuditSummary;
}

interface DiscountIdStats {
    checks: number;
    items: number;
    amount: number;
}

export class KavappSalesMapper {
    static analyze(raw: KavappDailySalesRaw): KavappDailySalesAnalytics {
        const completedChecks = this.filterChecksByStatus(raw.checksReport, kavappCheckStatuses.completed);
        const cancelledChecks = this.filterChecksByStatus(raw.checksReport, kavappCheckStatuses.cancelled);
        const paymentTotals = this.calculatePayments(raw, completedChecks);

        const kavappDailySalesAnalytics: KavappDailySalesAnalytics = {
            summary: this.buildSummary(raw, completedChecks, cancelledChecks, paymentTotals),
            cashAudit: paymentTotals.cashAudit,
            hourly: this.buildHourly(raw.hourlyReport),
            discounts: this.buildDiscounts(raw, completedChecks),
            products: this.buildProducts(raw),
            cashiers: this.collectCashiers(raw),
        };

        return kavappDailySalesAnalytics;
    }

    private static filterChecksByStatus(checks: KavappCheckItem[], status: KavappCheckStatus) {
        return checks.filter((check) => check.status === status);
    }

    private static calculatePayments(raw: KavappDailySalesRaw, completedChecks: CheckItem[]): PaymentTotals {
        const [financeReport] = raw.financeReport ?? [];

        return financeReport
            ? this.calculatePaymentsFromFinanceReport(financeReport)
            : this.calculatePaymentsFromChecks(completedChecks);
    }

    private static calculatePaymentsFromFinanceReport(finance: FinanceItem): PaymentTotals {
        const totalRevenue = this.parseNumber(finance.kasa);
        const cashTotal = this.parseNumber(finance.cash);
        const terminalTotal = this.parseNumber(finance.terminal);

        const startCash = this.parseNumber(finance.schange);
        const endCash = this.parseNumber(finance.echange);
        const expenses = this.parseNumber(finance.shopping);
        const collection = this.parseNumber(finance.autoCashCollection);
        const returns = this.parseNumber(finance.totalReturn);

        const expectedEndCash = startCash + cashTotal - expenses - collection - returns;

        const cashAudit: CashAuditSummary = {
            cashRevenue: round(cashTotal),
            startCash: round(startCash),
            expenses: round(expenses),
            endCash: round(endCash),
            difference: round(endCash - expectedEndCash),
            collection: round(collection),
            returns: round(returns),
        };

        return { totalRevenue, cashTotal, terminalTotal, cashAudit };
    }

    private static calculatePaymentsFromChecks(completedChecks: CheckItem[]) {
        const totalRevenue = this.sumBy(completedChecks, (c) => this.parseNumber(c.totalprice));
        const cashTotal = this.sumBy(completedChecks, (c) => this.getCheckCashAmount(c));
        const terminalTotal = this.sumBy(
            completedChecks,
            (c) => this.parseNumber(c.terminal) + this.parseNumber(c.card),
        );

        return { totalRevenue, cashTotal, terminalTotal };
    }

    private static getCheckCashAmount(check: CheckItem) {
        const cashGiven = this.parseNumber(check.cash);

        if (cashGiven > 0) {
            return Math.max(0, cashGiven - this.parseNumber(check.rest));
        }

        const nonCash = this.parseNumber(check.terminal) + this.parseNumber(check.card);

        return Math.max(0, this.parseNumber(check.totalprice) - nonCash);
    }

    private static buildSummary(
        raw: KavappDailySalesRaw,
        completedChecks: CheckItem[],
        cancelledChecks: CheckItem[],
        paymentTotals: PaymentTotals,
    ) {
        const totalChecks = completedChecks.length;
        const averageCheck = totalChecks > 0 ? paymentTotals.totalRevenue / totalChecks : 0;
        const totalItemsSold = this.sumBy(raw.reportNew, (item) => this.parseNumber(item.value, 1));

        return {
            totalChecks,
            cancelledChecks: cancelledChecks.length,
            totalRevenue: round(paymentTotals.totalRevenue),
            averageCheck: round(averageCheck),
            cashTotal: round(paymentTotals.cashTotal),
            terminalTotal: round(paymentTotals.terminalTotal),
            totalItemsSold,
        };
    }

    private static buildHourly(hourlyReport: KavappHourlyReportItem[]) {
        const hours: HourlySalesSummary[] = hourlyReport.map((kavappHourlyReportItem) => ({
            hour: kavappHourlyReportItem.hour,
            checks: parseInt(kavappHourlyReportItem.checks, 10),
            sales: parseInt(kavappHourlyReportItem.sales, 10),
            revenue: this.parseNumber(kavappHourlyReportItem.suma),
        }));

        const maxRevenue = Math.max(...hours.map((hour) => hour.revenue));
        const maxChecks = Math.max(...hours.map((hour) => hour.checks));
        const maxSales = Math.max(...hours.map((hour) => hour.sales));
        const minRevenue = Math.min(...hours.map((hour) => hour.revenue));
        const peakRevenueHours = hours.filter((hour) => hour.revenue === maxRevenue);
        const peakChecksHours = hours.filter((hour) => hour.checks === maxChecks);
        const peakSalesHours = hours.filter((hour) => hour.sales === maxSales);
        const slowestHours = hours.filter((hour) => hour.revenue === minRevenue);

        return {
            hours,
            peakRevenueHour: peakRevenueHours[0] ?? null,
            peakChecksHour: peakChecksHours[0] ?? null,
            slowestHour: slowestHours[0] ?? null,
            peakRevenueHours,
            peakChecksHours,
            peakSalesHours,
            slowestHours,
        };
    }

    private static buildDiscounts(raw: KavappDailySalesRaw, completedChecks: CheckItem[]): DiscountStats {
        const totalChecks = completedChecks.length;
        const discountChecks = completedChecks.filter((c) => this.hasDiscount(c.iddiscount));
        const discountedItems = raw.reportNew.filter((item) => this.hasDiscount(item.iddiscount));

        const discountIdMap = new Map<string, DiscountIdStats>();
        const getStats = (id: string): DiscountIdStats =>
            discountIdMap.get(id) ?? { checks: 0, items: 0, amount: 0 };

        for (const check of discountChecks) {
            const id = check.iddiscount.trim();
            const stats = getStats(id);
            stats.checks += 1;
            discountIdMap.set(id, stats);
        }

        let totalDiscountAmount = 0;
        for (const item of discountedItems) {
            const id = item.iddiscount.trim();
            const amount = this.calculateItemDiscount(item);
            totalDiscountAmount += amount;

            const stats = getStats(id);
            stats.items += this.parseNumber(item.value, 1);
            stats.amount += amount;
            discountIdMap.set(id, stats);
        }

        const byDiscountId: DiscountSummaryById[] = Array.from(discountIdMap.entries())
            .map(([id, stats]) => ({
                id,
                checksCount: stats.checks,
                itemsCount: stats.items,
                discountAmount: round(stats.amount),
            }))
            .sort((a, b) => b.checksCount - a.checksCount);

        return {
            checksWithDiscount: discountChecks.length,
            discountPercentOfChecks: percent(discountChecks.length, totalChecks, 1),
            totalDiscountItems: discountedItems.length,
            totalDiscountAmount: round(totalDiscountAmount),
            byDiscountId,
            morningPromo: this.buildMorningPromo(raw, completedChecks),
        };
    }

    private static buildMorningPromo(
        raw: KavappDailySalesRaw,
        completedChecks: CheckItem[],
    ): MorningPromoStats {
        const morningChecks = completedChecks.filter((c) => this.isMorningPromoTime(c.dtime));
        const morningItems = raw.reportNew.filter((r) => this.isMorningPromoTime(r.dtime));

        const revenue = this.sumBy(morningChecks, (c) => this.parseNumber(c.totalprice));
        const itemsSold = this.sumBy(morningItems, (r) => this.parseNumber(r.value, 1));

        let discountGiven = this.sumBy(morningItems, (item) => this.calculateItemDiscount(item));
        if (discountGiven === 0 && revenue > 0) {
            discountGiven = revenue * discountToPaidRatio(morningPromo.discountPercent);
        }

        return {
            timeRange: `${morningPromo.from} - ${morningPromo.to}`,
            checksCount: morningChecks.length,
            itemsSold,
            revenue: round(revenue),
            discountGiven: round(discountGiven),
        };
    }

    private static calculateItemDiscount(item: ReportItem): number {
        const qty = this.parseNumber(item.value, 1);
        const paid = this.parseNumber(item.price);
        const unit = this.parseNumber(item.unitPrice);

        if (unit > 0 && unit * qty > paid) {
            return unit * qty - paid;
        }

        const discountPercent = parseFloat(item.iddiscount ?? "");

        if (!isNaN(discountPercent) && discountPercent > 0 && discountPercent < 100) {
            return paid * discountToPaidRatio(discountPercent);
        }

        return 0;
    }

    private static hasDiscount(discountId?: string): boolean {
        return Boolean(discountId && discountId.trim() !== "" && discountId !== "0");
    }

    private static buildProducts(raw: KavappDailySalesRaw): ProductsAnalytics {
        const allProducts = this.buildProductList(raw);
        const allSoldProducts = [...allProducts].sort((a, b) => b.count - a.count);

        return {
            topByCount: allSoldProducts.slice(0, 10),
            topByRevenue: [...allProducts].sort((a, b) => b.totalPrice - a.totalPrice).slice(0, 10),
            allSoldProducts,
            categories: this.buildCategories(raw),
            totalUniqueItems: raw.avgReport.length,
        };
    }

    private static buildProductList(raw: KavappDailySalesRaw) {
        const productMap = new Map<string, ProductSalesSummary>();

        for (const p of raw.avgReport) {
            const name = p.name || "Невідомо";
            productMap.set(name, {
                name,
                count: this.parseNumber(p.count),
                totalPrice: round(this.parseNumber(p.totalPrice)),
                percent: round(this.parseNumber(p.percent), 2),
                avgPrice: round(this.parseNumber(p.avgprice)),
            });
        }

        return Array.from(productMap.values());
    }

    private static buildCategories(raw: KavappDailySalesRaw): CategorySalesSummary[] {
        return raw.groupReport && raw.groupReport.length > 0
            ? this.buildCategoriesFromGroupReport(raw.groupReport)
            : this.buildCategoriesFromItems(raw.reportNew);
    }

    private static buildCategoriesFromGroupReport(
        groupReport: NonNullable<KavappDailySalesRaw["groupReport"]>,
    ): CategorySalesSummary[] {
        return groupReport
            .map((g) => ({
                name: g.name?.trim() || "Інше",
                count: parseInt(g.count || "0", 10),
                revenue: round(this.parseNumber(g.totalPrice)),
            }))
            .filter((c) => c.count > 0)
            .sort((a, b) => b.count - a.count);
    }

    private static buildCategoriesFromItems(items: ReportItem[]): CategorySalesSummary[] {
        const aggregate = new Map<string, { count: number; revenue: number }>();

        for (const item of items) {
            const group = item.idgroup?.trim() || "Інше";
            const current = aggregate.get(group) ?? { count: 0, revenue: 0 };
            aggregate.set(group, {
                count: current.count + this.parseNumber(item.value, 1),
                revenue: current.revenue + this.parseNumber(item.price),
            });
        }

        return Array.from(aggregate.entries())
            .map(([name, stats]) => ({
                name,
                count: stats.count,
                revenue: round(stats.revenue),
            }))
            .sort((a, b) => b.count - a.count);
    }

    private static collectCashiers(raw: KavappDailySalesRaw) {
        const cashiers = new Set<string>();

        for (const c of raw.checksReport) {
            if (c.workername?.trim()) cashiers.add(c.workername.trim());
        }
        for (const r of raw.reportNew) {
            if (r.idworker?.trim()) cashiers.add(r.idworker.trim());
        }

        return Array.from(cashiers);
    }

    private static getTimeString(dtime?: string): string {
        if (!dtime) return "";

        const clean = dtime.trim();

        if (clean.includes(" ")) return clean.split(" ")[1] || "";

        if (clean.includes("T")) return clean.split("T")[1] || "";

        return clean;
    }

    private static isMorningPromoTime(dtime?: string): boolean {
        const time = this.getTimeString(dtime);

        if (!time) return false;

        const hourMinute = time.padStart(8, "0").slice(0, 5);

        return hourMinute >= morningPromo.from && hourMinute < morningPromo.to;
    }

    private static sumBy<T>(items: readonly T[], getValue: (item: T) => number): number {
        return items.reduce((sum, item) => sum + getValue(item), 0);
    }

    private static parseNumber(value: unknown, fallback = 0): number {
        if (isNumber(value)) return isNaN(value) ? fallback : value;

        if (isString(value)) {
            const parsed = parseFloat(value.trim());

            return isNaN(parsed) ? fallback : parsed;
        }
        return fallback;
    }
}
