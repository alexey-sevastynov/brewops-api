import { IsIn } from "class-validator";
import { workspacePlanKeys, type WorkspacePlanKey } from "../enums/workspace-plan-key";

export class ChangeWorkspacePlanDto {
    @IsIn(Object.values(workspacePlanKeys))
    planKey!: WorkspacePlanKey;
}
