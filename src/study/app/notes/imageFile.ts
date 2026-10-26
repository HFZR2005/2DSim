const MAX_EDGE = 1600;
const MAX_BYTES = 1_200_000;
const SKIP_IF_UNDER = 400_000;

export async function prepareNoteImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image');
  }
  if (file.type === 'image/gif') {
    if (file.size > MAX_BYTES) throw new Error('That image is too large');
    return file;
  }
  if ((file.type === 'image/jpeg' || file.type === 'image/webp' || file.type === 'image/png') && file.size <= SKIP_IF_UNDER) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Couldn't read that image");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error("Couldn't prepare that image");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), 'image/jpeg', 0.82);
  });
  if (!blob) throw new Error("Couldn't prepare that image");
  if (blob.size > MAX_BYTES) throw new Error('That image is too large');
  return blob;
}

export function imageFilesFromClipboard(data: DataTransfer | null | undefined): File[] {
  if (!data) return [];
  const fromFiles = imageFilesFromList(data.files);
  if (fromFiles.length > 1) return fromFiles;
  const fromItems = imageFilesFromList(data.items);
  if (fromItems.length > 0) return [fromItems[0]];
  return fromFiles;
}

export function imageFilesFromList(list: FileList | File[] | DataTransferItemList | null | undefined): File[] {
  if (!list) return [];
  const files: File[] = [];
  if (typeof DataTransferItemList !== 'undefined' && list instanceof DataTransferItemList) {
    for (let index = 0; index < list.length; index += 1) {
      const item = list[index];
      if (item?.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    return files;
  }
  const entries = list as FileList | File[];
  for (let index = 0; index < entries.length; index += 1) {
    const file = entries[index];
    if (file && (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(file.name))) {
      files.push(file);
    }
  }
  return files;
}
