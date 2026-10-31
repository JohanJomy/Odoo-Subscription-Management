import { NextResponse } from 'next/server';

export interface ValidationErrorField {
  field: string;
  message: string;
}

export class HttpError extends Error {
  statusCode: number;
  code: string;
  fields?: ValidationErrorField[];

  constructor(
    statusCode: number,
    code: string,
    message?: string,
    fields?: ValidationErrorField[]
  ) {
    super(message || code);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}

export function apiSuccess<T>(data: T, meta?: { page?: number; limit?: number; total?: number }, status = 200) {
  return NextResponse.json(
    {
      data,
      ...(meta ? { meta } : {}),
    },
    { status }
  );
}

export function apiError(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.fields ? { fields: err.fields } : {}),
        },
      },
      { status: err.statusCode }
    );
  }

  console.error('Unhandled server error:', err);
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message,
      },
    },
    { status: 500 }
  );
}

