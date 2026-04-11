import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import * as yaml from "js-yaml";
import JSZip from "jszip";

export const runtime = "nodejs";

const dumpOpts: yaml.DumpOptions & { allowUnicode?: boolean } = {
  allowUnicode: true,
  lineWidth: -1,
  noRefs: true,
};

function toISODateOrNull(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;

  // --- 全データ取得 ---
  const [
    familyRegisters,
    householders,
    members,
    addressHistories,
    ceremonies,
    ceremonyParticipants,
    tags,
    householderTags,
    memberTags,
    gravePlots,
    graveContracts,
    graveContractHistories,
  ] = await Promise.all([
    prisma.familyRegister.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.householder.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.householderMember.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.householderAddressHistory.findMany({ orderBy: { movedAt: "asc" } }),
    prisma.ceremony.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.ceremonyParticipant.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.tag.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.householderTag.findMany(),
    prisma.memberTag.findMany(),
    prisma.gravePlot.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.graveContract.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.graveContractHistory.findMany({ orderBy: { transferredAt: "asc" } }),
  ]);

  // --- YAML変換 ---
  const serialize = (label: string, data: unknown[]) =>
    yaml.dump({ [label]: data.map(normalizeDates) }, dumpOpts);

  const zip = new JSZip();

  zip.file("家族親族台帳.yaml", serialize("家族親族台帳", familyRegisters));
  zip.file("戸主.yaml", serialize("戸主", householders));
  zip.file("世帯員.yaml", serialize("世帯員", members));
  zip.file("住所変更履歴.yaml", serialize("住所変更履歴", addressHistories));
  zip.file("法要行事.yaml", serialize("法要行事", ceremonies));
  zip.file("法要参加者.yaml", serialize("法要参加者", ceremonyParticipants));
  zip.file("タグ.yaml", serialize("タグ", tags));
  zip.file("戸主タグ.yaml", serialize("戸主タグ", householderTags));
  zip.file("世帯員タグ.yaml", serialize("世帯員タグ", memberTags));
  zip.file("墓地区画.yaml", serialize("墓地区画", gravePlots));
  zip.file("墓地契約.yaml", serialize("墓地契約", graveContracts));
  zip.file("墓地契約履歴.yaml", serialize("墓地契約履歴", graveContractHistories));

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const filename = `テラコード_バックアップ_${stamp}.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

/** Date オブジェクトを ISO 文字列に正規化（YAML シリアライズ安定化） */
function normalizeDates(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return toISODateOrNull(obj);
  if (Array.isArray(obj)) return obj.map(normalizeDates);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = normalizeDates(v);
    }
    return result;
  }
  return obj;
}
