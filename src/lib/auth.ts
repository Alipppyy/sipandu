import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

const SESSION_COOKIE = "sp_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET belum dikonfigurasi di .env");
  }
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  rtId: string | null;
  rtNumber: string | null;
  avatarColor: string;
};

export type SessionPayload = SessionUser & { exp?: number };

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const c = await cookies();
    const token = c.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

/** Roles allowed to mutate data (all authenticated staff). */
export const STAFF_ROLES: Role[] = ["ADMIN", "OPERATOR", "KETUA_RT"];

export async function requireStaff(): Promise<SessionPayload> {
  const session = await requireUser();
  if (!STAFF_ROLES.includes(session.role)) throw new ForbiddenError();
  return session;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireUser();
  if (session.role !== "ADMIN") throw new ForbiddenError();
  return session;
}

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Sesi berakhir, silakan masuk kembali") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Anda tidak memiliki akses untuk aksi ini") {
    super(message);
  }
}

/** Scope a prisma `where` clause to the RT a user is allowed to see. */
export function rtScope(session: SessionPayload) {
  return session.role === "KETUA_RT" && session.rtId
    ? { rtId: session.rtId }
    : {};
}

export async function touchLogin(id: string) {
  await prisma.user
    .update({ where: { id }, data: { lastLoginAt: new Date() } })
    .catch(() => null);
}
