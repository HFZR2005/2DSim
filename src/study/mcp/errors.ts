export class ToolError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = 'ToolError';
  }

  toJson(): string {
    return JSON.stringify({
      code: this.code,
      message: this.message,
      ...(this.field ? { field: this.field } : {}),
    });
  }
}

export function forbidden(message = 'Not allowed for this student'): ToolError {
  return new ToolError('FORBIDDEN', message);
}

export function notFound(message = 'Not found'): ToolError {
  return new ToolError('NOT_FOUND', message);
}

export function noSelf(): ToolError {
  return new ToolError('NO_SELF_RECORD', 'This account has no linked student record of its own.');
}

export function invalid(field: string, message: string): ToolError {
  return new ToolError('VALIDATION_ERROR', message, field);
}
