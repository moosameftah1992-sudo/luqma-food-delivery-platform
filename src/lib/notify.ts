import { db } from "@/db";
import { notifications } from "@/db/schema";

export async function pushNotification(
  userId: number | null | undefined,
  title: string,
  body: string,
  kind = "info",
  orderId?: number | null,
) {
  if (!userId) return;
  try {
    await db.insert(notifications).values({
      userId,
      title,
      body,
      kind,
      orderId: orderId ?? null,
    });
  } catch (e) {
    console.error("notify failed", e);
  }
}
