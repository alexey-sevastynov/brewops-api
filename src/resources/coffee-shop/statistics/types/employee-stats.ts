export interface EmployeeStats {
    name: string;
    shifts: number;
    basicSalary: number;
    bonuses: number;
    totalSalary: number;
    averageRevenuePerShift: number;
    averageCashRevenuePercent: number;
    averageTerminalRevenuePercent: number;
    averageNetProfit: number;
    averageCostPercent: number;
    averageWriteOffPercent: number;
    averageSalaryPercent: number;
    averageChecksPerShift?: number;
    averageCheck?: number;
    averageItemsSoldPerShift?: number;
    averageItemsPerCheck?: number;
}
