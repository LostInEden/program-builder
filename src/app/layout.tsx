import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TopNav from "@/components/TopNav";
import BottomTabs from "@/components/BottomTabs";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CounterScheme",
  description: "Your team. Your scheme. Smarter game plans.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased stadium-bg min-h-screen`}>
        <TopNav />
        <div className="flex min-h-[calc(100vh-61px)]">
          <main className="flex-1 min-w-0 overflow-x-hidden pb-16 min-[900px]:pb-0">{children}</main>
        </div>
        <BottomTabs />
      </body>
    </html>
  );
}
