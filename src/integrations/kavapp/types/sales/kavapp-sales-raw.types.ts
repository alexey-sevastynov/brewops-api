/**
 * Item from Kavapp /report-new
 */
export interface KavappSaleItem {
    idsales: string;
    id: string;
    idsalepoint: string;
    idworker: string;
    article: string;
    manufacturer: string;
    iddrink: string;
    parameterItems?: unknown;
    idgroup: string;
    iddiscount: string;
    value: string;
    units: string;
    unitsName: string;
    code: string;
    dtime: string;
    price: string;
    unitPrice: string;
}

export interface KavappAvgReportItem {
    parametrsName?: string;
    unitsName?: string;
    name: string;
    count: string;
    numberOfPositions?: string;
    article?: string | null;
    manufacturer?: string | null;
    units?: string;
    percent?: string;
    avgprice?: string;
    totalPrice: string;
}

/**
 * Check item from Kavapp /checksreport
 * status: "3" = успішний чек, "0" = скасований чек
 */
export interface KavappCheckItem {
    idcheck: string;
    number: string;
    salepointname: string;
    workername: string;
    dtime: string;
    itemcount: string;
    iddiscount: string;
    cash: string;
    terminal: string;
    card: string;
    totalprice: string;
    cashback: string;
    status: string;
    rest: string;
}

/**
 * Hourly item from Kavapp /hourlyreport
 */
export interface KavappHourlyReportItem {
    salepoint: string;
    hour: string;
    checks: string;
    sales: string;
    suma: string;
}

/**
 * Item from Kavapp /financereport
 */
export interface KavappFinanceReportItem {
    idwork?: string;
    salepoint?: string;
    worker?: string;
    date?: string;
    kasa: string;
    cashfact?: string;
    cash: string;
    terminal: string;
    bonus?: string;
    shopping?: string;
    totalReturn?: string;
    autoCashCollection?: string;
    schange: string;
    salert?: string;
    echange: string;
    ealert?: string;
}

/**
 * Aggregated raw daily sales from all Kavapp endpoints
 */
export interface KavappDailySalesRaw {
    reportNew: KavappSaleItem[];
    avgReport: KavappAvgReportItem[];
    groupReport?: KavappAvgReportItem[];
    checksReport: KavappCheckItem[];
    hourlyReport: KavappHourlyReportItem[];
    financeReport?: KavappFinanceReportItem[];
}
