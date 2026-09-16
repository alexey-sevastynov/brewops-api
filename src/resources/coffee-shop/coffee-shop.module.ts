import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CoffeeShop, CoffeeShopEntitySchema } from "./coffee-shop-schema";
import { CoffeeShopService } from "./coffee-shop.service";
import { CoffeeShopController } from "./coffee-shop.controller";
import { WorkspaceMemberModule } from "../workspace-member/workspace-member.module";
import { WorkspaceModule } from "../workspace/workspace.module";
import { CoffeeShopAccessModule } from "../coffee-shop-access/coffee-shop-access.module";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: CoffeeShop.name, schema: CoffeeShopEntitySchema }]),
        WorkspaceMemberModule,
        WorkspaceModule,
        CoffeeShopAccessModule,
    ],
    controllers: [CoffeeShopController],
    providers: [CoffeeShopService],
    exports: [CoffeeShopService, WorkspaceMemberModule],
})
export class CoffeeShopModule {}
