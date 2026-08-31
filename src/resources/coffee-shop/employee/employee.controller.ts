import { Controller, Get, Post, Delete, Body, Param, UsePipes, ValidationPipe, Patch } from "@nestjs/common";
import { EmployeeService } from "./employee.service";
import { CreateEmployeeDto } from "./dto/create-employee-dto";
import { UpdateEmployeeDto } from "./dto/update-employee-dto";
import { CheckPermission } from "../../../resources/auth/decorators/check-permission.decorator";

@Controller("coffee-shops/:coffeeShopId/employees")
export class EmployeeController {
    constructor(private readonly employeeService: EmployeeService) {}

    @Get()
    @CheckPermission("employees", "read")
    findAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.employeeService.findEmployee(coffeeShopId);
    }

    @Get(":id")
    @CheckPermission("employees", "read")
    findById(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.employeeService.findByIdEmployee(id, coffeeShopId);
    }

    @Post()
    @CheckPermission("employees", "write")
    @UsePipes(new ValidationPipe())
    create(@Param("coffeeShopId") coffeeShopId: string, @Body() dto: CreateEmployeeDto) {
        return this.employeeService.createEmployee(dto, coffeeShopId);
    }

    @Patch(":id")
    @CheckPermission("employees", "write")
    @UsePipes(new ValidationPipe())
    update(
        @Param("coffeeShopId") coffeeShopId: string,
        @Param("id") id: string,
        @Body() dto: UpdateEmployeeDto,
    ) {
        return this.employeeService.updateEmployee(id, dto, coffeeShopId);
    }

    @Delete(":id")
    @CheckPermission("employees", "delete")
    delete(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.employeeService.deleteEmployee(id, coffeeShopId);
    }

    @Delete()
    @CheckPermission("employees", "delete")
    deleteAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.employeeService.deleteAllEmployee(coffeeShopId);
    }
}
