import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hood Score — Singapore Livability Rankings",
  description:
    "A data-driven livability score for every planning area in Singapore. Compare transit, food, schools, green space, safety, and affordability across 55 areas.",
  openGraph: {
    title: "Hood Score — Singapore Livability Rankings",
    description:
      "A data-driven livability score for every planning area in Singapore.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}