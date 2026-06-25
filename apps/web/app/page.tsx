import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type IconProps = { size?: number; className?: string; fill?: string };

function IconBase({ size = 24, className, fill = "none", children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ArrowRight({ size, className }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}

function BarChart3({ size, className }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15v-4" />
      <path d="M12 15V8" />
      <path d="M16 15v-9" />
      <path d="m16 6 3 3" />
    </IconBase>
  );
}

function Bell({ size, className }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
      <path d="M10 21h4" />
    </IconBase>
  );
}

function ShieldCheck({ size, className }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </IconBase>
  );
}

function Sparkles({ size, className }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M12 3 10 9l-6 2 6 2 2 6 2-6 6-2-6-2-2-6Z" />
    </IconBase>
  );
}

function Star({ size, className, fill }: IconProps) {
  return (
    <IconBase size={size} className={className} fill={fill}>
      <path d="m12 2 3 6 7 .9-5 4.8 1.2 6.8L12 17l-6.2 3.5L7 13.7 2 8.9 9 8l3-6Z" />
    </IconBase>
  );
}

function UserPlus({ size, className }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M15 19a6 6 0 0 0-12 0" />
      <circle cx="9" cy="8" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </IconBase>
  );
}

function Users({ size, className }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <path d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="8" r="4" />
      <path d="M22 19a4 4 0 0 0-4-4" />
      <path d="M6 15a4 4 0 0 0-4 4" />
    </IconBase>
  );
}

function WalletCards({ size, className }: IconProps) {
  return (
    <IconBase size={size} className={className}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M16 15h2" />
    </IconBase>
  );
}

const steps = [
  {
    icon: WalletCards,
    title: "1. Invierte",
    text: "Elige tu plan de inversion y empieza a hacer crecer tu patrimonio."
  },
  {
    icon: UserPlus,
    title: "2. Refiere",
    text: "Comparte tu enlace o codigo y gana recompensas por cada referido activo."
  },
  {
    icon: BarChart3,
    title: "3. Crece",
    text: "Reinvierte tus ganancias y multiplica tus ingresos semana tras semana."
  }
];

const metrics = [
  { icon: Users, value: "10K+", label: "Usuarios activos" },
  { icon: BarChart3, value: "$2M+", label: "Pagado en ganancias" },
  { icon: UserPlus, value: "25K+", label: "Referidos activos" },
  { icon: ShieldCheck, value: "99.9%", label: "Seguridad" }
];

export default function HomePage({ searchParams }: { searchParams?: { ref?: string } }) {
  const referralCode = typeof searchParams?.ref === "string" ? searchParams.ref : "";
  const loginHref = referralCode ? `/login?ref=${encodeURIComponent(referralCode)}` : "/login";

  return (
    <main className="landingPage">
      <header className="landingHeader">
        <Link className="landingBrand" href="/">
          <Image src="/logos/xspin-logo-full.png" alt="XSpin" width={236} height={79} priority />
        </Link>
        <nav className="landingNav" aria-label="Navegacion principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#beneficios">Beneficios</a>
          <a href="#testimonios">Testimonios</a>
          <a href="#preguntas">Preguntas</a>
        </nav>
        <Link className="landingLogin" href={loginHref}>
          Iniciar sesion
        </Link>
      </header>

      <section className="landingHero">
        <div className="landingHeroCopy">
          <span className="landingBadge">
            <Sparkles size={16} aria-hidden="true" />
            Plataforma segura y transparente
          </span>
          <h1>
            Invierte.
            <br />
            <span>Refiere.</span>
            <br />
            Crece.
          </h1>
          <p>
            XSpin es la plataforma que te permite hacer crecer tu patrimonio mediante
            inversiones inteligentes y recompensas por cada referido activo.
          </p>
          <div className="landingHeroActions">
            <Link className="landingPrimary" href={loginHref}>
              Comienza ahora <ArrowRight size={20} aria-hidden="true" />
            </Link>
          </div>
          <div className="landingSecurity">
            <ShieldCheck size={20} aria-hidden="true" />
            Seguridad de nivel bancario
          </div>
        </div>

        <div className="landingPhoneWrap" aria-label="Vista previa de la app XSpin">
          <div className="landingWave" aria-hidden="true" />
          <div className="landingPhone">
            <div className="phoneNotch" />
            <div className="phoneScreen">
              <div className="phoneTopbar">
                <Image src="/logos/xspin-logo-full.png" alt="" width={92} height={31} />
                <div className="phoneBell">
                  <Bell size={17} aria-hidden="true" />
                </div>
                <div className="phoneAvatar">X</div>
              </div>
              <p className="phoneGreeting">Hola, Novaseg</p>
              <h2>Tu patrimonio</h2>
              <p className="phoneSub">Resumen general de tu actividad</p>
              <div className="phoneBalance">
                <span>Patrimonio total</span>
                <strong>$12,540.00</strong>
                <small>+18.6% vs. mes anterior</small>
                <svg viewBox="0 0 190 82" aria-hidden="true">
                  <path d="M6 66 C28 44 42 58 60 36 C75 18 88 44 106 28 C124 12 137 34 152 18 C165 4 174 12 184 4" />
                </svg>
              </div>
              <div className="phoneStats">
                <div>
                  <Users size={18} />
                  <span>Referidos</span>
                  <strong>128</strong>
                </div>
                <div>
                  <BarChart3 size={18} />
                  <span>Ganancias</span>
                  <strong>$2,540</strong>
                </div>
                <div>
                  <WalletCards size={18} />
                  <span>Inversiones</span>
                  <strong>$10,000</strong>
                </div>
                <div>
                  <ShieldCheck size={18} />
                  <span>Retiros</span>
                  <strong>$1,200</strong>
                </div>
              </div>
              <div className="phoneActivity">
                <div>
                  <strong>Actividad reciente</strong>
                  <span>Ver todo</span>
                </div>
                <article>
                  <Users size={18} />
                  <p>
                    Nuevo referido
                    <small>Hace 2 horas</small>
                  </p>
                  <strong>+ $50.00</strong>
                </article>
                <article>
                  <ShieldCheck size={18} />
                  <p>
                    Ganancia por ciclo
                    <small>Hace 5 horas</small>
                  </p>
                  <strong>+ $120.00</strong>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landingHow" id="como-funciona">
        <h2>Como funciona</h2>
        <div className="landingSteps">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article className="landingStep" key={step.title}>
                <div className="landingStepIcon">
                  <Icon size={42} aria-hidden="true" />
                </div>
                {index < steps.length - 1 ? <span className="stepConnector" aria-hidden="true" /> : null}
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landingMetrics" id="beneficios" aria-label="Metricas de confianza">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label}>
              <Icon size={42} aria-hidden="true" />
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </article>
          );
        })}
      </section>

      <section className="landingCta">
        <div>
          <h2>
            Tu crecimiento
            <br />
            empieza <span>hoy.</span>
          </h2>
          <p>Unete a miles de personas que ya estan invirtiendo, refiriendo y creciendo con XSpin.</p>
          <div className="landingCtaActions">
            <Link className="landingPrimary" href={loginHref}>
              Comienza ahora <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a className="landingSecondary" href="#como-funciona">
              Mas informacion
            </a>
          </div>
        </div>
        <div className="landingCoinScene" aria-hidden="true">
          <div className="coinStack">
            <span />
            <span />
            <span />
          </div>
          <Image src="/logos/xspin-mark.svg" alt="" width={170} height={170} />
          <ArrowRight className="coinArrow" size={132} />
        </div>
      </section>

      <section className="landingTrust" id="testimonios">
        <p>Con la confianza de nuestra comunidad</p>
        <div className="trustRow">
          <div className="avatarStack" aria-hidden="true">
            {["AR", "JM", "LV", "RG", "MS"].map((initials) => (
              <span key={initials}>{initials}</span>
            ))}
            <strong>+10K</strong>
          </div>
          <div className="rating">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} size={20} fill="currentColor" aria-hidden="true" />
            ))}
            <strong>4.8/5</strong>
            <span>Basado en mas de 2,500 resenas</span>
          </div>
        </div>
      </section>
    </main>
  );
}
