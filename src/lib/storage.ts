import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { del, put } from "@vercel/blob";

export type StoredImage = { imageUrl: string; imagePathname: string };

/** Local uploads are told apart from Vercel Blob ones by their pathname. */
const LOCAL_PREFIX = "uploads/";
const LOCAL_DIR = join(process.cwd(), "public", LOCAL_PREFIX);

function usingBlob() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;

  // The disk fallback is for local development. A deployed filesystem is read
  // only, so say why rather than failing later with EROFS.
  if (process.env.VERCEL) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set, and photos cannot be written to disk when deployed.",
    );
  }

  return false;
}

function safeName(filename: string) {
  return filename.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
}

export async function storeImage(
  file: Blob,
  filename: string,
  contentType: string,
): Promise<StoredImage> {
  if (usingBlob()) {
    const blob = await put(`recipes/${filename}`, file, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });

    return { imageUrl: blob.url, imagePathname: blob.pathname };
  }

  const name = `${randomUUID()}-${safeName(filename)}`;

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(join(LOCAL_DIR, name), Buffer.from(await file.arrayBuffer()));

  return { imageUrl: `/${LOCAL_PREFIX}${name}`, imagePathname: `${LOCAL_PREFIX}${name}` };
}

export async function removeImage(pathname: string) {
  if (pathname.startsWith(LOCAL_PREFIX)) {
    await unlink(join(process.cwd(), "public", pathname)).catch(() => undefined);
    return;
  }

  await del(pathname).catch(() => undefined);
}
