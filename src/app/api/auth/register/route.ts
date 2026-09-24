import { db } from "@/db";
import { driverProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createSession, authErrorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim() || null;
    const role = body.role === "driver" ? "driver" : "customer";

    if (!email.includes("@")) throw new Error("بريد إلكتروني غير صحيح");
    if (password.length < 6) throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    if (fullName.length < 3) throw new Error("الاسم مطلوب");

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing[0]) throw new Error("هذا البريد مسجل مسبقاً");

    const code = String(Math.floor(100000 + Math.random() * 900000));

    const [user] = await db
      .insert(users)
      .values({
        email,
        fullName,
        phone,
        passwordHash: hashPassword(password),
        role,
        status: "active",
        emailVerified: false,
        verifyToken: code,
        governorateId: body.governorateId ? Number(body.governorateId) : null,
        areaId: body.areaId ? Number(body.areaId) : null,
        address: body.address ? String(body.address) : null,
      })
      .returning();

    if (role === "driver") {
      await db.insert(driverProfiles).values({
        userId: user.id,
        nationalId: String(body.nationalId || ""),
        licenseNumber: String(body.licenseNumber || ""),
        vehicleType: String(body.vehicleType || "دراجة نارية"),
        vehiclePlate: String(body.vehiclePlate || ""),
        idCardUrl: String(body.idCardUrl || ""),
        licenseUrl: String(body.licenseUrl || ""),
        termsAccepted: !!body.termsAccepted,
        status: "pending",
      });
    }

    return Response.json({
      ok: true,
      userId: user.id,
      email: user.email,
      // Demo environment: the verification code is returned instead of being emailed.
      devCode: code,
    });
  } catch (err) {
    if (err instanceof Error) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}
