import Image from "next/image";
import Link from "next/link";
import { GoogleSignInButton } from "./sign-in-button";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams?: { ref?: string } }) {
  const googleReady = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const referralCode = typeof searchParams?.ref === "string" ? searchParams.ref : "";
  const callbackUrl = referralCode ? `/dashboard?ref=${encodeURIComponent(referralCode)}` : "/dashboard";

  return (
    <main className="loginShell">
      <section className="loginPanel">
        <Image
          className="loginLogo"
          src="/logos/xspin-logo-full.png"
          alt="XSpin"
          width={410}
          height={138}
          priority
        />
        <div className="loginCopy">
          <h1>Inicia sesion</h1>
          <p>Accede a tu cuenta para continuar</p>
        </div>
        <GoogleSignInButton callbackUrl={callbackUrl} enabled={googleReady} />
        {!googleReady ? (
          <p className="loginWarning">
            Falta configurar Google OAuth en el servidor.
          </p>
        ) : null}
        <p className="loginLegal">
          Al continuar, aceptas nuestros{" "}
          <Link href="/terminos-y-condiciones">Terminos y Condiciones</Link>
          <br />
          y nuestra <Link href="/politica-de-privacidad">Politica de Privacidad.</Link>
        </p>
      </section>
    </main>
  );
}
