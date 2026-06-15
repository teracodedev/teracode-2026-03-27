import { NextRequest, NextResponse } from "next/server";
import { getHouseholderFieldMap, getHouseholderModelKind, getMemberDelegate } from "@/lib/prisma-models";
import { requireAuth } from "@/lib/require-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function calcAgeAtDeathFromDates(birthDate: Date, deathDate: Date): number {
  let age = deathDate.getFullYear() - birthDate.getFullYear();
  const m = deathDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && deathDate.getDate() < birthDate.getDate())) age--;
  return age;
}

function resolveAgeAtDeath(
  birthDate: Date | null,
  deathDate: Date | null,
  ageAtDeath: unknown
): string | null {
  if (birthDate && deathDate) {
    return String(calcAgeAtDeathFromDates(birthDate, deathDate));
  }
  if (ageAtDeath == null || ageAtDeath === "") return null;
  const trimmed = String(ageAtDeath).replace(/[才歳]/g, "");
  return trimmed || null;
}

// 世帯員追加
export async function POST(request: NextRequest, { params }: Params) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const { id } = await params;
  const householderId = id;

  try {
    const kind = getHouseholderModelKind();
    const fields = getHouseholderFieldMap(kind);
    const memberDelegate = getMemberDelegate() as {
      create: (args: unknown) => Promise<unknown>;
    };
    const body = await request.json();
    const { familyName, givenName, familyNameKana, givenNameKana, relation,
            postalCode, address1, address2, address3, phone1, phone2, fax, domicile,
            birthDate, deathDate, ageAtDeath, dharmaName, dharmaNameKana, note } = body;

    if (!familyName) {
      return NextResponse.json({ error: "姓は必須です" }, { status: 400 });
    }

    const birthDateObj = birthDate ? new Date(birthDate) : null;
    const deathDateObj = deathDate ? new Date(deathDate) : null;

    const member = await memberDelegate.create({
      data: {
        [fields.relationId]: householderId,
        familyName,
        givenName: givenName || null,
        familyNameKana: familyNameKana || null,
        givenNameKana: givenNameKana || null,
        relation: relation || null,
        postalCode: postalCode || null,
        address1: address1 || null,
        address2: address2 || null,
        address3: address3 || null,
        phone1: phone1 || null,
        phone2: phone2 || null,
        fax: fax || null,
        domicile: domicile || null,
        birthDate: birthDateObj,
        deathDate: deathDateObj,
        ageAtDeath: resolveAgeAtDeath(birthDateObj, deathDateObj, ageAtDeath),
        dharmaName: dharmaName || null,
        dharmaNameKana: dharmaNameKana || null,
        note: note || null,
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error(`POST /api/householder/${id}/members error:`, error);
    return NextResponse.json({ error: (error as Error).message || "登録に失敗しました" }, { status: 500 });
  }
}
