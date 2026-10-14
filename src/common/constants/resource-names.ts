export const resourceNames = {
    dailyReports: "dailyReports",
    employees: "employees",
    expenseReports: "expenseReports",
    facilityExpenses: "facilityExpenses",
    inventoryAudits: "inventoryAudits",
    ownerWithdrawals: "ownerWithdrawals",
    kavapp: "kavapp",
    statistics: "statistics",
} as const;

export type ResourceName = (typeof resourceNames)[keyof typeof resourceNames];
