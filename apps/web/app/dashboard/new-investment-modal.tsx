"use client";

import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const minInvestment = 20;
const investmentStep = 10;

type NewInvestmentModalProps = {
  identityRequirementMessage?: string;
  identityStatus: "loading" | "verified" | "blocked";
  maxInvestment: number;
  onInvestmentCreated: (amount: number) => Promise<void>;
};

export function NewInvestmentModal({ identityRequirementMessage, identityStatus, maxInvestment, onInvestmentCreated }: NewInvestmentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(minInvestment);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  const effectiveMaxInvestment = Math.max(minInvestment, maxInvestment);
  const amountProgress = useMemo(
    () => ((amount - minInvestment) / (effectiveMaxInvestment - minInvestment)) * 100,
    [amount, effectiveMaxInvestment]
  );
  const hasValidAmount = amount >= minInvestment && amount <= effectiveMaxInvestment;
  const showAmountError = !hasValidAmount;
  const isIdentityVerified = identityStatus === "verified";
  const isIdentityLoading = identityStatus === "loading";
  const identityTooltip = isIdentityLoading
    ? "Estamos validando tu identidad."
    : identityRequirementMessage ?? "Primero debes verificar tu identidad.";
  const canSubmit = isIdentityVerified && hasValidAmount && acceptedTerms && !isSubmitting;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

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

  function openModal() {
    if (!isIdentityVerified) {
      return;
    }

    setAmount((current) => Math.min(Math.max(current, minInvestment), effectiveMaxInvestment));
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setAmount(minInvestment);
    setAcceptedTerms(false);
    setIsSubmitting(false);
    setSubmitError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");
      await onInvestmentCreated(amount);
      closeModal();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo registrar la inversion. Intenta nuevamente.");
      setIsSubmitting(false);
    }
  }

  const modal = isOpen ? (
        <div className="modalOverlay" role="presentation">
          <section className="investmentModal" role="dialog" aria-modal="true" aria-labelledby="new-investment-title">
            <form onSubmit={handleSubmit}>
              <div className="modalHeader">
                <div>
                  <span className="loginEyebrow">Nueva inversion</span>
                  <h2 id="new-investment-title">Ingresa tu monto</h2>
                </div>
                <button className="modalClose" type="button" aria-label="Cerrar" onClick={closeModal}>
                  x
                </button>
              </div>

              <label className="amountField">
                <span>Cantidad a invertir</span>
                <div className="amountPreview">
                  <strong>{formatMoney(amount)}</strong>
                  <span>MXN</span>
                </div>
                <input
                  aria-label="Cantidad a invertir"
                  className="amountSlider"
                  max={effectiveMaxInvestment}
                  min={minInvestment}
                  name="amount"
                  onChange={(event) => setAmount(Number(event.target.value))}
                  step={investmentStep}
                  style={{ "--amount-progress": `${amountProgress}%` } as CSSProperties}
                  type="range"
                  value={amount}
                />
                <div className="amountRangeLabels">
                  <span>{formatMoney(minInvestment)}</span>
                  <span>{formatMoney(effectiveMaxInvestment)}</span>
                </div>
              </label>

              {showAmountError ? <p className="formError">Monto permitido: de $20 a {formatMoney(effectiveMaxInvestment)} MXN.</p> : null}
              {!isIdentityVerified ? (
                <p className="formError">{identityTooltip}</p>
              ) : null}
              {submitError ? <p className="formError">{submitError}</p> : null}

              <label className="termsCheck">
                <input checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} type="checkbox" />
                <span>Acepto terminos y condiciones.</span>
              </label>

              <div className="modalActions">
                <button className="secondaryModalAction" type="button" onClick={closeModal}>
                  Cancelar
                </button>
                <button className="primaryModalAction" disabled={!canSubmit} type="submit">
                  {isSubmitting ? "Registrando" : "Invertir"}
                </button>
              </div>
            </form>
          </section>
        </div>
  ) : null;

  return (
    <>
      <span className="newInvestmentGate" data-state={identityStatus} title={isIdentityVerified ? "Nueva inversion" : identityTooltip}>
        <button
          aria-disabled={!isIdentityVerified}
          aria-label="Nueva inversion"
          className="headerIconAction"
          disabled={!isIdentityVerified}
          onClick={openModal}
          type="button"
        >
          <InvestIcon />
          <span>Nueva inversion</span>
          {!isIdentityVerified ? (
            <b className="identityRequiredMark" aria-label={identityTooltip}>
              !
            </b>
          ) : null}
        </button>
      </span>

      {isMounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
    currency: "MXN"
  }).format(value);
}

function InvestIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 18.5h16v2H3a1 1 0 0 1-1-1V4h2Zm2-2.4 4.1-4.8 3.1 2.7 5-7.2 1.6 1.1-6.3 9.1-3.2-2.8-2.8 3.3Zm12.4-3.9H22v3.6h-2v-1.6h-1.6Z" />
    </svg>
  );
}
