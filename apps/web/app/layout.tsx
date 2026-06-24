import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegisterPwa } from "./register-pwa";
import "./styles.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pay.xspin.mx"),
  applicationName: "Xspin Pay",
  title: "XSpin Pay",
  description: "Comienza tu ciclo de inversion, construye tu comunidad y haz crecer tu capital semana a semana.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Xspin Pay"
  },
  openGraph: {
    title: "XSpin Pay",
    description: "Comienza tu ciclo de inversion, construye tu comunidad y haz crecer tu capital semana a semana.",
    images: [
      {
        url: "/logos/xspin-official.png",
        width: 1024,
        height: 1024,
        alt: "XSpin"
      }
    ],
    siteName: "XSpin Pay",
    type: "website",
    url: "https://pay.xspin.mx"
  },
  twitter: {
    card: "summary_large_image",
    title: "XSpin Pay",
    description: "Comienza tu ciclo de inversion, construye tu comunidad y haz crecer tu capital semana a semana.",
    images: ["/logos/xspin-official.png"]
  },
  icons: {
    icon: [
      { url: "/logos/xspin-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logos/xspin-icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/logos/xspin-mark.svg", type: "image/svg+xml" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
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
