import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 storage adapter (S3-compatible), behind a tiny provider-agnostic
 * surface so Frame.io / Google Drive can be added as alternative adapters later.
 *
 * Connect by setting these env vars (e.g. in Vercel → the OS project):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 * Until they're set, storageConfigured() is false and uploads are disabled with a
 * clear message — nothing else breaks.
 */

export type StorageProvider = "r2";

function env() {
  return {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
  };
}

export function storageConfigured(): boolean {
  const e = env();
  return Boolean(e.accountId && e.accessKeyId && e.secretAccessKey && e.bucket);
}

function client() {
  const e = env();
  if (!storageConfigured()) {
    throw new Error(
      "Storage isn't connected yet. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET to connect Cloudflare R2.",
    );
  }
  return {
    aws: new AwsClient({
      accessKeyId: e.accessKeyId!,
      secretAccessKey: e.secretAccessKey!,
      region: "auto",
      service: "s3",
    }),
    endpoint: `https://${e.accountId}.r2.cloudflarestorage.com`,
    bucket: e.bucket!,
  };
}

function objectUrl(endpoint: string, bucket: string, key: string): string {
  const safe = key.split("/").map(encodeURIComponent).join("/");
  return `${endpoint}/${bucket}/${safe}`;
}

/** A presigned PUT URL the browser uploads the file bytes to directly. */
export async function presignPutUrl(
  key: string,
  contentType: string,
  expiresSeconds = 900,
): Promise<string> {
  const { aws, endpoint, bucket } = client();
  const url = `${objectUrl(endpoint, bucket, key)}?X-Amz-Expires=${expiresSeconds}`;
  const signed = await aws.sign(url, {
    method: "PUT",
    headers: contentType ? { "content-type": contentType } : undefined,
    aws: { signQuery: true },
  });
  return signed.url;
}

/** A short-lived presigned GET URL for viewing/downloading. */
export async function presignGetUrl(
  key: string,
  expiresSeconds = 900,
): Promise<string> {
  const { aws, endpoint, bucket } = client();
  const url = `${objectUrl(endpoint, bucket, key)}?X-Amz-Expires=${expiresSeconds}`;
  const signed = await aws.sign(url, { method: "GET", aws: { signQuery: true } });
  return signed.url;
}

export async function deleteObject(key: string): Promise<void> {
  const { aws, endpoint, bucket } = client();
  await aws.fetch(objectUrl(endpoint, bucket, key), { method: "DELETE" });
}
