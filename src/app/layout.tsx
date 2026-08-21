import type { Metadata, Viewport } from "next";
import { AppNav } from "@/components/app-nav";
import "./globals.css";
import "./vocabulary.css";
import "./audio.css";
export const metadata: Metadata = { title: "LaLea｜職場英語", description: "利用零散時間練習真正用得上的職場英語" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f4ed" };
export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="zh-Hant"><body>{children}<AppNav/></body></html>; }
