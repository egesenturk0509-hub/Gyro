import type { Metadata } from "next";
import "./globals.css"; // Eğer css dosyanın adı farklıysa burayı düzelt

export const metadata: Metadata = {
  title: "Gyro Analiz Paneli",
  description: "Ege Şentürk - Robotik Veri Analiz Sistemi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
<body suppressHydrationWarning>{children}</body>
    </html>
  );
}