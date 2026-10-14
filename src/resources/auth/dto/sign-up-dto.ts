import { PickType } from "@nestjs/mapped-types";
import { CreateUserDto } from "../../../resources/user/dto/create-user-dto";

const signUpFields = [
    "userName",
    "email",
    "password",
    "firstName",
    "lastName",
    "phoneNumber",
    "invitationToken",
] as const;

export class SignUpDto extends PickType(CreateUserDto, signUpFields) {}
