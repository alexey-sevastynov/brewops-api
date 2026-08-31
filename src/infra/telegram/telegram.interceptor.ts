import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
    Optional,
    BadRequestException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { concatMap } from "rxjs/operators";
import { Reflector } from "@nestjs/core";
import { AiService } from "../ai/ai.service";
import { telegramNotifyMetadata } from "./telegram.decorator";
import { TelegramService } from "./telegram.service";
import { telegramActions } from "./constants";
import { type TelegramNotifyOptions } from "./types";
import { type CoffeeShopDocument } from "../../resources/coffee-shop/coffee-shop-schema";

interface ExpressRequest {
    params: Record<string, string>;
    body: Record<string, unknown>;
    coffeeShop?: CoffeeShopDocument;
    [key: string]: unknown;
}

@Injectable()
export class TelegramInterceptor implements NestInterceptor<unknown, unknown> {
    private readonly logger = new Logger(TelegramInterceptor.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly telegramService: TelegramService,
        @Optional() private readonly aiService: AiService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
        const handler = context.getHandler();
        const options = this.reflector.get<TelegramNotifyOptions>(telegramNotifyMetadata, handler);

        if (!options) {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest<ExpressRequest>();

        return next.handle().pipe(
            concatMap(async (response) => {
                const responseObj = response as Record<string, unknown> | null;

                try {
                    await this.handleNotification(options, request, responseObj);
                } catch (err) {
                    this.logger.error("Failed to send Telegram notification", err);
                }

                return response;
            }),
        );
    }

    private resolveMessageFn(options: TelegramNotifyOptions) {
        if ("messageFactory" in options && options.messageFactory) {
            if (!this.aiService) {
                throw new Error("AiService is required for messageFactory but was not injected");
            }

            return options.messageFactory(this.aiService);
        }

        if ("message" in options && options.message) {
            return options.message;
        }

        throw new Error(`No message or messageFactory found for resource: ${options.resource}`);
    }

    private async handleNotification(
        options: TelegramNotifyOptions,
        request: ExpressRequest,
        response: Record<string, unknown> | null,
    ): Promise<void> {
        const resourceId = request.params?.id;

        const data = response || request.body;

        const coffeeShop = request.coffeeShop;

        const chatId = coffeeShop?.telegramChatId;

        if (!chatId) {
            throw new BadRequestException("Telegram чат не налаштований для цієї кав'ярні.");
        }

        if (options.action === telegramActions.create) {
            if (!data) return;
            const messageFn = this.resolveMessageFn(options);
            await this.telegramService.handleCreate(chatId, options.resource, data, messageFn);
        } else if (options.action === telegramActions.update) {
            if (!resourceId) return;
            const messageFn = this.resolveMessageFn(options);
            await this.telegramService.handleUpdate(options.resource, resourceId, data, messageFn);
        } else if (options.action === telegramActions.delete) {
            if (!resourceId) return;
            await this.telegramService.handleDelete(String(resourceId));
        }
    }
}
