"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { PaymentSettingsDashboard } from "../wallet/wallet-dashboard";

type ProfileDashboardProps = {
  role: string;
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

export function ProfileDashboard({ role, userEmail, userName }: ProfileDashboardProps) {
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

  return (
    <>
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
            <span>{role}</span>
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
            subtitle="Administra tu contrasena y metodos de seguridad."
            tone="purple"
          />

          <div className="profileRows">
            <ProfileRow icon={<LockIcon />} title="Contrasena" subtitle="Ultima actualizacion: 07 jun 2026" action="Cambiar" />
            <ProfileRow icon={<ShieldIcon />} title="Autenticacion en dos pasos (2FA)" subtitle="Anade una capa extra de seguridad a tu cuenta." switchLabel="Activado" />
            <ProfileRow icon={<DeviceIcon />} title="Sesiones activas" subtitle="Gestiona los dispositivos con sesion iniciada." action="Ver sesiones" />
            <ProfileRow icon={<ClockIcon />} title="Actividad reciente" subtitle="Revisa los ultimos accesos a tu cuenta." action="Ver actividad" />
          </div>
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
  icon,
  status,
  statusTone = "green",
  subtitle,
  switchLabel,
  title
}: {
  action?: string;
  icon: ReactNode;
  status?: string;
  statusTone?: "green" | "yellow";
  subtitle: string;
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
        <span className="profileSwitch">
          <i />
          {switchLabel}
        </span>
      ) : null}
      {action ? (
        <button type="button">
          {action}
          <ChevronIcon />
        </button>
      ) : null}
    </article>
  );
}

async function getResponseErrorMessage(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? "No se pudo guardar la informacion.";
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
