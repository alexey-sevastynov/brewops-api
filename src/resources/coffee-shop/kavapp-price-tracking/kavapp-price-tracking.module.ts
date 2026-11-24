import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { KavappModule } from "../../../integrations/kavapp/kavapp.module";
import { TelegramModule } from "../../../infra/telegram/telegram.module";
import { CoffeeShop, CoffeeShopEntitySchema } from "../coffee-shop-schema";
import { KavappPriceSnapshot, KavappPriceSnapshotSchema } from "./kavapp-price-snapshot.schema";
import { KavappPriceTrackingController } from "./kavapp-price-tracking.controller";
import { KavappPriceTrackingService } from "./services/kavapp-price-tracking.service";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: KavappPriceSnapshot.name, schema: KavappPriceSnapshotSchema },
            { name: CoffeeShop.name, schema: CoffeeShopEntitySchema },
        ]),
        KavappModule,
        TelegramModule,
    ],
    controllers: [KavappPriceTrackingController],
    providers: [KavappPriceTrackingService],
})
export class KavappPriceTrackingModule {}
