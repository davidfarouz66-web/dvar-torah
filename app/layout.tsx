import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Feuillet Communautaire",
  description: "Créez votre feuillet de Chabbat en quelques minutes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
