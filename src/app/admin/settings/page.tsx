import Link from "next/link";

const settingsItems = [
  {
    href: "/admin/settings/basic-info",
    title: "基本情報設定",
    description: "年回案内ハガキの差出人名・住所・連絡案内を設定します。",
  },
  {
    href: "/admin/import",
    title: "データインポート",
    description: "MDB ファイルから戸主・家族・墓地データを一括取り込みします。",
  },
  {
    href: "/admin/backup",
    title: "バックアップ & リカバリー",
    description: "全データを YAML 形式で ZIP バックアップ、またはバックアップから復元します。",
  },
  {
    href: "/admin/accounts",
    title: "アカウント管理",
    description: "ログインアカウントの一覧・作成・パスワード設定を行います。",
  },
] as const;

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-amber-700">各種設定</h1>
        <p className="text-stone-500 text-sm mt-1">
          管理用の機能を選んでください。
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {settingsItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group block h-full rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:border-amber-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              <h2 className="text-lg font-semibold text-stone-800 group-hover:text-amber-800">
                {item.title}
              </h2>
              <p className="mt-2 text-sm text-stone-500 leading-relaxed">
                {item.description}
              </p>
              <p className="mt-4 text-sm font-medium text-amber-700 group-hover:text-amber-600">
                開く →
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
