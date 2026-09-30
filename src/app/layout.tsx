import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import "./globals.css";

// The reference design is set in Inter throughout.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "AI Pet Studio — 宠物图生图与图生视频模板",
    template: "%s | AI Pet Studio"
  },
  description:
    "上传一张宠物照片，套用模板即可生成图生图效果图和图生视频短片。图生图 10 积分、图生视频 50 积分。",
  openGraph: {
    type: "website",
    siteName: "AI Pet Studio",
    title: "AI Pet Studio — 宠物图生图与图生视频模板",
    description: "上传一张宠物照片，套用模板即可生成图生图效果图和图生视频短片。"
  },
  twitter: { card: "summary_large_image" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="min-h-dvh bg-black antialiased">
        <SessionProvider>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
