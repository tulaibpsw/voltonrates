import type { NextRequest } from "next/server";
import { isCloudinaryConfigured, noticeUploadSignature } from "@/lib/cloudinary";
import { error, guardAdmin, json } from "@/lib/http";

// Gives the admin's browser a one-time signature to upload a notice picture/video straight to Cloudinary.
export async function POST(req: NextRequest) {
  const denied = guardAdmin(req);
  if (denied) return denied;
  if (!isCloudinaryConfigured()) {
    return error("Upload is not set up yet (Cloudinary keys missing). You can paste a picture/video link instead.", 503);
  }
  return json(noticeUploadSignature());
}
