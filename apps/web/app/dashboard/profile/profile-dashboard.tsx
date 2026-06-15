"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { PaymentSettingsDashboard } from "../wallet/wallet-dashboard";

type ProfileDashboardProps = {
  userEmail: string;
  userName: string;
};

type ProfileTab = "personal" | "security" | "identity" | "payment";

type ProfileForm = {
  address: string;
  birthDate: string;
  city: string;
  country: string;
  email: string;
  fullName: string;
  phone: string;
};

type SecurityInfo = {
  activity: Array<{
    description: string;
    id: string;
    label: string;
    occurredAt: string;
  }>;
  sessions: Array<{
    browser: string;
    device: string;
    email: string;
    id: string;
    lastActiveAt: string;
    status: string;
  }>;
  twoFactorEnabled: boolean;
};

type InvestorLevel = {
  completedCycles: number;
  current: {
    key: LevelKey;
    name: string;
    requirement: string;
  };
  next: {
    key: LevelKey;
    name: string;
    requirement: string;
  } | null;
  progressToNext: number;
  totalInvested: number;
  totalReferrals: number;
};

type LevelKey = "explorer" | "starter" | "builder" | "elite" | "legend";

type TwoFactorSetup = {
  otpauthUrl: string;
  secret: string;
  twoFactorEnabled: boolean;
};

export function ProfileDashboard({ userEmail, userName }: ProfileDashboardProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const [form, setForm] = useState<ProfileForm>({
    address: "",
    birthDate: "",
    city: "CDMX",
    country: "MX",
    email: userEmail,
    fullName: userName,
    phone: ""
  });
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [security, setSecurity] = useState<SecurityInfo>({
    activity: [],
    sessions: [],
    twoFactorEnabled: false
  });
  const [securityDetail, setSecurityDetail] = useState<"sessions" | "activity" | null>(null);
  const [securityStatus, setSecurityStatus] = useState("");
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [level, setLevel] = useState<InvestorLevel | null>(null);
  const [twoFactorModalMode, setTwoFactorModalMode] = useState<"setup" | "disable" | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadProfile() {
      const response = await fetch(`/api/investor/profile?email=${encodeURIComponent(userEmail)}`);

      if (!response.ok) {
        return;
      }

      const profile = (await response.json()) as ProfileForm;

      if (isCurrent) {
        setForm({
          address: profile.address ?? "",
          birthDate: profile.birthDate ?? "",
          city: profile.city || "CDMX",
          country: profile.country || "MX",
          email: profile.email || userEmail,
          fullName: profile.fullName || userName,
          phone: profile.phone ?? ""
        });
      }
    }

    void loadProfile();

    return () => {
      isCurrent = false;
    };
  }, [userEmail, userName]);

  useEffect(() => {
    let isCurrent = true;

    async function loadSecurity() {
      const response = await fetch(`/api/investor/security?email=${encodeURIComponent(userEmail)}`);

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as SecurityInfo;

      if (isCurrent) {
        setSecurity(data);
      }
    }

    void loadSecurity();

    return () => {
      isCurrent = false;
    };
  }, [userEmail]);

  useEffect(() => {
    let isCurrent = true;

    async function loadLevel() {
      const response = await fetch(`/api/investor/level?email=${encodeURIComponent(userEmail)}`);

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as InvestorLevel;

      if (isCurrent) {
        setLevel(data);
      }
    }

    void loadLevel();

    return () => {
      isCurrent = false;
    };
  }, [userEmail]);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setStatus("");
  }

  async function saveProfile() {
    setIsSaving(true);
    setStatus("");

    const response = await fetch("/api/investor/profile", {
      body: JSON.stringify(form),
      headers: {
        "Content-Type": "application/json"
      },
      method: "PUT"
    });

    if (!response.ok) {
      setStatus(await getResponseErrorMessage(response));
      setIsSaving(false);
      return;
    }

    const profile = (await response.json()) as ProfileForm;
    setForm({
      address: profile.address ?? "",
      birthDate: profile.birthDate ?? "",
      city: profile.city || "CDMX",
      country: profile.country || "MX",
      email: profile.email || userEmail,
      fullName: profile.fullName || userName,
      phone: profile.phone ?? ""
    });
    setStatus("Informacion guardada correctamente.");
    setIsSaving(false);
  }

  function updateSecurity(data: SecurityInfo, message: string) {
    setSecurity(data);
    setSecurityStatus(message);
    setTwoFactorModalMode(null);
  }

  return (
    <>
      {level ? <ProfileLevelCard level={level} /> : null}

      <nav className="profileTabs" aria-label="Secciones de perfil">
        <button className={activeTab === "personal" ? "active" : ""} type="button" onClick={() => setActiveTab("personal")}>
          Informacion personal
        </button>
        <button className={activeTab === "security" ? "active" : ""} type="button" onClick={() => setActiveTab("security")}>
          Seguridad
        </button>
        <button className={activeTab === "identity" ? "active" : ""} type="button" onClick={() => setActiveTab("identity")}>
          Verificacion de identidad
        </button>
        <button className={activeTab === "payment" ? "active" : ""} type="button" onClick={() => setActiveTab("payment")}>
          Configuracion de pago
        </button>
      </nav>

      {activeTab === "personal" && (
        <section className="profilePanel personalProfilePanel">
          <ProfileSectionHeader
            icon={<UserIcon />}
            title="Informacion personal"
            subtitle="Actualiza tus datos personales y de contacto."
            tone="green"
          />

          <div className="profileFormGrid">
            <ProfileField label="Nombre completo" value={form.fullName} onChange={(value) => updateField("fullName", value)} />
            <ProfileField label="Correo electronico" value={form.email} onChange={(value) => updateField("email", value)} readOnly />
            <label className="profileField">
              <span>Telefono</span>
              <div className="phoneFieldGroup">
                <button type="button">
                  <span>MX</span>
                  +52
                  <ChevronIcon />
                </button>
                <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="55 1234 5678" />
              </div>
            </label>
            <ProfileField label="Fecha de nacimiento" type="date" value={form.birthDate} onChange={(value) => updateField("birthDate", value)} icon={<CalendarIcon />} />
            <label className="profileField">
              <span>Pais</span>
              <select value={form.country} onChange={(event) => updateField("country", event.target.value)}>
                <option value="MX">Mexico</option>
              </select>
            </label>
            <label className="profileField">
              <span>Ciudad</span>
              <select value={form.city} onChange={(event) => updateField("city", event.target.value)}>
                <option value="CDMX">Ciudad de Mexico</option>
                <option value="GDL">Guadalajara</option>
                <option value="MTY">Monterrey</option>
              </select>
            </label>
            <ProfileField className="wide" label="Direccion (opcional)" value={form.address} onChange={(value) => updateField("address", value)} />
          </div>

          <div className="profileActions">
            <button type="button" onClick={saveProfile} disabled={isSaving}>
              {isSaving ? "Guardando" : "Guardar cambios"}
            </button>
          </div>
          {status ? <p className={status.includes("correctamente") ? "profileSaveStatus success" : "profileSaveStatus"}>{status}</p> : null}
        </section>
      )}

      {activeTab === "security" && (
        <section className="profilePanel">
          <ProfileSectionHeader
            icon={<ShieldIcon />}
            title="Seguridad de la cuenta"
            subtitle="Administra la proteccion de acceso y revisa la actividad de tu cuenta."
            tone="purple"
          />

          <div className="profileRows">
            <ProfileRow
              icon={<ShieldIcon />}
              title="Autenticacion en dos pasos (2FA)"
              subtitle={security.twoFactorEnabled ? "Tu cuenta esta protegida con una app de autenticacion." : "Configura Google Authenticator, Authy o una app compatible."}
              status={security.twoFactorEnabled ? "Activado" : "Pendiente"}
              statusTone={security.twoFactorEnabled ? "green" : "yellow"}
              action={security.twoFactorEnabled ? "Desactivar" : "Configurar"}
              onAction={() => setTwoFactorModalMode(security.twoFactorEnabled ? "disable" : "setup")}
              disabled={isSavingSecurity}
            />
            <ProfileRow
              icon={<DeviceIcon />}
              title="Sesiones activas"
              subtitle={`${security.sessions.length || 1} sesion activa detectada.`}
              action="Ver sesiones"
              onAction={() => setSecurityDetail(securityDetail === "sessions" ? null : "sessions")}
            />
            <ProfileRow
              icon={<ClockIcon />}
              title="Actividad reciente"
              subtitle="Revisa los ultimos movimientos de seguridad."
              action="Ver actividad"
              onAction={() => setSecurityDetail(securityDetail === "activity" ? null : "activity")}
            />
          </div>
          {securityStatus ? <p className={securityStatus.includes("correctamente") ? "profileSaveStatus success" : "profileSaveStatus"}>{securityStatus}</p> : null}
          {securityDetail === "sessions" ? <SecuritySessions sessions={security.sessions} /> : null}
          {securityDetail === "activity" ? <SecurityActivity activity={security.activity} /> : null}
          {twoFactorModalMode ? (
            <TwoFactorModal
              email={form.email || userEmail}
              mode={twoFactorModalMode}
              onClose={() => setTwoFactorModalMode(null)}
              onCompleted={updateSecurity}
            />
          ) : null}
        </section>
      )}

      {activeTab === "identity" && (
        <section className="profilePanel">
          <ProfileSectionHeader
            icon={<IdentityIcon />}
            title="Verificacion de identidad"
            subtitle="Verifica tu identidad para aumentar la seguridad de tu cuenta y habilitar todas las funciones."
            tone="green"
          />

          <div className="profileRows">
            <ProfileRow icon={<DocumentIcon />} title="Identificacion oficial" subtitle="INE, Pasaporte o Licencia de conducir" status="Verificado" action="Ver documento" />
            <ProfileRow icon={<ReceiptIcon />} title="Comprobante de domicilio" subtitle="Recibo de luz, agua, gas o estado de cuenta" status="Pendiente" statusTone="yellow" action="Subir documento" />
          </div>

          <button className="verifyDocumentsAction" type="button">
            <IdentityIcon />
            Verificar documentos
          </button>
        </section>
      )}

      {activeTab === "payment" && (
        <section className="profilePaymentSettings">
          <PaymentSettingsDashboard userEmail={form.email || userEmail} />
        </section>
      )}
    </>
  );
}

function ProfileSectionHeader({
  icon,
  subtitle,
  title,
  tone
}: {
  icon: ReactNode;
  subtitle: string;
  title: string;
  tone: "green" | "purple";
}) {
  return (
    <header className="profileSectionHeader">
      <span className={`profileSectionIcon ${tone}`}>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function ProfileField({
  className = "",
  icon,
  label,
  onChange,
  readOnly = false,
  type = "text",
  value
}: {
  className?: string;
  icon?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className={`profileField ${className}`}>
      <span>{label}</span>
      <div>
        {icon}
        <input readOnly={readOnly} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

function ProfileRow({
  action,
  disabled = false,
  icon,
  onAction,
  onSwitch,
  status,
  statusTone = "green",
  subtitle,
  switchActive = false,
  switchLabel,
  title
}: {
  action?: string;
  disabled?: boolean;
  icon: ReactNode;
  onAction?: () => void;
  onSwitch?: () => void;
  status?: string;
  statusTone?: "green" | "yellow";
  subtitle: string;
  switchActive?: boolean;
  switchLabel?: string;
  title: string;
}) {
  return (
    <article className="profileRow">
      <span className="profileRowIcon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </div>
      {status ? <em className={`profileStatus ${statusTone}`}>{status}</em> : null}
      {switchLabel ? (
        <button className={switchActive ? "profileSwitch active" : "profileSwitch"} type="button" onClick={onSwitch} disabled={disabled}>
          <i />
          {switchLabel}
        </button>
      ) : null}
      {action ? (
        <button type="button" onClick={onAction} disabled={disabled}>
          {action}
          <ChevronIcon />
        </button>
      ) : null}
    </article>
  );
}

function SecuritySessions({ sessions }: { sessions: SecurityInfo["sessions"] }) {
  return (
    <div className="profileDetailPanel">
      <h3>Sesiones activas</h3>
      {(sessions.length ? sessions : [{ browser: "Navegador actual", device: "Sesion web", email: "", id: "current", lastActiveAt: new Date().toISOString(), status: "Activa" }]).map((session) => (
        <article className="profileDetailRow" key={session.id}>
          <DeviceIcon />
          <div>
            <strong>{session.device}</strong>
            <span>{session.browser} - {session.status}</span>
          </div>
          <time>{formatProfileDateTime(session.lastActiveAt)}</time>
        </article>
      ))}
    </div>
  );
}

function SecurityActivity({ activity }: { activity: SecurityInfo["activity"] }) {
  return (
    <div className="profileDetailPanel">
      <h3>Actividad reciente</h3>
      {(activity.length ? activity : []).map((event) => (
        <article className="profileDetailRow" key={event.id}>
          <ClockIcon />
          <div>
            <strong>{event.label}</strong>
            <span>{event.description}</span>
          </div>
          <time>{formatProfileDateTime(event.occurredAt)}</time>
        </article>
      ))}
    </div>
  );
}

function TwoFactorModal({
  email,
  mode,
  onClose,
  onCompleted
}: {
  email: string;
  mode: "setup" | "disable";
  onClose: () => void;
  onCompleted: (security: SecurityInfo, message: string) => void;
}) {
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const isSetup = mode === "setup";

  useEffect(() => {
    if (!isSetup) {
      return;
    }

    let isCurrent = true;

    async function loadSetup() {
      const response = await fetch("/api/investor/security/2fa/setup", {
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });

      if (!response.ok) {
        setError(await getResponseErrorMessage(response));
        return;
      }

      const data = (await response.json()) as TwoFactorSetup;

      if (isCurrent) {
        setSetup(data);
      }
    }

    void loadSetup();

    return () => {
      isCurrent = false;
    };
  }, [email, isSetup]);

  useEffect(() => {
    if (!setup?.otpauthUrl) {
      setQrDataUrl("");
      return;
    }

    let isCurrent = true;

    QRCode.toDataURL(setup.otpauthUrl, {
      color: {
        dark: "#04101b",
        light: "#ffffff"
      },
      margin: 1,
      width: 260
    }).then((dataUrl) => {
      if (isCurrent) {
        setQrDataUrl(dataUrl);
      }
    }).catch(() => {
      if (isCurrent) {
        setQrDataUrl("");
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [setup?.otpauthUrl]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentSecond = Math.floor(Date.now() / 1000);
      const remaining = 30 - (currentSecond % 30);
      setSecondsLeft(remaining === 30 ? 30 : remaining);
    }, 500);

    return () => window.clearInterval(interval);
  }, []);

  async function copySecret() {
    if (!setup?.secret) return;
    await navigator.clipboard?.writeText(setup.secret).catch(() => undefined);
  }

  async function submit() {
    if (!/^\d{6}$/.test(code)) {
      setError("Ingresa el codigo de 6 digitos de tu app.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const response = await fetch(isSetup ? "/api/investor/security/2fa/verify" : "/api/investor/security/2fa/disable", {
      body: JSON.stringify({
        code,
        email,
        secret: setup?.secret
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });

    if (!response.ok) {
      setError(await getResponseErrorMessage(response));
      setIsSubmitting(false);
      return;
    }

    const security = (await response.json()) as SecurityInfo;
    onCompleted(security, isSetup ? "2FA activado correctamente." : "2FA desactivado correctamente.");
  }

  return (
    <div className="modalOverlay walletModalOverlay twoFactorOverlay" role="presentation">
      <section className="investmentModal twoFactorModal" role="dialog" aria-modal="true" aria-labelledby="two-factor-title">
        <div className="twoFactorHeader">
          <div className="twoFactorBadge">
            <ShieldIcon />
            <span>Seguridad 2FA</span>
          </div>
          <button className="modalClose" type="button" aria-label="Cerrar" onClick={onClose}>
            x
          </button>
        </div>

        <div className="twoFactorHero">
          <h2 id="two-factor-title">
            {isSetup ? <>Configurar <span>autenticador</span></> : <>Desactivar <span>autenticador</span></>}
          </h2>
          <p>
            {isSetup
              ? "Agrega esta clave en Google Authenticator, Authy, Microsoft Authenticator o cualquier app TOTP."
              : "Ingresa un codigo vigente de tu app de autenticacion para desactivar esta capa de seguridad."}
          </p>
        </div>

        {isSetup ? (
          <section className="twoFactorStep">
            <div className="twoFactorStepTitle">
              <b>1</b>
              <div>
                <strong>Escanea el codigo QR con tu app</strong>
                <span>O ingresa la clave manualmente si tu app lo permite.</span>
              </div>
            </div>
            <div className="twoFactorQrGrid">
              <div className="twoFactorQrFrame">
                {qrDataUrl ? <img src={qrDataUrl} alt="Codigo QR para configurar 2FA" /> : <span>QR</span>}
                <img className="twoFactorQrLogo" src="/logos/xspin-mark.svg" alt="" aria-hidden="true" />
              </div>
              <span className="twoFactorDivider">o</span>
              <div className="twoFactorSecretPanel">
                <span>Clave secreta</span>
                <button type="button" onClick={copySecret} disabled={!setup?.secret}>
                  <code>{setup?.secret ?? "Generando clave..."}</code>
                  <CopyIcon />
                </button>
                <p><InfoIcon /> Copia esta clave y guardala en un lugar seguro. La necesitaras si cambias de dispositivo.</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="twoFactorStep twoFactorDisableStep">
            <div className="twoFactorStepTitle">
              <b>1</b>
              <div>
                <strong>Confirma tu codigo actual</strong>
                <span>Usaremos este codigo para validar que eres tu.</span>
              </div>
            </div>
          </section>
        )}

        <section className="twoFactorStep">
          <div className="twoFactorStepTitle">
            <b>2</b>
            <div>
              <strong>Ingresa el codigo de 6 digitos</strong>
              <span>Escribe el codigo que muestra tu app para verificar que todo esta configurado correctamente.</span>
            </div>
          </div>
          <label className="twoFactorOtpField" onClick={() => codeInputRef.current?.focus()}>
            <span>Codigo de 6 digitos</span>
            <input
              ref={codeInputRef}
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-label="Codigo de 6 digitos"
            />
            <div aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <i key={`two-factor-digit-${index}`}>{code[index] ? "•" : ""}</i>
              ))}
            </div>
          </label>
          <div className="twoFactorTimerRow">
            <p><ShieldCheckIcon /> Este codigo cambia cada 30 segundos y es unico.<br /><span>Manten tu cuenta protegida.</span></p>
            <div className="twoFactorTimer" style={{ "--timer-progress": `${(secondsLeft / 30) * 100}%` } as CSSProperties}>
              <span>{secondsLeft}</span>
            </div>
          </div>
        </section>

        {error ? <p className="modalError">{error}</p> : null}

        <div className="twoFactorActions">
          <button className="secondaryModalAction" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button className="primaryModalAction" type="button" onClick={submit} disabled={isSubmitting || (isSetup && !setup)}>
            <ShieldCheckIcon />
            {isSubmitting ? "Verificando" : isSetup ? "Activar 2FA" : "Desactivar 2FA"}
          </button>
        </div>
        <p className="twoFactorFooter"><LockIcon /> La autenticacion en dos pasos anade una capa extra de seguridad para proteger tu cuenta.</p>
      </section>
    </div>
  );
}

function ProfileLevelCard({ level }: { level: InvestorLevel }) {
  return (
    <section className={`profileLevelCard level-${level.current.key}`}>
      <LevelBadgeIcon levelKey={level.current.key} />
      <div className="profileLevelInfo">
        <span>Tu nivel actual</span>
        <strong>{level.current.name}</strong>
        <div className="profileStars" aria-hidden="true">
          {Array.from({ length: getLevelStars(level.current.key) }, (_, index) => (
            <i key={`profile-star-${index}`}>*</i>
          ))}
        </div>
        <p>{level.current.requirement}</p>
        <dl>
          <div>
            <dt>Miembro desde</dt>
            <dd>Jun 2026</dd>
          </div>
          <div>
            <dt>Ciclos completados</dt>
            <dd>{level.completedCycles}</dd>
          </div>
          <div>
            <dt>Inversion total</dt>
            <dd>{formatCurrency(level.totalInvested)}</dd>
          </div>
          <div>
            <dt>Referidos totales</dt>
            <dd>{level.totalReferrals}</dd>
          </div>
        </dl>
      </div>
      <div className="profileNextLevel">
        <TrophyIcon />
        <span>Proximo nivel</span>
        <strong>{level.next ? level.next.name : "Maximo alcanzado"}</strong>
      </div>
    </section>
  );
}

async function getResponseErrorMessage(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? "No se pudo guardar la informacion.";
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(amount);
}

function getLevelStars(levelKey: LevelKey) {
  return {
    builder: 3,
    elite: 4,
    explorer: 1,
    legend: 5,
    starter: 2
  }[levelKey];
}

function LevelBadgeIcon({ levelKey }: { levelKey: LevelKey }) {
  return (
    <div className={`levelBadgeIcon level-${levelKey}`}>
      <img src={`/badges/${levelKey}.png`} alt={`Insignia ${levelKey}`} />
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h10v3h3v2a6 6 0 0 1-5.3 6 5 5 0 0 1-1.7 1.4V18h4v2H7v-2h4v-2.6A5 5 0 0 1 9.3 14 6 6 0 0 1 4 8V6h3Zm10 5V5H7v3a5 5 0 0 0 10 0Zm2 .1V8h-2a7 7 0 0 1-.5 2.5A4 4 0 0 0 19 8.1ZM7.5 10.5A7 7 0 0 1 7 8H5a4 4 0 0 0 2.5 2.5Z" />
    </svg>
  );
}

function formatProfileDateTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5 20 6v5.7c0 5-3.2 8.6-8 10-4.8-1.4-8-5-8-10V6Zm0 2.2L6 7.3v4.4c0 3.7 2.2 6.5 6 7.8 3.8-1.3 6-4.1 6-7.8V7.3Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10V7a5 5 0 0 1 10 0v3h1.2c.7 0 1.3.6 1.3 1.3v8.2c0 .7-.6 1.3-1.3 1.3H5.8c-.7 0-1.3-.6-1.3-1.3v-8.2c0-.7.6-1.3 1.3-1.3Zm2 0h6V7a3 3 0 0 0-6 0Z" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5 20 6v5.7c0 5-3.2 8.6-8 10-4.8-1.4-8-5-8-10V6Zm0 2.2L6 7.3v4.4c0 3.7 2.2 6.5 6 7.8 3.8-1.3 6-4.1 6-7.8V7.3Zm-1 9.5 4.8-5 1.4 1.4-6.2 6.5-3.7-3.7 1.4-1.4Z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 7h10c.8 0 1.5.7 1.5 1.5v10c0 .8-.7 1.5-1.5 1.5H8c-.8 0-1.5-.7-1.5-1.5v-10C6.5 7.7 7.2 7 8 7Zm1.5 2v9h8V9ZM4.5 4h10v2h-8v8h-2Z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 10h2v8h-2Zm0-4h2v2h-2Zm1-4a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v11H4Zm2 2v7h12V7Zm2 11h8v2H8Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5v5.2l4 2.4-1 1.7-5-3V7Z" />
    </svg>
  );
}

function IdentityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h16v16H4Zm2 2v12h12V6Zm3 3h6v2H9Zm0 4h3v2H9Z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 2h8l4 4v16H6Zm7 1.5V7h3.5ZM8 10h8v2H8Zm0 4h8v2H8Z" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2Zm3 6h6V6H9Zm0 4h6v-2H9Zm0 4h4v-2H9Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2h2v3h6V2h2v3h3v16H4V5h3Zm11 8H6v9h12Z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9.3 5.3 6.7 6.7-6.7 6.7-1.4-1.4 5.3-5.3-5.3-5.3Z" />
    </svg>
  );
}
