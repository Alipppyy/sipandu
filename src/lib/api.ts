import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "./auth";

export type ApiMeta = {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function paginated<T>(data: T, meta: ApiMeta) {
  return NextResponse.json({ data, meta });
}

export type Pagination = { page: number; perPage: number; skip: number; take: number };

export function getPagination(searchParams: URLSearchParams, defaultPerPage = 10): Pagination {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const perPage = Math.min(
    100,
    Math.max(1, Number(searchParams.get("perPage") ?? defaultPerPage) || defaultPerPage),
  );
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

export function buildMeta(total: number, p: Pagination): ApiMeta {
  return {
    total,
    page: p.page,
    perPage: p.perPage,
    totalPages: Math.max(1, Math.ceil(total / p.perPage)),
  };
}

type Handler = () => Promise<NextResponse> | NextResponse;

/** Bungkus handler route agar error konsisten & tidak bocor ke klien. */
export async function handle(fn: Handler): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      const field = first?.path?.join(".");
      return fail(field ? `${field}: ${first.message}` : (first?.message ?? "Data tidak valid"), 422);
    }
    if (err instanceof UnauthorizedError) return fail(err.message, 401);
    if (err instanceof ForbiddenError) return fail(err.message, 403);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        const target = (err.meta?.target as string[] | undefined)?.join(", ");
        return fail(`Data sudah terdaftar${target ? ` (${target})` : ""}`, 409);
      }
      if (err.code === "P2025") return fail("Data tidak ditemukan", 404);
      if (err.code === "P2003") return fail("Data terkait masih digunakan / tidak valid", 400);
      return fail(`Kesalahan basis data (${err.code})`, 400);
    }
    if (err instanceof Prisma.PrismaClientValidationError) {
      return fail("Format data tidak sesuai", 422);
    }
    console.error("[api-error]", err);
    return fail("Terjadi kesalahan pada server", 500);
  }
}

export async function parseBody<S extends ZodType>(req: Request, schema: S) {
  const raw = await req.json().catch(() => ({}));
  return schema.parse(raw) as unknown as import("zod").z.infer<S>;
}
