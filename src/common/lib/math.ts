import Big from "big.js";

export function percent(part: number, whole: number, precision = 2) {
    if (!whole) return 0;

    const result = new Big(part).div(whole).times(100);

    return round(Number(result), precision);
}

export function toDecimalPercent(percent: number) {
    return Number(new Big(percent).div(100));
}

export function round(value: number, precision = 2) {
    return Number(new Big(value).round(precision));
}

export function discountToPaidRatio(discountPercent: number) {
    return Number(new Big(discountPercent).div(new Big(100).minus(discountPercent)));
}
