import { Body, Controller, Post } from "@nestjs/common";
import { PublicRoute } from "../../common/auth/decorators/public-route.decorator";
import { SignUpDto } from "./dto/sign-up-dto";
import { AuthService } from "./auth.service";
import { SignInDto } from "./dto/sign-in-dto";

@PublicRoute()
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("signup")
    signUp(@Body() signUpDto: SignUpDto) {
        return this.authService.signUp(signUpDto);
    }

    @Post("signin")
    signIn(@Body() signInDto: SignInDto) {
        return this.authService.signIn(signInDto);
    }
}
