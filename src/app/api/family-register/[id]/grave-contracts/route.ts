import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function nullableDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  return new Date(value);
}

function nullableFloat(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableInt(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;

  try {
    const body = await request.json();
    const mode = body.mode === "new" ? "new" : "existing";
    const householderId = typeof body.householderId === "string" ? body.householderId : "";

    if (!householderId) {
      return NextResponse.json({ error: "householderId is required" }, { status: 400 });
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

    const plotNumber = String(body.plotNumber ?? "").trim();
    if (mode === "new" && !plotNumber) {
      return NextResponse.json({ error: "plotNumber is required" }, { status: 400 });
    }

    if (mode === "new") {
      const existingPlot = await prisma.gravePlot.findUnique({
        where: { plotNumber },
        select: { id: true },
      });
      if (existingPlot) {
        return NextResponse.json(
          { error: "plotNumber already exists. Select the existing grave plot instead" },
          { status: 400 }
        );
      }
    }

    const contract = await prisma.$transaction(async (tx) => {
      const gravePlot =
        mode === "new"
          ? await tx.gravePlot.create({
              data: {
                plotNumber,
                area: nullableFloat(body.area),
                width: nullableFloat(body.width),
                depth: nullableFloat(body.depth),
                permanentUsageFee: nullableInt(body.permanentUsageFee),
                managementFee: nullableInt(body.managementFee),
                note: body.plotNote ? String(body.plotNote) : null,
              },
            })
          : await tx.gravePlot.findUnique({
              where: { id: String(body.gravePlotId ?? "") },
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
