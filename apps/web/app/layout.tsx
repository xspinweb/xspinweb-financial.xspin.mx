import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Pay Financial",
  description: "Administracion de inversionistas, ciclos y pagos"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
