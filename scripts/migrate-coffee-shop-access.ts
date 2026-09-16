import * as mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config();

const user = process.env.MONGO_USER;
const password = process.env.MONGO_PASSWORD;
const cluster = process.env.MONGO_CLUSTER;
const dbName = process.env.MONGO_DB;

const uri = `mongodb+srv://${user}:${password}@${cluster}/${dbName}?retryWrites=true&w=majority`;

async function run() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected successfully!");

    const db = mongoose.connection.db;
    if (!db) {
        throw new Error("Failed to get database instance.");
    }

    // 1. Find all members with manager or barista roles (or existing custom)
    const members = await db
        .collection("workspacemembers")
        .find({ role: { $in: ["manager", "barista", "custom"] } })
        .toArray();

    console.log(`Found ${members.length} non-owner/admin workspace members.`);

    // Also update any manager/barista role in workspacemembers to 'custom'
    await db.collection("workspacemembers").updateMany(
        { role: { $in: ["manager", "barista"] } },
        { $set: { role: "custom" } },
    );

    // Update any manager/barista role in workspaceinvitations to 'custom'
    await db.collection("workspaceinvitations").updateMany(
        { role: { $in: ["manager", "barista"] } },
        { $set: { role: "custom" } },
    );

    let createdCount = 0;

    for (const member of members) {
        // Find all active coffee shops belonging to this workspace
        const shops = await db
            .collection("coffeeshops")
            .find({ workspaceId: member.workspaceId, isActive: true })
            .toArray();

        for (const shop of shops) {
            const existingAccess = await db.collection("coffeeshopaccesses").findOne({
                memberId: member._id,
                coffeeShopId: shop._id,
            });

            if (!existingAccess) {
                await db.collection("coffeeshopaccesses").insertOne({
                    memberId: member._id,
                    coffeeShopId: shop._id,
                    role: "custom",
                    permissions: member.permissions || [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                createdCount++;
            } else if (existingAccess.role !== "custom") {
                await db.collection("coffeeshopaccesses").updateOne(
                    { _id: existingAccess._id },
                    { $set: { role: "custom" } },
                );
            }
        }
    }

    console.log(`Migration complete! Created ${createdCount} CoffeeShopAccess records.`);
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error("Migration failed:", err);
    mongoose.disconnect();
});
