import { Controller, Get, Post, Patch, Delete, Body, Param, UsePipes, ValidationPipe } from "@nestjs/common";
import { InventoryAlertRuleService } from "../services/inventory-alert-rule.service";
import { CreateInventoryAlertRuleDto } from "../dto/create-inventory-alert-rule.dto";
import { UpdateInventoryAlertRuleDto } from "../dto/update-inventory-alert-rule.dto";
import { CheckPermission } from "../../../../resources/auth/decorators/check-permission.decorator";
import { resourceNames } from "../../../../common/constants/resource-names";
import { permissionActions } from "../../../../common/enums/permission-action";

@Controller("coffee-shops/:coffeeShopId/kavapp/alert-rules")
export class InventoryAlertRuleController {
    constructor(private readonly service: InventoryAlertRuleService) {}

    @Get()
    @CheckPermission(resourceNames.kavapp, permissionActions.read)
    findAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.findAllInventoryAlertRules(coffeeShopId);
    }

    @Get(":id")
    @CheckPermission(resourceNames.kavapp, permissionActions.read)
    findById(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.findByIdInventoryAlertRule(id, coffeeShopId);
    }

    @Post()
    @CheckPermission(resourceNames.kavapp, permissionActions.write)
    @UsePipes(new ValidationPipe())
    create(@Param("coffeeShopId") coffeeShopId: string, @Body() dto: CreateInventoryAlertRuleDto) {
        return this.service.createInventoryAlertRule(dto, coffeeShopId);
    }

    @Patch(":id")
    @CheckPermission(resourceNames.kavapp, permissionActions.write)
    @UsePipes(new ValidationPipe())
    update(
        @Param("coffeeShopId") coffeeShopId: string,
        @Param("id") id: string,
        @Body() dto: UpdateInventoryAlertRuleDto,
    ) {
        return this.service.updateInventoryAlertRule(id, dto, coffeeShopId);
    }

    @Delete(":id")
    @CheckPermission(resourceNames.kavapp, permissionActions.delete)
    remove(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.removeInventoryAlertRule(id, coffeeShopId);
    }

    @Delete()
    @CheckPermission(resourceNames.kavapp, permissionActions.delete)
    removeAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.removeAllInventoryAlertRules(coffeeShopId);
    }
}
