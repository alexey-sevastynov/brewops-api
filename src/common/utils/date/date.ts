import { format as formatDateFns } from "date-fns";
import { uk } from "date-fns/locale";
import { dateFormatStrings, dateLocales, timeZones } from "./constants";

type DateFormatString = (typeof dateFormatStrings)[keyof typeof dateFormatStrings];

export function getTodayDate() {
    return format(new Date(), "yyyy-MM-dd");
}

export function getCurrentYear() {
    return new Date().getFullYear();
}

export function formatDateToIsoDate(date: unknown) {
    return formatDate(date, dateFormatStrings.iso);
}

export function formatDateToShortDate(date: unknown) {
    return formatDate(date, dateFormatStrings.short);
}

export function formatDateToLongDate(date: unknown) {
    return formatDate(date, dateFormatStrings.long);
}

export function formatDateToLongWithWeekDay(date: unknown) {
    return formatDate(date, dateFormatStrings.longWithWeekDay);
}

export function formatDateToDateTime(date: unknown) {
    return formatDate(date, dateFormatStrings.dateTime);
}

export function formatDateToTime(date: unknown) {
    return formatDate(date, dateFormatStrings.time);
}

export function formatDateToMonth(date: unknown) {
    return formatDate(date, dateFormatStrings.month);
}

export function formatDateToLocalDateTime(date: Date = new Date()) {
    return date.toLocaleString(dateLocales.ukrainian, {
        timeZone: timeZones.ukraine,
    });
}

function formatDate(value: unknown, dateFormatString: DateFormatString) {
    if (!value) return "";

    let date: Date;

    if (value instanceof Date) {
        date = value;
    } else if (typeof value === "string") {
        date = new Date(value);
    } else {
        throw new Error(`formatDate received invalid type: ${typeof value}`);
    }

    return format(date, dateFormatString);
}

function format(date: Date, formatString: DateFormatString, locale = uk) {
    return formatDateFns(date, formatString, { locale });
}
