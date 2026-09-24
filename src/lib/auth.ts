import crypto from "node:crypto";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { driverProfiles, restaurants, sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "luqma_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  role: "customer" | "store" | "driver" | "admin";
  status: string;
  emailVerified: boolean;
  governorateId: number | null;
  areaId: number | null;
  address: string | null;
  restaurantId: number | null;
  restaurantName: string | null;
  driverId: number | null;
  driverStatus: string | null;
};

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(candidate, "hex"),
      Buffer.from(hash, "hex"),
    );
  } catch {
    return false;
  }
}

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
    jar.delete(SESSION_COOKIE);
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.token, token))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;

  const u = row.user;
  const base: SessionUser = {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    role: u.role,
    status: u.status,
    emailVerified: u.emailVerified,
    governorateId: u.governorateId,
    areaId: u.areaId,
    address: u.address,
    restaurantId: null,
    restaurantName: null,
    driverId: null,
    driverStatus: null,
  };

  if (u.role === "store") {
    const r = await db
      .select({ id: restaurants.id, nameAr: restaurants.nameAr })
      .from(restaurants)
      .where(eq(restaurants.ownerUserId, u.id))
      .limit(1);
    if (r[0]) {
      base.restaurantId = r[0].id;
      base.restaurantName = r[0].nameAr;
    }
  }

  if (u.role === "driver") {
    const d = await db
      .select({ id: driverProfiles.id, status: driverProfiles.status })
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, u.id))
      .limit(1);
    if (d[0]) {
      base.driverId = d[0].id;
      base.driverStatus = d[0].status;
    }
  }

  return base;
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new AuthError("غير مسجل الدخول", 401);
  return u;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function guard(
  roles: Array<SessionUser["role"]>,
): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new AuthError("يجب تسجيل الدخول", 401);
  if (!roles.includes(u.role)) throw new AuthError("لا تملك صلاحية الوصول", 403);
  if (u.status !== "active") throw new AuthError("الحساب غير مفعل", 403);
  return u;
}

export function authErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return Response.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
}

export async function findUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email.toLowerCase().trim())))
    .limit(1);
  return rows[0] ?? null;
}
