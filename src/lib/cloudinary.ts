import { createHash } from "node:crypto";

/**
 * Cloudinary (the client's free account — same CLOUDINARY_* keys as the Volt On CRM).
 * Like the CRM, the admin's phone uploads the file straight to Cloudinary with a signature made here,
 * so big videos never pass through Vercel (Vercel limits request bodies to 4.5 MB).
 * Notice files are public (type "upload") because the TV must load them without logging in.
 */
export const NOTICE_FOLDER = "volton/rates-notices";
export const NOTICE_FORMATS = "jpg,jpeg,png,webp,gif,mp4,webm,mov";

function creds() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME_NEW || process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY_NEW || process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET_NEW || process.env.CLOUDINARY_API_SECRET;
  return cloud && key && secret ? { cloud, key, secret } : null;
}

export const isCloudinaryConfigured = () => creds() !== null;

/** Cloudinary signature: sorted "k=v&k=v" + api_secret, SHA-1 hex. */
export function signParams(params: Record<string, string | number>, secret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + secret).digest("hex");
}

/** Fields the browser must send with the file to https://api.cloudinary.com/v1_1/<cloud>/auto/upload. */
export function noticeUploadSignature() {
  const c = creds();
  if (!c) return null;
  const params = { folder: NOTICE_FOLDER, timestamp: Math.floor(Date.now() / 1000), allowed_formats: NOTICE_FORMATS };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${c.cloud}/auto/upload`,
    fields: { ...params, api_key: c.key, signature: signParams(params, c.secret) },
  };
}
