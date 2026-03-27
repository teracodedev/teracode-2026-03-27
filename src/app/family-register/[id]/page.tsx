"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  familyName: string;
  givenName: string | null;
  familyNameKana: string | null;
  relation: string | null;
  birthDate: string | null;
  deathDate: string | null;
  dharmaName: string | null;
  phone1: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  note: string | null;
  householderId: string;
}

interface Householder {
  id: string;
  familyName: string;
  givenName: string;
  familyNameKana: string | null;
  givenNameKana: string | null;
  isActive: boolean;
  postalCode: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  phone1: string | null;
  phone2: string | null;
  fax: string | null;
  email: string | null;
  domicile: string | null;
  gender: string | null;
  birthDate: string | null;
  deathDate: string | null;
  dharmaName: string | null;
  dharmaNameKana: string | null;
  note: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  members: Member[];
}

interface FamilyRegister {
  id: string;
  registerCode: string;
  name: string;
  note: string | null;
  householders: Householder[];
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ja-JP");
}

function formatGender(g: string | null) {
  if (g === "M") return "男性";
  if (g === "F") return "女性";
  if (g) return "その他";
  return "不明";
}

type TabId = "householders" | "genzaicho" | "kakocho";

const EMPTY_LIVING = { familyName: "", givenName: "", familyNameKana: "", givenNameKana: "", relation: "", birthDate: "" };
const EMPTY_DECEASED = { familyName: "", givenName: "", familyNameKana: "", givenNameKana: "", relation: "", birthDate: "", deathDate: "", dharmaName: "", dharmaNameKana: "" };

export default function FamilyRegisterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<FamilyRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("householders");
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNote, setEditNote] = useState("");
  const [linkQuery, setLinkQuery] = useState("");
  const [linkResults, setLinkResults] = useState<{ id: string; familyName: string; givenName: string; familyRegisterId: string | null }[]>([]);
  const [linking, setLinking] = useState(false);
  const [showLivingForm, setShowLivingForm] = useState(false);
  const [livingForm, setLivingForm] = useState(EMPTY_LIVING);
  const [savingLiving, setSavingLiving] = useState(false);
  const [showDeceasedForm, setShowDeceasedForm] = useState(false);
  const [deceasedForm, setDeceasedForm] = useState(EMPTY_DECEASED);
  const [savingDeceased, setSavingDeceased] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/api/family-register/${id}`);
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        setData(null);
        return;
      }
      const ok =
        res.ok &&
        json &&
        typeof json === "object" &&
        Array.isArray((json as FamilyRegister).householders);
      if (ok) {
        const row = json as FamilyRegister;
        setData(row);
        setEditName(row.name);
        setEditNote(row.note || "");
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!confirm("この台帳を削除しますか？（戸主データは削除されません）")) return;
    setDeleting(true);
    await fetchWithAuth(`/api/family-register/${id}`, { method: "DELETE" });
    router.push("/family-register");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchWithAuth(`/api/family-register/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, note: editNote }),
    });
    setEditing(false);
    fetchData();
  };

  const handleUnlink = async (householderId: string) => {
    if (!confirm("この戸主の紐付けを解除しますか？")) return;
    await fetchWithAuth(`/api/family-register/${id}/householders?householderId=${householderId}`, { method: "DELETE" });
    fetchData();
  };

  const searchHouseholders = async (q: string) => {
    if (!q.trim()) { setLinkResults([]); return; }
    const res = await fetchWithAuth(`/api/householder?q=${encodeURIComponent(q)}`);
    const rows = await res.json();
    setLinkResults(Array.isArray(rows) ? rows : []);
  };

  const handleLink = async (householderId: string) => {
    setLinking(true);
    await fetchWithAuth(`/api/family-register/${id}/householders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householderId }),
    });
    setLinkQuery("");
    setLinkResults([]);
    setLinking(false);
    fetchData();
  };

  const handleAddLiving = async (e: React.FormEvent) => {
    e.preventDefault();
    const householderId = data?.householders[0]?.id;
    if (!householderId) return;
    setSavingLiving(true);
    await fetchWithAuth(`/api/householder/${householderId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyName: livingForm.familyName,
        givenName: livingForm.givenName || null,
        familyNameKana: livingForm.familyNameKana || null,
        givenNameKana: livingForm.givenNameKana || null,
        relation: livingForm.relation || null,
        birthDate: livingForm.birthDate || null,
      }),
    });
    setSavingLiving(false);
    setShowLivingForm(false);
    setLivingForm(EMPTY_LIVING);
    fetchData();
  };

  const handleAddDeceased = async (e: React.FormEvent) => {
    e.preventDefault();
    const householderId = data?.householders[0]?.id;
    if (!householderId) return;
    setSavingDeceased(true);
    await fetchWithAuth(`/api/householder/${householderId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyName: deceasedForm.familyName,
        givenName: deceasedForm.givenName || null,
        familyNameKana: deceasedForm.familyNameKana || null,
        givenNameKana: deceasedForm.givenNameKana || null,
        relation: deceasedForm.relation || null,
        birthDate: deceasedForm.birthDate || null,
        deathDate: deceasedForm.deathDate || null,
        dharmaName: deceasedForm.dharmaName || null,
        dharmaNameKana: deceasedForm.dharmaNameKana || null,
      }),
    });
    setSavingDeceased(false);
    setShowDeceasedForm(false);
    setDeceasedForm(EMPTY_DECEASED);
    fetchData();
  };

  if (loading) return <div className="text-center py-12 text-stone-400">読み込み中...</div>;
  if (!data) return <div className="text-center py-12 text-stone-400">台帳が見つかりません</div>;

  const allMembers = data.householders.flatMap((h) =>
    (h.members ?? []).map((m) => ({ ...m, householderName: `${h.familyName}${h.givenName}`, householderId: h.id }))
  );
  const livingMembers = allMembers.filter((m) => !m.deathDate);
  const deceasedMembers = allMembers
    .filter((m) => !!m.deathDate)
    .sort((a, b) => new Date(b.deathDate!).getTime() - new Date(a.deathDate!).getTime());

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "householders", label: "戸主" },
    { id: "genzaicho",    label: "現在帳", count: livingMembers.length },
    { id: "kakocho",      label: "過去帳",  count: deceasedMembers.length },
  ];

  const inputCls = "w-full border border-stone-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-stone-400";

  return (
    <div className="max-w-3xl space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/family-register" className="text-stone-400 hover:text-stone-600 text-sm">← 一覧へ</Link>
        {editing ? (
          <form onSubmit={handleSaveEdit} className="flex items-center gap-2 flex-1">
            <input value={editName} onChange={(e) => setEditName(e.target.value)} required
              className="border border-stone-300 rounded-lg px-3 py-1.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-stone-400 flex-1" />
            <button type="submit" className="bg-stone-700 text-white px-3 py-1.5 rounded-lg text-sm">保存</button>
            <button type="button" onClick={() => setEditing(false)} className="text-stone-400 text-sm">キャンセル</button>
          </form>
        ) : (
          <h1 className="text-2xl font-bold text-stone-700">{data.name}</h1>
        )}
      </div>

      <div className="flex gap-2 justify-end flex-wrap">
        <button onClick={() => setEditing(!editing)}
          className="border border-stone-300 text-stone-600 px-4 py-1.5 rounded-lg hover:bg-stone-50 text-sm font-medium">
          {editing ? "キャンセル" : "名称編集"}
        </button>
        <button onClick={handleDelete} disabled={deleting}
          className="border border-red-200 text-red-600 px-4 py-1.5 rounded-lg hover:bg-red-50 text-sm font-medium disabled:opacity-50">
          {deleting ? "削除中..." : "台帳削除"}
        </button>
      </div>

      {editing && (
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <label className="block text-sm text-stone-500 mb-1">備考</label>
          <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={2} className={inputCls} />
        </div>
      )}

      {data.note && !editing && (
        <p className="text-stone-400 text-sm px-1">{data.note}</p>
      )}

      {/* タブ */}
      <div className="border-b border-stone-200 overflow-x-auto">
        <nav className="flex min-w-max">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? "border-amber-600 text-amber-700"
                  : "border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300"
              }`}>
              {t.label}
              {t.count !== undefined && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === t.id ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* 戸主タブ（1:1） */}
      {activeTab === "householders" && (
        <div className="space-y-4">
          {data.householders.length === 0 ? (
            <p className="text-stone-400 text-sm">戸主が登録されていません</p>
          ) : (() => {
            const h = data.householders[0];
            const address = [h.address1, h.address2, h.address3].filter(Boolean).join(" ");
            return (
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                  <div>
                    <Link href={`/householder/${h.id}`} className="text-xl font-bold text-stone-800 hover:text-amber-700">
                      {h.familyName}　{h.givenName}
                    </Link>
                    {(h.familyNameKana || h.givenNameKana) && (
                      <div className="text-sm text-stone-400 mt-0.5">
                        {h.familyNameKana}　{h.givenNameKana}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/householder/${h.id}/edit`}
                      className="border border-stone-300 text-stone-600 px-3 py-1 rounded-lg text-sm font-medium hover:bg-stone-50">
                      編集
                    </Link>
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${h.isActive ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                      {h.isActive ? "在籍" : "離檀"}
                    </span>
                  </div>
                </div>

                {/* 基本情報 */}
                <dl className="divide-y divide-stone-50">
                  <div className="flex px-4 py-2.5">
                    <dt className="w-28 shrink-0 text-sm text-stone-400">性別</dt>
                    <dd className="text-sm text-stone-800">{formatGender(h.gender)}</dd>
                  </div>
                  {h.birthDate && (
                    <div className="flex px-4 py-2.5">
                      <dt className="w-28 shrink-0 text-sm text-stone-400">生年月日</dt>
                      <dd className="text-sm text-stone-800">{formatDate(h.birthDate)}</dd>
                    </div>
                  )}
                  {h.deathDate && (
                    <div className="flex px-4 py-2.5">
                      <dt className="w-28 shrink-0 text-sm text-stone-400">命日</dt>
                      <dd className="text-sm text-stone-800">{formatDate(h.deathDate)}</dd>
                    </div>
                  )}
                  {h.dharmaName && (
                    <div className="flex px-4 py-2.5">
                      <dt className="w-28 shrink-0 text-sm text-stone-400">法名</dt>
                      <dd className="text-sm text-stone-800">
                        {h.dharmaName}
                        {h.dharmaNameKana && <span className="ml-2 text-stone-400 text-xs">({h.dharmaNameKana})</span>}
                      </dd>
                    </div>
                  )}
                  {h.postalCode && (
                    <div className="flex px-4 py-2.5">
                      <dt className="w-28 shrink-0 text-sm text-stone-400">郵便番号</dt>
                      <dd className="text-sm text-stone-800">〒{h.postalCode}</dd>
                    </div>
                  )}
                  {address && (
                    <div className="flex px-4 py-2.5">
                      <dt className="w-28 shrink-0 text-sm text-stone-400">住所</dt>
                      <dd className="text-sm text-stone-800">{address}</dd>
                    </div>
                  )}
                  {h.phone1 && (
                    <div className="flex px-4 py-2.5">
                      <dt className="w-28 shrink-0 text-sm text-stone-400">電話番号１</dt>
                      <dd className="text-sm text-stone-800">{h.phone1}</dd>
                    </div>
                  )}
                  {h.phone2 && (
                    <div className="flex px-4 py-2.5">
                      <dt className="w-28 shrink-0 text-sm text-stone-400">電話番号２</dt>
                      <dd className="text-sm text-stone-800">{h.phone2}</dd>
                    </div>
                  )}
                  {h.fax && (
                    <div className="flex px-4 py-2.5">
                      <dt className="w-28 shrink-0 text-sm text-stone-400">FAX</dt>
                      <dd className="text-sm text-stone-800">{h.fax}</dd>
                    </div>
                  )}
                  {h.email && (
                    <div className="flex px-4 py-2.5">
                      <dt className="w-28 shrink-0 text-sm text-stone-400">メール</dt>
                      <dd className="text-sm text-stone-800">{h.email}</dd>
                    </div>
                  )}
                  {h.domicile && (
                    <div className="flex px-4 py-2.5">
                      <dt className="w-28 shrink-0 text-sm text-stone-400">本籍</dt>
                      <dd className="text-sm text-stone-800">{h.domicile}</dd>
                    </div>
                  )}
                  {h.joinedAt && (
                    <div className="flex px-4 py-2.5">
                      <dt className="w-28 shrink-0 text-sm text-stone-400">入檀日</dt>
                      <dd className="text-sm text-stone-800">{formatDate(h.joinedAt)}</dd>
                    </div>
                  )}
                  {h.leftAt && (
                    <div className="flex px-4 py-2.5">
                      <dt className="w-28 shrink-0 text-sm text-stone-400">離檀日</dt>
                      <dd className="text-sm text-stone-800">{formatDate(h.leftAt)}</dd>
                    </div>
                  )}
                  {h.note && (
                    <div className="flex px-4 py-2.5">
                      <dt className="w-28 shrink-0 text-sm text-stone-400">備考</dt>
                      <dd className="text-sm text-stone-800 whitespace-pre-wrap">{h.note}</dd>
                    </div>
                  )}
                </dl>

                {/* 戸主台帳へのリンク */}
                <div className="px-4 py-3 border-t border-stone-100 bg-stone-50">
                  <Link href={`/householder/${h.id}`}
                    className="text-sm text-amber-700 hover:text-amber-800 font-medium">
                    → 戸主台帳を開く
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 現在帳タブ */}
      {activeTab === "genzaicho" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowLivingForm(true)}
              className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-700">
              ＋ 追加
            </button>
          </div>
          {showLivingForm && (
            <form onSubmit={handleAddLiving} className="bg-white rounded-xl border border-amber-200 p-4 space-y-3">
              <h3 className="font-medium text-stone-700 text-sm">現在帳に追加</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">姓 <span className="text-red-500">*</span></label>
                  <input required value={livingForm.familyName} onChange={e => setLivingForm(f => ({ ...f, familyName: e.target.value }))}
                    className={inputCls} placeholder="田中" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">名</label>
                  <input value={livingForm.givenName} onChange={e => setLivingForm(f => ({ ...f, givenName: e.target.value }))}
                    className={inputCls} placeholder="太郎" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">姓フリガナ</label>
                  <input value={livingForm.familyNameKana} onChange={e => setLivingForm(f => ({ ...f, familyNameKana: e.target.value }))}
                    className={inputCls} placeholder="タナカ" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">名フリガナ</label>
                  <input value={livingForm.givenNameKana} onChange={e => setLivingForm(f => ({ ...f, givenNameKana: e.target.value }))}
                    className={inputCls} placeholder="タロウ" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">続柄</label>
                  <input value={livingForm.relation} onChange={e => setLivingForm(f => ({ ...f, relation: e.target.value }))}
                    className={inputCls} placeholder="長男" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">生年月日</label>
                  <input type="date" value={livingForm.birthDate} onChange={e => setLivingForm(f => ({ ...f, birthDate: e.target.value }))}
                    className={inputCls} />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => { setShowLivingForm(false); setLivingForm(EMPTY_LIVING); }}
                  className="border border-stone-300 text-stone-600 px-4 py-1.5 rounded-lg text-sm">キャンセル</button>
                <button type="submit" disabled={savingLiving}
                  className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">
                  {savingLiving ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          )}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            {livingMembers.length === 0 ? (
              <p className="text-stone-400 text-sm">存命の世帯員が登録されていません</p>
            ) : (
              <div className="space-y-2">
                {livingMembers.map((m) => (
                  <div key={m.id} className="border border-stone-100 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-stone-800">{m.familyName} {m.givenName || ""}</span>
                        {m.relation && <span className="ml-2 text-sm text-stone-400">{m.relation}</span>}
                      </div>
                      <Link href={`/members/${m.id}`}
                        className="shrink-0 border border-stone-300 rounded px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 font-medium">
                        詳細
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 過去帳タブ */}
      {activeTab === "kakocho" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowDeceasedForm(true)}
              className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-700">
              ＋ 追加
            </button>
          </div>
          {showDeceasedForm && (
            <form onSubmit={handleAddDeceased} className="bg-white rounded-xl border border-amber-200 p-4 space-y-3">
              <h3 className="font-medium text-stone-700 text-sm">過去帳に追加</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">姓 <span className="text-red-500">*</span></label>
                  <input required value={deceasedForm.familyName} onChange={e => setDeceasedForm(f => ({ ...f, familyName: e.target.value }))}
                    className={inputCls} placeholder="田中" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">名</label>
                  <input value={deceasedForm.givenName} onChange={e => setDeceasedForm(f => ({ ...f, givenName: e.target.value }))}
                    className={inputCls} placeholder="太郎" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">姓フリガナ</label>
                  <input value={deceasedForm.familyNameKana} onChange={e => setDeceasedForm(f => ({ ...f, familyNameKana: e.target.value }))}
                    className={inputCls} placeholder="タナカ" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">名フリガナ</label>
                  <input value={deceasedForm.givenNameKana} onChange={e => setDeceasedForm(f => ({ ...f, givenNameKana: e.target.value }))}
                    className={inputCls} placeholder="タロウ" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">続柄</label>
                  <input value={deceasedForm.relation} onChange={e => setDeceasedForm(f => ({ ...f, relation: e.target.value }))}
                    className={inputCls} placeholder="父" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">生年月日</label>
                  <input type="date" value={deceasedForm.birthDate} onChange={e => setDeceasedForm(f => ({ ...f, birthDate: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">命日</label>
                  <input type="date" value={deceasedForm.deathDate} onChange={e => setDeceasedForm(f => ({ ...f, deathDate: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">法名</label>
                  <input value={deceasedForm.dharmaName} onChange={e => setDeceasedForm(f => ({ ...f, dharmaName: e.target.value }))}
                    className={inputCls} placeholder="○○院○○居士" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-stone-500 mb-1">法名フリガナ</label>
                  <input value={deceasedForm.dharmaNameKana} onChange={e => setDeceasedForm(f => ({ ...f, dharmaNameKana: e.target.value }))}
                    className={inputCls} placeholder="○○イン○○コジ" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => { setShowDeceasedForm(false); setDeceasedForm(EMPTY_DECEASED); }}
                  className="border border-stone-300 text-stone-600 px-4 py-1.5 rounded-lg text-sm">キャンセル</button>
                <button type="submit" disabled={savingDeceased}
                  className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">
                  {savingDeceased ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          )}
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            {deceasedMembers.length === 0 ? (
              <p className="text-stone-400 text-sm">故人の世帯員が登録されていません</p>
            ) : (
              <div className="space-y-2">
                {deceasedMembers.map((m) => (
                  <div key={m.id} className="border border-stone-100 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-stone-800">{m.familyName} {m.givenName || ""}</span>
                        {m.dharmaName && <span className="ml-2 text-sm text-stone-400">{m.dharmaName}</span>}
                        <div className="text-xs text-stone-400">
                          命日: {formatDate(m.deathDate)}
                        </div>
                      </div>
                      <Link href={`/members/${m.id}`}
                        className="shrink-0 border border-stone-300 rounded px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 font-medium">
                        詳細
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
