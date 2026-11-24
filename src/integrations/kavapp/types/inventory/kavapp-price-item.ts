export interface KavappPriceItem {
    itemid: string;
    type: string;
    name: string;
    pack: number;
    packPrice: number;
    units: string;
    unitsName: string;
    groupName?: string;
    orderid?: string;
}

export type KavappPriceCategory = "cup" | "ingredient" | "product" | "kitchen";

export type KavappPriceResponse = Record<KavappPriceCategory, KavappPriceItem[]>;
