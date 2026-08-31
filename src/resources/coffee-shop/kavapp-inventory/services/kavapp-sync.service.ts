import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { KavappInventory, KavappInventorySnapshotDocument } from "../kavapp-inventory-schema";
import { KavappInventoryService } from "./kavapp-inventory.service";
import { InventoryAlertService } from "./inventory-alert.service";

@Injectable()
export class KavappSyncService {
    private readonly logger = new Logger(KavappSyncService.name);

    constructor(
        @InjectModel(KavappInventory.name)
        private readonly snapshotModel: Model<KavappInventorySnapshotDocument>,
        private readonly kavappInventoryService: KavappInventoryService,
        private readonly inventoryAlertService: InventoryAlertService,
    ) {}

    async sync(
        coffeeShopId: string,
        pointId?: string,
        testAlert = false,
    ): Promise<KavappInventorySnapshotDocument> {
        const previousSnapshot = await this.getLatestSnapshot(coffeeShopId);
        const inventory = await this.kavappInventoryService.getCurrentInventory(coffeeShopId, pointId);

        const snapshot = new this.snapshotModel({
            coffeeShopId,
            syncDate: new Date(),
            cup: inventory.cup,
            ingredient: inventory.ingredient,
            product: inventory.product,
            kitchen: inventory.kitchen,
        });

        const saved = await snapshot.save();

        try {
            await this.inventoryAlertService.checkAndNotify(
                coffeeShopId,
                inventory,
                previousSnapshot,
                testAlert,
            );
        } catch (alertError) {
            this.logger.error("Failed to run alert checks", alertError);
        }

        return saved;
    }

    async getLatestSnapshot(coffeeShopId: string): Promise<KavappInventorySnapshotDocument | null> {
        return this.snapshotModel.findOne({ coffeeShopId }).sort({ syncDate: -1 }).exec();
    }

    async getHistory(coffeeShopId: string, limit = 30): Promise<KavappInventorySnapshotDocument[]> {
        return this.snapshotModel.find({ coffeeShopId }).sort({ syncDate: -1 }).limit(limit).exec();
    }
}
