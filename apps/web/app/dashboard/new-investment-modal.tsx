"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

const minInvestment = 20;
const maxInvestment = 2000;

type NewInvestmentModalProps = {
  onInvestmentCreated: (amount: number) => Promise<void>;
};

export function NewInvestmentModal({ onInvestmentCreated }: NewInvestmentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const numericAmount = useMemo(() => Number(amount), [amount]);
  const hasAmount = amount.trim().length > 0;
  const hasValidAmount = hasAmount && numericAmount >= minInvestment && numericAmount <= maxInvestment;
  const showAmountError = hasAmount && !hasValidAmount;
  const canSubmit = hasValidAmount && acceptedTerms && !isSubmitting;

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
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setAmount("");
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
      await onInvestmentCreated(numericAmount);
      closeModal();
    } catch {
      setSubmitError("No se pudo registrar la inversion. Intenta nuevamente.");
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button className="headerIconAction" type="button" aria-label="Nueva inversion" title="Nueva inversion" onClick={openModal}>
        <InvestIcon />
        <span>Nueva inversion</span>
      </button>

      {isOpen ? (
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
                <div>
                  <span>$</span>
                  <input
                    inputMode="decimal"
                    min={minInvestment}
                    max={maxInvestment}
                    name="amount"
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="20 - 2000"
                    type="number"
                    value={amount}
                  />
                  <span>MXN</span>
                </div>
              </label>

              {showAmountError ? <p className="formError">Monto permitido: de $20 a $2,000 MXN.</p> : null}
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
      ) : null}
    </>
  );
}

function InvestIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 18.5h16v2H3a1 1 0 0 1-1-1V4h2Zm2-2.4 4.1-4.8 3.1 2.7 5-7.2 1.6 1.1-6.3 9.1-3.2-2.8-2.8 3.3Zm12.4-3.9H22v3.6h-2v-1.6h-1.6Z" />
    </svg>
  );
}
