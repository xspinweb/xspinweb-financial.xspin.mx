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

type IdentityVerification = {
  backImage: string;
  frontImage: string;
  proofOfAddressFile: string;
  proofOfAddressFileName: string;
  proofOfAddressMimeType: string;
  proofOfAddressStatus: "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED";
  proofOfAddressSubmittedAt: string;
  selfieImage: string;
  selfieStatus: "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED";
  selfieSubmittedAt: string;
  status: "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED";
  submittedAt: string;
  updatedAt: string;
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
  const [identity, setIdentity] = useState<IdentityVerification>({
    backImage: "",
    frontImage: "",
    proofOfAddressFile: "",
    proofOfAddressFileName: "",
    proofOfAddressMimeType: "",
    proofOfAddressStatus: "PENDING",
    proofOfAddressSubmittedAt: "",
    selfieImage: "",
    selfieStatus: "PENDING",
    selfieSubmittedAt: "",
    status: "PENDING",
    submittedAt: "",
    updatedAt: ""
  });
  const [identityModalMode, setIdentityModalMode] = useState<"id" | "selfie" | null>(null);
  const [identityStatus, setIdentityStatus] = useState("");
  const [isIdentityLoading, setIsIdentityLoading] = useState(true);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [proofUploadProgress, setProofUploadProgress] = useState(0);
  const proofInputRef = useRef<HTMLInputElement | null>(null);

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
    setIsIdentityLoading(true);

    async function loadIdentity() {
      try {
        const response = await fetch(`/api/investor/identity?email=${encodeURIComponent(userEmail)}`);

        if (!response.ok) {
          if (isCurrent) {
            setIsIdentityLoading(false);
          }
          return;
        }

        const data = (await response.json()) as IdentityVerification;

        if (isCurrent) {
          setIdentity(data);
          setIsIdentityLoading(false);
        }
      } catch {
        if (isCurrent) {
          setIsIdentityLoading(false);
        }
      }
    }

    void loadIdentity();
    const interval = window.setInterval(loadIdentity, 5000);

    return () => {
      isCurrent = false;
      window.clearInterval(interval);
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

  async function uploadProofOfAddress(file?: File) {
    if (!file) return;
    setIdentityStatus("");

    if (file.size > 25 * 1024 * 1024) {
      setIdentityStatus("El comprobante no puede pesar mas de 25 MB.");
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setIdentityStatus("Selecciona un PDF o imagen valida.");
      return;
    }

    let stopProgress: (() => void) | null = null;
    let uploadTimeout: number | null = null;
    let success = false;
    setIsUploadingProof(true);
    setProofUploadProgress(8);

    try {
      const proofFile = await prepareProofOfAddressUpload(file);
      stopProgress = startUploadProgress(setProofUploadProgress);
      const controller = new AbortController();
      uploadTimeout = window.setTimeout(() => controller.abort(), 60_000);
      const response = await fetch("/api/investor/identity", {
        body: JSON.stringify({
          email: form.email || userEmail,
          proofOfAddress: {
            dataUrl: proofFile.dataUrl,
            fileName: proofFile.fileName,
            mimeType: proofFile.mimeType,
            size: proofFile.size
          }
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: controller.signal
      });
      window.clearTimeout(uploadTimeout);
      uploadTimeout = null;

      if (!response.ok) {
        setIdentityStatus(await getResponseErrorMessage(response));
        return;
      }

      const data = (await response.json()) as IdentityVerification;
      success = true;
      setProofUploadProgress(100);
      setIdentity(data);
      setIdentityStatus("Comprobante enviado a validacion.");
      window.setTimeout(() => setProofUploadProgress(0), 900);
    } catch (error) {
      setIdentityStatus(error instanceof DOMException && error.name === "AbortError"
        ? "La subida tardo demasiado. Intenta con una imagen mas ligera o vuelve a intentarlo."
        : error instanceof Error
          ? error.message
          : "No se pudo subir el comprobante. Intenta nuevamente.");
    } finally {
      stopProgress?.();
      if (uploadTimeout) {
        window.clearTimeout(uploadTimeout);
      }
      setIsUploadingProof(false);
      if (!success) {
        setProofUploadProgress(0);
      }
    }
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
            <ProfileRow
              icon={<DocumentIcon />}
              title="Identificacion oficial"
              subtitle=""
              status={getIdentityStatusLabel(identity.status, isIdentityLoading)}
              statusMark={getIdentityStatusMark(identity.status)}
              statusTone={getIdentityStatusTone(identity.status, isIdentityLoading)}
              action={!isIdentityLoading && (identity.status === "PENDING" || identity.status === "REJECTED") ? "Capturar" : undefined}
              actionIcon={<CameraIcon />}
              actionTone={identity.status === "REJECTED" ? "orange" : "purple"}
              disabled={isIdentityLoading}
              onAction={() => setIdentityModalMode("id")}
            />
            <ProfileRow
              icon={<UserCheckIcon />}
              title="Selfie"
              subtitle=""
              status={getIdentityStatusLabel(identity.selfieStatus, isIdentityLoading)}
              statusMark={getIdentityStatusMark(identity.selfieStatus)}
              statusTone={getIdentityStatusTone(identity.selfieStatus, isIdentityLoading)}
              action={!isIdentityLoading && (identity.selfieStatus === "PENDING" || identity.selfieStatus === "REJECTED") ? "Capturar" : undefined}
              actionIcon={<CameraIcon />}
              actionTone={identity.selfieStatus === "REJECTED" ? "orange" : "purple"}
              disabled={isIdentityLoading}
              onAction={() => setIdentityModalMode("selfie")}
            />
            <ProfileRow
              icon={<ReceiptIcon />}
              title="Comprobante de domicilio"
              subtitle=""
              status={getIdentityStatusLabel(identity.proofOfAddressStatus, isIdentityLoading)}
              statusMark={getIdentityStatusMark(identity.proofOfAddressStatus)}
              statusTone={getIdentityStatusTone(identity.proofOfAddressStatus, isIdentityLoading)}
              action={!isIdentityLoading && (identity.proofOfAddressStatus === "PENDING" || identity.proofOfAddressStatus === "REJECTED") ? isUploadingProof ? "Subiendo" : "Subir" : undefined}
              actionTone={identity.proofOfAddressStatus === "REJECTED" ? "orange" : "yellow"}
              disabled={isIdentityLoading || isUploadingProof}
              onAction={() => proofInputRef.current?.click()}
            />
          </div>
          <input
            ref={proofInputRef}
            className="identityHiddenFileInput"
            type="file"
            accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
            onChange={(event) => {
              void uploadProofOfAddress(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          {identityStatus ? <p className={identityStatus.includes("validacion") ? "profileSaveStatus success" : "profileSaveStatus"}>{identityStatus}</p> : null}
          {isUploadingProof || proofUploadProgress > 0 ? (
            <UploadProgress progress={proofUploadProgress} label={isUploadingProof ? "Subiendo comprobante" : "Comprobante enviado"} />
          ) : null}
          {identityModalMode ? (
            <IdentityVerificationModal
              email={form.email || userEmail}
              identity={identity}
              mode={identityModalMode}
              onClose={() => setIdentityModalMode(null)}
              onSaved={setIdentity}
            />
          ) : null}
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

function getIdentityStatusLabel(status: IdentityVerification["status"], isLoading: boolean): string | undefined {
  if (isLoading) return "Cargando";
  if (status === "SUBMITTED") return "Validacion";
  return undefined;
}

function getIdentityStatusTone(status: IdentityVerification["status"], isLoading: boolean): "green" | "orange" | "purple" | "red" | "yellow" {
  if (isLoading) return "purple";
  if (status === "SUBMITTED") return "orange";
  if (status === "VERIFIED") return "green";
  if (status === "REJECTED") return "red";
  return "yellow";
}

function getIdentityStatusMark(status: IdentityVerification["status"]) {
  if (status === "VERIFIED") return "/verificacion.png";
  if (status === "REJECTED") return "/rechazado.png";
  return undefined;
}

function ProfileRow({
  action,
  actionIcon,
  actionTone = "purple",
  disabled = false,
  icon,
  onAction,
  onSwitch,
  status,
  statusMark,
  statusTone = "green",
  subtitle,
  switchActive = false,
  switchLabel,
  title
}: {
  action?: string;
  actionIcon?: ReactNode;
  actionTone?: "green" | "orange" | "purple" | "yellow";
  disabled?: boolean;
  icon: ReactNode;
  onAction?: () => void;
  onSwitch?: () => void;
  status?: string;
  statusMark?: string;
  statusTone?: "green" | "orange" | "purple" | "red" | "yellow";
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
        {subtitle ? <small>{subtitle}</small> : null}
      </div>
      {status || statusMark ? (
        <em className={`profileStatus ${statusTone} ${statusMark && !status ? "markOnly" : ""}`}>
          {statusMark ? <img className="profileStatusMark" src={statusMark} alt="" /> : null}
          {status ? <span>{status}</span> : null}
        </em>
      ) : null}
      {switchLabel ? (
        <button className={switchActive ? "profileSwitch active" : "profileSwitch"} type="button" onClick={onSwitch} disabled={disabled}>
          <i />
          {switchLabel}
        </button>
      ) : null}
      {action ? (
        <button className={`profileActionButton ${actionTone}`} type="button" onClick={onAction} disabled={disabled}>
          {actionIcon}
          {action}
          {actionIcon ? null : <ChevronIcon />}
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
  const [setupStep, setSetupStep] = useState<"scan" | "code">("scan");
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

  function goToCodeStep() {
    setError("");
    setSetupStep("code");
    window.setTimeout(() => codeInputRef.current?.focus(), 80);
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

        {!isSetup ? (
          <div className="twoFactorHero">
            <h2 id="two-factor-title">Desactivar <span>autenticador</span></h2>
            <p>Ingresa un codigo vigente de tu app de autenticacion para desactivar esta capa de seguridad.</p>
          </div>
        ) : null}

        {isSetup && setupStep === "scan" ? (
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
              </div>
            </div>
          </section>
        ) : null}

        {!isSetup ? (
          <section className="twoFactorStep twoFactorDisableStep">
            <div className="twoFactorStepTitle">
              <b>1</b>
              <div>
                <strong>Confirma tu codigo actual</strong>
                <span>Usaremos este codigo para validar que eres tu.</span>
              </div>
            </div>
          </section>
        ) : null}

        {(!isSetup || setupStep === "code") ? <section className="twoFactorStep">
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
                <i key={`two-factor-digit-${index}`}>{code[index] ? "*" : ""}</i>
              ))}
            </div>
          </label>
          <div className="twoFactorTimerRow">
            <p><ShieldCheckIcon /> Este codigo cambia cada 30 segundos y es unico.<br /><span>Manten tu cuenta protegida.</span></p>
            <div className="twoFactorTimer" style={{ "--timer-progress": `${(secondsLeft / 30) * 100}%` } as CSSProperties}>
              <span>{secondsLeft}</span>
            </div>
          </div>
        </section> : null}

        {error ? <p className="modalError">{error}</p> : null}

        <div className="twoFactorActions">
          <button className="secondaryModalAction" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          {isSetup && setupStep === "scan" ? (
            <button className="primaryModalAction" type="button" onClick={goToCodeStep} disabled={!setup}>
              Siguiente
            </button>
          ) : (
            <button className="primaryModalAction" type="button" onClick={submit} disabled={isSubmitting || (isSetup && !setup)}>
              <ShieldCheckIcon />
              {isSubmitting ? "Verificando" : isSetup ? "Activar" : "Desactivar 2FA"}
            </button>
          )}
        </div>
        <p className="twoFactorFooter"><LockIcon /> La autenticacion en dos pasos anade una capa extra de seguridad para proteger tu cuenta.</p>
      </section>
    </div>
  );
}

function IdentityVerificationModal({
  email,
  identity,
  mode,
  onClose,
  onSaved
}: {
  email: string;
  identity: IdentityVerification;
  mode: "id" | "selfie";
  onClose: () => void;
  onSaved: (identity: IdentityVerification) => void;
}) {
  const [view, setView] = useState<"intro" | "capture" | "done">(mode === "selfie" ? "capture" : "intro");
  const [side, setSide] = useState<"front" | "back" | "selfie">(mode === "selfie" ? "selfie" : identity.frontImage && !identity.backImage ? "back" : "front");
  const [frontImage, setFrontImage] = useState(identity.frontImage);
  const [backImage, setBackImage] = useState(identity.backImage);
  const [selfieImage, setSelfieImage] = useState(identity.selfieImage);
  const [cameraError, setCameraError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (view !== "capture") {
      stopIdentityCamera(streamRef.current);
      streamRef.current = null;
      return;
    }

    let isCurrent = true;

    async function startCamera() {
      setCameraError("");
      stopIdentityCamera(streamRef.current);
      streamRef.current = null;

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Tu navegador no permitio abrir la camara. Puedes usar galeria.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: side === "selfie" ? "user" : "environment" },
            height: { ideal: 900 },
            width: { ideal: 1400 }
          }
        });

        if (!isCurrent) {
          stopIdentityCamera(stream);
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        if (isCurrent) {
          setCameraError("No se pudo abrir la camara. Revisa permisos o usa galeria.");
        }
      }
    }

    void startCamera();

    return () => {
      isCurrent = false;
      stopIdentityCamera(streamRef.current);
      streamRef.current = null;
    };
  }, [view, side]);

  async function submitCapturedDocuments() {
    let stopProgress: (() => void) | null = null;
    let success = false;
    setIsSaving(true);
    setStatusMessage("");
    setUploadProgress(8);

    try {
      stopProgress = startUploadProgress(setUploadProgress);
      const response = await fetch("/api/investor/identity", {
        body: JSON.stringify({
          email,
          ...(mode === "id" && frontImage ? { frontImage } : {}),
          ...(mode === "id" && backImage ? { backImage } : {}),
          ...(mode === "selfie" && selfieImage ? { selfieImage } : {})
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });

      if (!response.ok) {
        setStatusMessage(await getResponseErrorMessage(response));
        return;
      }

      const data = (await response.json()) as IdentityVerification;
      success = true;
      setUploadProgress(100);
      onSaved(data);
      setFrontImage(data.frontImage);
      setBackImage(data.backImage);
      setSelfieImage(data.selfieImage);
      window.setTimeout(onClose, 250);
    } catch {
      setStatusMessage("No se pudo enviar la informacion. Intenta nuevamente.");
    } finally {
      stopProgress?.();
      setIsSaving(false);
      if (!success) {
        setUploadProgress(0);
      }
    }
  }

  async function capturePhoto() {
    if (!videoRef.current) {
      setCameraError("La camara todavia no esta lista.");
      return;
    }

    const imageDataUrl = await captureIdentityFrame(videoRef.current);

    if (!imageDataUrl) {
      setCameraError("No se pudo tomar la foto. Intenta de nuevo.");
      return;
    }

    if (side === "selfie") {
      setSelfieImage(imageDataUrl);
      setView("done");
      return;
    }

    if (side === "front") {
      setFrontImage(imageDataUrl);
      setSide("back");
      setStatusMessage("");
      return;
    }

    setBackImage(imageDataUrl);
    setView("done");
  }

  return (
    <div className="identityOverlay" role="presentation">
      <section className="identityFlowModal" role="dialog" aria-modal="true" aria-labelledby="identity-title">
        <header className="identityFlowHeader">
          <button type="button" aria-label={view === "intro" || mode === "selfie" ? "Cerrar" : "Regresar"} onClick={view === "intro" || mode === "selfie" ? onClose : () => setView("intro")}>
            {mode === "selfie" ? <CloseIcon /> : <ArrowBackIcon />}
          </button>
          <h2 id="identity-title">Verificacion de identidad</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose}>
            <ShieldCheckIcon />
          </button>
        </header>

        <IdentityStepper activeStep={view === "done" ? 3 : 2} completedStep={view === "done" ? 2 : 1} middleLabel={mode === "selfie" ? "Selfie" : "INE"} />

        {view === "intro" ? (
          <div className="identityIntro">
            <section className="identityIntroHero">
              <div>
                <span className="identityIntroEyebrow">Paso 2 de 3</span>
                <h3>Fotografia tu INE</h3>
                <p>Necesitamos el anverso y reverso. Colocala en una superficie plana, evita reflejos y procura que todos los bordes entren en el marco.</p>
                <div className="identityIntroChecklist">
                  <span><IdentityIcon /> Frente legible</span>
                  <span><ReceiptIcon /> Reverso completo</span>
                  <span><ShieldCheckIcon /> Datos protegidos</span>
                </div>
              </div>
              <IdentityFlipPreview />
            </section>

            <button className="identityReadyButton" type="button" onClick={() => setView("capture")}>
              <CameraIcon />
              <span>
                <strong>Tomar foto</strong>
              </span>
            </button>
          </div>
        ) : null}

        {view === "capture" ? (
          <div className={`identityCapture ${side === "selfie" ? "selfie" : ""}`}>
            <span className="identitySidePill">{side === "selfie" ? "3 / 3  Selfie" : side === "front" ? "1 / 2  Anverso" : "2 / 2  Reverso"}</span>
            <h3>{side === "selfie" ? "Toma tu selfie" : side === "front" ? "Captura el anverso de tu INE" : "Captura el reverso de tu INE"}</h3>

            <div className={`identityCameraStage ${side === "selfie" ? "selfie" : ""}`}>
              <span className="identityAutoBadge"><LightningIcon /> Auto</span>
              {cameraError ? (
                <div className="identityCameraFallback">
                  <CameraIcon />
                  <strong>{cameraError}</strong>
                  <span>Revisa permisos de camara e intenta de nuevo.</span>
                </div>
              ) : (
                <video ref={videoRef} playsInline muted />
              )}
              {side === "selfie" ? (
                <div className="identitySelfieGuide" aria-hidden="true">
                  <i />
                </div>
              ) : (
                <div className="identityCameraGhost" key={side} aria-hidden="true">
                  <div className={`mockIne ${side === "front" ? "front" : "back"}`}>
                    {side === "front" ? (
                    <>
                      <header>
                        <b>INE</b>
                        <span>Instituto Nacional Electoral</span>
                      </header>
                      <i />
                      <div>
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                      <em />
                    </>
                    ) : (
                    <>
                      <i />
                      <i />
                      <span />
                      <span />
                      <span />
                    </>
                    )}
                  </div>
                </div>
              )}
              <div className={`identityFrameOverlay ${side === "selfie" ? "selfie" : ""}`} aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
              {side === "selfie" ? null : <div className="identityCaptureHint">
                <ShieldCheckIcon />
                <span>{side === "front" ? "Coloca tu INE sobre una superficie plana. Asegurate de que se vean todos los bordes." : "Voltea tu INE y coloca el reverso sobre una superficie plana. Asegurate de que se vean todos los bordes."}</span>
              </div>}
            </div>

            <div className="identityCaptureControls">
              <button className="identityShutter" type="button" onClick={capturePhoto} disabled={isSaving} aria-label="Tomar foto" />
            </div>
          </div>
        ) : null}

        {view === "done" ? (
          <div className="identityDone">
            <ShieldCheckIcon />
            <h3>{mode === "selfie" ? "Selfie capturada" : "Documentos capturados"}</h3>
            <p>{mode === "selfie" ? "Revisa tu selfie y presiona Continuar para enviarla a validacion." : "Revisa tus fotos y presiona Continuar para enviarlas a validacion."}</p>
            <div className="identityPreviewGrid">
              {mode === "selfie" ? (
                selfieImage ? <img src={selfieImage} alt="Selfie capturada" /> : null
              ) : (
                <>
                  {frontImage ? <img src={frontImage} alt="Anverso capturado" /> : null}
                  {backImage ? <img src={backImage} alt="Reverso capturado" /> : null}
                </>
              )}
            </div>
            <button
              className={`primaryModalAction ${isSaving ? "uploading" : ""}`}
              style={isSaving ? ({ "--upload-progress": `${uploadProgress}%` } as CSSProperties) : undefined}
              type="button"
              onClick={submitCapturedDocuments}
              disabled={isSaving}
            >
              <span>{isSaving ? `Enviando ${Math.round(uploadProgress)}%` : "Continuar"}</span>
            </button>
            {isSaving ? <UploadProgress progress={uploadProgress} label="Subiendo validacion" compact /> : null}
          </div>
        ) : null}

        {statusMessage ? <p className="modalError identityModalError">{statusMessage}</p> : null}
      </section>
    </div>
  );
}

function IdentityStepper({ activeStep, completedStep, middleLabel = "INE" }: { activeStep: number; completedStep: number; middleLabel?: string }) {
  return (
    <div className="identityStepper" aria-label="Progreso de verificacion">
      {[
        ["Informacion", 1],
        [middleLabel, 2],
        ["Confirmacion", 3]
      ].map(([label, step]) => (
        <div className={`${Number(step) <= activeStep ? "active" : ""} ${Number(step) <= completedStep ? "complete" : ""}`} key={step}>
          <b>{step}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function IdentityFlipPreview() {
  return (
    <div className="identityFlipPreview" aria-hidden="true">
      <div className="identityFlipCard">
        <div className="identityFlipFace identityFlipFront">
          <div className="identityFrameCorners">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="mockIne front">
            <header>
              <b>INE</b>
              <span>Instituto Nacional Electoral</span>
            </header>
            <i />
            <div>
              <span />
              <span />
              <span />
              <span />
            </div>
            <em />
          </div>
          <strong>1 Anverso</strong>
        </div>
        <div className="identityFlipFace identityFlipBack">
          <div className="identityFrameCorners">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="mockIne back">
            <i />
            <i />
            <span />
            <span />
            <span />
          </div>
          <strong>2 Reverso</strong>
        </div>
      </div>
    </div>
  );
}

function IdentityInstructionCard({
  label,
  number,
  text,
  title,
  variant
}: {
  label: string;
  number: string;
  text: string;
  title: string;
  variant: "front" | "back";
}) {
  return (
    <article className="identityInstructionCard">
      <div>
        <b>{number}</b>
        <h4>{title}</h4>
        <p>{text}</p>
        <span><IdentityIcon /> {label}</span>
      </div>
      <div className={`identityExampleCard ${variant}`}>
        <i />
        <strong>{variant === "front" ? "INE" : "IDMEX"}</strong>
        <span />
        <span />
        <span />
      </div>
    </article>
  );
}

async function captureIdentityFrame(video: HTMLVideoElement) {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    return "";
  }

  const canvas = document.createElement("canvas");
  const maxWidth = 900;
  const scale = Math.min(1, maxWidth / width);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  context?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.68);
}

function UploadProgress({ compact = false, label, progress }: { compact?: boolean; label: string; progress: number }) {
  const normalizedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`uploadProgress ${compact ? "compact" : ""}`}>
      <div className="uploadProgressMeta">
        <span>{label}</span>
        <strong>{Math.round(normalizedProgress)}%</strong>
      </div>
      <div className="uploadProgressTrack" style={{ "--upload-progress": `${normalizedProgress}%` } as CSSProperties}>
        <span />
      </div>
    </div>
  );
}

function startUploadProgress(setProgress: (progress: number) => void) {
  let progress = 12;
  setProgress(progress);

  const interval = window.setInterval(() => {
    progress = Math.min(progress + (progress < 55 ? 9 : progress < 82 ? 4 : 1), 94);
    setProgress(progress);
  }, 240);

  return () => window.clearInterval(interval);
}

function stopIdentityCamera(stream?: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
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

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

async function prepareProofOfAddressUpload(file: File) {
  const isImage = file.type.startsWith("image/");
  const originalDataUrl = await fileToDataUrl(file);

  if (!isImage) {
    ensureProofPayloadSize(originalDataUrl);
    return {
      dataUrl: originalDataUrl,
      fileName: file.name,
      mimeType: file.type,
      size: file.size
    };
  }

  const compressedDataUrl = await compressImageFile(file, 1400, 0.72).catch(() => originalDataUrl);
  const dataUrl = compressedDataUrl.length < originalDataUrl.length ? compressedDataUrl : originalDataUrl;
  ensureProofPayloadSize(dataUrl);

  return {
    dataUrl,
    fileName: replaceFileExtension(file.name, dataUrl.startsWith("data:image/jpeg") ? "jpg" : file.name.split(".").pop() || "jpg"),
    mimeType: dataUrl.startsWith("data:image/jpeg") ? "image/jpeg" : file.type,
    size: estimateDataUrlBytes(dataUrl)
  };
}

function compressImageFile(file: File, maxWidth: number, quality: number) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / image.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("No se pudo preparar la imagen."));
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo comprimir la imagen."));
    };

    image.src = objectUrl;
  });
}

function ensureProofPayloadSize(dataUrl: string) {
  if (dataUrl.length > 36_000_000) {
    throw new Error("El comprobante es demasiado pesado para enviarse.");
  }
}

function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

function replaceFileExtension(fileName: string, extension: string) {
  return fileName.includes(".") ? fileName.replace(/\.[^.]+$/, `.${extension}`) : `${fileName}.${extension}`;
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
      <img src={`/badges/${levelKey}-v2.png`} alt={`Insignia ${levelKey}`} />
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

function ArrowBackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11v2H8.8l5 5-1.4 1.4L5 12l7.4-7.4L13.8 6l-5 5Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4Z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.2 5 10 3h4l1.8 2H20c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2Zm3.8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 10-13h-7Z" />
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

function UserCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v1h11.2a6.8 6.8 0 0 1-.2-1.5c0-1.7.6-3.3 1.7-4.5A12 12 0 0 0 10 13Zm8.1 7.2-3.4-3.4 1.4-1.4 2 2 4.1-4.4 1.5 1.4Z" />
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

