import { formatUah } from "../../../common/utils/currency";
import { formatDateToLongDate } from "../../../common/utils/date/date";
import { expenseReportTypeLabels } from "./constants/expense-report-type-labels";
import { type ExpenseReport } from "./expense-report-schema";

export const formatExpenseReportMessage = () => (data: ExpenseReport) => {
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

    return `📄 *Звіт про витрату*

До обліку внесено витрату *«${data.title}»* на суму *${formatUah(data.amount)}*. Витрату віднесено до категорії *${expenseReportTypeLabels[data.type]}*.

${period}${description}${receipt}`;
};
