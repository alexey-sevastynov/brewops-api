import { Logger } from "@nestjs/common";
import { formatPercent } from "../../../common/utils/number";
import { formatUah } from "../../../common/utils/currency";
import { type AiService } from "../../../infra/ai/ai.service";
import { type DailyReport } from "./daily-report-schema";
import {
    type KavappDailySalesAnalytics,
    type CashAuditSummary,
} from "../../../integrations/kavapp/types/sales/kavapp-sales-analytics.types";
import { type TelegramNotificationContext } from "../../../infra/telegram/types";
import { formatDateToLongWithWeekDay } from "common/utils/date/date";

const logger = new Logger("DailyReportTelegram");

export const formatDailyReportMessage =
    (_aiService?: AiService, context?: TelegramNotificationContext) => async (data: DailyReport) => {
        let salesAnalytics = data.kavappSales;

        if (!salesAnalytics && context?.kavappSalesService) {
            try {
                const shopId = context.coffeeShop?._id?.toString() || data.coffeeShopId?.toString();

                if (shopId) {
                    const fetched = await context.kavappSalesService.getDailySalesAnalytics(
                        shopId,
                        data.date,
                    );

                    if (fetched) {
                        salesAnalytics = fetched;
                    }
                }
            } catch (error) {
                logger.warn(
                    "Failed to fetch Kavapp sales analytics for telegram message",
                    (error as Error).message,
                );
            }
        }

        const rawPlain: any =
            typeof (data as any)?.toObject === "function"
                ? (data as any).toObject()
                : (data as any)?._doc
                  ? { ...(data as any)._doc }
                  : { ...data };

        const reportData: DailyReport = {
            ...rawPlain,
            employee: (data as any).employee ?? rawPlain.employee,
            date: data.date ?? rawPlain.date,
            coffeeShopId: data.coffeeShopId ?? rawPlain.coffeeShopId,
            costOfGoods: data.costOfGoods ?? rawPlain.costOfGoods,
            productWriteOffs: data.productWriteOffs ?? rawPlain.productWriteOffs,
            employeeBonus: data.employeeBonus ?? rawPlain.employeeBonus,
            employeeTotalSalary: data.employeeTotalSalary ?? rawPlain.employeeTotalSalary,
            acquiringFee: data.acquiringFee ?? rawPlain.acquiringFee,
            totalRevenue: data.totalRevenue ?? rawPlain.totalRevenue,
            netProfit: data.netProfit ?? rawPlain.netProfit,
            salaryPercent: data.salaryPercent ?? rawPlain.salaryPercent,
            costPercent: data.costPercent ?? rawPlain.costPercent,
            writeOffPercent: data.writeOffPercent ?? rawPlain.writeOffPercent,
            cashRevenue: data.cashRevenue ?? rawPlain.cashRevenue,
            terminalRevenue: data.terminalRevenue ?? rawPlain.terminalRevenue,
            cashPercent: data.cashPercent ?? rawPlain.cashPercent,
            terminalPercent: data.terminalPercent ?? rawPlain.terminalPercent,
        };

        if (salesAnalytics?.summary?.totalRevenue) {
            reportData.totalRevenue = salesAnalytics.summary.totalRevenue;
            reportData.cashRevenue = salesAnalytics.summary.cashTotal;
            reportData.terminalRevenue = salesAnalytics.summary.terminalTotal;
            if (reportData.totalRevenue > 0) {
                reportData.cashPercent = (reportData.cashRevenue / reportData.totalRevenue) * 100;
                reportData.terminalPercent = (reportData.terminalRevenue / reportData.totalRevenue) * 100;
                if (reportData.costOfGoods !== undefined) {
                    reportData.costPercent = (reportData.costOfGoods / reportData.totalRevenue) * 100;
                }
                if (reportData.productWriteOffs !== undefined) {
                    reportData.writeOffPercent =
                        (reportData.productWriteOffs / reportData.totalRevenue) * 100;
                }
                if (reportData.employeeTotalSalary !== undefined) {
                    reportData.salaryPercent =
                        (reportData.employeeTotalSalary / reportData.totalRevenue) * 100;
                }
            }
        }

        const fullMessage = buildDailyReportTemplate(reportData, salesAnalytics);

        return sanitizeTelegramMarkdown(fullMessage);
    };

function sanitizeTelegramMarkdown(text: string): string {
    let sanitized = text.replace(/\*\*(.*?)\*\*/g, "*$1*");
    sanitized = sanitized.replace(/\\([_*[\]()~`>#+\-=|{}.!])/g, "$1");

    const boldCount = (sanitized.match(/\*/g) || []).length;

    if (boldCount % 2 !== 0) {
        const lastIndex = sanitized.lastIndexOf("*");
        sanitized = sanitized.slice(0, lastIndex) + sanitized.slice(lastIndex + 1);
    }

    return sanitized;
}

function buildReportHeaderSection(data: DailyReport, sales?: KavappDailySalesAnalytics): string {
    const employee = data.employee as unknown;
    let employeeName = "Не вказано";

    if (
        employee &&
        typeof employee === "object" &&
        "name" in employee &&
        (employee as { name: string }).name
    ) {
        employeeName = (employee as { name: string }).name;
    } else if (sales?.cashiers?.length) {
        employeeName = sales.cashiers.join(", ");
    } else if (typeof employee === "string" && employee.trim() !== "") {
        employeeName = employee;
    }

    const dateStr = data.date ? formatDateToLongWithWeekDay(data.date) : "Сьогодні";

    return `*ЩОДЕННИЙ АНАЛІТИЧНИЙ ЗВІТ*

*Дата:* ${dateStr}
*Працівник зміни:* ${employeeName}`;
}

function buildFinancialSection(data: DailyReport): string {
    const totalRev = data.totalRevenue ?? 0;
    const cost = data.costOfGoods ?? 0;
    const costPct = data.costPercent ?? (totalRev > 0 ? (cost / totalRev) * 100 : 0);
    const writeOffs = data.productWriteOffs ?? 0;
    const writeOffPct = data.writeOffPercent ?? (totalRev > 0 ? (writeOffs / totalRev) * 100 : 0);
    const salary = data.employeeTotalSalary ?? 0;
    const salaryPct = data.salaryPercent ?? (totalRev > 0 ? (salary / totalRev) * 100 : 0);
    const acquiring = data.acquiringFee ?? 0;
    const net = data.netProfit ?? totalRev - cost - writeOffs - salary - acquiring;

    return `*1. ФІНАНСОВИЙ РЕЗУЛЬТАТ*

• Виручка: *${formatUah(totalRev)}*
• Собівартість продукції: *${formatUah(cost)} (${formatPercent(costPct)})*
• Списання: *${formatUah(writeOffs)} (${formatPercent(writeOffPct)})*
• Фонд оплати праці: *${formatUah(salary)} (${formatPercent(salaryPct)})*
• Комісія банку (еквайринг): *${formatUah(acquiring)}*
• *Результат після основних витрат: ${formatUah(net)}*`;
}

function buildPaymentSection(data: DailyReport): string {
    const cash = data.cashRevenue ?? 0;
    const cashPct = data.cashPercent ?? 0;
    const terminal = data.terminalRevenue ?? 0;
    const termPct = data.terminalPercent ?? 0;

    return `*2. ОПЛАТА*

• Готівка: *${formatUah(cash)} (${formatPercent(cashPct)})*
• Безготівкова оплата: *${formatUah(terminal)} (${formatPercent(termPct)})*`;
}

function buildCashAuditSection(cashAudit: CashAuditSummary): string {
    const lines: string[] = [
        `💵 *РУХ ГОТІВКИ ТА КАСА*`,
        ``,
        `• Готівковий виторг: *${formatUah(cashAudit.cashRevenue)}*`,
        `• На ранок у касі було: *${formatUah(cashAudit.startCash)}*`,
    ];

    if (cashAudit.expenses > 0) {
        lines.push(`• Витрати з каси (закупки): *-${formatUah(cashAudit.expenses)}*`);
    } else {
        lines.push(`• Витрати з каси (закупки): *${formatUah(0)}*`);
    }

    if (cashAudit.collection > 0) {
        lines.push(`• Інкасація: *-${formatUah(cashAudit.collection)}*`);
    }

    lines.push(`• Залишок у касі на вечір: *${formatUah(cashAudit.endCash)}*`);

    const diffFormatted =
        cashAudit.difference > 0 ? `+${formatUah(cashAudit.difference)}` : formatUah(cashAudit.difference);

    const diffNote =
        cashAudit.difference < 0
            ? " (виплата ЗП / інкасація)"
            : cashAudit.difference > 0
              ? " (надлишок)"
              : "";

    lines.push(`• Касова різниця: *${diffFormatted}*${diffNote}`);

    return lines.join("\n");
}

function buildOperationalSection(sales: KavappDailySalesAnalytics): string {
    const lines: string[] = [
        `• Кількість чеків: *${sales.summary.totalChecks}*`,
        `• Середній чек: *${formatUah(sales.summary.averageCheck)}*`,
        `• Продано позицій: *${sales.summary.totalItemsSold}*`,
    ];

    if (sales.summary.cancelledChecks > 0) {
        lines.push(`• Скасованих чеків: *${sales.summary.cancelledChecks}*`);
    }

    if (sales.products.categories?.length) {
        const categories = sales.products.categories
            .map((category) => `${category.name} — ${category.count}`)
            .join(", ");

        lines.push(`\n*Продажі за категоріями:*\n${categories}.`);
    }

    return `*3. ОПЕРАЦІЙНІ ПОКАЗНИКИ*\n\n${lines.join("\n")}`;
}

function getActivityHours(
    hours: KavappDailySalesAnalytics["hourly"]["peakRevenueHours"],
    fallbackHour?: KavappDailySalesAnalytics["hourly"]["peakRevenueHour"],
) {
    if (hours?.length) {
        return hours;
    }

    return fallbackHour ? [fallbackHour] : [];
}

function buildSalesActivitySection(sales: KavappDailySalesAnalytics): string {
    const lines: string[] = [];

    const peakHours = getActivityHours(sales.hourly.peakRevenueHours, sales.hourly.peakRevenueHour);

    const slowHours = getActivityHours(sales.hourly.slowestHours, sales.hourly.slowestHour);

    if (peakHours.length > 0) {
        const hours = peakHours.map((hour) => hour.hour).join(", ");

        lines.push(
            `• Найактивніший період: *${hours} — ${formatUah(peakHours[0].revenue)} / ${peakHours[0].checks} чеків*`,
        );
    }

    if (slowHours.length > 0) {
        const hours = slowHours.map((hour) => hour.hour).join(", ");

        lines.push(
            `• Найменш активний період: *${hours} — ${formatUah(slowHours[0].revenue)} / ${slowHours[0].checks} чеків*`,
        );
    }

    return `*4. АКТИВНІСТЬ ПРОДАЖІВ*\n\n${lines.join("\n")}`;
}

function buildDiscountsSection(data: DailyReport, sales: KavappDailySalesAnalytics): string {
    const lines: string[] = [];

    const morningPromo = sales.discounts.morningPromo;

    if (morningPromo && (morningPromo.checksCount > 0 || morningPromo.revenue > 0)) {
        lines.push(
            `• Ранкова акція (${morningPromo.timeRange}): *${morningPromo.checksCount} чеки / ${formatUah(morningPromo.revenue)} виручки / ${formatUah(morningPromo.discountGiven)} знижки*`,
        );
    }

    if (sales.discounts.byDiscountId?.length) {
        for (const discount of sales.discounts.byDiscountId) {
            lines.push(
                `• Дисконт №${discount.id}: *${discount.checksCount} чеків / ${formatUah(discount.discountAmount)} знижки*`,
            );
        }
    }

    const totalDiscountSum = (morningPromo?.discountGiven || 0) + (sales.discounts.totalDiscountAmount || 0);

    if (totalDiscountSum > 0 && data.totalRevenue && data.totalRevenue > 0) {
        const discountPercentOfRevenue = (totalDiscountSum / data.totalRevenue) * 100;

        lines.push(
            `• *Загальна сума знижок: ${formatUah(totalDiscountSum)} (${formatPercent(discountPercentOfRevenue)} виручки)*`,
        );
    }

    if (lines.length === 0) {
        return "";
    }

    return `*5. ЗНИЖКИ ТА АКЦІЇ*\n\n${lines.join("\n")}`;
}

function buildKeyConclusionsSection(data: DailyReport, sales?: KavappDailySalesAnalytics): string {
    const lines: string[] = [];

    const revenue = data.totalRevenue ?? 0;
    const costPercent = data.costPercent ?? 0;
    const writeOffPercent = data.writeOffPercent ?? 0;
    const salaryPercent = data.salaryPercent ?? 0;

    if (revenue < 6000) {
        lines.push(`• Виручка за день: *${formatUah(revenue)}* — низький рівень, зміна потребує уваги.`);
    } else if (revenue < 8000) {
        lines.push(`• Виручка за день: *${formatUah(revenue)}* — нормальний результат.`);
    } else if (revenue < 10000) {
        lines.push(`• Виручка за день: *${formatUah(revenue)}* — хороший результат.`);
    } else if (revenue < 11000) {
        lines.push(`• Виручка за день: *${formatUah(revenue)}* — дуже хороший результат.`);
    } else {
        lines.push(`• Виручка за день: *${formatUah(revenue)}*.`);
    }

    if (costPercent > 36) {
        lines.push(
            `• Собівартість продукції: *${formatPercent(costPercent)}* — показник потребує контролю та аналізу.`,
        );
    } else if (costPercent >= 33) {
        lines.push(`• Собівартість продукції: *${formatPercent(costPercent)}* — показник у межах норми.`);
    } else {
        lines.push(`• Собівартість продукції: *${formatPercent(costPercent)}* — ідеальний рівень.`);
    }

    if (writeOffPercent < 3) {
        lines.push(
            `• Списання: *${formatPercent(writeOffPercent)}* — низький показник, але його необхідно оцінювати разом із фактичними залишками.`,
        );
    } else if (writeOffPercent <= 5) {
        lines.push(`• Списання: *${formatPercent(writeOffPercent)}* — помірний показник у межах норми.`);
    } else {
        lines.push(
            `• Списання: *${formatPercent(writeOffPercent)}* — критичний показник, потребує оптимізації.`,
        );
    }

    if (salaryPercent > 0) {
        if (salaryPercent >= 12 && salaryPercent <= 15) {
            lines.push(`• Фонд оплати праці: *${formatPercent(salaryPercent)}* — ідеальний рівень.`);
        } else if (salaryPercent <= 20) {
            lines.push(
                `• Фонд оплати праці: *${formatPercent(salaryPercent)}* — у межах допустимих значень.`,
            );
        } else {
            lines.push(
                `• Фонд оплати праці: *${formatPercent(salaryPercent)}* — підвищений відсоток витрат.`,
            );
        }
    }

    if (sales) {
        const peakHours = sales.hourly.peakRevenueHours?.length
            ? sales.hourly.peakRevenueHours.map((hour) => hour.hour).join(", ")
            : sales.hourly.peakRevenueHour?.hour;

        if (peakHours) {
            lines.push(`• Найбільша активність продажів: *${peakHours}*.`);
        }

        const slowHours = sales.hourly.slowestHours?.length
            ? sales.hourly.slowestHours.map((hour) => hour.hour).join(", ")
            : sales.hourly.slowestHour?.hour;

        if (slowHours) {
            lines.push(`• Найменша активність продажів: *${slowHours}*.`);
        }

        const morningPromo = sales.discounts.morningPromo;

        if (morningPromo && (morningPromo.checksCount > 0 || morningPromo.revenue > 0)) {
            lines.push(
                `• Ранкова акція принесла *${formatUah(morningPromo.revenue)} виручки за ${morningPromo.checksCount} чеки*.`,
            );
        }
    }

    return lines.join("\n");
}

function buildSoldProductsSection(sales: KavappDailySalesAnalytics, maxChars = 2000): string {
    const items = sales.products.allSoldProducts?.length
        ? sales.products.allSoldProducts
        : sales.products.topByCount;

    if (!items?.length) {
        return "";
    }

    const multipleItems = items.filter((product) => product.count > 1);
    const singleItems = items.filter((product) => product.count === 1);

    const parts: string[] = [];

    if (multipleItems.length > 0) {
        const lines: string[] = [];
        let currentLength = 0;

        for (const product of multipleItems) {
            const line = `• ${product.name} — *${product.count} шт.*`;

            if (currentLength + line.length + 150 > maxChars) {
                const remaining = multipleItems.length - lines.length;

                if (remaining > 0) {
                    lines.push(`_...та ще ${remaining} позицій_`);
                }

                break;
            }

            lines.push(line);
            currentLength += line.length + 1;
        }

        parts.push(lines.join("\n"));
    }

    if (singleItems.length > 0) {
        const names = singleItems.map((product) => product.name).join(", ");

        parts.push(`*По 1 шт.:*\n${names}.`);
    }

    return parts.join("\n\n");
}

function buildDailyReportTemplate(data: DailyReport, sales?: KavappDailySalesAnalytics): string {
    const sections: string[] = [
        buildReportHeaderSection(data, sales),
        buildFinancialSection(data),
        buildPaymentSection(data),
    ];

    if (sales?.cashAudit) {
        sections.push(buildCashAuditSection(sales.cashAudit));
    }

    if (sales) {
        sections.push(buildOperationalSection(sales), buildSalesActivitySection(sales));

        const discountsSection = buildDiscountsSection(data, sales);

        if (discountsSection) {
            sections.push(discountsSection);
        }
    }

    sections.push(`*6. КЛЮЧОВІ ВИСНОВКИ*\n\n${buildKeyConclusionsSection(data, sales)}`);

    if (sales) {
        const baseMessageLength = sections.join("\n\n").length;
        const telegramMaxSafeLength = 3900;
        const remainingBudget = Math.max(500, telegramMaxSafeLength - baseMessageLength - 200);

        const productsSection = buildSoldProductsSection(sales, remainingBudget);

        if (productsSection) {
            sections.push(`*7. ПОВНИЙ СПИСОК ПРОДАНИХ ТОВАРІВ*\n\n${productsSection}`);
        }
    }

    return sections.join("\n\n");
}
