import { HttpService } from "@nestjs/axios";
import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { AxiosError } from "axios";
import { getRequiredEnv } from "../../../common/utils/infra/env-functions";
import { envKeys } from "../../../common/enums/infra/env-key";
import { KavappLoginResponse } from "../types/auth/kavapp-login-response";
import { KavappLoginRequest } from "../types/auth/kavapp-login-request";
import { kavappErrorMessages } from "../constants/kavapp-error-messages";
import { kavappValidationMessages } from "../constants/kavapp-validation-messages";
import { kavappEndpoints } from "../constants/kavapp-endpoints";

@Injectable()
export class KavappAuthClient {
    private readonly cachedTokens = new Map<string, string>();

    constructor(private readonly httpService: HttpService) {}

    async login(coffeeShopId: string, email?: string, password?: string): Promise<string> {
        if (!email || !password) {
            throw new HttpException(kavappValidationMessages.credentialsRequired, HttpStatus.BAD_REQUEST);
        }

        const kavappLoginRequest: KavappLoginRequest = {
            email,
            pass: password,
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
            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(kavappErrorMessages.authenticationRequestFailed, HttpStatus.BAD_GATEWAY, {
                cause: error,
            });
        }
    }

    async executeWithAuth<T>(
        coffeeShopId: string,
        email: string | undefined,
        password: string | undefined,
        fn: (token: string) => Promise<T>,
    ): Promise<T> {
        let token = this.cachedTokens.get(coffeeShopId);

        if (!token) {
            token = await this.login(coffeeShopId, email, password);
        }

        try {
            return await fn(token);
        } catch (error) {
            if (!this.isUnauthorized(error)) {
                throw error;
            }

            this.cachedTokens.delete(coffeeShopId);

            token = await this.login(coffeeShopId, email, password);

            return fn(token);
        }
    }

    private isUnauthorized(error: unknown): boolean {
        if (!(error instanceof AxiosError)) {
            return false;
        }

        return error.response?.status === 401 || error.response?.status === 403;
    }
}
