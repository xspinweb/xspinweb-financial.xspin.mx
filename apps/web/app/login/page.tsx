import Image from "next/image";
import { GoogleSignInButton } from "./sign-in-button";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const googleReady = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <main className="loginShell">
      <section className="loginPanel">
        <Image
          src="/logos/xspin-logo.svg"
          alt="Xspin"
          width={180}
          height={48}
          priority
        />
        <div>
          <span className="loginEyebrow">Acceso privado</span>
          <h1>Entra a la operacion financiera.</h1>
          <p>
            Usa tu cuenta de Google autorizada para acceder al panel interno de
            inversionistas, ciclos y pagos.
          </p>
        </div>
        <GoogleSignInButton enabled={googleReady} />
        {!googleReady ? (
          <p className="loginWarning">
            Falta configurar Google OAuth en el servidor.
          </p>
        ) : null}
      </section>
    </main>
  );
}
