// NOTE: the per-file upload size limit was removed temporarily for testing.
// Before deploying to Vercel, restore it — serverless functions reject request
// bodies over ~4.5 MB:
//   export const MAX_FILE_SIZE = 4 * 1024 * 1024;
// ...and re-add the size checks in page.tsx findFileProblem() and
// api/study-plan/route.ts readFiles().
export const MAX_IMAGE_UPLOADS = 8;
export const MAX_TEXT_LENGTH = 80_000;

// Chat budgets. Materials are small enough to send to the model in full
// (capped at MAX_TEXT_LENGTH), but conversation history grows unbounded, so
// only the most recent turns ride along with each question.
export const MAX_CHAT_MESSAGE_LENGTH = 2_000;
export const CHAT_HISTORY_MAX_MESSAGES = 20;
export const CHAT_HISTORY_MAX_CHARS = 16_000;
