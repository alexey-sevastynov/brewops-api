import { userRoleKeys } from "../enums/user-role-key";
import { userStatusKeys } from "../enums/user-status-key";
import { userValidation } from "./user-validation";

export const userIdApiProps = {
    type: String,
    required: true,
    uniqueItems: true,
    example: "123e4567-e89b-12d3-a456-426655440000",
};

export const userNameApiProps = {
    type: String,
    required: true,
    uniqueItems: true,
    minLength: userValidation.userName.minLength,
    maxLength: userValidation.userName.maxLength,
    example: "John Doe",
};

export const emailApiProps = {
    type: String,
    required: true,
    uniqueItems: true,
    minLength: userValidation.email.minLength,
    maxLength: userValidation.email.maxLength,
    example: "johnDoe@example.com",
};

export const passwordApiProps = {
    type: String,
    required: true,
    minLength: userValidation.password.minLength,
    maxLength: userValidation.password.maxLength,
    example: "password123",
};

export const userRoleApiProps = {
    type: String,
    required: true,
    example: userRoleKeys.user,
    enum: [userRoleKeys.user, userRoleKeys.admin, userRoleKeys.manager],
    default: userRoleKeys.user,
};

export const userStatusApiProps = {
    type: String,
    required: true,
    example: userStatusKeys.active,
    enum: [userStatusKeys.active, userStatusKeys.blocked, userStatusKeys.pending, userStatusKeys.deleted],
    default: userStatusKeys.active,
};

export const isVerifiedApiProps = {
    type: Boolean,
    required: true,
    default: false,
};

export const blockReasonApiProps = {
    type: String,
    required: false,
    minLength: userValidation.blockReason.minLength,
    maxLength: userValidation.blockReason.maxLength,
    example: "Reason for blocking the user account: 'spam, abuse, etc.'",
};

export const firstNameApiProps = {
    type: String,
    required: false,
    minLength: userValidation.firstName.minLength,
    maxLength: userValidation.firstName.maxLength,
    example: "John",
};

export const lastNameApiProps = {
    type: String,
    required: false,
    minLength: userValidation.lastName.minLength,
    maxLength: userValidation.lastName.maxLength,
    example: "Doe",
};

export const phoneNumberApiProps = {
    type: String,
    required: false,
    minLength: 3,
    maxLength: 50,
    example: "+3809876543",
};
