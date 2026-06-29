const MAX_IMAGE_DIMENSION = 1280;
const IMAGE_QUALITY = 0.76;

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read file as data URL."));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

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

export async function uploadImageFile(file: File): Promise<string> {
  const optimizedFile = await optimizeImage(file);
  return readBlobAsDataUrl(optimizedFile);
}
