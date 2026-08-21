import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import "./vocabulary.css";
export const metadata: Metadata = { title: "LaLea｜職場英語", description: "利用零散時間練習真正用得上的職場英語" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f4ed" };
export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="zh-Hant"><body>{children}<nav className="app-nav" aria-label="主要導覽"><Link href="/">首頁</Link><Link href="/review">複習</Link><Link href="/vocabulary">詞彙庫</Link></nav></body></html>; }
