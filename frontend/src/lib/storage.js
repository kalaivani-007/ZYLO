import { supabase } from "./supabase";

const BUCKET = "room-images";
const signedUrlCache = new Map();

export function isExternalImage(value) {
  return !value || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:") || value.startsWith("blob:");
}

export async function signedImageUrl(path, expiresIn = 3600) {
  if (!path) return "";
  if (isExternalImage(path)) return path;

  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) return "";
  signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + expiresIn * 1000 });
  return data.signedUrl;
}

export async function signedImageUrls(paths, expiresIn = 3600) {
  const values = paths || [];
  const result = new Map();
  const pending = [];

  for (const path of values) {
    if (!path) continue;
    if (isExternalImage(path)) {
      result.set(path, path);
      continue;
    }
    const cached = signedUrlCache.get(path);
    if (cached && cached.expiresAt > Date.now() + 60_000) result.set(path, cached.url);
    else pending.push(path);
  }

  if (pending.length) {
    const unique = [...new Set(pending)];
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, expiresIn);
    if (!error) {
      for (const item of data || []) {
        if (!item.path || !item.signedUrl) continue;
        signedUrlCache.set(item.path, { url: item.signedUrl, expiresAt: Date.now() + expiresIn * 1000 });
        result.set(item.path, item.signedUrl);
      }
    }
  }

  return result;
}

export async function uploadRoomFile(userId, file, label = "original") {
  const rawExt = file.name?.split(".").pop()?.toLowerCase() || "jpg";
  const ext = ["jpg", "jpeg", "png", "webp"].includes(rawExt) ? rawExt : "jpg";
  const token = `${Date.now()}-${crypto.randomUUID()}`;
  const path = `${userId}/${token}-${label}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return path;
}

export function dataUrlToBlob(dataUrl) {
  const [header, payload] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const bytes = atob(payload);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: mime });
}

export async function uploadGeneratedImage(userId, dataUrl) {
  if (!dataUrl) return null;
  const blob = dataUrlToBlob(dataUrl);
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}-redesign.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: blob.type,
  });
  if (error) throw error;
  return path;
}

export async function removeStoredImages(paths) {
  const safe = (paths || []).filter((p) => p && !isExternalImage(p));
  if (!safe.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(safe);
  if (error) console.warn("Could not remove one or more stored images:", error.message);
  for (const path of safe) signedUrlCache.delete(path);
}
