import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "cjcrsg-flow",
  description: "Private Canva-to-Facebook content workflow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-heading font-semibold tracking-tight">
              cjcrsg-flow
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/templates"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Templates
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
