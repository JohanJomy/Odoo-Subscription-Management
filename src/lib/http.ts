import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiFieldError = {
  field: string;
  message: string;
};

export type ApiPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
};

export class HttpError extends Error {
  status: number;
  code: string;
  fields?: ApiFieldError[];

  constructor(status: number, code: string, message: string, fields?: ApiFieldError[]) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function ok<T>(data: T, meta?: ApiPaginationMeta, init?: ResponseInit) {
  return NextResponse.json(
    {
      data,
      ...(meta ? { meta } : {}),
    },
    init
  );
}

export function created<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: 201, ...init });
}

export function fail(
  status: number,
  code: string,
  message: string,
  fields?: ApiFieldError[]
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(fields && fields.length > 0 ? { fields } : {}),
      },
    },
    { status }
  );
}

export function zodToFieldErrors(error: ZodError): ApiFieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "root",
    message: issue.message,
  }));
}

export function parsePagination(url: string | URL) {
  const { searchParams } = new URL(url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, searchParams };
}

export type RouteHandler<T = any> = (request: T, context?: any) => Promise<Response | NextResponse> | Response | NextResponse;

export function apiHandler<T = any>(handler: RouteHandler<T>): (request: any, context?: any) => Promise<Response | NextResponse> {
  return async (request: any, context?: any) => {
    try {
      return await handler(request, context);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return fail(error.status, error.code, error.message, error.fields);
      }

      if (error instanceof ZodError) {
        return fail(422, "VALIDATION_ERROR", "Validation failed", zodToFieldErrors(error));
      }

      console.error("Unhandled API Error:", error);
      return fail(500, "INTERNAL_SERVER_ERROR", error?.message || "An unexpected error occurred");
    }
  };
}

