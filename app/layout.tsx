import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Ownership Map",
  description:
    "Who owns and invests in the major AI companies — an interactive, source-linked map that is kept current as new deals are struck.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
