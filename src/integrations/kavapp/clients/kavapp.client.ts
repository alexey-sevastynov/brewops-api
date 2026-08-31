import { HttpService } from "@nestjs/axios";
import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { AxiosError } from "axios";
import { getRequiredEnv } from "../../../common/utils/infra/env-functions";
import { envKeys } from "../../../common/enums/infra/env-key";
import { KavappInventoryResponse } from "../types/inventory/kavapp-inventory-response";
import { KavappCatalogItem } from "../types/inventory/kavapp-inventory-item";
import { KavappLoginResponse } from "../types/auth/kavapp-login-response";
import { kavappErrorMessages } from "../constants/kavapp-error-messages";
import { KavappLoginRequest } from "../types/auth/kavapp-login-request";
import { kavappEndpoints } from "../constants/kavapp-endpoints";

@Injectable()
export class KavappClient {
    private cachedTokens = new Map<string, string>();
    constructor(private readonly httpService: HttpService) {}

    async login(coffeeShopId: string, email?: string, pass?: string) {
        if (!email || !pass) {
            throw new HttpException("Kavapp email and password are required", HttpStatus.BAD_REQUEST);
        }

        const kavappLoginRequest: KavappLoginRequest = {
            email,
            pass,
        };

        try {
            const kavappLoginResponse = await firstValueFrom(
                this.httpService.post<KavappLoginResponse>(
                    `${getRequiredEnv(envKeys.kavappApiUrl)}${kavappEndpoints.login}`,
                    kavappLoginRequest,
                ),
            );

            if (kavappLoginResponse.data.error) {
                throw new HttpException(kavappErrorMessages.authenticationFailed, HttpStatus.UNAUTHORIZED);
            }

            const token = kavappLoginResponse.data.data.token;
            this.cachedTokens.set(coffeeShopId, token);

            return token;
        } catch (error) {
            if (error instanceof HttpException) throw error;

            throw new HttpException(kavappErrorMessages.authenticationRequestFailed, HttpStatus.BAD_GATEWAY, {
                cause: error,
            });
        }
    }

    async getInventory(coffeeShopId: string, email?: string, pass?: string, pointId?: string) {
        const defaultPointId = "1";
        const activePointId = pointId || getRequiredEnv(envKeys.kavappPointId) || defaultPointId;

        let token = this.cachedTokens.get(coffeeShopId);
        if (!token) token = await this.login(coffeeShopId, email, pass);

        try {
            try {
                return await this.fetchInventory(token, activePointId);
            } catch (error) {
                if (this.isUnauthorized(error)) {
                    this.cachedTokens.delete(coffeeShopId);
                    token = await this.login(coffeeShopId, email, pass);

                    const kavappInventoryResponse = await this.fetchInventory(token, activePointId);

                    return kavappInventoryResponse;
                }

                throw error;
            }
        } catch (error) {
            if (error instanceof HttpException) throw error;

            throw new HttpException(kavappErrorMessages.inventoryFetchFailed, HttpStatus.BAD_REQUEST, {
                cause: error,
            });
        }
    }

    async getCatalog(coffeeShopId: string, email?: string, pass?: string): Promise<KavappCatalogItem[]> {
        let token = this.cachedTokens.get(coffeeShopId);
        if (!token) token = await this.login(coffeeShopId, email, pass);

        try {
            const catalog = await Promise.all([
                this.fetchCatalog(kavappEndpoints.catalog.product, "product", token),
                this.fetchCatalog(kavappEndpoints.catalog.cup, "cup", token),
                this.fetchCatalog(kavappEndpoints.catalog.ingredient, "ingredient", token),
            ]);

            return catalog.flat();
        } catch (error) {
            if (this.isUnauthorized(error)) {
                this.cachedTokens.delete(coffeeShopId);
                token = await this.login(coffeeShopId, email, pass);
                return this.getCatalog(coffeeShopId, email, pass);
            }

            throw new HttpException(kavappErrorMessages.inventoryFetchFailed, HttpStatus.BAD_GATEWAY, {
                cause: error,
            });
        }
    }

    private async fetchInventory(token: string, pointId: string): Promise<KavappInventoryResponse> {
        const kavappOldApiUrl = getRequiredEnv(envKeys.kavappOldApiUrl);
        const kavappParams = { params: { token } };

        const kavappInventoryResponse = await firstValueFrom(
            this.httpService.get<KavappInventoryResponse>(
                `${kavappOldApiUrl}${kavappEndpoints.inventory(pointId)}`,
                kavappParams,
            ),
        );

        return kavappInventoryResponse.data;
    }

    private async fetchCatalog(
        endpoint: string,
        type: KavappCatalogItem["type"],
        token: string,
    ): Promise<KavappCatalogItem[]> {
        const response = await firstValueFrom(
            this.httpService.get<ReadonlyArray<Record<string, unknown>>>(
                `${getRequiredEnv(envKeys.kavappOldApiUrl)}${endpoint}`,
                { params: { token } },
            ),
        );

        return response.data.flatMap((item): KavappCatalogItem[] => {
            const id = this.toString(item.id);
            const name = this.toString(item.name);
            const status = this.toString(item.status);

            if (!id || !name || (status !== undefined && status !== "1")) return [];

            return [
                {
                    id,
                    name,
                    type,
                    units: this.toString(item.units) || this.toString(item.volumeUnits),
                    unitsName: this.toString(item.unitsName) || this.toString(item.volumeUnitsName),
                    volumeUnits: this.toString(item.volumeUnits),
                    volumeUnitsName: this.toString(item.volumeUnitsName),
                },
            ];
        });
    }

    private toString(value: unknown): string | undefined {
        if (typeof value !== "string" && typeof value !== "number") return undefined;
        return value === "" ? undefined : String(value);
    }

    private isUnauthorized(error: unknown): boolean {
        if (error instanceof AxiosError) {
            return error.response?.status === 401 || error.response?.status === 403;
        }

        return false;
    }
}
