import { NextRequest, NextResponse } from "next/server";
import { getHouseholderFieldMap, getHouseholderModelKind, getMemberDelegate } from "@/lib/prisma-models";
import { requireAuth } from "@/lib/require-auth";
import { toFullWidthKatakana, buildFullNameOrConditions, buildNestedFullNameOrConditions } from "@/lib/yaml-utils";

export const runtime = "nodejs";

// 現在帳一覧取得（命日が未設定の在籍世帯員）
export async function GET(request: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const queryKana = toFullWidthKatakana(query) || query;
  const tagIds = searchParams.get("tags")?.split(",").filter(Boolean) || [];

  try {
    const kind = getHouseholderModelKind();
    const memberDelegate = getMemberDelegate() as {
      findMany: (args: unknown) => Promise<unknown>;
    };
    const fields = getHouseholderFieldMap(kind);
    const relationName = fields.relation;
    const codeFilter = {
      [relationName]: { [fields.code]: { contains: query, mode: "insensitive" } },
    };

    // タグフィルター: 指定された全タグを持つレコードのみ (AND条件)
    const tagFilter = tagIds.length > 0
      ? { AND: tagIds.map((tagId: string) => ({ tags: { some: { tagId } } })) }
      : {};

    const records = await memberDelegate.findMany({
      where: {
        ...tagFilter,
        deathDate: null,
        [relationName]: { isActive: true },
        OR: query
          ? [
              { familyName: { contains: query, mode: "insensitive" } },
              { givenName: { contains: query, mode: "insensitive" } },
              { familyNameKana: { contains: queryKana, mode: "insensitive" } },
              { givenNameKana: { contains: queryKana, mode: "insensitive" } },
              { relation: { contains: query, mode: "insensitive" } },
              { [relationName]: { familyName: { contains: query, mode: "insensitive" } } },
              { [relationName]: { givenName: { contains: query, mode: "insensitive" } } },
              codeFilter,
              { [relationName]: { address1: { contains: query, mode: "insensitive" } } },
              { [relationName]: { address2: { contains: query, mode: "insensitive" } } },
              { [relationName]: { address3: { contains: query, mode: "insensitive" } } },
              ...buildFullNameOrConditions(query, queryKana),
              ...buildNestedFullNameOrConditions(query, relationName),
            ]
          : undefined,
      },
      include: {
        [relationName]: {
          select: {
            id: true,
            [fields.code]: true,
            familyName: true,
            givenName: true,
            postalCode: true,
            address1: true,
            address2: true,
            address3: true,
            phone1: true,
            phone2: true,
            fax: true,
            note: true,
            domicile: true,
            familyRegister: { select: { id: true, name: true } },
          },
        },
        tags: { include: { tag: true } },
      },
      orderBy: [{ familyNameKana: "asc" }, { givenNameKana: "asc" }, { familyName: "asc" }],
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("GET /api/genzaicho error:", error);
    return NextResponse.json({ error: (error as Error).message || "エラーが発生しました" }, { status: 500 });
  }
}
