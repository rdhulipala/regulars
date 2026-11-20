import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Regulars — booking for solo trainers, cooks and nannies"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
