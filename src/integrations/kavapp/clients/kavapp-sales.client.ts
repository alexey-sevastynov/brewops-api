import { HttpService } from "@nestjs/axios";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { getRequiredEnv } from "../../../common/utils/infra/env-functions";
import { envKeys } from "../../../common/enums/infra/env-key";
import { contentTypes } from "../../../common/constants/network/content-types";
import { kavappEndpoints } from "../constants/kavapp-endpoints";
import { kavappErrorMessages } from "../constants/kavapp-error-messages";
import { kavappDefaultValues } from "../constants/kavapp-default-values";
import {
    KavappAvgReportItem,
    KavappCheckItem,
    KavappDailySalesRaw,
    KavappFinanceReportItem,
    KavappHourlyReportItem,
    KavappSaleItem,
} from "../types/sales/kavapp-sales-raw.types";
import { KavappAuthClient } from "./kavapp-auth.client";

const kavappAvgReportTypes = {
    drink: "drink",
    group: "group",
} as const;

const kavappAvgReportParameters = {
    withoutParameter: "0",
} as const;

@Injectable()
export class KavappSalesClient {
    constructor(
        private readonly httpService: HttpService,
        private readonly authClient: KavappAuthClient,
    ) {}

    async getDailySalesRaw(
        coffeeShopId: string,
        sdtime: string,
        edtime: string,
        email?: string,
        password?: string,
        pointId?: string,
    ): Promise<KavappDailySalesRaw> {
        const activePointId = pointId || getRequiredEnv(envKeys.kavappPointId) || kavappDefaultValues.pointId;

        try {
            return await this.authClient.executeWithAuth(coffeeShopId, email, password, async (token) => {
                const [reportNew, avgReport, groupReport, checksReport, hourlyReport, financeReport] =
                    await Promise.all([
                        this.fetchReportNew(token, sdtime, edtime),
                        this.fetchAvgReport(token, sdtime, edtime),
                        this.fetchGroupReport(token, sdtime, edtime),
                        this.fetchChecksReport(token, sdtime, edtime),
                        this.fetchHourlyReport(token, sdtime, edtime, activePointId),
                        this.fetchFinanceReport(token, sdtime, edtime),
                    ]);

                return {
                    reportNew: this.toArray(reportNew),
                    avgReport: this.toArray(avgReport),
                    groupReport: this.toArray(groupReport),
                    checksReport: this.toArray(checksReport),
                    hourlyReport: this.toArray(hourlyReport),
                    financeReport: this.toArray(financeReport),
                };
            });
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new HttpException(kavappErrorMessages.salesFetchFailed, HttpStatus.BAD_GATEWAY, {
                cause: error,
            });
        }
    }

    private fetchReportNew(token: string, sdtime: string, edtime: string) {
        return this.fetchSalesEndpoint<KavappSaleItem[]>(kavappEndpoints.sales.reportNew, token, {
            sdtime,
            edtime,
        });
    }

    private fetchAvgReport(token: string, sdtime: string, edtime: string) {
        return this.fetchSalesEndpoint<KavappAvgReportItem[]>(kavappEndpoints.sales.avgReport, token, {
            idtype: kavappAvgReportTypes.drink,
            dateRangePicker: { sdtime, edtime },
            sdtime,
            edtime,
        });
    }

    private fetchGroupReport(token: string, sdtime: string, edtime: string) {
        return this.fetchSalesEndpoint<KavappAvgReportItem[]>(kavappEndpoints.sales.avgReport, token, {
            idtype: kavappAvgReportTypes.group,
            dateRangePicker: { sdtime, edtime },
            useParameter: kavappAvgReportParameters.withoutParameter,
            sdtime,
            edtime,
        }).catch(() => []);
    }

    private fetchChecksReport(token: string, sdtime: string, edtime: string) {
        return this.fetchSalesEndpoint<KavappCheckItem[]>(kavappEndpoints.sales.checksReport, token, {
            sdtime,
            edtime,
        });
    }

    private fetchHourlyReport(token: string, sdtime: string, edtime: string, pointId: string) {
        return this.fetchSalesEndpoint<KavappHourlyReportItem[]>(kavappEndpoints.sales.hourlyReport, token, {
            dateRangePicker: { sdtime, edtime },
            sdtime,
            edtime,
            idworker: null,
            idsalepoint: pointId,
        });
    }

    private fetchFinanceReport(token: string, sdtime: string, edtime: string) {
        return this.fetchSalesEndpoint<KavappFinanceReportItem[]>(
            kavappEndpoints.sales.financeReport,
            token,
            {
                dateRangePicker: { sdtime, edtime },
                sdtime,
                edtime,
            },
        ).catch(() => []);
    }

    private toArray<T>(value: T): T extends unknown[] ? T : never {
        return (Array.isArray(value) ? value : []) as T extends unknown[] ? T : never;
    }

    private async fetchSalesEndpoint<T>(
        endpoint: string,
        token: string,
        body: Record<string, unknown>,
    ): Promise<T> {
        const kavappOldApiUrl = getRequiredEnv(envKeys.kavappOldApiUrl);

        const headers = {
            accept: `${contentTypes.json}, text/plain, */*`,
            "content-type": contentTypes.json,
            Referer: "https://admin.kavapp.com/",
        };

        const response = await firstValueFrom(
            this.httpService.put<T>(`${kavappOldApiUrl}${endpoint}`, body, {
                params: { token },
                headers,
            }),
        );

        return response.data;
    }
}
