import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { KavappModule } from "../../../integrations/kavapp/kavapp.module";
import { CoffeeShop, CoffeeShopEntitySchema } from "../coffee-shop-schema";
import { KavappSalesService } from "./services/kavapp-sales.service";
import { KavappSalesController } from "./controllers/kavapp-sales.controller";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: CoffeeShop.name, schema: CoffeeShopEntitySchema }]),
        KavappModule,
    ],
    controllers: [KavappSalesController],
    providers: [KavappSalesService],
    exports: [KavappSalesService],
})
export class KavappSalesModule {}
