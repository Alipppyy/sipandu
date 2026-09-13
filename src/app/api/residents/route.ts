import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireStaff, rtScope } from "@/lib/auth";
import { handle, getPagination, buildMeta } from "@/lib/api";
import { logActivity } from "@/lib/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "NIK harus 16 digit angka"),
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  gender: z.enum(["LAKI_LAKI", "PEREMPUAN"]),
  birthPlace: z.string().trim().min(1, "Tempat lahir wajib diisi"),
  birthDate: z.coerce.date(),
  religion: z.enum(["ISLAM", "KRISTEN", "KATOLIK", "HINDU", "BUDDHA", "KONGHUCU"]).default("ISLAM"),
  education: z.enum(["SD", "SMP", "SMA", "DIPLOMA", "SARJANA", "PASCASARJANA"]).default("SMA"),
  occupation: z.string().trim().default("Wiraswasta"),
  maritalStatus: z
    .enum(["BELUM_KAWIN", "KAWIN", "CERAI_HIDUP", "CERAI_MATI"])
    .default("BELUM_KAWIN"),
  phone: z.string().trim().optional().nullable(),
  whatsapp: z.string().trim().optional().nullable(),
  email: z.string().trim().email("Email tidak valid").optional().nullable().or(z.literal("")),
  familyId: z.string().optional().nullable(),
  familyRole: z.enum(["KEPALA", "ISTRI", "ANAK", "ORANG_TUA", "FAMILI_LAIN"]).default("ANAK"),
  rtId: z.string().min(1, "RT wajib dipilih"),
  status: z.enum(["AKTIF", "PINDAH", "MENINGGAL"]).default("AKTIF"),
  bloodType: z.string().trim().optional().nullable(),
  isVoter: z.boolean().default(true),
  notes: z.string().trim().optional().nullable(),
});

export async function GET(req: Request) {
  return handle(async () => {
    const session = await requireUser();
    const sp = new URL(req.url).searchParams;
    const p = getPagination(sp);
    const q = sp.get("q")?.trim() ?? "";
    const rtId = sp.get("rtId") ?? "";
    const status = sp.get("status") ?? "";
    const gender = sp.get("gender") ?? "";
    const role = sp.get("familyRole") ?? "";
    const familyId = sp.get("familyId") ?? "";

    const scope = rtScope(session);
    const where: Prisma.ResidentWhereInput = {
      ...scope,
      ...(rtId ? { rtId } : {}),
      ...(status ? { status: status as Prisma.EnumResidentStatusFilter } : {}),
      ...(gender ? { gender: gender as Prisma.EnumGenderFilter } : {}),
      ...(role ? { familyRole: role as Prisma.EnumFamilyRoleFilter } : {}),
      ...(familyId ? { familyId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { nik: { contains: q } },
              { phone: { contains: q } },
              { occupation: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.resident.count({ where }),
      prisma.resident.findMany({
        where,
        orderBy: { name: "asc" },
        skip: p.skip,
        take: p.take,
        include: {
          rt: { select: { number: true, areaName: true } },
          family: { select: { id: true, kkNumber: true, headName: true, address: true } },
        },
      }),
    ]);

    return NextResponse.json({ data, meta: buildMeta(total, p) });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireStaff();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
    }
    const d = parsed.data;

    if (session.role === "KETUA_RT" && session.rtId && d.rtId !== session.rtId) {
      return NextResponse.json({ error: "Anda hanya dapat menambah warga di RT Anda" }, { status: 403 });
    }

    const data = await prisma.resident.create({
      data: {
        ...d,
        email: d.email || null,
        phone: d.phone || null,
        whatsapp: d.whatsapp || null,
        familyId: d.familyId || null,
        bloodType: d.bloodType ?? undefined,
      } as Prisma.ResidentUncheckedCreateInput,
      include: { rt: { select: { number: true } } },
    });

    // Jika sebagai kepala keluarga & KK belum punya kepala, tautkan
    if (d.familyId && d.familyRole === "KEPALA") {
      const fam = await prisma.family.findUnique({ where: { id: d.familyId } });
      if (fam && !fam.headId) {
        await prisma.family.update({
          where: { id: fam.id },
          data: { headId: data.id, headName: data.name },
        });
      }
    }

    await logActivity({
      userId: session.id,
      userName: session.name,
      action: "CREATE",
      entity: "Warga",
      entityId: data.id,
      description: `Warga "${data.name}" (RT ${data.rt.number}) ditambahkan`,
    });

    return NextResponse.json(data, { status: 201 });
  });
}
