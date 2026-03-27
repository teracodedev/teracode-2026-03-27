"use client";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";

// ---- Types ----

interface Member {
  id: string;
  familyName: string;
  givenName: string | null;
  familyNameKana: string | null;
  givenNameKana: string | null;
  relation: string | null;
  gender: string | null;
  birthDate: string | null;
  deathDate: string | null;
  dharmaName: string | null;
  dharmaNameKana: string | null;
  note: string | null;
  classification: string | null;
  affiliation: string | null;
  affiliationRole: string | null;
  affiliationNote: string | null;
  templeRole: string | null;
  templeRoleNote: string | null;
  annaiFuyo: boolean;
  keijiFuyo: boolean;
  hatsuu: boolean;
}

interface SermonRecord {
  id: string;
  sermonDate: string | null;
  memberName: string | null;
  content: string | null;
}

interface HouseholderDetail {
  id: string;
  householderCode: string;
  familyName: string;
  givenName: string;
  familyNameKana: string | null;
  givenNameKana: string | null;
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
  note: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  isActive: boolean;
  kubun: string | null;
  isSodai: boolean;
  tantosodai: string | null;
  yago: string | null;
  chiku: string | null;
  motochiku: string | null;
  chikuJunjo: number | null;
  omairiJunjo: number | null;
  annaiYohi: string | null;
  nenkaiannaIYohi: string | null;
  tsukikiYohi: string | null;
  noteNoPrint: boolean;
  preDharmaName: string | null;
  preDharmaNameKana: string | null;
  templeRole: string | null;
  templeRoleNote: string | null;
  classification1: string | null;
  classification2: string | null;
  classification3: string | null;
  classification4: string | null;
  classification5: string | null;
  classification6: string | null;
  classification7: string | null;
  classification8: string | null;
  members: Member[];
  sermons: SermonRecord[];
}

type TabId = "kihon" | "detail" | "current" | "past" | "sermon" | "grave" | "finance" | "schedule" | "extra" | "memo" | "filememo" | "eitaikyo";

// ---- Helpers ----

function toInputDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

function calcAge(birthDate: string | null): string {
  if (!birthDate) return "-";
  const today = new Date();
  const bd = new Date(birthDate);
  const age = Math.floor((today.getTime() - bd.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return String(age);
}

function formatJpDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ja-JP");
}

// ---- Sub-components ----

function FieldLabel({ children, red }: { children: React.ReactNode; red?: boolean }) {
  return (
    <span className={`text-xs whitespace-nowrap select-none ${red ? "text-red-600" : "text-gray-700"}`}>
      {children}
    </span>
  );
}

function AccessInput({
  value, onChange, onBlur, type = "text", className = "", placeholder = "",
  disabled = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      className={`border border-gray-400 bg-white text-xs px-1 py-0.5 focus:outline-none focus:border-orange-400 ${className}`}
    />
  );
}

function AccessSelect({
  value, onChange, options, className = "",
}: {
  value: string;
  onChange?: (v: string) => void;
  options: { label: string; value: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`border border-gray-400 bg-white text-xs px-1 py-0.5 focus:outline-none focus:border-orange-400 ${className}`}
    >
      <option value=""></option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function AccessCheckbox({ checked, onChange, label }: { checked: boolean; onChange?: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-1 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="w-3 h-3"
      />
      {label && <span className="text-xs">{label}</span>}
    </label>
  );
}

function AccessBtn({ children, onClick, variant = "default", small = false }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "blue" | "red" | "gray";
  small?: boolean;
}) {
  const base = `border text-xs px-2 py-0.5 cursor-pointer select-none`;
  const variants = {
    default: "border-gray-500 bg-[#e0e0e0] text-gray-800 hover:bg-[#d0d0d0]",
    blue: "border-blue-600 bg-[#ddeeff] text-blue-800 hover:bg-[#cce0ff]",
    red: "border-red-500 bg-[#ffe0e0] text-red-700 hover:bg-[#ffd0d0]",
    gray: "border-gray-400 bg-[#f0f0f0] text-gray-600 hover:bg-[#e0e0e0]",
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${small ? "text-[10px] px-1" : ""}`}>
      {children}
    </button>
  );
}

// ---- Main Page ----

export default function HouseholderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [householder, setHouseholder] = useState<HouseholderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("kihon");

  // Edit form state (mirrors householder fields)
  const [form, setForm] = useState<Partial<HouseholderDetail>>({});

  // Members
  const [members, setMembers] = useState<Member[]>([]);
  const [memberEdits, setMemberEdits] = useState<Record<string, Partial<Member>>>({});
  const [memberSaving, setMemberSaving] = useState<Record<string, boolean>>({});
  const [newMember, setNewMember] = useState<Partial<Member>>({});
  const [addingMember, setAddingMember] = useState(false);

  // Sermons
  const [sermons, setSermons] = useState<SermonRecord[]>([]);
  const [sermonEdits, setSermonEdits] = useState<Record<string, Partial<SermonRecord>>>({});
  const [sermonSaving, setSermonSaving] = useState<Record<string, boolean>>({});
  const [newSermon, setNewSermon] = useState<Partial<SermonRecord>>({});
  const [addingSermon, setAddingSermon] = useState(false);

  // Load
  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchWithAuth(`/api/householder/${id}`);
    if (res.ok) {
      const data: HouseholderDetail = await res.json();
      setHouseholder(data);
      setForm(data);
      setMembers(data.members || []);
      setSermons(data.sermons || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Auto-save householder
  const saveHouseholder = useCallback(async (updated: Partial<HouseholderDetail>) => {
    if (!householder) return;
    setSaving(true);
    setSaveMsg("");
    const res = await fetchWithAuth(`/api/householder/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...householder, ...updated }),
    });
    if (res.ok) {
      const data = await res.json();
      setHouseholder(data);
      setForm(data);
      setSaveMsg("保存しました");
      setTimeout(() => setSaveMsg(""), 2000);
    }
    setSaving(false);
  }, [householder, id]);

  const setF = (key: keyof HouseholderDetail, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Member save
  const saveMember = async (memberId: string, data: Partial<Member>) => {
    setMemberSaving((s) => ({ ...s, [memberId]: true }));
    const current = members.find((m) => m.id === memberId);
    if (!current) return;
    const payload = { ...current, ...data };
    const res = await fetchWithAuth(`/api/householder/${id}/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setMembers((ms) => ms.map((m) => m.id === memberId ? updated : m));
      setMemberEdits((e) => { const n = { ...e }; delete n[memberId]; return n; });
    }
    setMemberSaving((s) => ({ ...s, [memberId]: false }));
  };

  const deleteMember = async (memberId: string) => {
    if (!confirm("この世帯員を削除しますか？")) return;
    await fetchWithAuth(`/api/householder/${id}/members/${memberId}`, { method: "DELETE" });
    setMembers((ms) => ms.filter((m) => m.id !== memberId));
  };

  const addMember = async () => {
    if (!newMember.familyName) return;
    setAddingMember(true);
    const res = await fetchWithAuth(`/api/householder/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMember),
    });
    if (res.ok) {
      const created = await res.json();
      setMembers((ms) => [...ms, created]);
      setNewMember({});
    }
    setAddingMember(false);
  };

  // Sermon save
  const saveSermon = async (sermonId: string, data: Partial<SermonRecord>) => {
    setSermonSaving((s) => ({ ...s, [sermonId]: true }));
    const current = sermons.find((s) => s.id === sermonId);
    if (!current) return;
    const payload = { ...current, ...data };
    const res = await fetchWithAuth(`/api/householder/${id}/sermons/${sermonId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setSermons((ss) => ss.map((s) => s.id === sermonId ? updated : s));
      setSermonEdits((e) => { const n = { ...e }; delete n[sermonId]; return n; });
    }
    setSermonSaving((s) => ({ ...s, [sermonId]: false }));
  };

  const deleteSermon = async (sermonId: string) => {
    await fetchWithAuth(`/api/householder/${id}/sermons/${sermonId}`, { method: "DELETE" });
    setSermons((ss) => ss.filter((s) => s.id !== sermonId));
  };

  const addSermon = async () => {
    setAddingSermon(true);
    const res = await fetchWithAuth(`/api/householder/${id}/sermons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSermon),
    });
    if (res.ok) {
      const created = await res.json();
      setSermons((ss) => [...ss, created]);
      setNewSermon({});
    }
    setAddingSermon(false);
  };

  // Member field helpers
  const getMemberField = (memberId: string, key: keyof Member) => {
    const edit = memberEdits[memberId];
    if (edit && key in edit) return edit[key] as string ?? "";
    const m = members.find((x) => x.id === memberId);
    if (!m) return "";
    const v = m[key];
    if (v == null) return "";
    if (typeof v === "boolean") return String(v);
    if (key === "birthDate" || key === "deathDate") return toInputDate(v as string);
    return String(v);
  };

  const setMemberField = (memberId: string, key: keyof Member, value: unknown) => {
    setMemberEdits((e) => ({ ...e, [memberId]: { ...e[memberId], [key]: value } }));
  };

  // Sermon field helpers
  const getSermonField = (sermonId: string, key: keyof SermonRecord) => {
    const edit = sermonEdits[sermonId];
    if (edit && key in edit) return edit[key] as string ?? "";
    const s = sermons.find((x) => x.id === sermonId);
    if (!s) return "";
    const v = s[key];
    if (v == null) return "";
    if (key === "sermonDate") return toInputDate(v as string);
    return String(v);
  };

  const setSermonField = (sermonId: string, key: keyof SermonRecord, value: unknown) => {
    setSermonEdits((e) => ({ ...e, [sermonId]: { ...e[sermonId], [key]: value } }));
  };

  const currentMembers = members.filter((m) => !m.deathDate);
  const pastMembers = members.filter((m) => !!m.deathDate);

  if (loading) {
    return <div className="bg-[#f0f0f0] min-h-screen flex items-center justify-center text-sm text-gray-600">読み込み中...</div>;
  }

  if (!householder) {
    return <div className="bg-[#f0f0f0] min-h-screen flex items-center justify-center text-sm text-red-600">戸主情報が見つかりません</div>;
  }

  const fullName = `${form.familyName ?? ""} ${form.givenName ?? ""}`.trim();
  const fullKana = `${form.familyNameKana ?? ""} ${form.givenNameKana ?? ""}`.trim();

  const tabDefs: { id: TabId; label: string }[] = [
    { id: "kihon", label: "基本項目" },
    { id: "detail", label: "戸主詳細" },
    { id: "current", label: "現在帳" },
    { id: "past", label: "過去帳" },
    { id: "sermon", label: "法話記録" },
    { id: "grave", label: "墓　地" },
    { id: "finance", label: "入出金" },
    { id: "schedule", label: "予定表" },
    { id: "extra", label: "予備項目" },
    { id: "memo", label: "メ　モ" },
    { id: "filememo", label: "ファイルメ" },
    { id: "eitaikyo", label: "永代経" },
  ];

  const inputCls = "border border-gray-400 bg-white text-xs px-1 py-0.5 focus:outline-none focus:border-orange-400";

  return (
    <div className="bg-[#f0f0f0] min-h-screen text-xs">
      {/* Top bar */}
      <div className="bg-[#d4d0c8] border-b border-gray-500 px-2 py-1 flex items-center gap-3">
        <span className="font-bold text-sm text-gray-800">門信徒台帳</span>
        <div className="flex gap-0.5 ml-2">
          {["あ","か","さ","た","な","は","ま","や","ら","わ","全"].map((k) => (
            <button key={k}
              onClick={() => router.push(`/householder?kana=${k}`)}
              className="border border-gray-500 bg-[#e0ddd8] text-xs px-1.5 py-0.5 hover:bg-[#c0bdb8] select-none">
              {k}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-600">電話番号</span>
          <input className={`${inputCls} w-24`} placeholder="" readOnly />
          <span className="text-xs text-gray-600">戸主フリガナ</span>
          <input className={`${inputCls} w-24`} placeholder="" readOnly />
        </div>
      </div>

      {/* Navigation bar */}
      <div className="bg-[#d4d0c8] border-b border-gray-400 px-2 py-1 flex items-center gap-2">
        <div className="flex gap-0.5">
          {["|<","<",">",">|"].map((btn) => (
            <button key={btn}
              className="border border-gray-500 bg-[#e0ddd8] text-xs px-2 py-0.5 hover:bg-[#c0bdb8] font-mono select-none">
              {btn}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-2">
          <AccessBtn>台帳検索</AccessBtn>
          <AccessBtn>検索結果再表示</AccessBtn>
          <AccessBtn>検索解除</AccessBtn>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {saving && <span className="text-orange-600 text-xs">保存中...</span>}
          {saveMsg && <span className="text-green-700 text-xs">{saveMsg}</span>}
          <AccessBtn variant="blue" onClick={() => saveHouseholder(form)}>
            保存
          </AccessBtn>
          <AccessBtn variant="red" onClick={() => router.push("/householder")}>
            閉じる
          </AccessBtn>
        </div>
      </div>

      {/* Search status */}
      <div className="bg-[#ffffc0] border-b border-gray-400 px-3 py-0.5 text-xs text-gray-700">
        検索中
      </div>

      {/* Record header */}
      <div className="bg-[#e8e4e0] border-b border-gray-400 px-3 py-1.5 flex items-center gap-3">
        <FieldLabel red>氏名</FieldLabel>
        <AccessInput
          value={form.familyName ?? ""}
          onChange={(v) => setF("familyName", v)}
          onBlur={() => saveHouseholder(form)}
          className="w-20 font-bold"
        />
        <AccessInput
          value={form.givenName ?? ""}
          onChange={(v) => setF("givenName", v)}
          onBlur={() => saveHouseholder(form)}
          className="w-20 font-bold"
        />
        <FieldLabel>フリガナ</FieldLabel>
        <AccessInput
          value={form.familyNameKana ?? ""}
          onChange={(v) => setF("familyNameKana", v)}
          onBlur={() => saveHouseholder(form)}
          className="w-20"
        />
        <AccessInput
          value={form.givenNameKana ?? ""}
          onChange={(v) => setF("givenNameKana", v)}
          onBlur={() => saveHouseholder(form)}
          className="w-20"
        />
        <div className="ml-auto flex items-center gap-2">
          <FieldLabel>登録日</FieldLabel>
          <span className="text-xs text-gray-600">
            {form.joinedAt ? new Date(form.joinedAt).toLocaleDateString("ja-JP") : "-"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#d4d0c8] border-b border-gray-500 px-1 pt-1">
        {tabDefs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`text-xs px-2 py-1 border border-b-0 mr-0.5 select-none ${
              activeTab === t.id
                ? "bg-[#f0f0f0] border-gray-500 border-b border-b-[#f0f0f0] -mb-px font-bold"
                : "bg-[#c4c0b8] border-gray-400 hover:bg-[#d0cdc8]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content area */}
      <div className="bg-[#f0f0f0] p-2">

        {/* ===== 基本項目 ===== */}
        {activeTab === "kihon" && (
          <div className="flex gap-3">
            {/* Left column */}
            <div className="flex-1 min-w-0">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {/* 区分 + 担当総代 + 総代 */}
                  <tr>
                    <td className="py-0.5 pr-1 w-24"><FieldLabel red>区分</FieldLabel></td>
                    <td className="py-0.5">
                      <AccessSelect
                        value={form.kubun ?? ""}
                        onChange={(v) => setF("kubun", v)}
                        options={[{label:"門信徒",value:"門信徒"},{label:"檀家",value:"檀家"},{label:"その他",value:"その他"}]}
                        className="w-28"
                      />
                    </td>
                    <td className="py-0.5 pr-1 w-20"><FieldLabel>担当総代</FieldLabel></td>
                    <td className="py-0.5">
                      <AccessInput
                        value={form.tantosodai ?? ""}
                        onChange={(v) => setF("tantosodai", v)}
                        onBlur={() => saveHouseholder(form)}
                        className="w-28"
                      />
                    </td>
                    <td className="py-0.5 pl-2">
                      <AccessCheckbox
                        checked={form.isSodai ?? false}
                        onChange={(v) => { setF("isSodai", v); }}
                        label="総代"
                      />
                    </td>
                    <td className="py-0.5 pl-1">
                      <AccessBtn small>関係先の台帳</AccessBtn>
                    </td>
                  </tr>

                  {/* 郵便番号 */}
                  <tr>
                    <td className="py-0.5 pr-1"><FieldLabel>〒</FieldLabel></td>
                    <td className="py-0.5" colSpan={3}>
                      <div className="flex items-center gap-1">
                        <AccessInput
                          value={form.postalCode ?? ""}
                          onChange={(v) => setF("postalCode", v)}
                          onBlur={() => saveHouseholder(form)}
                          className="w-20"
                          placeholder="000-0000"
                        />
                        <AccessBtn small>住所入力</AccessBtn>
                        <AccessBtn small>住所を履歴へ移動</AccessBtn>
                        <AccessBtn small>地図を表示</AccessBtn>
                      </div>
                    </td>
                    <td colSpan={2}></td>
                  </tr>

                  {/* 住所1 + 地区 */}
                  <tr>
                    <td className="py-0.5 pr-1"><FieldLabel red>住所_1</FieldLabel></td>
                    <td className="py-0.5" colSpan={3}>
                      <AccessInput
                        value={form.address1 ?? ""}
                        onChange={(v) => setF("address1", v)}
                        onBlur={() => saveHouseholder(form)}
                        className="w-64"
                      />
                    </td>
                    <td className="py-0.5 pr-1"><FieldLabel>地区</FieldLabel></td>
                    <td className="py-0.5">
                      <AccessInput
                        value={form.chiku ?? ""}
                        onChange={(v) => setF("chiku", v)}
                        onBlur={() => saveHouseholder(form)}
                        className="w-24"
                      />
                    </td>
                  </tr>

                  {/* 住所2 + 地区内順序 */}
                  <tr>
                    <td className="py-0.5 pr-1"><FieldLabel>住所_2</FieldLabel></td>
                    <td className="py-0.5" colSpan={3}>
                      <AccessInput
                        value={form.address2 ?? ""}
                        onChange={(v) => setF("address2", v)}
                        onBlur={() => saveHouseholder(form)}
                        className="w-64"
                      />
                    </td>
                    <td className="py-0.5 pr-1"><FieldLabel>地区内順序</FieldLabel></td>
                    <td className="py-0.5">
                      <div className="flex items-center gap-1">
                        <AccessInput
                          value={String(form.chikuJunjo ?? "")}
                          onChange={(v) => setF("chikuJunjo", v ? Number(v) : null)}
                          onBlur={() => saveHouseholder(form)}
                          type="number"
                          className="w-14"
                        />
                        <AccessBtn small>?</AccessBtn>
                      </div>
                    </td>
                  </tr>

                  {/* 住所3 + お参り順序 */}
                  <tr>
                    <td className="py-0.5 pr-1"><FieldLabel>住所_3</FieldLabel></td>
                    <td className="py-0.5" colSpan={3}>
                      <AccessInput
                        value={form.address3 ?? ""}
                        onChange={(v) => setF("address3", v)}
                        onBlur={() => saveHouseholder(form)}
                        className="w-64"
                      />
                    </td>
                    <td className="py-0.5 pr-1"><FieldLabel>お参り順序</FieldLabel></td>
                    <td className="py-0.5">
                      <div className="flex items-center gap-1">
                        <AccessInput
                          value={String(form.omairiJunjo ?? "")}
                          onChange={(v) => setF("omairiJunjo", v ? Number(v) : null)}
                          onBlur={() => saveHouseholder(form)}
                          type="number"
                          className="w-14"
                        />
                        <AccessBtn small>?</AccessBtn>
                      </div>
                    </td>
                  </tr>

                  {/* 電話1 + FAX */}
                  <tr>
                    <td className="py-0.5 pr-1"><FieldLabel red>電話1</FieldLabel></td>
                    <td className="py-0.5" colSpan={2}>
                      <AccessInput
                        value={form.phone1 ?? ""}
                        onChange={(v) => setF("phone1", v)}
                        onBlur={() => saveHouseholder(form)}
                        className="w-32"
                      />
                    </td>
                    <td className="py-0.5 pr-1"><FieldLabel>FAX</FieldLabel></td>
                    <td className="py-0.5" colSpan={2}>
                      <AccessInput
                        value={form.fax ?? ""}
                        onChange={(v) => setF("fax", v)}
                        onBlur={() => saveHouseholder(form)}
                        className="w-32"
                      />
                    </td>
                  </tr>

                  {/* 電話2 */}
                  <tr>
                    <td className="py-0.5 pr-1"><FieldLabel>電話2</FieldLabel></td>
                    <td className="py-0.5" colSpan={5}>
                      <AccessInput
                        value={form.phone2 ?? ""}
                        onChange={(v) => setF("phone2", v)}
                        onBlur={() => saveHouseholder(form)}
                        className="w-32"
                      />
                    </td>
                  </tr>

                  {/* Email */}
                  <tr>
                    <td className="py-0.5 pr-1"><FieldLabel>Email</FieldLabel></td>
                    <td className="py-0.5" colSpan={5}>
                      <AccessInput
                        value={form.email ?? ""}
                        onChange={(v) => setF("email", v)}
                        onBlur={() => saveHouseholder(form)}
                        className="w-56"
                      />
                    </td>
                  </tr>

                  {/* 備考 + 備考印刷不可 */}
                  <tr>
                    <td className="py-0.5 pr-1 align-top"><FieldLabel>備考</FieldLabel></td>
                    <td className="py-0.5" colSpan={4}>
                      <textarea
                        value={form.note ?? ""}
                        onChange={(e) => setF("note", e.target.value)}
                        onBlur={() => saveHouseholder(form)}
                        rows={2}
                        className="border border-gray-400 bg-white text-xs px-1 py-0.5 w-64 focus:outline-none focus:border-orange-400 resize-none"
                      />
                    </td>
                    <td className="py-0.5 align-top">
                      <AccessCheckbox
                        checked={form.noteNoPrint ?? false}
                        onChange={(v) => { setF("noteNoPrint", v); saveHouseholder({ ...form, noteNoPrint: v }); }}
                        label="備考印刷不可"
                      />
                    </td>
                  </tr>

                  {/* 屋号 */}
                  <tr>
                    <td className="py-0.5 pr-1"><FieldLabel>屋号</FieldLabel></td>
                    <td className="py-0.5" colSpan={3}>
                      <div className="flex items-center gap-1">
                        <AccessInput
                          value={form.yago ?? ""}
                          onChange={(v) => setF("yago", v)}
                          onBlur={() => saveHouseholder(form)}
                          className="w-32"
                        />
                        <AccessBtn small>地図の割当</AccessBtn>
                      </div>
                    </td>
                    <td colSpan={2}></td>
                  </tr>

                  {/* 元地区 */}
                  <tr>
                    <td className="py-0.5 pr-1"><FieldLabel>元地区</FieldLabel></td>
                    <td className="py-0.5" colSpan={3}>
                      <div className="flex items-center gap-1">
                        <AccessInput
                          value={form.motochiku ?? ""}
                          onChange={(v) => setF("motochiku", v)}
                          onBlur={() => saveHouseholder(form)}
                          className="w-32"
                        />
                        <AccessBtn small>?</AccessBtn>
                      </div>
                    </td>
                    <td colSpan={2}></td>
                  </tr>

                  {/* 案内系 */}
                  <tr>
                    <td className="py-0.5 pr-1"><FieldLabel>一般案内要否</FieldLabel></td>
                    <td className="py-0.5">
                      <AccessSelect
                        value={form.annaiYohi ?? ""}
                        onChange={(v) => setF("annaiYohi", v)}
                        options={[{label:"要",value:"要"},{label:"×",value:"×"}]}
                        className="w-16"
                      />
                    </td>
                    <td className="py-0.5 pr-1"><FieldLabel>年回案内要否</FieldLabel></td>
                    <td className="py-0.5">
                      <AccessSelect
                        value={form.nenkaiannaIYohi ?? ""}
                        onChange={(v) => setF("nenkaiannaIYohi", v)}
                        options={[{label:"要",value:"要"},{label:"×",value:"×"}]}
                        className="w-16"
                      />
                    </td>
                    <td className="py-0.5 pr-1"><FieldLabel>月忌参の有無</FieldLabel></td>
                    <td className="py-0.5">
                      <AccessSelect
                        value={form.tsukikiYohi ?? ""}
                        onChange={(v) => setF("tsukikiYohi", v)}
                        options={[{label:"有",value:"有"},{label:"無",value:"無"}]}
                        className="w-16"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td colSpan={6} className="py-1">
                      <span className="text-blue-700 text-[10px]">『×』印を付けると、案内は作成されません。</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right column: 台帳の分類 */}
            <div className="w-44 shrink-0">
              <div className="border border-gray-400 bg-[#e8e4e0] p-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-700">台帳の分類</span>
                  <AccessBtn small>?</AccessBtn>
                </div>
                {([1,2,3,4,5,6,7,8] as const).map((n) => (
                  <div key={n} className="flex items-center gap-1 mb-0.5">
                    <span className="text-[10px] w-4 text-gray-500">{n}</span>
                    <AccessInput
                      value={(form as any)[`classification${n}`] ?? ""}
                      onChange={(v) => setF(`classification${n}` as keyof HouseholderDetail, v)}
                      onBlur={() => saveHouseholder(form)}
                      className="flex-1"
                    />
                  </div>
                ))}
                <div className="mt-1">
                  <AccessBtn small>分類の登録</AccessBtn>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== 戸主詳細 ===== */}
        {activeTab === "detail" && (
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr>
                    <td className="py-0.5 pr-1 w-24"><FieldLabel>性別</FieldLabel></td>
                    <td className="py-0.5">
                      <AccessSelect
                        value={form.gender ?? ""}
                        onChange={(v) => setF("gender", v)}
                        options={[{label:"男",value:"男"},{label:"女",value:"女"},{label:"その他",value:"その他"}]}
                        className="w-20"
                      />
                    </td>
                    <td className="py-0.5 pr-1 w-20"><FieldLabel>生年月日</FieldLabel></td>
                    <td className="py-0.5">
                      <AccessInput
                        value={toInputDate(form.birthDate ?? null)}
                        onChange={(v) => setF("birthDate", v)}
                        onBlur={() => saveHouseholder(form)}
                        type="date"
                        className="w-32"
                      />
                    </td>
                    <td className="py-0.5 pr-1"><FieldLabel>満年齢</FieldLabel></td>
                    <td className="py-0.5">
                      <span className="text-xs">{calcAge(form.birthDate ?? null)}歳</span>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-0.5 pr-1 align-top"><FieldLabel>備考</FieldLabel></td>
                    <td className="py-0.5" colSpan={5}>
                      <textarea
                        value={form.note ?? ""}
                        onChange={(e) => setF("note", e.target.value)}
                        onBlur={() => saveHouseholder(form)}
                        rows={3}
                        className={`${inputCls} w-80 resize-none`}
                      />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-0.5 pr-1 align-top"><FieldLabel>本籍</FieldLabel></td>
                    <td className="py-0.5" colSpan={5}>
                      <textarea
                        value={form.domicile ?? ""}
                        onChange={(e) => setF("domicile", e.target.value)}
                        onBlur={() => saveHouseholder(form)}
                        rows={2}
                        className={`${inputCls} w-80 resize-none`}
                      />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-0.5 pr-1"><FieldLabel>生前法名</FieldLabel></td>
                    <td className="py-0.5" colSpan={2}>
                      <AccessInput
                        value={form.preDharmaName ?? ""}
                        onChange={(v) => setF("preDharmaName", v)}
                        onBlur={() => saveHouseholder(form)}
                        className="w-40"
                      />
                    </td>
                    <td className="py-0.5 pr-1"><FieldLabel>生前法名かな</FieldLabel></td>
                    <td className="py-0.5" colSpan={2}>
                      <AccessInput
                        value={form.preDharmaNameKana ?? ""}
                        onChange={(v) => setF("preDharmaNameKana", v)}
                        onBlur={() => saveHouseholder(form)}
                        className="w-40"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-1 pr-1 align-top" colSpan={2}>
                      <div className="border border-gray-400 bg-[#e0e0e0] w-24 h-28 flex items-center justify-center text-[10px] text-gray-500">
                        顔写真の割当
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: 寺院の役職 */}
            <div className="w-64 shrink-0 flex flex-col gap-2">
              <div className="border border-gray-400 bg-[#e8e4e0] p-1">
                <div className="font-bold text-xs text-gray-700 mb-1">寺院の役職</div>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#d4d0c8]">
                      <th className="border border-gray-400 px-1 py-0.5 text-left font-normal">役職</th>
                      <th className="border border-gray-400 px-1 py-0.5 text-left font-normal">備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-400 px-1 py-0.5">
                        <AccessInput
                          value={form.templeRole ?? ""}
                          onChange={(v) => setF("templeRole", v)}
                          onBlur={() => saveHouseholder(form)}
                          className="w-full"
                        />
                      </td>
                      <td className="border border-gray-400 px-1 py-0.5">
                        <AccessInput
                          value={form.templeRoleNote ?? ""}
                          onChange={(v) => setF("templeRoleNote", v)}
                          onBlur={() => saveHouseholder(form)}
                          className="w-full"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== 現在帳 ===== */}
        {activeTab === "current" && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-gray-700">現在帳</span>
              <span className="text-xs text-gray-500">{currentMembers.length}人</span>
            </div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#d4d0c8]">
                  <th className="border border-gray-400 px-1 py-0.5 w-12">操作</th>
                  <th className="border border-gray-400 px-1 py-0.5">氏名</th>
                  <th className="border border-gray-400 px-1 py-0.5">フリガナ</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-10">性別</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-24">生年月日</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-10">満年齢</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-16">続柄</th>
                  <th className="border border-gray-400 px-1 py-0.5">分類</th>
                  <th className="border border-gray-400 px-1 py-0.5">所属会</th>
                  <th className="border border-gray-400 px-1 py-0.5">備考</th>
                </tr>
              </thead>
              <tbody>
                {currentMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-[#e8f0ff]">
                    <td className="border border-gray-300 px-1 py-0.5">
                      <button
                        onClick={() => deleteMember(m.id)}
                        className="text-[10px] text-red-600 border border-red-400 px-1 hover:bg-red-50">
                        削除
                      </button>
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <div className="flex gap-1">
                        <input
                          className={`${inputCls} w-14`}
                          value={getMemberField(m.id, "familyName")}
                          onChange={(e) => setMemberField(m.id, "familyName", e.target.value)}
                          onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                        />
                        <input
                          className={`${inputCls} w-14`}
                          value={getMemberField(m.id, "givenName")}
                          onChange={(e) => setMemberField(m.id, "givenName", e.target.value)}
                          onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                        />
                      </div>
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <div className="flex gap-1">
                        <input
                          className={`${inputCls} w-12`}
                          value={getMemberField(m.id, "familyNameKana")}
                          onChange={(e) => setMemberField(m.id, "familyNameKana", e.target.value)}
                          onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                        />
                        <input
                          className={`${inputCls} w-12`}
                          value={getMemberField(m.id, "givenNameKana")}
                          onChange={(e) => setMemberField(m.id, "givenNameKana", e.target.value)}
                          onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                        />
                      </div>
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <select
                        className={`${inputCls} w-10`}
                        value={getMemberField(m.id, "gender")}
                        onChange={(e) => setMemberField(m.id, "gender", e.target.value)}
                        onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                      >
                        <option value=""></option>
                        <option value="男">男</option>
                        <option value="女">女</option>
                      </select>
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <input
                        type="date"
                        className={`${inputCls} w-28`}
                        value={getMemberField(m.id, "birthDate")}
                        onChange={(e) => setMemberField(m.id, "birthDate", e.target.value)}
                        onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                      {calcAge(m.birthDate)}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <input
                        className={`${inputCls} w-16`}
                        value={getMemberField(m.id, "relation")}
                        onChange={(e) => setMemberField(m.id, "relation", e.target.value)}
                        onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <input
                        className={`${inputCls} w-16`}
                        value={getMemberField(m.id, "classification")}
                        onChange={(e) => setMemberField(m.id, "classification", e.target.value)}
                        onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <input
                        className={`${inputCls} w-20`}
                        value={getMemberField(m.id, "affiliation")}
                        onChange={(e) => setMemberField(m.id, "affiliation", e.target.value)}
                        onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <input
                        className={`${inputCls} w-24`}
                        value={getMemberField(m.id, "note")}
                        onChange={(e) => setMemberField(m.id, "note", e.target.value)}
                        onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                      />
                    </td>
                  </tr>
                ))}

                {/* Add new row */}
                <tr className="bg-[#f8fff8]">
                  <td className="border border-gray-300 px-1 py-0.5">
                    <button
                      onClick={addMember}
                      disabled={addingMember}
                      className="text-[10px] text-blue-600 border border-blue-400 px-1 hover:bg-blue-50 disabled:opacity-50">
                      {addingMember ? "追加中" : "追加"}
                    </button>
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <div className="flex gap-1">
                      <input
                        className={`${inputCls} w-14`}
                        placeholder="姓"
                        value={newMember.familyName ?? ""}
                        onChange={(e) => setNewMember((p) => ({ ...p, familyName: e.target.value }))}
                      />
                      <input
                        className={`${inputCls} w-14`}
                        placeholder="名"
                        value={newMember.givenName ?? ""}
                        onChange={(e) => setNewMember((p) => ({ ...p, givenName: e.target.value }))}
                      />
                    </div>
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <div className="flex gap-1">
                      <input
                        className={`${inputCls} w-12`}
                        placeholder="姓カナ"
                        value={newMember.familyNameKana ?? ""}
                        onChange={(e) => setNewMember((p) => ({ ...p, familyNameKana: e.target.value }))}
                      />
                      <input
                        className={`${inputCls} w-12`}
                        placeholder="名カナ"
                        value={newMember.givenNameKana ?? ""}
                        onChange={(e) => setNewMember((p) => ({ ...p, givenNameKana: e.target.value }))}
                      />
                    </div>
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <select
                      className={`${inputCls} w-10`}
                      value={newMember.gender ?? ""}
                      onChange={(e) => setNewMember((p) => ({ ...p, gender: e.target.value }))}>
                      <option value=""></option>
                      <option value="男">男</option>
                      <option value="女">女</option>
                    </select>
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <input
                      type="date"
                      className={`${inputCls} w-28`}
                      value={newMember.birthDate ?? ""}
                      onChange={(e) => setNewMember((p) => ({ ...p, birthDate: e.target.value }))}
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5"></td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <input
                      className={`${inputCls} w-16`}
                      placeholder="続柄"
                      value={newMember.relation ?? ""}
                      onChange={(e) => setNewMember((p) => ({ ...p, relation: e.target.value }))}
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <input
                      className={`${inputCls} w-16`}
                      placeholder="分類"
                      value={newMember.classification ?? ""}
                      onChange={(e) => setNewMember((p) => ({ ...p, classification: e.target.value }))}
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <input
                      className={`${inputCls} w-20`}
                      placeholder="所属会"
                      value={newMember.affiliation ?? ""}
                      onChange={(e) => setNewMember((p) => ({ ...p, affiliation: e.target.value }))}
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <input
                      className={`${inputCls} w-24`}
                      placeholder="備考"
                      value={newMember.note ?? ""}
                      onChange={(e) => setNewMember((p) => ({ ...p, note: e.target.value }))}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ===== 過去帳 ===== */}
        {activeTab === "past" && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-gray-700">過去帳</span>
              <span className="text-xs text-gray-500">{pastMembers.length}人</span>
              <div className="flex items-center gap-1 ml-4 text-[10px] text-gray-600">
                <label><input type="radio" name="pastMode" className="mr-0.5" />2行</label>
                <label><input type="radio" name="pastMode" className="mr-0.5" defaultChecked />3行</label>
                <label><input type="radio" name="pastMode" className="mr-0.5" />4行</label>
              </div>
            </div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#d4d0c8]">
                  <th className="border border-gray-400 px-1 py-0.5 w-12">操作</th>
                  <th className="border border-gray-400 px-1 py-0.5">俗名</th>
                  <th className="border border-gray-400 px-1 py-0.5">法名</th>
                  <th className="border border-gray-400 px-1 py-0.5">フリガナ</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-10">性別</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-16">続柄</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-24">命日</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-24">生年月日</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-10">享年</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-10">案内不要</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-10">掲示不要</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-10">初盂</th>
                </tr>
              </thead>
              <tbody>
                {pastMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-[#e8f0ff]">
                    <td className="border border-gray-300 px-1 py-0.5">
                      <button
                        onClick={() => deleteMember(m.id)}
                        className="text-[10px] text-red-600 border border-red-400 px-1 hover:bg-red-50">
                        削除
                      </button>
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <div className="flex gap-1">
                        <input
                          className={`${inputCls} w-12`}
                          value={getMemberField(m.id, "familyName")}
                          onChange={(e) => setMemberField(m.id, "familyName", e.target.value)}
                          onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                        />
                        <input
                          className={`${inputCls} w-12`}
                          value={getMemberField(m.id, "givenName")}
                          onChange={(e) => setMemberField(m.id, "givenName", e.target.value)}
                          onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                        />
                      </div>
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <div className="flex gap-1">
                        <input
                          className={`${inputCls} w-16`}
                          value={getMemberField(m.id, "dharmaName")}
                          onChange={(e) => setMemberField(m.id, "dharmaName", e.target.value)}
                          onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                        />
                      </div>
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <div className="flex gap-1">
                        <input
                          className={`${inputCls} w-12`}
                          value={getMemberField(m.id, "familyNameKana")}
                          onChange={(e) => setMemberField(m.id, "familyNameKana", e.target.value)}
                          onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                        />
                        <input
                          className={`${inputCls} w-12`}
                          value={getMemberField(m.id, "givenNameKana")}
                          onChange={(e) => setMemberField(m.id, "givenNameKana", e.target.value)}
                          onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                        />
                      </div>
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <select
                        className={`${inputCls} w-10`}
                        value={getMemberField(m.id, "gender")}
                        onChange={(e) => setMemberField(m.id, "gender", e.target.value)}
                        onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                      >
                        <option value=""></option>
                        <option value="男">男</option>
                        <option value="女">女</option>
                      </select>
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <input
                        className={`${inputCls} w-16`}
                        value={getMemberField(m.id, "relation")}
                        onChange={(e) => setMemberField(m.id, "relation", e.target.value)}
                        onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <input
                        type="date"
                        className={`${inputCls} w-28`}
                        value={getMemberField(m.id, "deathDate")}
                        onChange={(e) => setMemberField(m.id, "deathDate", e.target.value)}
                        onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <input
                        type="date"
                        className={`${inputCls} w-28`}
                        value={getMemberField(m.id, "birthDate")}
                        onChange={(e) => setMemberField(m.id, "birthDate", e.target.value)}
                        onBlur={() => saveMember(m.id, memberEdits[m.id] ?? {})}
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center text-[10px]">
                      {m.birthDate && m.deathDate
                        ? Math.floor((new Date(m.deathDate).getTime() - new Date(m.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                        : ""}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                      <input
                        type="checkbox"
                        checked={memberEdits[m.id]?.annaiFuyo ?? m.annaiFuyo}
                        onChange={(e) => { setMemberField(m.id, "annaiFuyo", e.target.checked); saveMember(m.id, { ...memberEdits[m.id], annaiFuyo: e.target.checked }); }}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                      <input
                        type="checkbox"
                        checked={memberEdits[m.id]?.keijiFuyo ?? m.keijiFuyo}
                        onChange={(e) => { setMemberField(m.id, "keijiFuyo", e.target.checked); saveMember(m.id, { ...memberEdits[m.id], keijiFuyo: e.target.checked }); }}
                        className="w-3 h-3"
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                      <input
                        type="checkbox"
                        checked={memberEdits[m.id]?.hatsuu ?? m.hatsuu}
                        onChange={(e) => { setMemberField(m.id, "hatsuu", e.target.checked); saveMember(m.id, { ...memberEdits[m.id], hatsuu: e.target.checked }); }}
                        className="w-3 h-3"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== 法話記録 ===== */}
        {activeTab === "sermon" && (
          <div>
            <div className="mb-1 text-[10px] text-gray-600 bg-[#ffffcc] border border-yellow-400 px-2 py-0.5 inline-block">
              法話の日付　俗名/回忌　法話内容(メモ)　表示欄の高さが不足する場合は、ダブルクリックして下さい。
            </div>
            <table className="w-full border-collapse text-xs mt-1">
              <thead>
                <tr className="bg-[#d4d0c8]">
                  <th className="border border-gray-400 px-1 py-0.5 w-12">操作</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-28">法話の日付</th>
                  <th className="border border-gray-400 px-1 py-0.5 w-32">俗名/回忌</th>
                  <th className="border border-gray-400 px-1 py-0.5">法話内容（メモ）</th>
                </tr>
              </thead>
              <tbody>
                {sermons.map((s) => (
                  <tr key={s.id} className="hover:bg-[#e8f0ff]">
                    <td className="border border-gray-300 px-1 py-0.5">
                      <button
                        onClick={() => deleteSermon(s.id)}
                        className="text-[10px] text-red-600 border border-red-400 px-1 hover:bg-red-50">
                        削除
                      </button>
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <input
                        type="date"
                        className={`${inputCls} w-28`}
                        value={getSermonField(s.id, "sermonDate")}
                        onChange={(e) => setSermonField(s.id, "sermonDate", e.target.value)}
                        onBlur={() => saveSermon(s.id, sermonEdits[s.id] ?? {})}
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <input
                        className={`${inputCls} w-full`}
                        value={getSermonField(s.id, "memberName")}
                        onChange={(e) => setSermonField(s.id, "memberName", e.target.value)}
                        onBlur={() => saveSermon(s.id, sermonEdits[s.id] ?? {})}
                      />
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      <textarea
                        className={`${inputCls} w-full resize-none`}
                        rows={2}
                        value={getSermonField(s.id, "content")}
                        onChange={(e) => setSermonField(s.id, "content", e.target.value)}
                        onBlur={() => saveSermon(s.id, sermonEdits[s.id] ?? {})}
                      />
                    </td>
                  </tr>
                ))}

                {/* Add row */}
                <tr className="bg-[#f8fff8]">
                  <td className="border border-gray-300 px-1 py-0.5">
                    <button
                      onClick={addSermon}
                      disabled={addingSermon}
                      className="text-[10px] text-blue-600 border border-blue-400 px-1 hover:bg-blue-50 disabled:opacity-50">
                      {addingSermon ? "追加中" : "追加"}
                    </button>
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <input
                      type="date"
                      className={`${inputCls} w-28`}
                      value={newSermon.sermonDate ?? ""}
                      onChange={(e) => setNewSermon((p) => ({ ...p, sermonDate: e.target.value }))}
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <input
                      className={`${inputCls} w-full`}
                      placeholder="俗名/回忌"
                      value={newSermon.memberName ?? ""}
                      onChange={(e) => setNewSermon((p) => ({ ...p, memberName: e.target.value }))}
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-0.5">
                    <textarea
                      className={`${inputCls} w-full resize-none`}
                      rows={2}
                      placeholder="法話内容（メモ）"
                      value={newSermon.content ?? ""}
                      onChange={(e) => setNewSermon((p) => ({ ...p, content: e.target.value }))}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ===== Other tabs (placeholder) ===== */}
        {(activeTab === "grave" || activeTab === "finance" || activeTab === "schedule" ||
          activeTab === "extra" || activeTab === "memo" || activeTab === "filememo" ||
          activeTab === "eitaikyo") && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            （未実装）
          </div>
        )}
      </div>
    </div>
  );
}
