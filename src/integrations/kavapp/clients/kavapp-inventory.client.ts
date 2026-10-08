import { HttpService } from "@nestjs/axios";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { getRequiredEnv } from "../../../common/utils/infra/env-functions";
import { envKeys } from "../../../common/enums/infra/env-key";
import { KavappInventoryResponse } from "../types/inventory/kavapp-inventory-response";
import { KavappCatalogItem } from "../types/inventory/kavapp-inventory-item";
import { kavappErrorMessages } from "../constants/kavapp-error-messages";
import { kavappEndpoints } from "../constants/kavapp-endpoints";
import { KavappAuthClient } from "./kavapp-auth.client";
import { isNumber, isString } from "common/utils/guards";
import { kavappDefaultValues } from "../constants/kavapp-default-values";
import { kavappInventoryTypes } from "../constants/kavapp-inventory-types";

@Injectable()
export class KavappInventoryClient {
    constructor(
        private readonly httpService: HttpService,
        private readonly authClient: KavappAuthClient,
    ) {}

    async getInventory(
        coffeeShopId: string,
        email?: string,
        password?: string,
        pointId?: string,
    ): Promise<KavappInventoryResponse> {
        const activePointId = pointId || getRequiredEnv(envKeys.kavappPointId) || kavappDefaultValues.pointId;

        try {
            return await this.authClient.executeWithAuth(coffeeShopId, email, password, async (token) => {
                const kavappOldApiUrl = getRequiredEnv(envKeys.kavappOldApiUrl);

                const response = await firstValueFrom(
                    this.httpService.get<KavappInventoryResponse>(
                        `${kavappOldApiUrl}${kavappEndpoints.inventory(activePointId)}`,
                        { params: { token } },
                    ),
                );

                return response.data;
            });
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(kavappErrorMessages.inventoryFetchFailed, HttpStatus.BAD_REQUEST, {
                cause: error,
            });
        }
    }

    async getCatalog(coffeeShopId: string, email?: string, password?: string): Promise<KavappCatalogItem[]> {
        try {
            return await this.authClient.executeWithAuth(coffeeShopId, email, password, async (token) => {
                const catalog = await Promise.all([
                    this.fetchCatalogItemType(
                        kavappEndpoints.catalog.product,
                        kavappInventoryTypes.product,
                        token,
                    ),
                    this.fetchCatalogItemType(kavappEndpoints.catalog.cup, kavappInventoryTypes.cup, token),
                    this.fetchCatalogItemType(
                        kavappEndpoints.catalog.ingredient,
                        kavappInventoryTypes.ingredient,
                        token,
                    ),
                ]);

                return catalog.flat();
            });
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(kavappErrorMessages.inventoryFetchFailed, HttpStatus.BAD_GATEWAY, {
                cause: error,
            });
        }
    }

    private async fetchCatalogItemType(
        endpoint: string,
        type: KavappCatalogItem["type"],
        token: string,
    ): Promise<KavappCatalogItem[]> {
        const response = await firstValueFrom(
            this.httpService.get<ReadonlyArray<Record<string, unknown>>>(
                `${getRequiredEnv(envKeys.kavappOldApiUrl)}${endpoint}`,
                {
                    params: { token },
                },
            ),
        );

        return response.data.flatMap((item): KavappCatalogItem[] => {
            const id = this.toStringValue(item.id);
            const name = this.toStringValue(item.name);
            const status = this.toStringValue(item.status);

            if (!id || !name || (status !== undefined && status !== "1")) {
                return [];
            }

            return [
                {
                    id,
                    name,
                    type,
                    units: this.toStringValue(item.units) || this.toStringValue(item.volumeUnits),
                    unitsName: this.toStringValue(item.unitsName) || this.toStringValue(item.volumeUnitsName),
                    volumeUnits: this.toStringValue(item.volumeUnits),
                    volumeUnitsName: this.toStringValue(item.volumeUnitsName),
                },
            ];
        });
    }

    private toStringValue(value: unknown) {
        if (isString(value)) return value || undefined;

        if (isNumber(value)) return String(value);

        return undefined;
    }
}
