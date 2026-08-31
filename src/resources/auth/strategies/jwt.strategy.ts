import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { PassportStrategy } from "@nestjs/passport";
import { Model } from "mongoose";
import { ExtractJwt, Strategy } from "passport-jwt";
import { type AuthJwtPayload } from "../../../common/auth/types/jwt-payload";
import { type AuthenticatedUser } from "../../../common/auth/types/authenticated-user";
import { errorMessages } from "../../../common/constants/error-messages";
import { envKeys } from "../../../common/enums/infra/env-key";
import { getRequiredEnv } from "../../../common/utils/infra/env-functions";
import { User } from "../../user/user-schema";
import { userStatusKeys } from "../../user/enums/user-status-key";
import { WorkspaceMember } from "../../workspace-member/workspace-member-schema";

const jwtExtractor = ExtractJwt as unknown as {
    fromAuthHeaderAsBearerToken: () => (request: unknown) => string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        @InjectModel(User.name) private readonly userModel: Model<User>,
        @InjectModel(WorkspaceMember.name) private readonly workspaceMemberModel: Model<WorkspaceMember>,
    ) {
        super({
            jwtFromRequest: jwtExtractor.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: getRequiredEnv(envKeys.jwtSecret, configService),
        });
    }

    async validate(payload: AuthJwtPayload): Promise<AuthenticatedUser> {
        if (!payload.id) {
            throw new UnauthorizedException(errorMessages.invalidToken);
        }

        const user = await this.userModel.findById(payload.id);

        if (!user) {
            throw new UnauthorizedException(errorMessages.invalidToken);
        }

        if (user.userStatus === userStatusKeys.blocked) {
            throw new UnauthorizedException(errorMessages.accountBlocked);
        }

        const workspaceMember = await this.workspaceMemberModel.findOne({ userId: user._id }).exec();

        return {
            mongoId: user._id.toString(),
            userId: user.userId,
            userName: user.userName,
            isVerified: user.isVerified,
            workspaceId: workspaceMember?.workspaceId.toString(),
            workspaceRole: workspaceMember?.role,
        };
    }
}
