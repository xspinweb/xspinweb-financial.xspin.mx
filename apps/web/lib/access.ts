export type AppRole = "SUPER_ADMIN" | "USER";

export type NavItem = {
  label: string;
  href: string;
  icon: "home" | "users" | "wallet" | "grid" | "chart" | "gift" | "profile" | "history";
};

const superAdminEmails = new Set(["carlos.rosado.escobar@gmail.com"]);

export function getAppRole(email?: string | null): AppRole {
  if (email && superAdminEmails.has(email.toLowerCase())) {
    return "SUPER_ADMIN";
  }

  return "USER";
}

export function getRoleLabel(role: AppRole) {
  return role === "SUPER_ADMIN" ? "Super admin" : "Inversionista";
}

export function getNavItems(role: AppRole): NavItem[] {
  if (role === "SUPER_ADMIN") {
    return [
      { label: "Inicio", href: "/dashboard", icon: "home" },
      { label: "Usuarios", href: "#", icon: "users" },
      { label: "Ciclos", href: "#", icon: "grid" },
      { label: "Pagos", href: "#", icon: "wallet" },
      { label: "Reportes", href: "#", icon: "chart" }
    ];
  }

  return [
    { label: "Inicio", href: "/dashboard", icon: "home" },
    { label: "Historial", href: "/dashboard#weekly-history", icon: "history" },
    { label: "Cartera", href: "/dashboard/wallet", icon: "wallet" },
    { label: "Perfil", href: "#", icon: "profile" }
  ];
}
