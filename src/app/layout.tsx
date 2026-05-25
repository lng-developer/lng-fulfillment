import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppToaster } from "@/components/ui/AppToaster";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fulfillment Platform v2",
  description: "Long-term multi-tenant fulfillment platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={inter.variable} lang="vi">
      <body suppressHydrationWarning>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
