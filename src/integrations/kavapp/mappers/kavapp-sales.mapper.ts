import { discountToPaidRatio, percent, round } from "../../../common/lib/math";
import { isNumber, isString } from "../../../common/utils/guards";
import { formatDateToTime } from "../../../common/utils/date/date";
import type {
    KavappCheckItem,
    KavappDailySalesRaw,
    KavappHourlyReportItem,
    KavappWorkReportItem,
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
    WorkShiftSummary,
} from "../types/sales/kavapp-sales-analytics.types";

const kavappCheckStatuses = {
    completed: "3",
    cancelled: "0",
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
            workShift: this.buildWorkShift(raw.workReport),
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
        const discountReports = raw.discountReport ?? [];
        const cardMap = new Map((raw.cardsList ?? []).map((c) => [c.cardnumber.trim(), c]));
        const discountMap = new Map((raw.discountsList ?? []).map((d) => [d.id.trim(), d]));

        let totalDiscountAmount = 0;
        let checksWithDiscount = 0;
        let totalDiscountItems = 0;
        const byDiscountId: DiscountSummaryById[] = [];

        for (const dr of discountReports) {
            const cardNum = dr.iddiscount?.trim() ?? "";
            const checksCount = parseInt(dr.checkscount || "0", 10);
            const itemsCount = parseInt(dr.itemcount || "0", 10);
            const paidPrice = this.parseNumber(dr.totalprice);

            const card = cardMap.get(cardNum);
            const disc = card ? discountMap.get(card.discountid.trim()) : discountMap.get(cardNum);

            const percentValue =
                this.parseNumber(disc?.dvalue) || this.parseNumber(disc?.pvalue) || parseFloat(cardNum) || 0;

            const name = card?.dicountname?.trim() || disc?.name?.trim() || `Дисконт №${cardNum}`;

            const discountAmount =
                percentValue > 0 && percentValue < 100 ? paidPrice * discountToPaidRatio(percentValue) : 0;

            totalDiscountAmount += discountAmount;
            checksWithDiscount += checksCount;
            totalDiscountItems += itemsCount;

            byDiscountId.push({
                id: cardNum,
                name,
                percent: percentValue,
                checksCount,
                itemsCount,
                discountAmount: round(discountAmount),
            });
        }

        byDiscountId.sort((a, b) => b.checksCount - a.checksCount);

        const discountPercentOfChecks = totalChecks > 0 ? percent(checksWithDiscount, totalChecks, 1) : 0;

        return {
            checksWithDiscount,
            discountPercentOfChecks,
            totalDiscountItems,
            totalDiscountAmount: round(totalDiscountAmount),
            byDiscountId,
            morningPromo: this.buildMorningPromo(raw, completedChecks),
        };
    }

    private static buildMorningPromo(
        raw: KavappDailySalesRaw,
        completedChecks: CheckItem[],
    ): MorningPromoStats | undefined {
        const activePromos = (raw.promotionsList ?? []).filter((p) => p.status === "1" && p.old === "0");

        const timePromo = activePromos.find((p) => Boolean(p.tstart && p.tend && p.value));
        if (!timePromo) {
            return undefined;
        }

        const from = timePromo.tstart.slice(0, 5);
        const to = timePromo.tend.slice(0, 5);
        const promoPercent = this.parseNumber(timePromo.value);
        const timeRange = `${from} - ${to}`;

        const promoChecks = completedChecks.filter((c) => this.isTimeInRange(c.dtime, from, to));
        const promoItems = raw.reportNew.filter((r) => this.isTimeInRange(r.dtime, from, to));

        const revenue = this.sumBy(promoChecks, (c) => this.parseNumber(c.totalprice));
        const itemsSold = this.sumBy(promoItems, (r) => this.parseNumber(r.value, 1));

        const discountGiven =
            promoPercent > 0 && promoPercent < 100 ? revenue * discountToPaidRatio(promoPercent) : 0;

        return {
            name: "Ранкова акція",
            timeRange,
            percent: promoPercent,
            checksCount: promoChecks.length,
            itemsSold,
            revenue: round(revenue),
            discountGiven: round(discountGiven),
        };
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

    private static isTimeInRange(dtime?: string, from = "07:30", to = "11:00"): boolean {
        const time = this.getTimeString(dtime);

        if (!time) return false;

        const hourMinute = time.padStart(8, "0").slice(0, 5);

        return hourMinute >= from && hourMinute < to;
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

    private static buildWorkShift(workReport?: KavappWorkReportItem[]) {
        if (!workReport?.length) return undefined;

        let earliestStart: string | undefined;
        let latestEnd: string | undefined;

        for (const shift of workReport) {
            if (shift.sdtime && (!earliestStart || shift.sdtime < earliestStart)) {
                earliestStart = shift.sdtime;
            }

            if (shift.edtime && (!latestEnd || shift.edtime > latestEnd)) {
                latestEnd = shift.edtime;
            }
        }

        if (!earliestStart && !latestEnd) return undefined;

        const workShiftSummary: WorkShiftSummary = {
            startTime: formatDateToTime(earliestStart),
            endTime: formatDateToTime(latestEnd),
        };

        return workShiftSummary;
    }
}
