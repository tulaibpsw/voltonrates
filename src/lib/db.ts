import { MongoClient, type Db } from "mongodb";

// One client per serverless instance. On Vercel the module is reused between
// requests while the instance is warm, so we cache the connect promise on globalThis.
const globalForMongo = globalThis as unknown as { _mongo?: Promise<MongoClient> };

function mongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  return uri;
}

export async function getDb(): Promise<Db> {
  if (!globalForMongo._mongo) {
    const client = new MongoClient(mongoUri(), { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 });
    globalForMongo._mongo = client.connect().catch((err) => {
      globalForMongo._mongo = undefined;
      throw err;
    });
  }
  const client = await globalForMongo._mongo;
  return client.db(process.env.MONGODB_DB || "volton_rates");
}
