"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useState, useEffect, use } from "react";
import Link from "next/link";

interface GraveContract {
  id: string;
  startDate: string | null;
  endDate: string | null;
  note: string | null;
  householder: {
    id: string;
    familyName: string;
    givenName: string;
    familyRegister: { id: string; name: string } | null;
  };
}

interface GravePlot {
  id: string;
  plotNumber: string;
  area: number | null;
  permanentUsageFee: number | null;
  managementFee: number | null;
  note: string | null;
  contracts: GraveContract[];
}

export default function GraveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [grave, setGrave] = useState<GravePlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`/api/graves/${id}`);
        if (!res.ok) {
          setError("墓地が見つかりません");
          return;
        }
        setGrave(await res.json());
      } catch {
        setError("エラーが発生しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const formatCurrency = (v: number | null) =>
    v != null ? `¥${v.toLocaleString()}` : "-";

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("ja-JP");
  };

  if (loading)
    return (
      <div className="text-center py-12 text-stone-400">読み込み中...</div>
    );
  if (error || !grave)
    return (
      <div className="text-center py-12 text-stone-400">
        {error || "墓地が見つかりません"}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/graves"
            className="text-stone-400 hover:text-stone-600 transition-colors"
          >
            ← 墓地一覧
          </Link>
          <h1 className="text-2xl font-bold text-amber-700">
            墓地 No. {grave.plotNumber}
          </h1>
        </div>
      </div>

      {/* 墓地情報 */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="text-lg font-bold text-stone-800">墓地情報</h2>
        </div>
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-stone-500">墓地番号</dt>
              <dd className="text-stone-800 font-medium">
                {grave.plotNumber}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-500">UUID</dt>
              <dd className="text-stone-500 text-xs font-mono">{grave.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-stone-500">面積</dt>
              <dd className="text-stone-800">
                {grave.area ? `${grave.area} m²` : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-500">永代使用料</dt>
              <dd className="text-stone-800">
                {formatCurrency(grave.permanentUsageFee)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-500">管理費</dt>
              <dd className="text-stone-800">
                {formatCurrency(grave.managementFee)}
              </dd>
            </div>
            {grave.note && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-stone-500">備考</dt>
                <dd className="text-stone-800 whitespace-pre-wrap">
                  {grave.note}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* 契約情報 */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="text-lg font-bold text-stone-800">
            使用契約 ({grave.contracts.length}件)
          </h2>
        </div>
        {grave.contracts.length === 0 ? (
          <div className="px-6 py-8 text-center text-stone-400">
            契約情報がありません
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {grave.contracts.map((c) => (
              <div key={c.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/householder/${c.householder.id}`}
                        className="text-stone-800 font-medium hover:text-amber-700 hover:underline"
                      >
                        {c.householder.familyName} {c.householder.givenName}
                      </Link>
                      {c.householder.familyRegister && (
                        <Link
                          href={`/family-register/${c.householder.familyRegister.id}`}
                          className="text-xs text-amber-700 hover:text-amber-800 hover:underline"
                        >
                          {c.householder.familyRegister.name}
                        </Link>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 mt-0.5 font-mono">
                      契約ID: {c.id}
                    </div>
                  </div>
                  <div className="text-sm text-stone-600">
                    <span>
                      {formatDate(c.startDate)} 〜 {formatDate(c.endDate)}
                    </span>
                  </div>
                </div>
                {c.note && (
                  <div className="text-sm text-stone-500 mt-2 whitespace-pre-wrap">
                    {c.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
