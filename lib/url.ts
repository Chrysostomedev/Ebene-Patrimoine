/**
 * Robustly resolves a storage path into a full URL by removing redundant 
 * API prefixes (like /api/v1) and ensuring the /storage/ segment is correct.
 */
export function resolveStorageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) {
    // Even if absolute, we might want to normalize doubled /storage/ or redundant v1
    return path
      .replace(/\/api\/v[12]\/storage\//i, "/storage/")
      .replace(/\/api\/v[12]\/attachments\//i, "/storage/attachments/")
      .replace(/\/api\/v[12]\//i, "/");
  }

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  // Base URL should be the origin without trailing /api/v1 or /api
  const base = rawApiUrl
    .replace(/\/api\/v[12]\/?$/i, "")
    .replace(/\/api\/?$/i, "")
    .replace(/\/v[12]\/?$/i, "");

  let cleanP = path;
  // Strip common redundant prefixes from the start of the path
  cleanP = cleanP.replace(/^\/?api\/v[12]\/storage\//i, "");
  cleanP = cleanP.replace(/^\/?api\/v[12]\//i, "");
  cleanP = cleanP.replace(/^\/?storage\//i, "");
  cleanP = cleanP.replace(/^public\//i, "");

  // Special case for paths starting with v1/ (legacy data)
  if (cleanP.toLowerCase().startsWith("v1/")) {
    cleanP = cleanP.substring(3);
  }
  
  if (cleanP.startsWith("/")) cleanP = cleanP.substring(1);
  
  return `${base.replace(/\/$/, "")}/storage/${cleanP}`;
}
