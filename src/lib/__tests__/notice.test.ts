import { describe, expect, it } from "vitest";
import { noticeSchema } from "../validation";

describe("noticeSchema", () => {
  it("accepts a text notice until removed", () => {
    const r = noticeSchema.parse({ kind: "text", message: "Come to my office", durationMinutes: null });
    expect(r).toMatchObject({ kind: "text", message: "Come to my office", mediaUrl: "", durationMinutes: null });
  });
  it("needs a message for text", () => {
    expect(noticeSchema.safeParse({ kind: "text", message: " ", durationMinutes: 5 }).success).toBe(false);
  });
  it("needs an https link for a picture or video", () => {
    expect(noticeSchema.safeParse({ kind: "image", durationMinutes: 5 }).success).toBe(false);
    expect(noticeSchema.safeParse({ kind: "video", mediaUrl: "http://x.com/a.mp4", durationMinutes: 5 }).success).toBe(false);
    expect(noticeSchema.safeParse({ kind: "video", mediaUrl: "javascript:alert(1)", durationMinutes: 5 }).success).toBe(false);
    expect(noticeSchema.safeParse({ kind: "image", mediaUrl: "https://res.cloudinary.com/x/a.jpg", durationMinutes: 5 }).success).toBe(true);
  });
  it("limits duration to 1 minute – 24 hours", () => {
    expect(noticeSchema.safeParse({ kind: "text", message: "x", durationMinutes: 0 }).success).toBe(false);
    expect(noticeSchema.safeParse({ kind: "text", message: "x", durationMinutes: 1441 }).success).toBe(false);
  });
});
