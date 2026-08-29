import { toNumber } from "../../../common/utils/number";
import { type KavappInventoryItem } from "../types/inventory/kavapp-inventory-item";
import type { KavappInventoryResponse } from "../types/inventory/kavapp-inventory-response";

export class KavappInventoryMapper {
    static mapItem<T extends KavappInventoryItem>(item: T): T {
        return {
            ...item,
            itemPrice: toNumber(item.itemPrice),
            itemsCost: toNumber(item.itemsCost),
            salePrice: toNumber(item.salePrice),
            saleCost: toNumber(item.saleCost),
        };
    }

    static map(response: KavappInventoryResponse): KavappInventoryResponse {
        return {
            cup: (response.cup ?? []).map((item) => this.mapItem(item)),
            ingredient: (response.ingredient ?? []).map((item) => this.mapItem(item)),
            product: (response.product ?? []).map((item) => this.mapItem(item)),
            kitchen: (response.kitchen ?? []).map((item) => this.mapItem(item)),
        };
    }
}
