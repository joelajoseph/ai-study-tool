// An error that is safe to show to the user, carrying the HTTP status the API
// route should respond with. Anything else thrown becomes an opaque 500.
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Shared tail for route catch blocks: log for debugging, then answer with the
// error's message and status (or an opaque 500).
export function toErrorResponse(error: unknown, fallbackMessage: string): Response {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const status = error instanceof ApiError ? error.status : 500;
  return Response.json({ error: message }, { status });
}
