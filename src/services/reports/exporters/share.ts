/**
 * Cross-platform file delivery: triggers a normal browser download on web,
 * and falls back to the same path on Capacitor (the WebView handles it).
 * If we want true native share-sheet later, we can wire up @capacitor/share +
 * @capacitor/filesystem here without changing callers.
 */

export type FileBlob = Blob | Uint8Array | ArrayBuffer | string;

function toBlob(data: FileBlob, mime: string): Blob {
  if (data instanceof Blob) return data;
  if (typeof data === "string") return new Blob([data], { type: mime });
  return new Blob([data as BlobPart], { type: mime });
}

export function shareOrDownload(filename: string, data: FileBlob, mime: string) {
  const blob = toBlob(data, mime);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export function safeFilename(base: string, ext: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const cleaned = base.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${cleaned || "report"}_${stamp}.${ext}`;
}
