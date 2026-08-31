import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { User, UserSchema } from "../../resources/user/user-schema";
import { getRequiredEnv } from "../../common/utils/infra/env-functions";
import { envKeys } from "../../common/enums/infra/env-key";
import { MailVerificationModule } from "../../resources/mail-verification/mail-verification.module";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CoffeeShopGuard } from "./guards/coffee-shop.guard";
import { WorkspaceModule } from "../../resources/workspace/workspace.module";
import { WorkspaceMemberModule } from "../../resources/workspace-member/workspace-member.module";
import {
    WorkspaceMember,
    WorkspaceMemberSchema,
} from "../../resources/workspace-member/workspace-member-schema";
import { CoffeeShop, CoffeeShopEntitySchema } from "../../resources/coffee-shop/coffee-shop-schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: WorkspaceMember.name, schema: WorkspaceMemberSchema },
            { name: CoffeeShop.name, schema: CoffeeShopEntitySchema },
        ]),
        PassportModule.register({ defaultStrategy: "jwt" }),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: getRequiredEnv(envKeys.jwtSecret, configService),
                signOptions: { expiresIn: getRequiredEnv(envKeys.jwtExpiration, configService) },
            }),
        }),
        MailVerificationModule,
        WorkspaceModule,
        WorkspaceMemberModule,
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtStrategy,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: CoffeeShopGuard,
        },
    ],
    exports: [AuthService, JwtModule],
})
export class AuthModule {}
