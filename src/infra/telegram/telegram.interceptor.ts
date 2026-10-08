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
import {
    telegramActions,
    telegramErrorMessages,
    telegramLogMessages,
    telegramValidationMessages,
} from "./constants";
import {
    type TelegramNotifyOptions,
    type TelegramNotificationContext,
    TelegramNotifyWithMessage,
    TelegramNotifyWithFactory,
} from "./types";
import { type CoffeeShopDocument } from "../../resources/coffee-shop/coffee-shop-schema";
import { type WorkspaceDocument } from "../../resources/workspace/workspace-schema";
import { getWorkspacePlanLimits } from "../../common/config/workspace-plan.config";
import { KavappSalesService } from "../../resources/coffee-shop/kavapp-sales/services/kavapp-sales.service";

interface ExpressRequest {
    params: Record<string, string>;
    body: Record<string, unknown>;
    coffeeShop?: CoffeeShopDocument;
    workspace?: WorkspaceDocument;
    [key: string]: unknown;
}

@Injectable()
export class TelegramInterceptor implements NestInterceptor<unknown, unknown> {
    private readonly logger = new Logger(TelegramInterceptor.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly telegramService: TelegramService,
        @Optional() private readonly aiService: AiService,
        @Optional() private readonly kavappSalesService?: KavappSalesService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
        const handler = context.getHandler();
        const options = this.reflector.get<TelegramNotifyOptions>(telegramNotifyMetadata, handler);

        if (!options) return next.handle();

        const request = context.switchToHttp().getRequest<ExpressRequest>();

        return next.handle().pipe(
            concatMap(async (response) => {
                const responseObj = response as Record<string, unknown> | null;

                try {
                    await this.handleNotification(options, request, responseObj);
                } catch (err) {
                    this.logger.error(telegramLogMessages.sendNotificationFailed, err);
                }

                return response;
            }),
        );
    }

    private resolveMessageFn(options: TelegramNotifyOptions, context?: TelegramNotificationContext) {
        if (this.hasMessageFactory(options)) {
            if (!this.aiService) throw new Error(telegramErrorMessages.aiServiceRequired);

            return options.messageFactory(this.aiService, context);
        }

        if (this.hasMessage(options)) return options.message;

        throw new Error(telegramErrorMessages.messageSourceNotFound.replace("{0}", options.resource));
    }

    private hasMessage<T>(options: TelegramNotifyOptions<T>): options is TelegramNotifyWithMessage<T> {
        return "message" in options && options.message !== undefined;
    }

    private hasMessageFactory<T>(options: TelegramNotifyOptions<T>): options is TelegramNotifyWithFactory<T> {
        return "messageFactory" in options && options.messageFactory !== undefined;
    }

    private async handleNotification(
        options: TelegramNotifyOptions,
        request: ExpressRequest,
        response: Record<string, unknown> | null,
    ): Promise<void> {
        const resourceId = request.params?.id;

        const data = response || request.body;

        if (request.workspace) {
            const limits = getWorkspacePlanLimits(request.workspace.planKey);

            if (!limits.allowTelegramIntegration) return;
        }

        if (!request.coffeeShop?.telegramChatId) {
            throw new BadRequestException(telegramValidationMessages.chatNotConfigured);
        }

        const notificationContext: TelegramNotificationContext = {
            coffeeShop: request.coffeeShop,
            workspace: request.workspace,
            kavappSalesService: this.kavappSalesService,
        };

        if (options.action === telegramActions.create) {
            if (!data) return;

            const messageFn = this.resolveMessageFn(options, notificationContext);

            await this.telegramService.handleCreate(
                request.coffeeShop?.telegramChatId,
                options.resource,
                data,
                messageFn,
            );
        } else if (options.action === telegramActions.update) {
            if (!resourceId) return;

            const messageFn = this.resolveMessageFn(options, notificationContext);

            await this.telegramService.handleUpdate(options.resource, resourceId, data, messageFn);
        } else if (options.action === telegramActions.delete) {
            if (!resourceId) return;

            await this.telegramService.handleDelete(String(resourceId));
        }
    }
}
