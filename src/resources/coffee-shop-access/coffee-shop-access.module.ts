import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CoffeeShopAccess, CoffeeShopAccessSchema } from "./coffee-shop-access.schema";
import { CoffeeShopAccessService } from "./coffee-shop-access.service";

@Module({
    imports: [MongooseModule.forFeature([{ name: CoffeeShopAccess.name, schema: CoffeeShopAccessSchema }])],
    providers: [CoffeeShopAccessService],
    exports: [CoffeeShopAccessService, MongooseModule],
})
export class CoffeeShopAccessModule {}
