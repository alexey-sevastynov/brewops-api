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
    name: string;
    count: string;
    parametrsName?: string;
    unitsName?: string;
    numberOfPositions?: string;
    article?: string | null;
    manufacturer?: string | null;
    units?: string;
    percent?: string;
    avgprice?: string;
    totalPrice: string;
}

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

export interface KavappHourlyReportItem {
    salepoint: string;
    hour: string;
    checks: string;
    sales: string;
    suma: string;
}

export interface KavappFinanceReportItem {
    kasa: string;
    cash: string;
    terminal: string;
    cashfact?: string;
    bonus?: string;
    shopping?: string;
    totalReturn?: string;
    autoCashCollection?: string;
    idwork?: string;
    salepoint?: string;
    worker?: string;
    date?: string;
    schange: string;
    salert?: string;
    echange: string;
    ealert?: string;
}

export interface KavappDiscountReportItem {
    iddiscount: string;
    checkscount: string;
    itemcount: string;
    cash: string;
    terminal: string;
    totalprice: string;
    card?: string;
    cashback?: string;
}

export interface KavappDiscountItem {
    id: string;
    status: string;
    name: string;
    dvalue: string;
    type?: string;
    pvalue?: string;
    productsValue?: string;
    defaultDiscount?: string;
}

export interface KavappCardItem {
    id: string;
    status: string;
    name?: string;
    surname?: string;
    cardnumber: string;
    cardcode?: string;
    discountid: string;
    dicountname: string;
    suma?: string;
}

export interface KavappPromotionItem {
    id: string;
    status: string;
    old: string;
    tstart: string;
    tend: string;
    value: string;
    salepoint?: string;
    dstart?: string;
    dend?: string;
    dweek?: string;
    object?: string;
    objectid?: string;
    type?: string;
    card?: string;
    carddiscount?: string;
    addParams?: string;
}

export interface KavappWorkReportItem {
    idwork?: string;
    idsalepoint?: string;
    idworker?: string;
    sdtime?: string;
    sdtimeUtc?: string;
    edtime?: string;
    edtimeUtc?: string;
    kasa?: string;
    [key: string]: unknown;
}

export interface KavappProfitReportItem {
    sdtime?: string;
    sdTimeUtc?: string;
    edtime?: string;
    edTimeUtc?: string;
    idWork?: string;
    salepointName?: string;
    workerName?: string;
    revenue?: string;
    usedSum?: string;
    profit?: string;
    profitPercent?: string;
}

export interface KavappWriteOffReportItem {
    id?: string;
    salepoint?: string;
    status?: string;
    workerType?: string;
    confirmerType?: string;
    worker?: string;
    confirmer?: string;
    dtime?: string;
    dtimeUtc?: string;
    ltime?: string;
    ltimeUtc?: string;
    totalPrice?: string;
    description?: string;
    [key: string]: unknown;
}

export interface KavappDailySalesRaw {
    reportNew: KavappSaleItem[];
    avgReport: KavappAvgReportItem[];
    checksReport: KavappCheckItem[];
    hourlyReport: KavappHourlyReportItem[];
    groupReport?: KavappAvgReportItem[];
    financeReport?: KavappFinanceReportItem[];
    discountReport?: KavappDiscountReportItem[];
    discountsList?: KavappDiscountItem[];
    cardsList?: KavappCardItem[];
    promotionsList?: KavappPromotionItem[];
    workReport?: KavappWorkReportItem[];
    profitReport?: KavappProfitReportItem[];
    writeOffReport?: KavappWriteOffReportItem[];
}
