interface KavappDailySalesSummary {
    totalChecks: number;
    cancelledChecks: number;
    totalRevenue: number;
    averageCheck: number;
    cashTotal: number;
    terminalTotal: number;
    totalItemsSold: number;
}

interface KavappHourlySalesAnalytics {
    hours: HourlySalesSummary[];
    peakRevenueHour: PeakHourInfo | null;
    peakChecksHour: PeakHourInfo | null;
    slowestHour: PeakHourInfo | null;
    peakRevenueHours: PeakHourInfo[];
    peakChecksHours: PeakHourInfo[];
    peakSalesHours: PeakHourInfo[];
    slowestHours: PeakHourInfo[];
}

interface KavappProductSalesAnalytics {
    topByCount: ProductSalesSummary[];
    topByRevenue: ProductSalesSummary[];
    allSoldProducts: ProductSalesSummary[];
    categories: CategorySalesSummary[];
    totalUniqueItems: number;
}

interface PeakHourInfo {
    hour: string;
    checks: number;
    sales: number;
    revenue: number;
}

export interface HourlySalesSummary {
    hour: string;
    checks: number;
    sales: number;
    revenue: number;
}

export interface DiscountSummaryById {
    id: string;
    name?: string;
    percent?: number;
    checksCount: number;
    itemsCount: number;
    discountAmount: number;
}

export interface MorningPromoStats {
    name?: string;
    timeRange: string;
    percent?: number;
    checksCount: number;
    itemsSold: number;
    revenue: number;
    discountGiven: number;
}

export interface DiscountStats {
    checksWithDiscount: number;
    discountPercentOfChecks: number;
    totalDiscountItems: number;
    totalDiscountAmount: number;
    byDiscountId: DiscountSummaryById[];
    morningPromo?: MorningPromoStats;
}

export interface ProductSalesSummary {
    name: string;
    count: number;
    totalPrice: number;
    percent: number;
    avgPrice: number;
}

export interface CategorySalesSummary {
    name: string;
    count: number;
    revenue: number;
}

export interface CashAuditSummary {
    cashRevenue: number;
    startCash: number;
    expenses: number;
    endCash: number;
    difference: number;
    collection: number;
    returns: number;
}

export interface WorkShiftSummary {
    startTime?: string;
    endTime?: string;
}

export interface KavappDailySalesAnalytics {
    summary: KavappDailySalesSummary;
    hourly: KavappHourlySalesAnalytics;
    discounts: DiscountStats;
    products: KavappProductSalesAnalytics;
    cashiers: string[];
    cashAudit?: CashAuditSummary;
    workShift?: WorkShiftSummary;
}
