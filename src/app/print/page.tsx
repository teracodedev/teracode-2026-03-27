import Link from "next/link";

const printItems = [
  {
    href: "/print/roster",
    title: "名簿類の印刷",
    description: "戸主・家族・親族などの名簿を印刷します。",
  },
  {
    href: "/print/address",
    title: "宛名類の印刷",
    description: "封筒・ラベルなど宛名書類を印刷します。",
  },
  {
    href: "/print/kakocho",
    title: "過去帳の印刷",
    description: "過去帳を年月・家別などで印刷します。",
  },
  {
    href: "/print/nenkaihyo",
    title: "年回表の印刷",
    description: "該当年の年回(法要)対象者一覧を印刷します。",
  },
] as const;

export default function PrintMenuPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-amber-700">各種印刷</h1>
        <p className="text-stone-500 text-sm mt-1">
          印刷したい書類の種類を選んでください。
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {printItems.map((item) => (
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
