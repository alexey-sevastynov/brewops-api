import { Controller, Get, Post, Delete, Body, Param, UsePipes, ValidationPipe, Patch } from "@nestjs/common";
import { OwnerWithdrawalService } from "./owner-withdrawal.service";
import { CreateOwnerWithdrawalDto } from "./dto/create-owner-withdrawal-dto";
import { UpdateOwnerWithdrawalDto } from "./dto/update-owner-withdrawal-dto";
import { CheckPermission } from "../../../resources/auth/decorators/check-permission.decorator";
import { resourceNames } from "../../../common/constants/resource-names";
import { permissionActions } from "../../../common/enums/permission-action";

@Controller("coffee-shops/:coffeeShopId/owner-withdrawals")
export class OwnerWithdrawalController {
    constructor(private readonly service: OwnerWithdrawalService) {}

    @Get()
    @CheckPermission(resourceNames.ownerWithdrawals, permissionActions.read)
    findAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.findAllOwnerWithdrawal(coffeeShopId);
    }

    @Get(":id")
    @CheckPermission(resourceNames.ownerWithdrawals, permissionActions.read)
    findById(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.findByIdOwnerWithdrawal(id, coffeeShopId);
    }

    @Post()
    @CheckPermission(resourceNames.ownerWithdrawals, permissionActions.write)
    @UsePipes(new ValidationPipe())
    create(@Param("coffeeShopId") coffeeShopId: string, @Body() dto: CreateOwnerWithdrawalDto) {
        return this.service.createOwnerWithdrawal(dto, coffeeShopId);
    }

    @Patch(":id")
    @CheckPermission(resourceNames.ownerWithdrawals, permissionActions.write)
    @UsePipes(new ValidationPipe())
    update(
        @Param("coffeeShopId") coffeeShopId: string,
        @Param("id") id: string,
        @Body() dto: UpdateOwnerWithdrawalDto,
    ) {
        return this.service.updateOwnerWithdrawal(id, dto, coffeeShopId);
    }

    @Delete(":id")
    @CheckPermission(resourceNames.ownerWithdrawals, permissionActions.delete)
    delete(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.deleteOwnerWithdrawal(id, coffeeShopId);
    }

    @Delete()
    @CheckPermission(resourceNames.ownerWithdrawals, permissionActions.delete)
    deleteAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.deleteAllOwnerWithdrawals(coffeeShopId);
    }
}
