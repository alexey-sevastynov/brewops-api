import { ApiProperty } from "@nestjs/swagger";
import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsPhoneNumber,
    IsString,
    IsStrongPassword,
    IsUUID,
    Length,
} from "class-validator";
import { type UserStatusKey, userStatusKeys } from "../enums/user-status-key";
import {
    blockReasonApiProps,
    emailApiProps,
    firstNameApiProps,
    isVerifiedApiProps,
    lastNameApiProps,
    passwordApiProps,
    phoneNumberApiProps,
    userIdApiProps,
    userNameApiProps,
    userStatusApiProps,
} from "../constants/user-api-props";
import { userValidation } from "../constants/user-validation";
import { BaseDto } from "../../../common/dto/base-dto";

export class CreateUserDto extends BaseDto {
    @ApiProperty(userIdApiProps)
    @IsNotEmpty()
    @IsString()
    @IsUUID("4", { message: "userId must be a valid UUID v4" })
    userId!: string;

    @ApiProperty(userNameApiProps)
    @IsNotEmpty()
    @IsString()
    @Length(userValidation.userName.minLength, userValidation.userName.maxLength)
    userName!: string;

    @ApiProperty(emailApiProps)
    @IsNotEmpty()
    @IsEmail()
    email!: string;

    @ApiProperty(passwordApiProps)
    @IsNotEmpty()
    @IsStrongPassword()
    @Length(userValidation.password.minLength, userValidation.password.maxLength)
    password!: string;

    @ApiProperty(userStatusApiProps)
    @IsNotEmpty()
    @IsEnum(userStatusKeys)
    userStatus!: UserStatusKey;

    @ApiProperty(isVerifiedApiProps)
    @IsOptional()
    isVerified!: boolean;

    @ApiProperty(blockReasonApiProps)
    @IsOptional()
    @IsString()
    @Length(userValidation.blockReason.minLength, userValidation.blockReason.maxLength)
    blockReason?: string;

    @ApiProperty(firstNameApiProps)
    @IsOptional()
    @IsString()
    @Length(userValidation.firstName.minLength, userValidation.firstName.maxLength)
    firstName?: string;

    @ApiProperty(lastNameApiProps)
    @IsOptional()
    @IsString()
    @Length(userValidation.lastName.minLength, userValidation.lastName.maxLength)
    lastName?: string;

    @ApiProperty(phoneNumberApiProps)
    @IsOptional()
    @IsPhoneNumber("UA")
    phoneNumber?: string;

    @ApiProperty({ required: false, description: "Invitation token from workspace invite email" })
    @IsOptional()
    @IsString()
    invitationToken?: string;
}
