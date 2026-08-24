// Vercel serverless functions reject request bodies over ~4.5 MB, so uploads
// must stay below that or the deployed app would break on large files.
export const MAX_FILE_SIZE = 4 * 1024 * 1024;
export const MAX_IMAGE_UPLOADS = 8;
export const MAX_TEXT_LENGTH = 80_000;
