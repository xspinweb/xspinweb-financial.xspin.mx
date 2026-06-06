"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button className="signOutButton" type="button" onClick={() => signOut({ callbackUrl: "/" })}>
      Salir
    </button>
  );
}
