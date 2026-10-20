/**
 * Local test database: starts an in-memory MongoDB on port 27999 with demo rates.
 * Use it with MONGODB_URI=mongodb://127.0.0.1:27999 in .env.local. Data is lost when stopped.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { demoRates } from "./demo-rates";

async function main() {
  const server = await MongoMemoryServer.create({ instance: { port: 27999, ip: "127.0.0.1" } });
  const uri = server.getUri();
  const client = await new MongoClient(uri).connect();
  const db = client.db(process.env.MONGODB_DB || "volton_rates");
  const now = new Date();
  await db.collection("rates").insertMany(
    demoRates.map((r) => ({ ...r, previousPrice: r.previousPrice ?? null, priceChangedAt: now, inStock: true, active: true, createdAt: now, updatedAt: now })),
  );
  await client.close();
  console.log(`Local MongoDB ready at ${uri} with ${demoRates.length} demo rates. Press Ctrl+C to stop.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
