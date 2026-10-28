import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl as s3SignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { invalid } from "@/server/security/errors";

/**
 * Stockage objet privé. Aucun fichier n'est public : l'accès passe toujours par
 * une URL signée à durée limitée, délivrée après contrôle d'autorisation.
 */
export const UPLOAD_RULES = {
  image: { mimes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 8 * 1024 * 1024 },
  document: { mimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"], maxBytes: 10 * 1024 * 1024 },
} as const;

/** Détection du type réel par signature binaire : l'extension et le Content-Type client ne sont pas fiables. */
export function sniffMime(buf: Uint8Array): string | null {
  const b = buf;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  if (b.length >= 5 && String.fromCharCode(...b.slice(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export async function validateUpload(file: File, kind: keyof typeof UPLOAD_RULES): Promise<{ bytes: Uint8Array; mime: string }> {
  const rule = UPLOAD_RULES[kind];
  if (file.size === 0) throw invalid("Fichier vide.");
  if (file.size > rule.maxBytes) throw invalid(`Fichier trop volumineux (maximum ${Math.round(rule.maxBytes / 1024 / 1024)} Mo).`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime || !(rule.mimes as readonly string[]).includes(mime)) throw invalid(`Format non accepté. Formats autorisés : ${rule.mimes.map((m) => EXT[m]).join(", ")}.`);
  return { bytes, mime };
}

let s3: S3Client | null = null;
function client() {
  s3 ??= new S3Client({ region: env.S3_REGION, endpoint: env.S3_ENDPOINT, forcePathStyle: !!env.S3_ENDPOINT, credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! } });
  return s3;
}

const localPath = (key: string) => {
  const root = path.resolve(env.STORAGE_LOCAL_DIR);
  const p = path.resolve(root, key);
  if (!p.startsWith(root + path.sep)) throw new Error("Clé de stockage invalide");
  return p;
};

export async function putObject(prefix: "parcels" | "disputes" | "messages" | "avatars", bytes: Uint8Array, mime: string): Promise<string> {
  const key = `${prefix}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${EXT[mime] ?? "bin"}`;
  if (env.STORAGE_DRIVER === "s3") {
    await client().send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: bytes, ContentType: mime, ServerSideEncryption: env.S3_ENDPOINT ? undefined : "AES256" }));
  } else {
    const p = localPath(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, bytes);
  }
  return key;
}

export async function deleteObject(key: string) {
  if (env.STORAGE_DRIVER === "s3") await client().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  else await rm(localPath(key), { force: true });
}

function sign(key: string, exp: number) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(`file:${key}:${exp}`).digest("base64url");
}

/** URL signée temporaire. À n'appeler qu'après vérification des droits de l'utilisateur sur le fichier. */
export async function signedUrl(key: string, ttlSeconds = 600): Promise<string> {
  if (env.STORAGE_DRIVER === "s3") return s3SignedUrl(client(), new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), { expiresIn: ttlSeconds });
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `/api/files?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sign(key, exp)}`;
}

export async function readLocalSigned(key: string, exp: number, sig: string): Promise<{ bytes: Buffer; mime: string } | null> {
  if (env.STORAGE_DRIVER !== "local") return null;
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  const expected = Buffer.from(sign(key, exp));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const bytes = await readFile(localPath(key));
    return { bytes, mime: sniffMime(bytes) ?? "application/octet-stream" };
  } catch {
    return null;
  }
}
