"use client";

import { useEffect, useMemo, useState } from "react";
import { NewInvestmentModal } from "./new-investment-modal";

type Referral = {
  name: string;
  invested: boolean;
  investedAt: string;
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
