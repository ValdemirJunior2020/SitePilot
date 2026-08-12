import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getBucket } from '../config/firebase.js';

export async function saveScreenshot({ buffer, uid, siteId, scanId }) {
  if (!buffer) return null;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (storageBucket) {
    const bucket = getBucket();
    const objectPath = `sitepilot/${uid}/${siteId}/${scanId}.png`;
    const token = crypto.randomUUID();
    const file = bucket.file(objectPath);
    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType: 'image/png',
        cacheControl: 'private,max-age=3600',
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
  }

  const dir = path.resolve('screenshots', uid, siteId);
  await mkdir(dir, { recursive: true });
  const fileName = `${scanId}.png`;
  await writeFile(path.join(dir, fileName), buffer);
  const base = process.env.PUBLIC_SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${base.replace(/\/$/, '')}/screenshots/${encodeURIComponent(uid)}/${encodeURIComponent(siteId)}/${fileName}`;
}


export async function deleteSiteScreenshots(uid, siteId) {
  if (process.env.FIREBASE_STORAGE_BUCKET) {
    const bucket = getBucket();
    await bucket.deleteFiles({ prefix: `sitepilot/${uid}/${siteId}/`, force: true });
    return;
  }
  const { rm } = await import('node:fs/promises');
  const dir = path.resolve('screenshots', uid, siteId);
  await rm(dir, { recursive: true, force: true });
}
