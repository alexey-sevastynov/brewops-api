import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { getRequiredEnv } from "../../../common/utils/infra/env-functions";
import { typeNames } from "../../../common/enums/infra/type-name";
import { envKeys } from "../../../common/enums/infra/env-key";
import { isArray, isNumber, isString } from "../../../common/utils/guards";
import { KavappAuthClient } from "./kavapp-auth.client";
import { kavappEndpoints } from "../constants/kavapp-endpoints";
import { kavappErrorMessages } from "../constants/kavapp-error-messages";
import { KavappPriceItem, KavappPriceResponse } from "../types/inventory/kavapp-price-item";
import { kavappInventoryItemTypes } from "../constants/kavapp-inventory";

@Injectable()
export class KavappPriceClient {
    constructor(
        private readonly httpService: HttpService,
        private readonly authClient: KavappAuthClient,
    ) {}

    async getPrices(
        coffeeShopId: string,
        email?: string,
        password?: string,
        pointId?: string,
    ): Promise<KavappPriceResponse> {
        const activePointId = pointId || getRequiredEnv(envKeys.kavappPointId);

        try {
            return await this.authClient.executeWithAuth(coffeeShopId, email, password, async (token) => {
                const response = await firstValueFrom(
                    this.httpService.get<Record<string, unknown>>(
                        `${getRequiredEnv(envKeys.kavappOldApiUrl)}${kavappEndpoints.prices(activePointId)}`,
                        { params: { token } },
                    ),
                );

                return this.mapResponse(response.data);
            });
        } catch (error) {
            if (error instanceof HttpException) throw error;

            throw new HttpException(kavappErrorMessages.inventoryFetchFailed, HttpStatus.BAD_GATEWAY, {
                cause: error,
            });
        }
    }

    private mapResponse(response: Record<string, unknown>): KavappPriceResponse {
        return Object.fromEntries(
            kavappInventoryItemTypes.map((category) => [category, this.mapCategory(response[category])]),
        ) as KavappPriceResponse;
    }

    private mapCategory(value: unknown) {
        if (!isArray(value)) return [];

        return value.flatMap((rawItem): KavappPriceItem[] => {
            if (!rawItem || typeof rawItem !== typeNames.object) return [];

            const item = rawItem as Record<string, unknown>;
            const itemid = this.toStringValue(item.itemid);
            const name = this.toStringValue(item.name);
            const pack = Number(item.pack);
            const packPrice = Number(item.packPrice);

            if (!itemid || !name || !Number.isFinite(pack) || !Number.isFinite(packPrice)) return [];

            const kavappPriceItem: KavappPriceItem = {
                itemid,
                type: this.toStringValue(item.type) ?? "",
                name,
                groupName: this.toStringValue(item.groupName),
                pack,
                packPrice,
                units: this.toStringValue(item.units) ?? "",
                unitsName: this.toStringValue(item.unitsName) ?? "",
                orderid: this.toStringValue(item.orderid),
            };

            return [kavappPriceItem];
        });
    }

    private toStringValue(value: unknown): string | undefined {
        if (isString(value)) return value || undefined;

        if (isNumber(value)) return String(value);

        return undefined;
    }
}
