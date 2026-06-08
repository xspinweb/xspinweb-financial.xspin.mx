"use client";

import { useEffect, useMemo, useState } from "react";
import { NewInvestmentModal } from "./new-investment-modal";

type Referral = {
  name: string;
  invested: boolean;
  investedAt: string;
  amount?: number;
};

type Investment = {
  id: string;
  name: string;
  amount: number;
  group: string;
  cycle: string;
  investedAt: string;
  nextPaymentAt: string;
  referrals: Referral[];
};

type InvestorDashboardProps = {
  userName: string;
};

const storageKey = "pay-financial-investments";

export function InvestorDashboard({ userName }: InvestorDashboardProps) {
  const [investments, setInvestments] = useState<Investment[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);

    if (!stored) {
      return;
    }

    try {
      setInvestments(JSON.parse(stored) as Investment[]);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(investments));
  }, [investments]);

  const cards = useMemo(() => {
    const confirmedReferrals = investments.reduce(
      (total, investment) => total + investment.referrals.filter((referral) => referral.invested).length,
      0
    );
    const nextPayment = investments[0]?.nextPaymentAt ?? "-";
    const hasCollectable = investments.some((investment) => investment.referrals.filter((referral) => referral.invested).length >= 2);

    return [
      { label: "Inversiones activas", value: String(investments.length) },
      { label: "Referidos confirmados", value: String(confirmedReferrals) },
      { label: "Proximo pago", value: nextPayment },
      { label: "Estatus actual", value: hasCollectable ? "Por cobrar" : investments.length > 0 ? "Pendiente" : "-" }
    ];
  }, [investments]);

  function handleInvestmentCreated(amount: number) {
    setInvestments((currentInvestments) => {
      const groupNumber = Math.floor(currentInvestments.length / 16) + 1;
      const now = new Date();
      const nextPaymentDate = new Date(now);
      nextPaymentDate.setDate(now.getDate() + 7);

      const nextInvestment: Investment = {
        id: crypto.randomUUID(),
        name: userName,
        amount,
        group: `Grupo ${groupNumber}`,
        cycle: "Semana 1 de 12",
        investedAt: formatDate(now),
        nextPaymentAt: formatDate(nextPaymentDate),
        referrals: []
      };

      return [nextInvestment, ...currentInvestments];
    });
  }

  return (
    <>
      <section className="dashboardCards">
        {cards.map((card) => (
          <article className="dashboardCard" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="investmentPanel">
        <div className="tableHeader">
          <h2>Mis inversiones</h2>
          <NewInvestmentModal onInvestmentCreated={handleInvestmentCreated} />
        </div>

        {investments.length === 0 ? (
          <div className="emptyInvestments">
            <strong>Sin inversiones activas</strong>
            <span>Cuando realices una nueva inversion, aparecera aqui con su grupo, ciclo y fecha de proximo pago.</span>
          </div>
        ) : (
          <div className="investmentList">
            {investments.map((investment) => {
              const confirmedReferrals = investment.referrals.filter((referral) => referral.invested).length;
              const referralBonus = getReferralBonus(investment.referrals);
              const canCollect = confirmedReferrals >= 2;

              return (
                <details className="investmentItem" key={investment.id}>
                  <summary>
                    <div className="investmentSummaryMain">
                      <span>{investment.name}</span>
                      <strong>{investment.group}</strong>
                    </div>
                    <div>
                      <span>Ciclo</span>
                      <strong>{investment.cycle}</strong>
                    </div>
                    <div>
                      <span>Fecha</span>
                      <strong>{investment.investedAt}</strong>
                    </div>
                    <div>
                      <span>Referidos</span>
                      <strong>{confirmedReferrals}</strong>
                    </div>
                    <div>
                      <span>Proximo pago</span>
                      <strong>{investment.nextPaymentAt}</strong>
                    </div>
                    <InviteReferralModal investmentId={investment.id} />
                    <span className={canCollect ? "statusPill statusGreen" : "statusPill statusRed"}>
                      {canCollect ? "Por cobrar" : "Pendiente"}
                    </span>
                  </summary>

                  <div className="referralPanel">
                    <div className="investmentDetailGrid">
                      <div>
                        <span>Monto invertido</span>
                        <strong>{formatCurrency(investment.amount)}</strong>
                      </div>
                      <div>
                        <span>Condicion para cobrar</span>
                        <strong>2 referidos confirmados</strong>
                      </div>
                      <div>
                        <span>Bono por referidos</span>
                        <strong>{formatCurrency(referralBonus)}</strong>
                      </div>
                    </div>
                    <div className="referralHeader">
                      <strong>Referidos</strong>
                      <span>Se requieren al menos 2 referidos con inversion confirmada.</span>
                    </div>
                    {investment.referrals.length === 0 ? (
                      <p className="emptyReferralText">Aun no hay referidos vinculados a esta inversion.</p>
                    ) : (
                      <div className="referralList">
                        {investment.referrals.map((referral) => (
                          <div className="referralItem" key={`${investment.id}-${referral.name}`}>
                            <div>
                              <strong>{referral.name}</strong>
                              <span>{referral.investedAt}</span>
                            </div>
                            <span className={referral.invested ? "statusPill statusGreen" : "statusPill statusRed"}>
                              {referral.invested ? "Confirmado" : "Pendiente"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function InviteReferralModal({ investmentId }: { investmentId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedValue, setCopiedValue] = useState<"link" | "code" | null>(null);
  const [origin, setOrigin] = useState("");
  const referralCode = useMemo(() => `XSPIN-${investmentId.slice(-6).toUpperCase()}`, [investmentId]);
  const referralLink = `${origin || "https://pay.xspin.mx"}/dashboard?ref=${referralCode}`;

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function closeModal() {
    setIsOpen(false);
    setCopiedValue(null);
  }

  async function copyValue(value: string, type: "link" | "code") {
    await navigator.clipboard.writeText(value);
    setCopiedValue(type);
  }

  return (
    <>
      <button
        className="inviteReferralAction"
        type="button"
        aria-label="Invitar referido"
        title="Invitar referido"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(true);
        }}
      >
        <InviteIcon />
        <span>Invitar</span>
      </button>

      {isOpen ? (
        <div className="modalOverlay" role="presentation">
          <section className="investmentModal" role="dialog" aria-modal="true" aria-labelledby={`invite-${investmentId}`}>
            <div className="inviteModalContent">
              <div className="modalHeader">
                <div>
                  <span className="loginEyebrow">Referidos</span>
                  <h2 id={`invite-${investmentId}`}>Invitar referido</h2>
                </div>
                <button className="modalClose" type="button" aria-label="Cerrar" onClick={closeModal}>
                  x
                </button>
              </div>

              <CopyBox
                label="Link de invitacion"
                value={referralLink}
                copied={copiedValue === "link"}
                onCopy={() => copyValue(referralLink, "link")}
              />
              <CopyBox
                label="Codigo de referido"
                value={referralCode}
                copied={copiedValue === "code"}
                onCopy={() => copyValue(referralCode, "code")}
              />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function CopyBox({ copied, label, onCopy, value }: { copied: boolean; label: string; onCopy: () => void; value: string }) {
  return (
    <div className="copyBox">
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        <button type="button" onClick={onCopy}>
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function InviteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.5 11.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Zm0 2.3c-4.1 0-7.3 2.1-7.3 4.8V20h10.2a6.3 6.3 0 0 1-.4-2.2c0-1.4.5-2.8 1.3-3.8-1.1-.2-2.4-.3-3.8-.3Zm8.4-1a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2Zm.8 2.5v2h2v1.6h-2v2h-1.6v-2h-2v-1.6h2v-2Z" />
    </svg>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  })
    .format(date)
    .replace(".", "");
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    style: "currency"
  }).format(amount);
}

function getReferralBonus(referrals: Referral[]) {
  return referrals.reduce((total, referral) => {
    if (!referral.invested) {
      return total;
    }

    return total + (referral.amount ?? 0) * 0.05;
  }, 0);
}
