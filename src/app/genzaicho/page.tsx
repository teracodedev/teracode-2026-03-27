"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { generateCsv, downloadCsv, downloadExcel, downloadFudemame } from "@/lib/csv-utils";
import { DownloadMenu } from "@/components/DownloadMenu";

import { Fragment, useState, useEffect, useCallback } from "react";
import { useSharedSearch } from "@/lib/use-shared-search";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TagFilter } from "@/components/TagFilter";
import { TagBadge, type Tag } from "@/components/TagBadge";

interface GenzaichoRecord {
  id: string;
  householderId: string;
  familyName: string;
  givenName: string | null;
  familyNameKana: string | null;
  givenNameKana: string | null;
  relation: string | null;
  birthDate: string | null;
  dharmaName: string | null;
  dharmaNameKana: string | null;
  note: string | null;
  tags?: { tag: Tag }[];
  householder: {
    id: string;
    householderCode: string;
    familyName: string;
    givenName: string;
    postalCode: string | null;
    address1: string | null;
    address2: string | null;
    address3: string | null;
    phone1: string | null;
    phone2: string | null;
    fax: string | null;
    note: string | null;
    domicile: string | null;
    familyRegister: { id: string; name: string } | null;
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日";
}

function calcAge(birthDateStr: string | null): string {
  if (!birthDateStr) return "-";
  const birth = new Date(birthDateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age + "歳";
}

export default function GenzaichoPage() {
  const router = useRouter();
  const [records, setRecords] = useState<GenzaichoRecord[]>([]);
  const { query, setQuery } = useSharedSearch();
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [filterNotTagIds, setFilterNotTagIds] = useState<string[]>([]);
  const PAGE_SIZE = 10;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (filterTagIds.length > 0) params.set("tags", filterTagIds.join(","));
      if (filterNotTagIds.length > 0) params.set("notTags", filterNotTagIds.join(","));
      const res = await fetchWithAuth("/api/genzaicho?" + params);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      setRecords(
        rows.filter(
          (r): r is GenzaichoRecord =>
            r != null &&
            typeof r === "object" &&
            typeof (r as GenzaichoRecord).householder?.id === "string"
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query, filterTagIds, filterNotTagIds]);

  useEffect(() => {
    const timer = setTimeout(fetchRecords, 300);
    return () => clearTimeout(timer);
  }, [fetchRecords]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-700">現在帳</h1>
          <p className="text-sm text-stone-500 mt-1">在籍中の世帯員一覧</p>
        </div>
        <DownloadMenu
          disabled={records.length === 0}
          onCsv={() => {
            const headers = ["姓", "名", "姓フリガナ", "名フリガナ", "続柄", "生年月日", "年齢", "戸主姓", "戸主名", "戸主番号", "郵便番号", "住所1", "住所2", "住所3", "電話番号1", "電話番号2", "FAX", "家族・親族台帳", "タグ"];
            const rows = records.map((r) => [
              r.familyName, r.givenName || "",
              r.familyNameKana || "", r.givenNameKana || "",
              r.relation || "",
              r.birthDate ? new Date(r.birthDate).toISOString().slice(0, 10) : "",
              r.birthDate ? calcAge(r.birthDate) : "",
              r.householder.familyName, r.householder.givenName, r.householder.householderCode,
              r.householder.postalCode || "",
              r.householder.address1 || "", r.householder.address2 || "", r.householder.address3 || "",
              r.householder.phone1 || "", r.householder.phone2 || "", r.householder.fax || "",
              r.householder.familyRegister?.name || "",
              r.tags?.map((t) => t.tag.name).join(" / ") || "",
            ]);
            downloadCsv(generateCsv(headers, rows), "現在帳.csv");
          }}
          onExcel={() => {
            const headers = ["姓", "名", "姓フリガナ", "名フリガナ", "続柄", "生年月日", "年齢", "戸主姓", "戸主名", "戸主番号", "郵便番号", "住所1", "住所2", "住所3", "電話番号1", "電話番号2", "FAX", "家族・親族台帳", "タグ"];
            const rows = records.map((r) => [
              r.familyName, r.givenName || "",
              r.familyNameKana || "", r.givenNameKana || "",
              r.relation || "",
              r.birthDate ? new Date(r.birthDate).toISOString().slice(0, 10) : "",
              r.birthDate ? calcAge(r.birthDate) : "",
              r.householder.familyName, r.householder.givenName, r.householder.householderCode,
              r.householder.postalCode || "",
              r.householder.address1 || "", r.householder.address2 || "", r.householder.address3 || "",
              r.householder.phone1 || "", r.householder.phone2 || "", r.householder.fax || "",
              r.householder.familyRegister?.name || "",
              r.tags?.map((t) => t.tag.name).join(" / ") || "",
            ]);
            downloadExcel(headers, rows, "現在帳.xlsx");
          }}
          onFudemame={() => {
            downloadFudemame(
              records.map((r) => ({
                familyName: r.familyName, givenName: r.givenName || "",
                familyNameKana: r.familyNameKana || "", givenNameKana: r.givenNameKana || "",
                postalCode: r.householder.postalCode || "",
                address1: r.householder.address1 || "", address2: r.householder.address2 || "", address3: r.householder.address3 || "",
                tel1: r.householder.phone1 || "", tel2: r.householder.phone2 || "", fax: r.householder.fax || "",
              })),
              "現在帳.vcf"
            );
          }}
        />
      </div>

      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="氏名・戸主名・住所で検索..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
          className="flex-1 border border-stone-300 rounded-lg px-4 py-2 text-base text-stone-800 bg-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        <TagFilter selectedTagIds={filterTagIds} notTagIds={filterNotTagIds} onChange={(ids, notIds) => { setFilterTagIds(ids); setFilterNotTagIds(notIds); setCurrentPage(1); }} />
      </div>

      {!loading && (query || filterTagIds.length > 0 || filterNotTagIds.length > 0) && (
        <div className="text-sm text-stone-500">検索結果: {records.length}件</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-stone-400">読み込み中...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p>現在帳の記録がありません</p>
          <p className="text-xs mt-2">戸主の世帯員を登録すると現在帳に表示されます</p>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-2">
            {records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden cursor-pointer active:bg-stone-50"
                onClick={() => router.push("/members/" + record.id)}
              >
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-stone-800 text-base">
                        {[record.familyName, record.givenName].filter(Boolean).join(" ")}
                      </div>
                      {(record.familyNameKana || record.givenNameKana) && (
                        <div className="text-xs text-stone-400">{[record.familyNameKana, record.givenNameKana].filter(Boolean).join(" ")}</div>
                      )}
                      <div className="text-sm text-stone-500 mt-1 flex flex-wrap gap-x-2">
                        {record.relation && <span>{record.relation}</span>}
                        {record.birthDate && <span>生: {formatDate(record.birthDate)}（{calcAge(record.birthDate)}）</span>}
                      </div>
                      {record.tags && record.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {record.tags.map((t) => <TagBadge key={t.tag.id} tag={t.tag} />)}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right" onClick={(e) => e.stopPropagation()}>
                      <Link href={"/householder/" + record.householder.id} className="text-sm text-stone-500 hover:underline">
                        {record.householder.familyName} {record.householder.givenName}
                      </Link>
                      <div className="text-sm text-stone-400 mt-0.5">
                        {[record.householder.address1, record.householder.address2].filter(Boolean).join(" ")}
                      </div>
                    </div>
                  </div>
                </div>
                {record.householder.familyRegister ? (
                  <Link
                    href={`/family-register/${record.householder.familyRegister.id}`}
                    className="block px-4 py-2 border-t border-stone-100 text-xs text-amber-800 bg-amber-50/50 hover:bg-amber-50"
                  >
                    {record.householder.familyRegister.name}
                  </Link>
                ) : (
                  <div className="px-4 py-2 border-t border-stone-100 text-xs text-stone-400 bg-stone-50/40">
                    家族・親族台帳未紐付け
                  </div>
                )}
              </div>
            ))}
            <div className="text-sm text-stone-400 px-1 pt-1">{records.length}件中 {Math.min((currentPage - 1) * PAGE_SIZE + 1, records.length)}〜{Math.min(currentPage * PAGE_SIZE, records.length)}件表示</div>
          </div>

          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <table className="w-full text-base">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">フリガナ</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">氏名</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">所属グループ</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">住所</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">電話番号1</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">電話番号2</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">タグ</th>
                  <th className="text-left px-4 py-3 text-stone-600 font-medium">詳細・編集</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((record) => (
                  <Fragment key={record.id}>
                    <tr className="hover:bg-stone-50">
                      <td className="px-4 py-3 text-stone-600 text-sm">
                        {[record.familyNameKana, record.givenNameKana].filter(Boolean).join(" ") || "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-stone-800">
                        {[record.familyName, record.givenName].filter(Boolean).join(" ")}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {record.householder.familyRegister ? (
                          <Link
                            href={`/family-register/${record.householder.familyRegister.id}`}
                            className="text-amber-700 hover:text-amber-800 hover:underline text-sm"
                          >
                            {record.householder.familyRegister.name}
                          </Link>
                        ) : (
                          <span className="text-stone-300 text-sm">未設定</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-600 text-sm">
                        {[record.householder.address1, record.householder.address2, record.householder.address3].filter(Boolean).join(" ") || "-"}
                      </td>
                      <td className="px-4 py-3 text-stone-600 text-sm">
                        {record.householder.phone1 || "-"}
                      </td>
                      <td className="px-4 py-3 text-stone-600 text-sm">
                        {record.householder.phone2 || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {record.tags?.map((t) => <TagBadge key={t.tag.id} tag={t.tag} />)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link href={"/members/" + record.id} className="text-amber-700 hover:text-amber-800 hover:underline">
                          詳細・編集
                        </Link>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 text-sm text-stone-400">
              {records.length}件中 {Math.min((currentPage - 1) * PAGE_SIZE + 1, records.length)}〜{Math.min(currentPage * PAGE_SIZE, records.length)}件表示
            </div>
          </div>

          {/* ページネーション */}
          {Math.ceil(records.length / PAGE_SIZE) > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← 前へ
              </button>
              <span className="text-sm text-stone-500">{currentPage} / {Math.ceil(records.length / PAGE_SIZE)}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(records.length / PAGE_SIZE), p + 1))}
                disabled={currentPage === Math.ceil(records.length / PAGE_SIZE)}
                className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                次へ →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
