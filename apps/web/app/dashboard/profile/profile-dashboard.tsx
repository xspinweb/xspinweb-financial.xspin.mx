"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type ProfileDashboardProps = {
  role: string;
  userEmail: string;
  userName: string;
};

type ProfileTab = "personal" | "security" | "identity";

export function ProfileDashboard({ role, userEmail, userName }: ProfileDashboardProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");

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
      </nav>

      {(activeTab === "personal" || activeTab === "security" || activeTab === "identity") && (
        <section className="profilePanel personalProfilePanel">
          <ProfileSectionHeader
            icon={<UserIcon />}
            title="Informacion personal"
            subtitle="Actualiza tus datos personales y de contacto."
            tone="green"
          />

          <div className="profileFormGrid">
            <ProfileField label="Nombre completo" defaultValue={userName} />
            <ProfileField label="Correo electronico" defaultValue={userEmail} />
            <label className="profileField">
              <span>Telefono</span>
              <div className="phoneFieldGroup">
                <button type="button">
                  <span>MX</span>
                  +52
                  <ChevronIcon />
                </button>
                <input defaultValue="55 1234 5678" />
              </div>
            </label>
            <ProfileField label="Fecha de nacimiento" defaultValue="15 / 06 / 1990" icon={<CalendarIcon />} />
            <label className="profileField">
              <span>Pais</span>
              <select defaultValue="MX">
                <option value="MX">Mexico</option>
              </select>
            </label>
            <label className="profileField">
              <span>Ciudad</span>
              <select defaultValue="CDMX">
                <option value="CDMX">Ciudad de Mexico</option>
                <option value="GDL">Guadalajara</option>
                <option value="MTY">Monterrey</option>
              </select>
            </label>
            <ProfileField className="wide" label="Direccion (opcional)" defaultValue="Av. Reforma 123, Col. Centro, C.P. 06000" />
          </div>

          <div className="profileActions">
            <span>{role}</span>
            <button type="button">Guardar cambios</button>
          </div>
        </section>
      )}

      {(activeTab === "security" || activeTab === "personal" || activeTab === "identity") && (
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

      {(activeTab === "identity" || activeTab === "personal" || activeTab === "security") && (
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
  defaultValue,
  icon,
  label
}: {
  className?: string;
  defaultValue: string;
  icon?: ReactNode;
  label: string;
}) {
  return (
    <label className={`profileField ${className}`}>
      <span>{label}</span>
      <div>
        {icon}
        <input defaultValue={defaultValue} />
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
  icon: React.ReactNode;
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
