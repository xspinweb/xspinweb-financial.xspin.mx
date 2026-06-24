import type { Metadata } from "next";
import Image from "next/image";

const shareDescription =
  "🚀 Te invito a formar parte de XSPIN. Comienza tu ciclo de inversión, construye tu comunidad y haz crecer tu capital cada semana.";

export const metadata: Metadata = {
  title: "Únete a XSPIN",
  description: shareDescription,
  openGraph: {
    title: "Unete a XSPIN",
    description: shareDescription,
    images: [
      {
        url: "/logos/xspin-official.png",
        width: 1024,
        height: 1024,
        alt: "XSPIN"
      }
    ],
    siteName: "XSPIN Pay",
    type: "website",
    url: "https://pay.xspin.mx/register"
  },
  twitter: {
    card: "summary_large_image",
    title: "Únete a XSPIN",
    description: shareDescription,
    images: ["/logos/xspin-official.png"]
  }
};

export default function RegisterPage({ searchParams }: { searchParams?: { ref?: string } }) {
  const referralCode = typeof searchParams?.ref === "string" ? searchParams.ref : "";
  const loginHref = referralCode ? `/login?ref=${encodeURIComponent(referralCode)}` : "/login";

  return (
    <main className="loginShell">
      <section className="loginPanel">
        <Image src="/logos/xspin-official.png" alt="XSPIN" width={220} height={220} priority />
        <div>
          <span className="loginEyebrow">Invitación XSPIN</span>
          <h1>Forma parte de XSPIN.</h1>
          <p>Comienza tu ciclo de inversión, construye tu comunidad y haz crecer tu capital cada semana.</p>
        </div>
        <a className="headerAccess registerAccessButton" href={loginHref}>
          Continuar registro
        </a>
      </section>
    </main>
  );
}
