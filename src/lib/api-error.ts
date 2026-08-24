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
