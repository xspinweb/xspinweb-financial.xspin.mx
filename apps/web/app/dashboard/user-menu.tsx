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

export function UserMenu({ avatar, userName }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
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

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setCanInstall(isIos);

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
          <section className="installHelpSheet" role="dialog" aria-modal="true" aria-labelledby="install-help-title">
            <button className="installHelpClose" type="button" aria-label="Cerrar" onClick={() => setShowInstallHelp(false)}>
              x
            </button>
            <strong id="install-help-title">Instalar XSpin</strong>
            <p>En iPhone toca Compartir y despues Agregar a inicio.</p>
            <p>En Android abre el menu del navegador y toca Instalar app.</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
