import { randomUUID } from "node:crypto";
import { ObjectId, type WithId } from "mongodb";
import { getDb } from "./db";
import { DEFAULT_CATEGORIES, type BoardPayload, type BoardSettings, type Notice, type NoticeKind, type Rate, type Unit } from "./types";

interface RateDoc {
  category: string;
  brand: string;
  model: string;
  spec: string;
  unit: Unit;
  price: number;
  previousPrice: number | null;
  priceChangedAt: Date | null;
  inStock: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MetaDoc {
  _id: "board";
  version: number;
  settings: BoardSettings;
  notice?: NoticeDoc | null;
}

interface NoticeDoc {
  id: string;
  kind: NoticeKind;
  message: string;
  mediaUrl: string;
  sound: boolean;
  startedAt: Date;
  showUntil: Date | null;
}

interface HistoryDoc {
  rateId: ObjectId;
  price: number;
  previousPrice: number | null;
  at: Date;
}

export const DEFAULT_SETTINGS: BoardSettings = {
  title: "Volt On Solar",
  subtitle: "Today's Market Rates",
  ticker: "Rates are subject to change. Please confirm with the sales team before booking.",
  categoryOrder: DEFAULT_CATEGORIES,
  theme: "auto",
};

async function collections() {
  const db = await getDb();
  return {
    rates: db.collection<RateDoc>("rates"),
    meta: db.collection<MetaDoc>("meta"),
    history: db.collection<HistoryDoc>("rate_history"),
  };
}

function toRate(d: WithId<RateDoc>): Rate {
  return {
    id: d._id.toHexString(),
    category: d.category,
    brand: d.brand,
    model: d.model,
    spec: d.spec,
    unit: d.unit,
    price: d.price,
    previousPrice: d.previousPrice,
    priceChangedAt: d.priceChangedAt ? d.priceChangedAt.toISOString() : null,
    inStock: d.inStock,
    active: d.active,
    sortOrder: d.sortOrder,
    updatedAt: d.updatedAt.toISOString(),
  };
}

/** Only a notice that has not expired yet is sent to screens. */
function activeNotice(n: NoticeDoc | null | undefined, now: Date): Notice | null {
  if (!n || (n.showUntil && n.showUntil <= now)) return null;
  return { ...n, startedAt: n.startedAt.toISOString(), showUntil: n.showUntil ? n.showUntil.toISOString() : null };
}

function parseId(id: string): ObjectId | null {
  return /^[a-f0-9]{24}$/i.test(id) ? new ObjectId(id) : null;
}

async function getMeta(): Promise<MetaDoc> {
  const { meta } = await collections();
  const doc = await meta.findOne({ _id: "board" });
  return doc ?? { _id: "board", version: 0, settings: DEFAULT_SETTINGS };
}

/** Bump the board version. The new version is broadcast to screens. */
async function bumpVersion(): Promise<number> {
  const { meta } = await collections();
  const doc = await meta.findOneAndUpdate(
    { _id: "board" },
    { $inc: { version: 1 }, $setOnInsert: { settings: DEFAULT_SETTINGS } },
    { upsert: true, returnDocument: "after" },
  );
  return doc?.version ?? 1;
}

export async function getBoard(opts: { includeInactive?: boolean } = {}): Promise<BoardPayload> {
  const { rates } = await collections();
  const filter = opts.includeInactive ? {} : { active: true };
  const [docs, meta] = await Promise.all([
    rates.find(filter).sort({ category: 1, sortOrder: 1, brand: 1, model: 1 }).toArray(),
    getMeta(),
  ]);
  const now = new Date();
  return {
    rates: docs.map(toRate),
    settings: { ...DEFAULT_SETTINGS, ...meta.settings },
    notice: activeNotice(meta.notice, now),
    version: meta.version,
    serverTime: now.toISOString(),
  };
}

export type RateInput = Pick<
  RateDoc,
  "category" | "brand" | "model" | "spec" | "unit" | "price" | "inStock" | "active" | "sortOrder"
>;

export async function createRate(input: RateInput): Promise<{ rate: Rate; version: number }> {
  const { rates, history } = await collections();
  const now = new Date();
  const doc: RateDoc = { ...input, previousPrice: null, priceChangedAt: now, createdAt: now, updatedAt: now };
  const res = await rates.insertOne(doc);
  await history.insertOne({ rateId: res.insertedId, price: input.price, previousPrice: null, at: now });
  return { rate: toRate({ ...doc, _id: res.insertedId }), version: await bumpVersion() };
}

export async function updateRate(
  id: string,
  input: Partial<RateInput>,
): Promise<{ rate: Rate; version: number } | null> {
  const _id = parseId(id);
  if (!_id) return null;
  const { rates, history } = await collections();
  const current = await rates.findOne({ _id });
  if (!current) return null;

  const now = new Date();
  const set: Partial<RateDoc> = { ...input, updatedAt: now };
  const priceChanged = input.price !== undefined && input.price !== current.price;
  if (priceChanged) {
    set.previousPrice = current.price;
    set.priceChangedAt = now;
  }
  const updated = await rates.findOneAndUpdate({ _id }, { $set: set }, { returnDocument: "after" });
  if (!updated) return null;
  if (priceChanged) {
    await history.insertOne({ rateId: _id, price: input.price!, previousPrice: current.price, at: now });
  }
  return { rate: toRate(updated), version: await bumpVersion() };
}

export async function deleteRate(id: string): Promise<{ version: number } | null> {
  const _id = parseId(id);
  if (!_id) return null;
  const { rates, history } = await collections();
  const res = await rates.deleteOne({ _id });
  if (res.deletedCount === 0) return null;
  await history.deleteMany({ rateId: _id });
  return { version: await bumpVersion() };
}

export async function saveSettings(settings: BoardSettings): Promise<{ version: number }> {
  const { meta } = await collections();
  await meta.updateOne({ _id: "board" }, { $set: { settings }, $setOnInsert: { version: 0 } }, { upsert: true });
  return { version: await bumpVersion() };
}

export async function getHistory(id: string, limit = 30) {
  const _id = parseId(id);
  if (!_id) return [];
  const { history } = await collections();
  const docs = await history.find({ rateId: _id }).sort({ at: -1 }).limit(limit).toArray();
  return docs.map((h) => ({ price: h.price, previousPrice: h.previousPrice, at: h.at.toISOString() }));
}

export async function countRates(): Promise<number> {
  const { rates } = await collections();
  return rates.countDocuments();
}

export interface NoticeInput {
  kind: NoticeKind;
  message: string;
  mediaUrl: string;
  sound: boolean;
  durationMinutes: number | null;
}

/** Show a notice on every screen now. It replaces any notice that is already showing. */
export async function setNotice(input: NoticeInput): Promise<{ notice: Notice; version: number }> {
  const { meta } = await collections();
  const now = new Date();
  const doc: NoticeDoc = {
    id: randomUUID(),
    kind: input.kind,
    message: input.message,
    mediaUrl: input.kind === "text" ? "" : input.mediaUrl,
    sound: input.kind === "video" && input.sound,
    startedAt: now,
    showUntil: input.durationMinutes ? new Date(now.getTime() + input.durationMinutes * 60_000) : null,
  };
  await meta.updateOne(
    { _id: "board" },
    { $set: { notice: doc }, $setOnInsert: { version: 0, settings: DEFAULT_SETTINGS } },
    { upsert: true },
  );
  return { notice: activeNotice(doc, now)!, version: await bumpVersion() };
}

export async function clearNotice(): Promise<{ version: number }> {
  const { meta } = await collections();
  await meta.updateOne({ _id: "board" }, { $set: { notice: null } });
  return { version: await bumpVersion() };
}

/** Delete every product and its price history. Settings and the notice are kept. */
export async function deleteAllRates(): Promise<{ deleted: number; version: number }> {
  const { rates, history } = await collections();
  const res = await rates.deleteMany({});
  await history.deleteMany({});
  return { deleted: res.deletedCount, version: await bumpVersion() };
}
