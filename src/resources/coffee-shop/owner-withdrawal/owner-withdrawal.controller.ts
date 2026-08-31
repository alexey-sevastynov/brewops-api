import { Controller, Get, Post, Delete, Body, Param, UsePipes, ValidationPipe, Patch } from "@nestjs/common";
import { OwnerWithdrawalService } from "./owner-withdrawal.service";
import { CreateOwnerWithdrawalDto } from "./dto/create-owner-withdrawal-dto";
import { UpdateOwnerWithdrawalDto } from "./dto/update-owner-withdrawal-dto";
import { CheckPermission } from "../../../resources/auth/decorators/check-permission.decorator";

@Controller("coffee-shops/:coffeeShopId/owner-withdrawals")
export class OwnerWithdrawalController {
    constructor(private readonly service: OwnerWithdrawalService) {}

    @Get()
    @CheckPermission("owner-withdrawals", "read")
    findAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.findAllOwnerWithdrawal(coffeeShopId);
    }

    @Get(":id")
    @CheckPermission("owner-withdrawals", "read")
    findById(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.findByIdOwnerWithdrawal(id, coffeeShopId);
    }

    @Post()
    @CheckPermission("owner-withdrawals", "write")
    @UsePipes(new ValidationPipe())
    create(@Param("coffeeShopId") coffeeShopId: string, @Body() dto: CreateOwnerWithdrawalDto) {
        return this.service.createOwnerWithdrawal(dto, coffeeShopId);
    }

    @Patch(":id")
    @CheckPermission("owner-withdrawals", "write")
    @UsePipes(new ValidationPipe())
    update(
        @Param("coffeeShopId") coffeeShopId: string,
        @Param("id") id: string,
        @Body() dto: UpdateOwnerWithdrawalDto,
    ) {
        return this.service.updateOwnerWithdrawal(id, dto, coffeeShopId);
    }

    @Delete(":id")
    @CheckPermission("owner-withdrawals", "delete")
    delete(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.deleteOwnerWithdrawal(id, coffeeShopId);
    }

    @Delete()
    @CheckPermission("owner-withdrawals", "delete")
    deleteAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.deleteAllOwnerWithdrawals(coffeeShopId);
    }
}
