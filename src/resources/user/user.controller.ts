import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Put,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import { Roles } from "../../common/auth/decorators/roles.decorator";
import { authorizedRoles } from "../../common/auth/constants/authorized-roles";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user-dto";
import { UpdateUserDto } from "./dto/update-user-dto";
import { CurrentUser } from "../../common/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/auth/types/authenticated-user";

@Controller("users")
export class UserController {
    constructor(private readonly userService: UserService) {}

    // --- Self-Service Endpoints ---

    @Get("me")
    getProfile(@CurrentUser() user: AuthenticatedUser) {
        return this.userService.findByIdUser(user.mongoId);
    }

    @Patch("me")
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: Partial<UpdateUserDto>) {
        return this.userService.updateProfile(user.mongoId, dto);
    }

    @Delete("me")
    deleteAccount(@CurrentUser() user: AuthenticatedUser) {
        return this.userService.deleteAccount(user.mongoId);
    }

    // --- Admin-Only Endpoints ---

    @Roles(...authorizedRoles.adminOnly)
    @Get()
    findAll() {
        return this.userService.findAllUser();
    }

    @Roles(...authorizedRoles.adminOnly)
    @Get(":id")
    findById(@Param("id") id: string) {
        return this.userService.findByIdUser(id);
    }

    @Roles(...authorizedRoles.adminOnly)
    @Post()
    @UsePipes(new ValidationPipe())
    create(@Body() user: CreateUserDto) {
        return this.userService.createUser(user);
    }

    @Roles(...authorizedRoles.adminOnly)
    @Put(":id")
    update(@Param("id") id: string, @Body() user: UpdateUserDto) {
        return this.userService.updateUser(id, user);
    }

    @Roles(...authorizedRoles.adminOnly)
    @Patch(":id")
    partialUpdate(@Param("id") id: string, @Body() user: Partial<UpdateUserDto>) {
        return this.userService.partialUpdateUser(id, user);
    }

    @Roles(...authorizedRoles.adminOnly)
    @Delete(":id")
    delete(@Param("id") id: string) {
        return this.userService.deleteUser(id);
    }

    @Roles(...authorizedRoles.adminOnly)
    @Delete()
    deleteAll() {
        return this.userService.deleteAllUsers();
    }
}
