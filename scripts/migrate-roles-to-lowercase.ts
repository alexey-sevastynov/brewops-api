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

    // 1. Update workspacemembers
    const members = await db.collection("workspacemembers").find({}).toArray();
    console.log(`Found ${members.length} members. Normalizing roles to lowercase...`);
    for (const member of members) {
        if (member.role && typeof member.role === "string") {
            const lowerRole = member.role.toLowerCase();
            if (member.role !== lowerRole) {
                await db.collection("workspacemembers").updateOne(
                    { _id: member._id },
                    { $set: { role: lowerRole } }
                );
                console.log(`Updated member ${member._id}: ${member.role} -> ${lowerRole}`);
            }
        }
    }

    // 2. Update workspaceinvitations
    const invitesList = await db.listCollections({ name: "workspaceinvitations" }).toArray();
    if (invitesList.length > 0) {
        const invites = await db.collection("workspaceinvitations").find({}).toArray();
        console.log(`Found ${invites.length} invitations. Normalizing roles to lowercase...`);
        for (const invite of invites) {
            if (invite.role && typeof invite.role === "string") {
                const lowerRole = invite.role.toLowerCase();
                if (invite.role !== lowerRole) {
                    await db.collection("workspaceinvitations").updateOne(
                        { _id: invite._id },
                        { $set: { role: lowerRole } }
                    );
                    console.log(`Updated invitation ${invite._id}: ${invite.role} -> ${lowerRole}`);
                }
            }
        }
    }

    console.log("Database roles migration complete!");
    await mongoose.disconnect();
}

run().catch((err) => {
    console.error("Migration failed:", err);
    mongoose.disconnect();
});
