import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { envKeys } from "../../common/enums/infra/env-key";
import { getRequiredEnv } from "../../common/utils/infra/env-functions";
import { methods } from "../../common/constants/network/methods";
import { httpHeaders } from "../../common/constants/network/http-headers";
import { contentTypes } from "../../common/constants/network/content-types";
import { parseJSONResponse, stringifyJSON } from "../../common/utils/json";
import { formatDateToLocalDateTime } from "../../common/utils/date/date";
import { createRequestTimeout } from "../../common/utils/network/request-signal";
import { TelegramMessageMapping, TelegramMessageMappingDocument } from "./telegram-message-mapping.schema";
import { TelegramBotResponse, TelegramMethod } from "./types";
import {
    telegramApiUrl,
    telegramErrorMessages,
    telegramLogMessages,
    telegramMethods,
    telegramParseModes,
    telegramWarningMessages,
} from "./constants";

@Injectable()
export class TelegramService {
    private readonly logger = new Logger(TelegramService.name);
    private readonly botToken: string;

    constructor(
        private readonly configService: ConfigService,
        @InjectModel(TelegramMessageMapping.name)
        private readonly mappingModel: Model<TelegramMessageMappingDocument>,
    ) {
        this.botToken = getRequiredEnv(envKeys.telegramBotToken, configService);
    }

    private get telegramBotApiUrl(): string {
        return `${telegramApiUrl}/bot${this.botToken}`;
    }

    async sendMessage(chatId: string, text: string) {
        return this.request(telegramMethods.sendMessage, {
            chat_id: chatId,
            text,
            parse_mode: telegramParseModes.markdown,
        });
    }

    async editMessageText(chatId: string, messageId: number, text: string) {
        return this.request(telegramMethods.editMessageText, {
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: telegramParseModes.markdown,
        });
    }

    async deleteMessage(chatId: string, messageId: number) {
        return this.request(telegramMethods.deleteMessage, {
            chat_id: chatId,
            message_id: messageId,
        });
    }

    async handleCreate(
        chatId: string,
        resourceName: string,
        data: Record<string, unknown>,
        customMessageFn: (data: Record<string, unknown>) => string | Promise<string>,
    ) {
        const messageText = await customMessageFn(data);

        try {
            const result = await this.sendMessage(chatId, messageText);

            if (!result.result) return;

            const resourceId = data._id || data.id;

            if (!resourceId) {
                this.logger.warn(telegramWarningMessages.resourceIdNotFound.replace("{0}", resourceName));

                return;
            }

            await this.mappingModel.create({
                resourceId,
                resourceType: resourceName,
                messageId: result.result.message_id,
                chatId: result.result.chat.id.toString(),
            });

            this.logger.log(telegramLogMessages.createNotification.replace("{0}", resourceName));
        } catch (error) {
            this.logger.error(telegramErrorMessages.createNotification.replace("{0}", resourceName), error);
        }
    }

    async handleUpdate(
        resourceName: string,
        resourceId: string,
        data: Record<string, unknown>,
        customMessageFn: (data: Record<string, unknown>) => string | Promise<string>,
    ) {
        const mapping = await this.mappingModel.findOne({ resourceId });

        if (!mapping) {
            this.logger.warn(
                telegramWarningMessages.mappingNotFound
                    .replace("{0}", resourceName)
                    .replace("{1}", resourceId),
            );

            return;
        }

        const messageText = `${await customMessageFn(data)}\n\n🔄 *Оновлено:* ${formatDateToLocalDateTime()}`;

        try {
            await this.editMessageText(mapping.chatId, mapping.messageId, messageText);

            this.logger.log(
                telegramLogMessages.updateNotification
                    .replace("{0}", resourceName)
                    .replace("{1}", resourceId),
            );
        } catch (error) {
            this.logger.error(
                telegramErrorMessages.updateNotification
                    .replace("{0}", resourceName)
                    .replace("{1}", resourceId),
                error,
            );
        }
    }

    async handleDelete(resourceId: string) {
        const mapping = await this.mappingModel.findOne({ resourceId });

        if (!mapping) {
            this.logger.warn(telegramWarningMessages.mappingNotFoundById.replace("{0}", resourceId));

            return;
        }

        try {
            await this.deleteMessage(mapping.chatId, mapping.messageId);
        } catch (error) {
            this.logger.error(telegramErrorMessages.deleteNotification.replace("{0}", resourceId), error);
        } finally {
            await this.mappingModel.deleteOne({ _id: mapping._id });
        }

        this.logger.log(telegramLogMessages.deleteNotification.replace("{0}", resourceId));
    }

    private async request(method: TelegramMethod, body: Record<string, unknown>) {
        const requestTimeout = createRequestTimeout();

        try {
            const response = await fetch(`${this.telegramBotApiUrl}/${method}`, {
                method: methods.post,
                headers: {
                    [httpHeaders.contentType]: contentTypes.json,
                },
                signal: requestTimeout.signal,
                body: stringifyJSON(body),
            });

            const data = await parseJSONResponse<TelegramBotResponse>(response);

            if (!response.ok || !data.ok) {
                throw new Error(`${telegramErrorMessages.apiError}: ${JSON.stringify(data)}`);
            }

            return data;
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                throw new Error(telegramErrorMessages.requestTimeout);
            }

            throw error;
        } finally {
            requestTimeout.cleanup();
        }
    }
}
