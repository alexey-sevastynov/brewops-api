import { nameOf } from "../../../../common/utils/name-of";
import { type DailyReport } from "../daily-report-schema";

export const dailyReportProps: Record<keyof DailyReport, string> = {
    coffeeShopId: nameOf<DailyReport>("coffeeShopId"),
    date: nameOf<DailyReport>("date"),
    cashRevenue: nameOf<DailyReport>("cashRevenue"),
    terminalRevenue: nameOf<DailyReport>("terminalRevenue"),
    employee: nameOf<DailyReport>("employee"),
    costOfGoods: nameOf<DailyReport>("costOfGoods"),
    productWriteOffs: nameOf<DailyReport>("productWriteOffs"),
    employeeBonus: nameOf<DailyReport>("employeeBonus"),
    employeeTotalSalary: nameOf<DailyReport>("employeeTotalSalary"),
    acquiringFee: nameOf<DailyReport>("acquiringFee"),
    totalRevenue: nameOf<DailyReport>("totalRevenue"),
    netProfit: nameOf<DailyReport>("netProfit"),
    salaryPercent: nameOf<DailyReport>("salaryPercent"),
    costPercent: nameOf<DailyReport>("costPercent"),
    writeOffPercent: nameOf<DailyReport>("writeOffPercent"),
    cashPercent: nameOf<DailyReport>("cashPercent"),
    terminalPercent: nameOf<DailyReport>("terminalPercent"),
    kavappSales: nameOf<DailyReport>("kavappSales"),
} as const;
