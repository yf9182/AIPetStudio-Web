"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { cn, formatCredits } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "模板" },
  { href: "/tasks", label: "我的作品" },
  { href: "/points", label: "积分" },
  { href: "/pricing", label: "定价" }
];

/**
 * Sticky 72px header, matching the reference navigation: logo at the left,
 * 28px-gapped links centred, and a 32px pill CTA at the right.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { status } = useSession();
  const [balanceState, setBalance] = useState<number | null>(null);
  const [menuState, setMenuState] = useState<{ open: boolean; path: string }>({
    open: false,
    path: pathname
  });

  // Derived rather than stored: signing out hides the pill without an effect,
  // and navigating closes the mobile menu by comparing the stored path during
  // render (the React-recommended alternative to a reset effect).
  const balance = status === "authenticated" ? balanceState : null;
  const menuOpen = menuState.open && menuState.path === pathname;

  const closeMenu = useCallback(() => setMenuState({ open: false, path: pathname }), [pathname]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/wallet", { cache: "no-store" });
        if (!response.ok) return;
        const body = (await response.json()) as { balance?: number };
        if (!cancelled) setBalance(typeof body.balance === "number" ? body.balance : null);
      } catch {
        /* the pill is advisory */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/6 bg-black/80 backdrop-blur-xl">
      <div className="container-page flex h-18 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 text-nav font-medium text-white">
          <LogoMark />
          <span className="tracking-[-0.2px]">AI Pet Studio</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="主导航">
          {NAV_LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-nav tracking-[-0.1px] transition-colors duration-150",
                  active ? "text-white" : "text-ink-50/70 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          {status === "authenticated" && balance !== null ? (
            <Link
              href="/points"
              className="hidden items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-micro font-medium text-ink-100 transition-colors hover:bg-white/14 sm:inline-flex"
            >
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              {formatCredits(balance)} 积分
            </Link>
          ) : null}

          {status === "authenticated" ? (
            <div className="hidden items-center gap-4 md:flex">
              <Link
                href="/account"
                className="text-nav text-ink-50/70 transition-colors hover:text-white"
              >
                账号
              </Link>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="text-nav text-ink-50/70 transition-colors hover:text-white"
              >
                退出
              </button>
            </div>
          ) : (
            <Link href="/login" className="hidden text-nav text-ink-50/70 transition-colors hover:text-white md:block">
              登录
            </Link>
          )}

          <ButtonLink href="/#templates" size="sm" className="hidden md:inline-flex">
            开始创作
          </ButtonLink>

          <button
            type="button"
            aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
            aria-expanded={menuOpen}
            onClick={() => setMenuState({ open: !menuOpen, path: pathname })}
            className="flex size-9 items-center justify-center rounded-full border border-white/15 text-white md:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-white/6 bg-black md:hidden">
          <div className="container-page flex flex-col py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="py-3 text-base text-ink-100 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            {status === "authenticated" ? (
              <>
                <Link href="/account" onClick={closeMenu} className="py-3 text-base text-ink-100">
                  账号
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className="py-3 text-left text-base text-ink-100"
                >
                  退出
                </button>
              </>
            ) : (
              <Link href="/login" onClick={closeMenu} className="py-3 text-base text-ink-100">
                登录
              </Link>
            )}
            <ButtonLink href="/#templates" size="lg" className="my-3" onClick={closeMenu}>
              开始创作
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function LogoMark() {
  return (
    <span className="flex size-7 items-center justify-center rounded-full bg-brand" aria-hidden>
      <svg viewBox="0 0 24 24" className="size-4 text-white" fill="currentColor">
        <path d="M12 13.4c-1.9 0-3.6 1.4-3.6 3.1 0 1.1.8 1.9 2 1.9.7 0 1.2-.2 1.6-.5.4.3.9.5 1.6.5 1.2 0 2-.8 2-1.9 0-1.7-1.7-3.1-3.6-3.1Z" />
        <ellipse cx="6.6" cy="9.4" rx="1.9" ry="2.3" />
        <ellipse cx="17.4" cy="9.4" rx="1.9" ry="2.3" />
        <ellipse cx="9.7" cy="6.3" rx="1.7" ry="2.1" />
        <ellipse cx="14.3" cy="6.3" rx="1.7" ry="2.1" />
      </svg>
    </span>
  );
}
