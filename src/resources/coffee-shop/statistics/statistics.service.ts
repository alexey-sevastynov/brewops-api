import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getStartOfDay, getEndOfDay, getStartOfMonth, formatMonthLabel } from "../../../common/lib/date";
import { percent, round } from "../../../common/lib/math";
import { DailyReport, DailyReportDocument } from "../daily-report/daily-report-schema";
import { expenseReportTypes } from "../expense-report/enums/expense-report-type";
import { ExpenseReport, ExpenseReportDocument } from "../expense-report/expense-report-schema";
import { InventoryAudit, InventoryAuditDocument } from "../inventory-audit/inventory-audit-schema";
import { OwnerWithdrawal, OwnerWithdrawalDocument } from "../owner-withdrawal/owner-withdrawal-schema";
import { GetStatisticsDto } from "./dto/get-statistics.dto";
import { EmployeeStats } from "./types/employee-stats";
import { InventoryAuditBreakdownItem } from "./types/inventory-audit-breakdown-item";
import { InventoryAuditTotals } from "./types/inventory-audit-totals";
import { CoffeeShopStatistics } from "./types/statistic-coffee-shop";
import { StatisticsHighlights, MetricHighlight } from "./types/statistics-highlights";
import { StatisticsPercentages } from "./types/statistics-percentages";
import { ExpensesBreakdown } from "./types/expenses-breakdown";
import { ExpenseBreakdownItem } from "./types/expense-breakdown-item";
import { InventoryAuditType } from "./types/inventory-audit-type";
import { inventoryAuditTypes } from "./constants/inventory-audit-types";
import { ExchangeRateResult, ExchangeRateService } from "./services/exchange-rate.service";
import { OwnerWithdrawalSummary } from "./types/owner-withdrawal-summary";
import { FacilityExpense, FacilityExpenseDocument } from "../facility-expense/facility-expense-schema";
import { FacilityExpenseSummary } from "../facility-expense/facility-expense-summary";

@Injectable()
export class StatisticsService {
    constructor(
        @InjectModel(DailyReport.name)
        private readonly dailyReportModel: Model<DailyReportDocument>,
        @InjectModel(ExpenseReport.name)
        private readonly expenseReportModel: Model<ExpenseReportDocument>,
        @InjectModel(InventoryAudit.name)
        private readonly inventoryAuditModel: Model<InventoryAuditDocument>,
        @InjectModel(OwnerWithdrawal.name)
        private readonly ownerWithdrawalModel: Model<OwnerWithdrawalDocument>,
        @InjectModel(FacilityExpense.name)
        private readonly facilityExpenseModel: Model<FacilityExpenseDocument>,
        private readonly exchangeRateService: ExchangeRateService,
    ) {}

    async getStatistics(coffeeShopId: string, dateRange: GetStatisticsDto) {
        const startOfDay = getStartOfDay(dateRange.from);
        const endOfDay = getEndOfDay(dateRange.to);
        const dailyReports = await this.getDailyReports(coffeeShopId, startOfDay, endOfDay);
        const dailyExpenses = await this.getDailyExpenses(coffeeShopId, startOfDay, endOfDay);
        const monthlyExpenses = await this.getMonthlyExpenses(coffeeShopId, startOfDay, endOfDay);
        const inventoryAudits = await this.getInventoryAudits(coffeeShopId, startOfDay, endOfDay);
        const selectedPeriodWithdrawals = await this.getOwnerWithdrawals(coffeeShopId, startOfDay, endOfDay);
        const allTimeWithdrawals = await this.getAllTimeOwnerWithdrawals(coffeeShopId);
        const exchangeRateInfo = await this.exchangeRateService.getUsdToUahRate();
        const facilityExpenseSummary = await this.getFacilityExpenseSummary(coffeeShopId, startOfDay);

        const coffeeShopStatistics = this.createCoffeeShopStatistics(
            startOfDay,
            endOfDay,
            dailyReports,
            dailyExpenses,
            monthlyExpenses,
            inventoryAudits,
            selectedPeriodWithdrawals,
            allTimeWithdrawals,
            exchangeRateInfo,
            facilityExpenseSummary,
        );

        return coffeeShopStatistics;
    }

    private async getDailyReports(coffeeShopId: string, startOfDay: Date, endOfDay: Date) {
        const dailyReports = await this.dailyReportModel
            .find({ coffeeShopId, date: { $gte: startOfDay, $lte: endOfDay } })
            .populate("employee");

        return dailyReports;
    }

    private async getDailyExpenses(coffeeShopId: string, startOfDay: Date, endOfDay: Date) {
        const dailyExpenses = await this.expenseReportModel.find({
            coffeeShopId,
            type: expenseReportTypes.daily,
            date: { $gte: startOfDay, $lte: endOfDay },
        });

        return dailyExpenses;
    }

    private async getMonthlyExpenses(coffeeShopId: string, startOfDay: Date, endOfDay: Date) {
        const monthlyExpenses = await this.expenseReportModel.find({
            coffeeShopId,
            type: expenseReportTypes.monthly,
            validFrom: { $lte: endOfDay },
            $or: [{ validTo: { $exists: false } }, { validTo: null }, { validTo: { $gte: startOfDay } }],
        });

        return monthlyExpenses;
    }

    private async getInventoryAudits(coffeeShopId: string, startOfDay: Date, endOfDay: Date) {
        const inventoryAudits = await this.inventoryAuditModel.find({
            coffeeShopId,
            validFrom: { $lte: endOfDay },
            validTo: { $gte: startOfDay },
        });

        return inventoryAudits;
    }

    private async getOwnerWithdrawals(coffeeShopId: string, startOfDay: Date, endOfDay: Date) {
        const ownerWithdrawals = await this.ownerWithdrawalModel.find({
            coffeeShopId,
            withdrawalDate: { $gte: startOfDay, $lte: endOfDay },
        });

        return ownerWithdrawals;
    }

    private async getAllTimeOwnerWithdrawals(coffeeShopId: string) {
        const ownerWithdrawals = await this.ownerWithdrawalModel.find({ coffeeShopId });

        return ownerWithdrawals;
    }

    private createStatisticsPercentages(
        totalRevenue: number,
        totalEmployeesSalary: number,
        costOfGoods: number,
        productWriteOffs: number,
        inventoryShortageAmount: number,
        inventorySurplusAmount: number,
        cashRevenue: number,
        terminalRevenue: number,
        acquiringFee: number,
    ) {
        const inventoryNetAdjustmentAmount = inventorySurplusAmount - inventoryShortageAmount;

        const statisticsPercentages: StatisticsPercentages = {
            salaryPercent: percent(totalEmployeesSalary, totalRevenue),
            costPercent: percent(costOfGoods, totalRevenue),
            writeOffPercent: percent(productWriteOffs, totalRevenue),
            inventoryShortagePercent: percent(inventoryShortageAmount, totalRevenue),
            inventorySurplusPercent: percent(inventorySurplusAmount, totalRevenue),
            inventoryNetAdjustmentPercent: percent(inventoryNetAdjustmentAmount, totalRevenue),
            cashPercent: percent(cashRevenue, totalRevenue),
            terminalPercent: percent(terminalRevenue, totalRevenue),
            acquiringPercent: percent(acquiringFee, totalRevenue),
        };

        return statisticsPercentages;
    }

    private createExpensesBreakdown(
        startOfDay: Date,
        endOfDay: Date,
        dailyExpenses: ExpenseReport[],
        monthlyExpenses: ExpenseReport[],
        totalDailyExpensesAmount: number,
        totalMonthlyExpensesAmount: number,
    ) {
        const dailyExpenseItems = this.buildDailyExpenseItems(dailyExpenses);
        const monthlyExpenseItems = this.buildMonthlyExpenseItems(startOfDay, endOfDay, monthlyExpenses);

        const expensesBreakdown: ExpensesBreakdown = {
            dailyExpenses: {
                totalAmount: round(totalDailyExpensesAmount),
                expenseItems: dailyExpenseItems,
            },
            monthlyExpenses: {
                totalAmount: round(totalMonthlyExpensesAmount),
                expenseItems: monthlyExpenseItems,
            },
        };

        return expensesBreakdown;
    }

    private async getFacilityExpenseSummary(coffeeShopId: string, startOfDay: Date) {
        const period = getStartOfMonth(startOfDay);
        const facilityExpenses = await this.facilityExpenseModel.find({ coffeeShopId, period });

        const targetAmount = 20175;
        const collectedAmount = facilityExpenses.reduce((sum, item) => sum + item.amount, 0);
        const operationsCount = facilityExpenses.length;

        const progressPercentage = Math.min(100, percent(collectedAmount, targetAmount, 0));
        const isFullyCollected = collectedAmount >= targetAmount;
        const remainingAmount = Math.max(0, targetAmount - collectedAmount);
        const monthLabel = formatMonthLabel(period);

        const facilityExpenseSummary: FacilityExpenseSummary = {
            targetAmount,
            collectedAmount,
            remainingAmount,
            progressPercentage,
            isFullyCollected,
            operationsCount,
            monthLabel,
            period,
        };

        return facilityExpenseSummary;
    }

    private buildDailyExpenseItems(dailyExpenses: ExpenseReport[]): ExpenseBreakdownItem[] {
        const grouped = new Map<
            string,
            { title: string; description?: string; amount: number; count: number }
        >();

        for (const expense of dailyExpenses) {
            const key = `${expense.title}\0${expense.description ?? ""}`;
            const existing = grouped.get(key);

            if (existing) {
                existing.amount += expense.amount;
                existing.count += 1;
            } else {
                grouped.set(key, {
                    title: expense.title,
                    description: expense.description,
                    amount: expense.amount,
                    count: 1,
                });
            }
        }

        return Array.from(grouped.values()).map((item) => ({
            title: item.title,
            amount: round(item.amount),
            description: item.description,
            type: expenseReportTypes.daily,
            count: item.count,
        }));
    }

    private buildMonthlyExpenseItems(
        startOfDay: Date,
        endOfDay: Date,
        monthlyExpenses: ExpenseReport[],
    ): ExpenseBreakdownItem[] {
        return monthlyExpenses.map((expense) => {
            const { amount, activeDays } = this.calculateMonthlyExpenseApportioned(
                startOfDay,
                endOfDay,
                expense,
            );

            return {
                title: expense.title,
                amount: round(amount),
                description: expense.description,
                type: expenseReportTypes.monthly,
                count: activeDays,
            };
        });
    }

    private calculateMonthlyExpenseApportioned(startOfDay: Date, endOfDay: Date, expense: ExpenseReport) {
        const dayMs = 24 * 60 * 60 * 1000;
        const startTs = startOfDay.getTime();
        const endTs = endOfDay.getTime();
        let amount = 0;
        let activeDays = 0;

        for (let ts = startTs; ts <= endTs; ts += dayMs) {
            const d = new Date(ts);
            const year = d.getFullYear();
            const month = d.getMonth();
            const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

            const activeFrom = new Date(expense.validFrom as Date);
            activeFrom.setHours(0, 0, 0, 0);

            let activeTo: Date | null = null;
            if (expense.validTo) {
                activeTo = new Date(expense.validTo);
                activeTo.setHours(23, 59, 59, 999);
            }

            const tsDate = d.getTime();
            if (tsDate >= activeFrom.getTime() && (!activeTo || tsDate <= activeTo.getTime())) {
                amount += expense.amount / daysInCurrentMonth;
                activeDays += 1;
            }
        }

        return { amount, activeDays };
    }

    private aggregateDailyReports(dailyReports: DailyReport[]) {
        let totalRevenue = 0;
        let cashRevenue = 0;
        let terminalRevenue = 0;
        let costOfGoods = 0;
        let productWriteOffs = 0;
        let acquiringFee = 0;
        let netProfit = 0;

        const employeeStats: Record<string, EmployeeStats> = {};

        for (const report of dailyReports) {
            totalRevenue += report.totalRevenue ?? 0;
            cashRevenue += report.cashRevenue ?? 0;
            terminalRevenue += report.terminalRevenue ?? 0;
            costOfGoods += report.costOfGoods ?? 0;
            productWriteOffs += report.productWriteOffs ?? 0;
            acquiringFee += report.acquiringFee ?? 0;
            netProfit += report.netProfit ?? 0;

            const employee = report.employee;
            const employeeId = employee._id.toString();

            if (!employeeStats[employeeId]) {
                employeeStats[employeeId] = {
                    name: employee.name,
                    shifts: 0,
                    basicSalary: 0,
                    bonuses: 0,
                    totalSalary: 0,
                    averageRevenuePerShift: 0,
                    averageCashRevenuePercent: 0,
                    averageTerminalRevenuePercent: 0,
                    averageNetProfit: 0,
                    averageCostPercent: 0,
                    averageWriteOffPercent: 0,
                    averageSalaryPercent: 0,
                };
            }

            employeeStats[employeeId].shifts += 1;
            employeeStats[employeeId].bonuses += report.employeeBonus || 0;
            employeeStats[employeeId].totalSalary += report.employeeTotalSalary || 0;
            employeeStats[employeeId].basicSalary +=
                (report.employeeTotalSalary || 0) - (report.employeeBonus || 0);
            employeeStats[employeeId].averageRevenuePerShift += report.totalRevenue ?? 0;
            employeeStats[employeeId].averageCashRevenuePercent += report.cashPercent ?? 0;
            employeeStats[employeeId].averageTerminalRevenuePercent += report.terminalPercent ?? 0;
            employeeStats[employeeId].averageNetProfit += report.netProfit ?? 0;
            employeeStats[employeeId].averageCostPercent += report.costPercent ?? 0;
            employeeStats[employeeId].averageWriteOffPercent += report.writeOffPercent ?? 0;
            employeeStats[employeeId].averageSalaryPercent += report.salaryPercent ?? 0;
        }

        for (const stats of Object.values(employeeStats)) {
            if (stats.shifts > 0) {
                stats.averageRevenuePerShift = round(stats.averageRevenuePerShift / stats.shifts);
                stats.averageCashRevenuePercent = round(stats.averageCashRevenuePercent / stats.shifts);
                stats.averageTerminalRevenuePercent = round(
                    stats.averageTerminalRevenuePercent / stats.shifts,
                );
                stats.averageNetProfit = round(stats.averageNetProfit / stats.shifts);
                stats.averageCostPercent = round(stats.averageCostPercent / stats.shifts);
                stats.averageWriteOffPercent = round(stats.averageWriteOffPercent / stats.shifts);
                stats.averageSalaryPercent = round(stats.averageSalaryPercent / stats.shifts);
            }
        }

        return {
            totalRevenue,
            cashRevenue,
            terminalRevenue,
            costOfGoods,
            productWriteOffs,
            acquiringFee,
            netProfit,
            employeeStats,
        };
    }

    private calculateMonthlyExpensesApportioned(
        startOfDay: Date,
        endOfDay: Date,
        monthlyExpenses: ExpenseReport[],
    ) {
        let totalMonthlyExpensesAmount = 0;

        for (const expense of monthlyExpenses) {
            const { amount } = this.calculateMonthlyExpenseApportioned(startOfDay, endOfDay, expense);
            totalMonthlyExpensesAmount += amount;
        }

        return totalMonthlyExpensesAmount;
    }

    private createInventoryAuditTotals(
        startOfDay: Date,
        endOfDay: Date,
        inventoryAudits: InventoryAudit[],
    ): InventoryAuditTotals {
        let totalShortageAmount = 0;
        let totalSurplusAmount = 0;

        for (const inventoryAudit of inventoryAudits) {
            const apportionedAudit = this.calculateInventoryAuditApportioned(
                startOfDay,
                endOfDay,
                inventoryAudit,
            );

            totalShortageAmount += apportionedAudit.shortageAmount;
            totalSurplusAmount += apportionedAudit.surplusAmount;
        }

        const inventoryAuditTotals: InventoryAuditTotals = {
            shortage: {
                totalAmount: round(totalShortageAmount),
                items: this.buildInventoryAuditItems(
                    startOfDay,
                    endOfDay,
                    inventoryAudits,
                    inventoryAuditTypes.shortage,
                ),
            },
            surplus: {
                totalAmount: round(totalSurplusAmount),
                items: this.buildInventoryAuditItems(
                    startOfDay,
                    endOfDay,
                    inventoryAudits,
                    inventoryAuditTypes.surplus,
                ),
            },
            inventoryAuditAdjustmentAmount: round(totalSurplusAmount - totalShortageAmount),
        };

        return inventoryAuditTotals;
    }

    private buildInventoryAuditItems(
        startOfDay: Date,
        endOfDay: Date,
        inventoryAudits: InventoryAudit[],
        type: InventoryAuditType,
    ): InventoryAuditBreakdownItem[] {
        const inventoryAuditBreakdownItems: InventoryAuditBreakdownItem[] = [];

        for (const audit of inventoryAudits) {
            const apportionedAudit = this.calculateInventoryAuditApportioned(startOfDay, endOfDay, audit);
            const periodAmount =
                type === inventoryAuditTypes.shortage
                    ? apportionedAudit.shortageAmount
                    : apportionedAudit.surplusAmount;

            if (periodAmount <= 0 || apportionedAudit.overlapDays <= 0) continue;

            inventoryAuditBreakdownItems.push({
                productTitle: audit.title,
                periodAmount: round(periodAmount),
                description: audit.description,
                activeDays: apportionedAudit.overlapDays,
            });
        }

        return inventoryAuditBreakdownItems;
    }

    private calculateInventoryAuditApportioned(startOfDay: Date, endOfDay: Date, audit: InventoryAudit) {
        const dayMs = 24 * 60 * 60 * 1000;
        const activeFrom = new Date(audit.validFrom);
        activeFrom.setHours(0, 0, 0, 0);

        const activeTo = new Date(audit.validTo);
        activeTo.setHours(23, 59, 59, 999);

        const overlapStart = new Date(Math.max(startOfDay.getTime(), activeFrom.getTime()));
        const overlapEnd = new Date(Math.min(endOfDay.getTime(), activeTo.getTime()));

        if (overlapStart > overlapEnd) {
            return { shortageAmount: 0, surplusAmount: 0, overlapDays: 0 };
        }

        const totalPeriodDays = Math.ceil((activeTo.getTime() - activeFrom.getTime() + 1) / dayMs);
        const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime() + 1) / dayMs);

        const shortageAmount = (audit.shortageAmount / totalPeriodDays) * overlapDays;
        const surplusAmount = (audit.surplusAmount / totalPeriodDays) * overlapDays;

        return { shortageAmount, surplusAmount, overlapDays };
    }

    private createOwnerWithdrawalSummary(
        selectedPeriodWithdrawals: OwnerWithdrawal[],
        allTimeWithdrawals: OwnerWithdrawal[],
        exchangeRateInfo: ExchangeRateResult,
    ) {
        const rate = exchangeRateInfo.rate;

        let selectedPeriodUah = 0;

        for (const selectedPeriodWithdrawal of selectedPeriodWithdrawals) {
            selectedPeriodUah += selectedPeriodWithdrawal.amount ?? 0;
        }
        const selectedPeriodRoundedUah = round(selectedPeriodUah);
        const selectedPeriodRoundedUsd = rate > 0 ? round(selectedPeriodUah / rate) : 0;

        let allTimeUah = 0;

        for (const allTimeWithdrawal of allTimeWithdrawals) {
            allTimeUah += allTimeWithdrawal.amount ?? 0;
        }
        const allTimeRoundedUah = round(allTimeUah);
        const allTimeRoundedUsd = rate > 0 ? round(allTimeUah / rate) : 0;

        const ownerWithdrawalSummary: OwnerWithdrawalSummary = {
            selectedPeriod: {
                totalAmountUah: selectedPeriodRoundedUah,
                totalAmountUsd: selectedPeriodRoundedUsd,
                count: selectedPeriodWithdrawals.length,
            },
            allTime: {
                totalAmountUah: allTimeRoundedUah,
                totalAmountUsd: allTimeRoundedUsd,
                count: allTimeWithdrawals.length,
            },
            exchangeRate: round(rate, 2),
            rateUpdatedAt: exchangeRateInfo.updatedAt,
        };

        return ownerWithdrawalSummary;
    }

    private calculateStatisticsHighlights(dailyReports: DailyReport[]) {
        if (!dailyReports || dailyReports.length <= 1) return undefined;

        const statisticsHighlights: StatisticsHighlights = {
            revenue: this.findMetricHighlight(dailyReports, (report) => report.totalRevenue ?? 0),
            netProfit: this.findMetricHighlight(dailyReports, (report) => report.netProfit ?? 0),
            costPercent: this.findMetricHighlight(dailyReports, (report) => report.costPercent ?? 0),
            writeOffPercent: this.findMetricHighlight(dailyReports, (report) => report.writeOffPercent ?? 0),
            cashRevenue: this.findMetricHighlight(dailyReports, (report) => report.cashRevenue ?? 0),
            terminalRevenue: this.findMetricHighlight(dailyReports, (report) => report.terminalRevenue ?? 0),
        };

        return statisticsHighlights;
    }

    private findMetricHighlight(reports: DailyReport[], getValue: (report: DailyReport) => number) {
        let maxReport = reports[0];
        let minReport = reports[0];
        let maxValue = getValue(reports[0]);
        let minValue = getValue(reports[0]);

        for (const report of reports) {
            const value = getValue(report);

            if (value > maxValue) {
                maxValue = value;
                maxReport = report;
            }

            if (value < minValue) {
                minValue = value;
                minReport = report;
            }
        }

        const metricHighlight: MetricHighlight = {
            max: {
                date: maxReport.date,
                value: round(maxValue),
                employeeName: maxReport.employee.name,
            },
            min: {
                date: minReport.date,
                value: round(minValue),
                employeeName: minReport.employee.name,
            },
        };

        return metricHighlight;
    }

    private createCoffeeShopStatistics(
        startOfDay: Date,
        endOfDay: Date,
        dailyReports: DailyReport[],
        dailyExpenses: ExpenseReport[],
        monthlyExpenses: ExpenseReport[],
        inventoryAudits: InventoryAudit[],
        selectedPeriodWithdrawals: OwnerWithdrawal[],
        allTimeWithdrawals: OwnerWithdrawal[],
        exchangeRateInfo: ExchangeRateResult,
        facilityExpenseSummary: FacilityExpenseSummary,
    ) {
        const aggregatedDaily = this.aggregateDailyReports(dailyReports);
        let totalDailyExpensesAmount = 0;

        for (const expense of dailyExpenses) {
            totalDailyExpensesAmount += expense.amount;
        }

        const totalMonthlyExpensesAmount = this.calculateMonthlyExpensesApportioned(
            startOfDay,
            endOfDay,
            monthlyExpenses,
        );
        const inventoryAuditTotals = this.createInventoryAuditTotals(startOfDay, endOfDay, inventoryAudits);

        const totalExpensesAmount = totalDailyExpensesAmount + totalMonthlyExpensesAmount;

        const dayMs = 24 * 60 * 60 * 1000;
        const timeDiff = endOfDay.getTime() - startOfDay.getTime() + 1;
        const totalDays = Math.ceil(timeDiff / dayMs);

        const totalShifts = Object.values(aggregatedDaily.employeeStats).reduce(
            (sum, emp) => sum + emp.shifts,
            0,
        );
        const totalEmployeesSalary = Object.values(aggregatedDaily.employeeStats).reduce(
            (sum, emp) => sum + emp.totalSalary,
            0,
        );

        const coffeeShopStatistics: CoffeeShopStatistics = {
            period: { from: startOfDay, to: endOfDay },
            totalDays,
            totalShifts,
            totalRevenue: round(aggregatedDaily.totalRevenue),
            cashRevenue: round(aggregatedDaily.cashRevenue),
            terminalRevenue: round(aggregatedDaily.terminalRevenue),
            costOfGoods: round(aggregatedDaily.costOfGoods),
            productWriteOffs: round(aggregatedDaily.productWriteOffs),
            acquiringFee: round(aggregatedDaily.acquiringFee),
            totalExpenses: round(totalExpensesAmount),
            inventoryAuditTotals,
            expensesBreakdown: this.createExpensesBreakdown(
                startOfDay,
                endOfDay,
                dailyExpenses,
                monthlyExpenses,
                totalDailyExpensesAmount,
                totalMonthlyExpensesAmount,
            ),
            netProfit: round(aggregatedDaily.netProfit),
            netProfitAfterExpenses: round(
                aggregatedDaily.netProfit -
                    totalExpensesAmount +
                    inventoryAuditTotals.inventoryAuditAdjustmentAmount,
            ),
            percentages: this.createStatisticsPercentages(
                aggregatedDaily.totalRevenue,
                totalEmployeesSalary,
                aggregatedDaily.costOfGoods,
                aggregatedDaily.productWriteOffs,
                inventoryAuditTotals.shortage.totalAmount,
                inventoryAuditTotals.surplus.totalAmount,
                aggregatedDaily.cashRevenue,
                aggregatedDaily.terminalRevenue,
                aggregatedDaily.acquiringFee,
            ),
            employees: Object.values(aggregatedDaily.employeeStats),
            ownerWithdrawals: this.createOwnerWithdrawalSummary(
                selectedPeriodWithdrawals,
                allTimeWithdrawals,
                exchangeRateInfo,
            ),
            facilityExpense: facilityExpenseSummary,
            highlights: this.calculateStatisticsHighlights(dailyReports),
        };

        return coffeeShopStatistics;
    }
}
