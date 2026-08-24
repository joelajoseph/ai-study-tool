import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// next/font downloads Inter at build time and self-hosts it — no external
// request at runtime. The variable name is referenced in globals.css.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Study Planner",
  description: "Create a focused study plan from your course materials.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.variable} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
