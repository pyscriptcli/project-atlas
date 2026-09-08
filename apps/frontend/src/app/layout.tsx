import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Atlas | Geospatial Map Studio",
  description:
    "Next.js, Node.js, and Supabase powered geospatial map builder and trade area analysis studio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased overflow-hidden m-0 p-0 w-screen h-screen bg-[#0a1628] text-slate-100 selection:bg-sky-500/30">
        {children}
      </body>
    </html>
  );
}
