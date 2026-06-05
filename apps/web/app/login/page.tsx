import { getServerSession } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";
import { GoogleSignInButton } from "./sign-in-button";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

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
        <GoogleSignInButton />
      </section>
    </main>
  );
}
