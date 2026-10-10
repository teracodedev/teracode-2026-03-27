import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { apiErrorResponse } from "@/lib/api-error";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function nullableDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  return new Date(value);
}

export async function POST(request: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;

  try {
    const body = await request.json();
    const householderId = typeof body.householderId === "string" ? body.householderId : "";
    const gravePlotId = typeof body.gravePlotId === "string" ? body.gravePlotId : "";

    if (!householderId) {
      return NextResponse.json({ error: "householderId is required" }, { status: 400 });
    }

    if (!gravePlotId) {
      return NextResponse.json({ error: "gravePlotId is required" }, { status: 400 });
    }

    const householder = await prisma.householder.findFirst({
      where: { id: householderId, familyRegisterId: id },
      select: { id: true },
    });

    if (!householder) {
      return NextResponse.json(
        { error: "Householder does not belong to this family register" },
        { status: 404 }
      );
    }

    const start = nullableDate(body.startDate);
    if (!start) {
      return NextResponse.json(
        { error: "契約開始日は必須です" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const gravePlot = await tx.gravePlot.findUnique({
        where: { id: gravePlotId },
      });

      if (!gravePlot) {
        return { error: "墓所が見つかりません", status: 404 } as const;
      }

      const duplicate = await tx.graveContract.findFirst({
        where: { gravePlotId: gravePlot.id, householderId },
        select: { id: true },
      });

      if (duplicate) {
        return { error: "この戸主はすでにこの墓所の契約があります", status: 409 } as const;
      }

      const contract = await tx.graveContract.create({
        data: {
          gravePlotId: gravePlot.id,
          householderId,
          usageStartDate: start,
          startDate: start,
          endDate: nullableDate(body.endDate),
          note: body.note ? String(body.note) : null,
        },
        include: { gravePlot: true },
      });
      return { contract };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.contract, { status: 201 });
  } catch (error) {
    return apiErrorResponse("POST /api/family-register/[id]/grave-contracts", error, "墓所契約の追加に失敗しました");
  }
}
