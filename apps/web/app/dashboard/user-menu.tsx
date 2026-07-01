"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type UserMenuProps = {
  avatar?: string | null;
  userName: string;
};

type InstallPlatform = "ios" | "android";
type InstallStepIcon = "menu" | "download" | "logo" | "phone" | "share" | "plus";

type InstallStep = {
  number: string;
  icon: InstallStepIcon;
  lines: Array<{ text: string; highlight?: boolean }>;
};

const androidInstallSteps: InstallStep[] = [
  {
    number: "1",
    icon: "menu",
    lines: [
      { text: "Toca el menu" },
      { text: "del navegador", highlight: true },
    ],
  },
  {
    number: "2",
    icon: "download",
    lines: [
      { text: "Selecciona" },
      { text: "Instalar app", highlight: true },
    ],
  },
  {
    number: "3",
    icon: "logo",
    lines: [
      { text: "Toca" },
      { text: "Instalar", highlight: true },
    ],
  },
  {
    number: "4",
    icon: "phone",
    lines: [
      { text: "Listo! XSpin ya esta" },
      { text: "en tu pantalla de inicio." },
    ],
  },
];

const iosInstallSteps: InstallStep[] = [
  {
    number: "1",
    icon: "share",
    lines: [
      { text: "Toca el boton" },
      { text: "Compartir", highlight: true },
    ],
  },
  {
    number: "2",
    icon: "plus",
    lines: [
      { text: "Selecciona" },
      { text: "Agregar a inicio", highlight: true },
    ],
  },
  {
    number: "3",
    icon: "logo",
    lines: [
      { text: "Toca" },
      { text: "Agregar", highlight: true },
    ],
  },
  {
    number: "4",
    icon: "phone",
    lines: [
      { text: "Listo! XSpin ya esta" },
      { text: "en tu pantalla de inicio." },
    ],
  },
];

function getInstallPlatform(): InstallPlatform {
  if (typeof window === "undefined") {
    return "android";
  }

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ? "ios" : "android";
}

function InstallGuideIcon({ type }: { type: InstallStepIcon }) {
  if (type === "logo") {
    return <img className="installStepLogoImage" src="/logos/xspin-icon-192.png" alt="" />;
  }

  if (type === "phone") {
    return (
      <span className="installStepPhone" aria-hidden="true">
        <span />
        <img src="/logos/xspin-icon-192.png" alt="" />
      </span>
    );
  }

  if (type === "menu") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="6.8" r="1.45" />
        <circle cx="12" cy="12" r="1.45" />
        <circle cx="12" cy="17.2" r="1.45" />
      </svg>
    );
  }

  if (type === "download") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4v11" />
        <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
        <path d="M5 18.5h14" />
      </svg>
    );
  }

  if (type === "share") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 15V4" />
        <path d="m8.5 7.5 3.5-3.5 3.5 3.5" />
        <path d="M7 10H5.8A1.8 1.8 0 0 0 4 11.8v6.4A1.8 1.8 0 0 0 5.8 20h12.4a1.8 1.8 0 0 0 1.8-1.8v-6.4a1.8 1.8 0 0 0-1.8-1.8H17" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function UserMenu({ avatar, userName }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [installHelpPlatform, setInstallHelpPlatform] = useState<InstallPlatform>("android");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function isStandalone() {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
      );
    }

    if (isStandalone()) {
      setCanInstall(false);
      return;
    }

    setInstallHelpPlatform(getInstallPlatform());
    setCanInstall(true);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setCanInstall(true);
    }

    function handleInstalled() {
      setCanInstall(false);
      setInstallPrompt(null);
      setShowInstallHelp(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleInstallApp() {
    setInstallHelpPlatform(getInstallPlatform());

    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice.catch(() => null);
      setInstallPrompt(null);

      if (choice?.outcome === "accepted") {
        setCanInstall(false);
      }

      return;
    }

    setShowInstallHelp(true);
  }

  const installSteps = installHelpPlatform === "ios" ? iosInstallSteps : androidInstallSteps;

  return (
    <div className="userMenu" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Menu de usuario"
        className="userMenuTrigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {avatar ? (
          <img src={avatar} alt="" width={38} height={38} className="userAvatar" referrerPolicy="no-referrer" />
        ) : (
          <span className="userFallback">{userName.charAt(0)}</span>
        )}
        <svg className={isOpen ? "menuChevron open" : "menuChevron"} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m7.4 8.6 4.6 4.6 4.6-4.6L18 10l-6 6-6-6z" />
        </svg>
      </button>

      {canInstall ? (
        <button className="installAppButton" type="button" onClick={handleInstallApp}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3a1 1 0 0 1 1 1v8.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4l2.3 2.3V4a1 1 0 0 1 1-1Z" />
            <path d="M5 17a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
          </svg>
          <span>Instalar <em>App</em></span>
          <i aria-hidden="true">&gt;</i>
        </button>
      ) : null}

      {isOpen ? (
        <div className="userDropdown" role="menu">
          <button type="button" role="menuitem" onClick={() => signOut({ callbackUrl: "/" })}>
            Cerrar sesion
          </button>
        </div>
      ) : null}

      {showInstallHelp ? (
        <div className="installHelpBackdrop" role="presentation">
          <section className="installHelpSheet installHelpGuide" role="dialog" aria-modal="true" aria-labelledby="install-help-title">
            <button className="installHelpClose" type="button" aria-label="Cerrar" onClick={() => setShowInstallHelp(false)}>
              x
            </button>
            <img className="installHelpLogo" src="/logos/xspin-logo-full.png" alt="XSpin" />
            <strong id="install-help-title" className="installHelpTitle">
              Instala <span>XSpin</span>
            </strong>
            <div className="installSteps" aria-label={installHelpPlatform === "ios" ? "Pasos para instalar en iOS" : "Pasos para instalar en Android"}>
              {installSteps.map((step) => (
                <article className="installStep" key={`${installHelpPlatform}-${step.number}`}>
                  <span className="installStepNumber">{step.number}</span>
                  <span className="installStepIcon">
                    <InstallGuideIcon type={step.icon} />
                  </span>
                  <p className="installStepText">
                    {step.lines.map((line) => (
                      <span className={line.highlight ? "highlight" : undefined} key={line.text}>
                        {line.text}
                      </span>
                    ))}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
