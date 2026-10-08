export const kavappEndpoints = {
    login: "/admin/login",
    inventory: (pointId: string) => `/nowreport/${pointId}`,
    catalog: {
        product: "/product",
        cup: "/cup",
        ingredient: "/ingredient",
    },
    sales: {
        reportNew: "/report-new",
        avgReport: "/avgreport",
        checksReport: "/checksreport",
        hourlyReport: "/hourlyreport",
        financeReport: "/financereport",
    },
} as const;
