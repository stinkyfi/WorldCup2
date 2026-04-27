/** Typed application error for consistent HTTP + JSON envelope mapping */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
