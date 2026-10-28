import { formatUah } from "../../../common/utils/currency";
import { formatDateToLongDate } from "../../../common/utils/date/date";
import { type AiService } from "../../../infra/ai/ai.service";
import { type TelegramNotificationContext } from "../../../infra/telegram/types";
import { expenseReportTypeLabels } from "./constants/expense-report-type-labels";
import { type ExpenseReport } from "./expense-report-schema";

export const formatExpenseReportMessage =
    (_aiService?: AiService, _context?: TelegramNotificationContext) => (data: ExpenseReport) => {
        const period =
            data.validFrom && data.validTo
                ? `Період дії витрати встановлено з *${formatDateToLongDate(data.validFrom)}* до *${formatDateToLongDate(data.validTo)}*.`
                : data.validFrom
                  ? `Початок дії витрати — *${formatDateToLongDate(data.validFrom)}*.`
                  : data.validTo
                    ? `Витрата дійсна до *${formatDateToLongDate(data.validTo)}*.`
                    : data.date
                      ? `Дату здійснення витрати визначено як *${formatDateToLongDate(data.date)}*.`
                      : "";

        const description = data.description ? `\n\nℹ️ _Додаткова інформація: ${data.description}_` : "";
        const receipt = data.receiptUrl ? `\n\n🧾 [Чек](${data.receiptUrl})` : "";

        const message = `📄 *Звіт про витрату*

До обліку внесено витрату *«${data.title}»* на суму *${formatUah(data.amount)}*. Витрату віднесено до категорії *${expenseReportTypeLabels[data.type]}*.

${period}${description}${receipt}`;

        return sanitizeTelegramMarkdown(message);
    };

function sanitizeTelegramMarkdown(text: string): string {
    let sanitized = text.replace(/\*\*(.*?)\*\*/g, "*$1*");
    sanitized = sanitized.replace(/\\([_*[\]()~`>#+\-=|{}.!])/g, "$1");

    const boldCount = (sanitized.match(/\*/g) || []).length;
    if (boldCount % 2 !== 0) {
        const lastIndex = sanitized.lastIndexOf("*");
        sanitized = sanitized.slice(0, lastIndex) + sanitized.slice(lastIndex + 1);
    }

    const italicCount = (sanitized.match(/_/g) || []).length;
    if (italicCount % 2 !== 0) {
        const lastIndex = sanitized.lastIndexOf("_");
        sanitized = sanitized.slice(0, lastIndex) + sanitized.slice(lastIndex + 1);
    }

    return sanitized;
}
