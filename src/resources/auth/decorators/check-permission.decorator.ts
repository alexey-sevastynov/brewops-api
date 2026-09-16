import { SetMetadata } from "@nestjs/common";
import { type ResourceName } from "../../../common/constants/resource-names";
import { type PermissionAction } from "../../../common/enums/permission-action";

export interface RequiredPermission {
    resource: ResourceName;
    action: PermissionAction;
}

export const PERMISSION_METADATA_KEY = "permission";

export const CheckPermission = (resource: ResourceName, action: PermissionAction) =>
    SetMetadata(PERMISSION_METADATA_KEY, { resource, action });
