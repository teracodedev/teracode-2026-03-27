import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

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

    const contract = await prisma.$transaction(async (tx) => {
      const gravePlot = await tx.gravePlot.findUnique({
        where: { id: gravePlotId },
      });

      if (!gravePlot) {
        throw new Error("gravePlotId is required");
      }

      const duplicate = await tx.graveContract.findFirst({
        where: { gravePlotId: gravePlot.id, householderId },
        select: { id: true },
      });

      if (duplicate) {
        throw new Error("Duplicate grave contract for this householder and grave plot");
      }

      return tx.graveContract.create({
        data: {
          gravePlotId: gravePlot.id,
          householderId,
          startDate: nullableDate(body.startDate),
          endDate: nullableDate(body.endDate),
          note: body.note ? String(body.note) : null,
        },
        include: { gravePlot: true },
      });
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error("POST /api/family-register/[id]/grave-contracts error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to add grave contract" },
      { status: 500 }
    );
  }
}
