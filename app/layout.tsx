import type { Metadata } from "next";
import "@fontsource/public-sans/latin-400.css";
import "@fontsource/public-sans/latin-500.css";
import "@fontsource/public-sans/latin-600.css";
import "@fontsource/public-sans/latin-700.css";
import "@fontsource/public-sans/latin-800.css";
import "@fontsource/source-serif-4/latin-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "FireLens | Microgravity combustion evidence",
  description: "Explore source-linked evidence from NASA PSI and combustion research.",
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
