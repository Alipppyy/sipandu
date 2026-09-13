import { prisma } from "./prisma";

type LogInput = {
  userId?: string | null;
  userName?: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "SEND" | "PAY" | "LOGIN" | "EXPORT" | "SYSTEM";
  entity: string;
  entityId?: string | null;
  description: string;
};

export async function logActivity(input: LogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId || null,
        userName: input.userName ?? "Sistem",
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        description: input.description,
      },
    });
  } catch (err) {
    console.error("[audit]", err);
  }
}
