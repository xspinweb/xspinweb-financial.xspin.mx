"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

type UserMenuProps = {
  avatar?: string | null;
  userName: string;
};

export function UserMenu({ avatar, userName }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

      {isOpen ? (
        <div className="userDropdown" role="menu">
          <button type="button" role="menuitem" onClick={() => signOut({ callbackUrl: "/" })}>
            Cerrar sesion
          </button>
        </div>
      ) : null}
    </div>
  );
}
