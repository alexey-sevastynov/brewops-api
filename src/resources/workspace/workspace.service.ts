import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { errorMessages } from "../../common/constants/error-messages";
import { Workspace, WorkspaceDocument } from "./workspace-schema";
import { CreateWorkspaceDto } from "./dto/create-workspace-dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace-dto";
import { workspacePlanKeys, type WorkspacePlanKey } from "./enums/workspace-plan-key";

@Injectable()
export class WorkspaceService {
    constructor(
        @InjectModel(Workspace.name)
        private readonly workspaceModel: Model<WorkspaceDocument>,
    ) {}

    findById(id: string) {
        return this.workspaceModel.findById(id).exec();
    }

    findByIds(ids: string[]) {
        return this.workspaceModel
            .find({ _id: { $in: ids } })
            .lean()
            .exec();
    }

    createWorkspace(dto: CreateWorkspaceDto) {
        const workspace = new this.workspaceModel({
            name: dto.name,
            planKey: workspacePlanKeys.free,
        });

        return workspace.save() as Promise<WorkspaceDocument>;
    }

    async updateWorkspace(id: string, dto: UpdateWorkspaceDto) {
        const updated = await this.workspaceModel.findByIdAndUpdate(id, dto, { new: true });

        if (!updated) throw new NotFoundException(errorMessages.notFound.replace("{0}", Workspace.name));

        return updated;
    }

    async changePlan(id: string, planKey: WorkspacePlanKey) {
        if (planKey !== workspacePlanKeys.free) {
            throw new NotFoundException(
                "Платні тарифи (PRO, BUSINESS) тимчасово недоступні для прямого підключення. Зверніться до адміністратора для активації.",
            );
        }

        const updated = await this.workspaceModel.findByIdAndUpdate(id, { planKey }, { new: true });

        if (!updated) throw new NotFoundException(errorMessages.notFound.replace("{0}", Workspace.name));

        return updated;
    }
}
