import { upload } from "@vercel/blob/client";
import { API_BASE_URL, tokenStorage } from "@/lib/api";

const MAX_IMAGE_DIMENSION = 1600;
const IMAGE_QUALITY = 0.82;
const MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not process this image."));
    };

    image.src = objectUrl;
  });
}

function getScaledDimensions(width: number, height: number) {
  const largestSide = Math.max(width, height);
  if (largestSide <= MAX_IMAGE_DIMENSION) {
    return { width, height };
  }

  const scale = MAX_IMAGE_DIMENSION / largestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function optimizeImage(file: File) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  const image = await loadImage(file);
  const { width, height } = getScaledDimensions(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const optimizedBlob = await canvasToBlob(canvas, "image/webp", IMAGE_QUALITY)
    || await canvasToBlob(canvas, "image/jpeg", IMAGE_QUALITY);

  if (!optimizedBlob || optimizedBlob.size >= file.size) {
    return file;
  }

  return new File([optimizedBlob], file.name, {
    type: optimizedBlob.type || file.type || "image/jpeg",
    lastModified: file.lastModified,
  });
}

function sanitizeFilename(name: string) {
  const extensionIndex = name.lastIndexOf(".");
  const rawBaseName = extensionIndex >= 0 ? name.slice(0, extensionIndex) : name;
  const rawExtension = extensionIndex >= 0 ? name.slice(extensionIndex).toLowerCase() : "";
  const safeBaseName = rawBaseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
  const safeExtension = rawExtension.replace(/[^a-z0-9.]/g, "") || ".jpg";

  return `${safeBaseName}${safeExtension}`;
}

function buildUploadPath(file: File) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${now.getUTCDate()}`.padStart(2, "0");
  return `admin-uploads/${year}/${month}/${day}/${sanitizeFilename(file.name)}`;
}

export async function uploadImageFile(file: File): Promise<string> {
  const token = tokenStorage.get();
  if (!token) {
    throw new Error("You are signed out. Please log in again.");
  }

  const optimizedFile = await optimizeImage(file);
  const result = await upload(buildUploadPath(optimizedFile), optimizedFile, {
    access: "public",
    contentType: optimizedFile.type || file.type || "image/jpeg",
    handleUploadUrl: `${API_BASE_URL}/admin/uploads`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    multipart: optimizedFile.size >= MULTIPART_THRESHOLD_BYTES,
  });

  if (!result.url) {
    throw new Error("Image upload did not return a public URL.");
  }

  return result.url;
}
