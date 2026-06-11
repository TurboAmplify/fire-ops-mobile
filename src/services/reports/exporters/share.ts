/**
 * Cross-platform file delivery.
 *
 * - Native (Capacitor iOS/Android): writes to cache + opens the OS share sheet
 *   so the user can save to Files, AirDrop, email, etc.
 * - Mobile web (iOS Safari / Android Chrome): uses Web Share API with a File
 *   when supported, else opens the blob in a new tab as a fallback because
 *   iOS Safari ignores <a download> for blob URLs.
 * - Desktop: normal <a download> click.
 */

export type FileBlob = Blob | Uint8Array | ArrayBuffer | string;

function toBlob(data: FileBlob, mime: string): Blob {
  if (data instanceof Blob) return data;
  if (typeof data === "string") return new Blob([data], { type: mime });
  return new Blob([data as BlobPart], { type: mime });
}

function isNativeCapacitor(): boolean {
  // Avoid hard import of @capacitor/core at top-level so web builds stay light
  const cap = (globalThis as any)?.Capacitor;
  return !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
}

function isMobileWeb(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip "data:<mime>;base64,"
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function nativeShare(filename: string, blob: Blob, mime: string): Promise<boolean> {
  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const data = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
    });
    await Share.share({
      title: filename,
      url: written.uri,
      dialogTitle: "Save or share file",
    });
    return true;
  } catch (err) {
    console.warn("[share] native share failed, falling back", err);
    return false;
  }
}

async function webShareFile(filename: string, blob: Blob, mime: string): Promise<boolean> {
  try {
    const nav: any = navigator;
    if (typeof File === "undefined" || !nav?.canShare || !nav?.share) return false;
    const file = new File([blob], filename, { type: mime });
    if (!nav.canShare({ files: [file] })) return false;
    await nav.share({ files: [file], title: filename });
    return true;
  } catch (err) {
    // User cancel throws AbortError — treat as handled
    if ((err as any)?.name === "AbortError") return true;
    console.warn("[share] web share failed, falling back", err);
    return false;
  }
}

// Pre-opened window for iOS Safari / mobile web: callers (e.g. export buttons)
// open an empty tab synchronously inside the click handler so we still have
// user-gesture privileges by the time async PDF/Excel generation finishes.
let pendingDeliveryWindow: Window | null = null;

export function primeMobileDelivery(): void {
  if (typeof window === "undefined") return;
  if (!isMobileWeb() || isNativeCapacitor()) return;
  try {
    const w = window.open("about:blank", "_blank");
    if (w) {
      try {
        w.document.write(
          "<title>Preparing file…</title><body style=\"font-family:-apple-system,sans-serif;padding:24px;color:#444\">Preparing your file…</body>",
        );
      } catch {
        /* cross-origin write may throw; harmless */
      }
      pendingDeliveryWindow = w;
    }
  } catch {
    pendingDeliveryWindow = null;
  }
}

export function clearMobileDelivery(): void {
  if (pendingDeliveryWindow && !pendingDeliveryWindow.closed) {
    try { pendingDeliveryWindow.close(); } catch { /* noop */ }
  }
  pendingDeliveryWindow = null;
}

function openBlobInNewTab(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const target = pendingDeliveryWindow && !pendingDeliveryWindow.closed ? pendingDeliveryWindow : null;
  pendingDeliveryWindow = null;
  if (target) {
    try {
      target.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    } catch {
      /* fall through */
    }
  }
  // iOS Safari needs a real navigation, not an anchor click, to render the PDF.
  const win = window.open(url, "_blank");
  if (!win) {
    // Popup blocked — last resort: navigate current tab
    window.location.href = url;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function anchorDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function shareOrDownload(filename: string, data: FileBlob, mime: string): Promise<void> {
  const blob = toBlob(data, mime);

  if (isNativeCapacitor()) {
    clearMobileDelivery();
    if (await nativeShare(filename, blob, mime)) return;
    // fall through to web fallback
  }

  if (isMobileWeb()) {
    if (await webShareFile(filename, blob, mime)) {
      clearMobileDelivery();
      return;
    }
    openBlobInNewTab(blob);
    return;
  }

  clearMobileDelivery();
  anchorDownload(filename, blob);
}

export function safeFilename(base: string, ext: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const cleaned = base.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${cleaned || "report"}_${stamp}.${ext}`;
}
