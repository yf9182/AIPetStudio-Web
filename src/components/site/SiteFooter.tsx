import Link from "next/link";

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "创作",
    links: [
      { label: "模板库", href: "/#templates" },
      { label: "图生图", href: "/?kind=image#templates" },
      { label: "图生视频", href: "/?kind=video#templates" },
      { label: "我的作品", href: "/tasks" }
    ]
  },
  {
    title: "账户",
    links: [
      { label: "登录", href: "/login" },
      { label: "积分中心", href: "/points" },
      { label: "订阅方案", href: "/pricing" },
      { label: "账号设置", href: "/account" }
    ]
  },
  {
    title: "关于",
    links: [
      { label: "帮助与常见问题", href: "/#faq" },
      { label: "iOS 版本", href: "https://apps.apple.com/" },
      { label: "服务条款", href: "/terms" },
      { label: "隐私政策", href: "/privacy" }
    ]
  }
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/6 py-16">
      <div className="container-page">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand" aria-hidden>
                <svg viewBox="0 0 24 24" className="size-4 text-white" fill="currentColor">
                  <path d="M12 13.4c-1.9 0-3.6 1.4-3.6 3.1 0 1.1.8 1.9 2 1.9.7 0 1.2-.2 1.6-.5.4.3.9.5 1.6.5 1.2 0 2-.8 2-1.9 0-1.7-1.7-3.1-3.6-3.1Z" />
                  <ellipse cx="6.6" cy="9.4" rx="1.9" ry="2.3" />
                  <ellipse cx="17.4" cy="9.4" rx="1.9" ry="2.3" />
                  <ellipse cx="9.7" cy="6.3" rx="1.7" ry="2.1" />
                  <ellipse cx="14.3" cy="6.3" rx="1.7" ry="2.1" />
                </svg>
              </span>
              <span className="text-nav font-medium text-white">AI Pet Studio</span>
            </div>
            <p className="mt-4 text-nav leading-6 text-white/50">
              一张宠物照片，生成图生图效果与图生视频短片。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:gap-16">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="text-nav font-medium text-ink-100">{column.title}</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-nav text-white/50 transition-colors duration-150 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/6 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-micro text-white/40">
            © {new Date().getFullYear()} AI Pet Studio. 保留所有权利。
          </p>
          <p className="text-micro text-white/40">
            积分与订阅由 Stripe 处理，生成由 Vidu 提供。
          </p>
        </div>
      </div>
    </footer>
  );
}
