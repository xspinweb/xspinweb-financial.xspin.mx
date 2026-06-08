import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegisterPwa } from "./register-pwa";
import "./styles.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  applicationName: "Xspin Pay",
  title: "Pay Financial",
  description: "Administracion de inversionistas, ciclos y pagos",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Xspin Pay"
  },
  icons: {
    icon: "/logos/xspin-mark.svg",
    apple: "/logos/xspin-mark.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#050b12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
        <RegisterPwa />
      </body>
    </html>
  );
}
