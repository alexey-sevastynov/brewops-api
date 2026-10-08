export interface HourlySalesSummary {
    hour: string;
    checks: number;
    sales: number;
    revenue: number;
}

export interface PeakHourInfo {
    hour: string;
    checks: number;
    sales: number;
    revenue: number;
}

export interface DiscountSummaryById {
    id: string;
    checksCount: number;
    itemsCount: number;
    discountAmount: number;
}

export interface MorningPromoStats {
    timeRange: string;
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
    morningPromo: MorningPromoStats;
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

export interface KavappDailySalesAnalytics {
    summary: {
        totalChecks: number;
        cancelledChecks: number;
        totalRevenue: number;
        averageCheck: number;
        cashTotal: number;
        terminalTotal: number;
        totalItemsSold: number;
    };
    cashAudit?: CashAuditSummary;
    hourly: {
        hours: HourlySalesSummary[];
        peakRevenueHour: PeakHourInfo | null;
        peakChecksHour: PeakHourInfo | null;
        slowestHour: PeakHourInfo | null;
        peakRevenueHours: PeakHourInfo[];
        peakChecksHours: PeakHourInfo[];
        peakSalesHours: PeakHourInfo[];
        slowestHours: PeakHourInfo[];
    };
    discounts: DiscountStats;

    products: {
        topByCount: ProductSalesSummary[];
        topByRevenue: ProductSalesSummary[];
        allSoldProducts: ProductSalesSummary[];
        categories: CategorySalesSummary[];
        totalUniqueItems: number;
    };

    cashiers: string[];
}
