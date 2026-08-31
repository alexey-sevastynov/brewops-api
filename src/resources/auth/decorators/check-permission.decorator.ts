import { SetMetadata } from "@nestjs/common";

export interface RequiredPermission {
    resource: string;
    action: string;
}

export const PERMISSION_METADATA_KEY = "permission";

export const CheckPermission = (resource: string, action: string) =>
    SetMetadata(PERMISSION_METADATA_KEY, { resource, action });
