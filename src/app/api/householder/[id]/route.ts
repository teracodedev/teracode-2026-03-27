import { NextRequest, NextResponse } from "next/server";
import { getHouseholderDelegate, getHouseholderFieldMap, getHouseholderModelKind } from "@/lib/prisma-models";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// 戸主詳細取得
export async function GET(_request: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;

  try {
    const kind = getHouseholderModelKind();
    const delegate = getHouseholderDelegate() as {
      findUnique: (args: unknown) => Promise<unknown>;
      update: (args: unknown) => Promise<unknown>;
      delete: (args: unknown) => Promise<unknown>;
    };
    const include =
      kind === "householder"
        ? {
            members: true,
            familyRegister: { select: { id: true, name: true } },
          }
        : {
            members: true,
          };

    const householder = await delegate.findUnique({
      where: { id },
      include,
    });

    if (!householder) {
      return NextResponse.json({ error: "戸主が見つかりません" }, { status: 404 });
    }

    return NextResponse.json(householder);
  } catch (error) {
    console.error(`GET /api/householder/${id} error:`, error);
    return NextResponse.json({ error: (error as Error).message || "エラーが発生しました" }, { status: 500 });
  }
}

// 戸主情報更新
export async function PUT(request: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;

  try {
    const kind = getHouseholderModelKind();
    const delegate = getHouseholderDelegate() as {
      update: (args: unknown) => Promise<unknown>;
    };
    const fields = getHouseholderFieldMap(kind);
    const body = await request.json();
    const {
      familyName,
      givenName,
      familyNameKana,
      givenNameKana,
      postalCode,
      address1,
      address2,
      address3,
      phone1,
      phone2,
      fax,
      email,
      domicile,
      note,
      joinedAt,
      leftAt,
      isActive,
      relation,
    } = body;

    const data: Record<string, unknown> = {
        familyName,
        givenName,
        familyNameKana: familyNameKana || null,
        givenNameKana: givenNameKana || null,
        postalCode: postalCode || null,
        address1: address1 || null,
        address2: address2 || null,
        address3: address3 || null,
        [fields.phoneMain]: phone1 || null,
        fax: fax || null,
        email: email || null,
        note: note || null,
        joinedAt: joinedAt ? new Date(joinedAt) : null,
        leftAt: leftAt ? new Date(leftAt) : null,
        isActive: isActive ?? true,
        relation: relation || null,
      };

    if (fields.phoneSub) {
      data[fields.phoneSub] = phone2 || null;
    }

    if (fields.domicile) {
      data[fields.domicile] = domicile || null;
    }

    const householder = await delegate.update({
      where: { id },
      data,
      include: { members: true },
    });

    // 家族・親族台帳の名称・フリガナを戸主名に合わせて更新
    if (kind === "householder" && familyName && givenName) {
      const current = await prisma.householder.findUnique({
        where: { id },
        select: { familyRegisterId: true },
      });
      if (current?.familyRegisterId) {
        await prisma.familyRegister.update({
          where: { id: current.familyRegisterId },
          data: {
            name: `${familyName}${givenName}の家族・親族台帳`,
            nameKana: (familyNameKana || givenNameKana)
              ? `${familyNameKana ?? ""}${givenNameKana ?? ""}の家族・親族台帳`
              : null,
          },
        });
      }
    }

    return NextResponse.json(householder);
  } catch (error) {
    console.error(`PUT /api/householder/${id} error:`, error);
    return NextResponse.json({ error: (error as Error).message || "エラーが発生しました" }, { status: 500 });
  }
}

// 戸主削除
export async function DELETE(_request: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;

  try {
    const delegate = getHouseholderDelegate() as {
      delete: (args: unknown) => Promise<unknown>;
    };
    await delegate.delete({ where: { id } });
    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error(`DELETE /api/householder/${id} error:`, error);
    return NextResponse.json({ error: (error as Error).message || "エラーが発生しました" }, { status: 500 });
  }
}
