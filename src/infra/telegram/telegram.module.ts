import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TelegramService } from "./telegram.service";
import { TelegramInterceptor } from "./telegram.interceptor";
import { TelegramMessageMapping, TelegramMessageMappingSchema } from "./telegram-message-mapping.schema";
import { KavappSalesModule } from "../../resources/coffee-shop/kavapp-sales/kavapp-sales.module";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: TelegramMessageMapping.name, schema: TelegramMessageMappingSchema },
        ]),
        KavappSalesModule,
    ],
    providers: [
        TelegramService,
        {
            provide: APP_INTERCEPTOR,
            useClass: TelegramInterceptor,
        },
    ],
    exports: [TelegramService],
})
export class TelegramModule {}
