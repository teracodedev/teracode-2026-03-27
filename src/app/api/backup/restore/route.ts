import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import * as yaml from "js-yaml";
import JSZip from "jszip";

export const runtime = "nodejs";

/** YAML ファイル名 → モデルキーのマッピング */
const FILE_MAP: Record<string, string> = {
  "家族親族台帳.yaml": "familyRegister",
  "戸主.yaml": "householder",
  "世帯員.yaml": "member",
  "住所変更履歴.yaml": "addressHistory",
  "法要行事.yaml": "ceremony",
  "法要参加者.yaml": "ceremonyParticipant",
  "タグ.yaml": "tag",
  "戸主タグ.yaml": "householderTag",
  "世帯員タグ.yaml": "memberTag",
  "墓地区画.yaml": "gravePlot",
  "墓地契約.yaml": "graveContract",
  "墓地契約履歴.yaml": "graveContractHistory",
};

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function toBool(v: unknown, def = false): boolean {
  if (typeof v === "boolean") return v;
  return def;
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : Math.round(n);
}

function toFloat(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

type R = Record<string, unknown>;

export async function POST(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
  }

  try {
    const arrayBuf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuf);

    // --- YAML ファイルをパース ---
    const data: Record<string, R[]> = {};
    for (const [fileName, modelKey] of Object.entries(FILE_MAP)) {
      const entry = zip.file(fileName);
      if (!entry) continue;
      const text = await entry.async("string");
      const doc = yaml.load(text) as Record<string, unknown[]> | null;
      if (!doc) continue;
      const rootKey = Object.keys(doc)[0];
      const arr = doc[rootKey];
      if (Array.isArray(arr)) {
        data[modelKey] = arr as R[];
      }
    }

    // --- トランザクションで全データ入れ替え（タイムアウト5分） ---
    await prisma.$transaction(async (tx) => {
      // 削除順（外部キー制約を考慮: 子テーブルから削除）
      await tx.graveContractHistory.deleteMany();
      await tx.graveContract.deleteMany();
      await tx.gravePlot.deleteMany();
      await tx.memberTag.deleteMany();
      await tx.householderTag.deleteMany();
      await tx.ceremonyParticipant.deleteMany();
      await tx.ceremony.deleteMany();
      await tx.householderAddressHistory.deleteMany();
      await tx.householderMember.deleteMany();
      await tx.householder.deleteMany();
      await tx.familyRegister.deleteMany();
      await tx.tag.deleteMany();

      // --- createMany で一括挿入（親テーブルから） ---

      // 1. 家族親族台帳
      if (data.familyRegister?.length) {
        await tx.familyRegister.createMany({
          data: data.familyRegister.map((r) => ({
            id: r.id as string,
            registerCode: r.registerCode as string,
            name: r.name as string,
            nameKana: (r.nameKana as string) || null,
            note: (r.note as string) || null,
            createdAt: parseDate(r.createdAt) ?? new Date(),
            updatedAt: parseDate(r.updatedAt) ?? new Date(),
          })),
        });
      }

      // 2. タグ
      if (data.tag?.length) {
        await tx.tag.createMany({
          data: data.tag.map((r) => ({
            id: r.id as string,
            name: r.name as string,
            color: (r.color as string) || "#6b7280",
            createdAt: parseDate(r.createdAt) ?? new Date(),
          })),
        });
      }

      // 3. 戸主
      if (data.householder?.length) {
        await tx.householder.createMany({
          data: data.householder.map((r) => ({
            id: r.id as string,
            householderCode: r.householderCode as string,
            familyName: r.familyName as string,
            givenName: (r.givenName as string) || "",
            familyNameKana: (r.familyNameKana as string) || null,
            givenNameKana: (r.givenNameKana as string) || null,
            postalCode: (r.postalCode as string) || null,
            address1: (r.address1 as string) || null,
            address2: (r.address2 as string) || null,
            address3: (r.address3 as string) || null,
            phone1: (r.phone1 as string) || null,
            phone2: (r.phone2 as string) || null,
            fax: (r.fax as string) || null,
            email: (r.email as string) || null,
            gender: (r.gender as string) || null,
            birthDate: parseDate(r.birthDate),
            deathDate: parseDate(r.deathDate),
            ageAtDeath: (r.ageAtDeath as string) || null,
            dharmaName: (r.dharmaName as string) || null,
            dharmaNameKana: (r.dharmaNameKana as string) || null,
            domicile: (r.domicile as string) || null,
            relation: (r.relation as string) || null,
            note: (r.note as string) || null,
            isActive: toBool(r.isActive, true),
            joinedAt: parseDate(r.joinedAt),
            leftAt: parseDate(r.leftAt),
            familyRegisterId: (r.familyRegisterId as string) || null,
            createdAt: parseDate(r.createdAt) ?? new Date(),
            updatedAt: parseDate(r.updatedAt) ?? new Date(),
          })),
        });
      }

      // 4. 世帯員
      if (data.member?.length) {
        await tx.householderMember.createMany({
          data: data.member.map((r) => ({
            id: r.id as string,
            householderId: r.householderId as string,
            familyName: r.familyName as string,
            givenName: (r.givenName as string) || null,
            familyNameKana: (r.familyNameKana as string) || null,
            givenNameKana: (r.givenNameKana as string) || null,
            postalCode: (r.postalCode as string) || null,
            address1: (r.address1 as string) || null,
            address2: (r.address2 as string) || null,
            address3: (r.address3 as string) || null,
            phone1: (r.phone1 as string) || null,
            phone2: (r.phone2 as string) || null,
            fax: (r.fax as string) || null,
            email: (r.email as string) || null,
            gender: (r.gender as string) || null,
            birthDate: parseDate(r.birthDate),
            deathDate: parseDate(r.deathDate),
            ageAtDeath: (r.ageAtDeath as string) || null,
            dharmaName: (r.dharmaName as string) || null,
            dharmaNameKana: (r.dharmaNameKana as string) || null,
            domicile: (r.domicile as string) || null,
            relation: (r.relation as string) || null,
            note: (r.note as string) || null,
            notePrintDisabled: toBool(r.notePrintDisabled),
            meinichiFusho: toBool(r.meinichiFusho),
            createdAt: parseDate(r.createdAt) ?? new Date(),
            updatedAt: parseDate(r.updatedAt) ?? new Date(),
          })),
        });
      }

      // 5. 住所変更履歴
      if (data.addressHistory?.length) {
        await tx.householderAddressHistory.createMany({
          data: data.addressHistory.map((r) => ({
            id: r.id as string,
            householderId: r.householderId as string,
            postalCode: (r.postalCode as string) || null,
            address1: (r.address1 as string) || null,
            address2: (r.address2 as string) || null,
            address3: (r.address3 as string) || null,
            movedAt: parseDate(r.movedAt) ?? new Date(),
            note: (r.note as string) || null,
          })),
        });
      }

      // 6. 法要行事
      if (data.ceremony?.length) {
        await tx.ceremony.createMany({
          data: data.ceremony.map((r) => ({
            id: r.id as string,
            title: r.title as string,
            ceremonyType: r.ceremonyType as "MEMORIAL" | "REGULAR" | "FUNERAL" | "SPECIAL" | "OTHER",
            scheduledAt: parseDate(r.scheduledAt) ?? new Date(),
            endAt: parseDate(r.endAt),
            location: (r.location as string) || null,
            description: (r.description as string) || null,
            maxAttendees: toInt(r.maxAttendees),
            fee: toInt(r.fee),
            status: (r.status as "SCHEDULED" | "COMPLETED" | "CANCELLED") || "SCHEDULED",
            note: (r.note as string) || null,
            createdAt: parseDate(r.createdAt) ?? new Date(),
            updatedAt: parseDate(r.updatedAt) ?? new Date(),
          })),
        });
      }

      // 7. 法要参加者
      if (data.ceremonyParticipant?.length) {
        await tx.ceremonyParticipant.createMany({
          data: data.ceremonyParticipant.map((r) => ({
            id: r.id as string,
            ceremonyId: r.ceremonyId as string,
            householderId: r.householderId as string,
            attendees: toInt(r.attendees) ?? 1,
            offering: toInt(r.offering),
            note: (r.note as string) || null,
            createdAt: parseDate(r.createdAt) ?? new Date(),
            updatedAt: parseDate(r.updatedAt) ?? new Date(),
          })),
        });
      }

      // 8. 戸主タグ
      if (data.householderTag?.length) {
        await tx.householderTag.createMany({
          data: data.householderTag.map((r) => ({
            id: r.id as string,
            householderId: r.householderId as string,
            tagId: r.tagId as string,
          })),
        });
      }

      // 9. 世帯員タグ
      if (data.memberTag?.length) {
        await tx.memberTag.createMany({
          data: data.memberTag.map((r) => ({
            id: r.id as string,
            memberId: r.memberId as string,
            tagId: r.tagId as string,
          })),
        });
      }

      // 10. 墓地区画
      if (data.gravePlot?.length) {
        await tx.gravePlot.createMany({
          data: data.gravePlot.map((r) => ({
            id: r.id as string,
            plotNumber: r.plotNumber as string,
            area: toFloat(r.area),
            width: toFloat(r.width),
            depth: toFloat(r.depth),
            permanentUsageFee: toInt(r.permanentUsageFee),
            managementFee: toInt(r.managementFee),
            note: (r.note as string) || null,
            createdAt: parseDate(r.createdAt) ?? new Date(),
            updatedAt: parseDate(r.updatedAt) ?? new Date(),
          })),
        });
      }

      // 11. 墓地契約
      if (data.graveContract?.length) {
        await tx.graveContract.createMany({
          data: data.graveContract.map((r) => ({
            id: r.id as string,
            gravePlotId: r.gravePlotId as string,
            householderId: r.householderId as string,
            usageStartDate: parseDate(r.usageStartDate),
            startDate: parseDate(r.startDate),
            endDate: parseDate(r.endDate),
            note: (r.note as string) || null,
            createdAt: parseDate(r.createdAt) ?? new Date(),
            updatedAt: parseDate(r.updatedAt) ?? new Date(),
          })),
        });
      }

      // 12. 墓地契約履歴
      if (data.graveContractHistory?.length) {
        await tx.graveContractHistory.createMany({
          data: data.graveContractHistory.map((r) => ({
            id: r.id as string,
            graveContractId: r.graveContractId as string,
            householderName: r.householderName as string,
            householderKana: (r.householderKana as string) || null,
            startDate: parseDate(r.startDate),
            endDate: parseDate(r.endDate),
            transferredAt: parseDate(r.transferredAt) ?? new Date(),
            note: (r.note as string) || null,
          })),
        });
      }
    }, {
      timeout: 300000, // 5分
    });

    // 件数サマリー
    const summary = {
      家族親族台帳: data.familyRegister?.length ?? 0,
      戸主: data.householder?.length ?? 0,
      世帯員: data.member?.length ?? 0,
      住所変更履歴: data.addressHistory?.length ?? 0,
      法要行事: data.ceremony?.length ?? 0,
      法要参加者: data.ceremonyParticipant?.length ?? 0,
      タグ: data.tag?.length ?? 0,
      戸主タグ: data.householderTag?.length ?? 0,
      世帯員タグ: data.memberTag?.length ?? 0,
      墓地区画: data.gravePlot?.length ?? 0,
      墓地契約: data.graveContract?.length ?? 0,
      墓地契約履歴: data.graveContractHistory?.length ?? 0,
    };

    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error("リカバリーエラー:", e);
    return NextResponse.json(
      { error: `リカバリーに失敗しました: ${(e as Error).message}` },
      { status: 500 },
    );
  }
}
