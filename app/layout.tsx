import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaLea | 你的職場英文學習夥伴",
  description: "每天 10 分鐘，學會真正用得上的職場英文。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "LaLea | 你的職場英文學習夥伴",
    description: "每天 10 分鐘，學會真正用得上的職場英文。",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "LaLea 職場英文學習" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LaLea | 你的職場英文學習夥伴",
    description: "每天 10 分鐘，學會真正用得上的職場英文。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
