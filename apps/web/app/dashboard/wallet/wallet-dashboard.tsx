"use client";

import type { ReactNode, UIEvent } from "react";
import { useEffect, useRef, useState } from "react";

type PaymentType = "bank" | "paypal" | "paxum" | "crypto";

type PaymentMethod = {
  accountHolder?: string;
  bankName?: string;
  clabe?: string;
  coin?: string;
  createdAt: string;
  email?: string;
  id: string;
  isPrimary: boolean;
  paxumAccount?: string;
  type: PaymentType;
  walletAddress?: string;
};

type PortfolioPayment = {
  amount: number;
  notes?: string | null;
  paidAt: string;
};

type PortfolioWeek = {
  paymentAt: string;
  totalGenerated: number;
  weekNumber: number;
};

type PortfolioInvestment = {
  group: string;
  paidWeeks?: number;
  payments?: PortfolioPayment[];
  weeks?: PortfolioWeek[];
};

type PortfolioResponse = {
  investments: PortfolioInvestment[];
  walletPayments?: PortfolioPayment[];
};

type MethodDraft = {
  accountHolder: string;
  bankName: string;
  clabe: string;
  coin: string;
  email: string;
  paxumAccount: string;
  walletAddress: string;
};

const methodOptions: Array<{
  description: string;
  label: string;
  tag?: string;
  type: PaymentType;
}> = [
  {
    description: "Recibe tus pagos directamente en tu cuenta bancaria.",
    label: "Transferencia Bancaria",
    tag: "CLABE",
    type: "bank"
  },
  {
    description: "Recibe tus pagos en tu cuenta de PayPal de forma rapida y segura.",
    label: "PayPal",
    type: "paypal"
  },
  {
    description: "Recibe tus pagos en tu cuenta de Paxum.",
    label: "Paxum",
    type: "paxum"
  },
  {
    description: "Recibe tus pagos en tu billetera de criptomonedas.",
    label: "Criptomonedas",
    tag: "Nuevo",
    type: "crypto"
  }
];

const initialDraft: MethodDraft = {
  accountHolder: "",
  bankName: "",
  clabe: "",
  coin: "Bitcoin (BTC)",
  email: "",
  paxumAccount: "",
  walletAddress: ""
};

const bankOptions = ["BBVA Mexico", "Santander", "Banorte", "HSBC", "Citibanamex", "Scotiabank"];
const coinOptions = ["Bitcoin (BTC)", "Ethereum (ETH)", "Tether (USDT)", "Solana (SOL)"];

export function WalletDashboard({ userEmail }: { userEmail: string }) {
  const savedMethodsCarouselRef = useRef<HTMLDivElement>(null);
  const [selectedType, setSelectedType] = useState<PaymentType>("bank");
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [draft, setDraft] = useState<MethodDraft>(initialDraft);
  const [error, setError] = useState("");
  const [portfolio, setPortfolio] = useState<PortfolioResponse>({ investments: [] });
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [isSavingMethod, setIsSavingMethod] = useState(false);
  const [paymentCarouselIndex, setPaymentCarouselIndex] = useState(0);
  const [savedCarouselIndex, setSavedCarouselIndex] = useState(0);

  async function loadWalletData() {
    setIsLoadingMethods(true);
    setError("");

    try {
      const [methodsResponse, portfolioResponse] = await Promise.all([
        fetch(`/api/payout-methods?email=${encodeURIComponent(userEmail)}`),
        fetch(`/api/investments/portfolio?email=${encodeURIComponent(userEmail)}`)
      ]);

      if (!methodsResponse.ok) {
        throw new Error(await getResponseErrorMessage(methodsResponse));
      }

      if (!portfolioResponse.ok) {
        throw new Error(await getResponseErrorMessage(portfolioResponse));
      }

      const methodsData = (await methodsResponse.json()) as PaymentMethod[];
      const portfolioData = (await portfolioResponse.json()) as PortfolioResponse;

      setMethods(methodsData);
      setPortfolio(portfolioData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar tus metodos de pago.");
    } finally {
      setIsLoadingMethods(false);
    }
  }

  useEffect(() => {
    void loadWalletData();
  }, [userEmail]);

  function updateDraft(field: keyof MethodDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function selectType(type: PaymentType) {
    setSelectedType(type);
    setPaymentCarouselIndex(methodOptions.findIndex((option) => option.type === type));
    setDraft(initialDraft);
    setError("");
  }

  async function saveMethod() {
    const validationError = validateDraft(selectedType, draft);

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = buildMethod(selectedType, draft);
    setIsSavingMethod(true);
    setError("");

    try {
      const response = await fetch("/api/payout-methods", {
        body: JSON.stringify(toApiPayoutMethod(userEmail, payload)),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      const method = (await response.json()) as PaymentMethod;

      setMethods((current) => [
        ...(method.isPrimary ? current.map((currentMethod) => ({ ...currentMethod, isPrimary: false })) : current),
        method
      ]);
      setDraft(initialDraft);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar el metodo de pago.");
    } finally {
      setIsSavingMethod(false);
    }
  }

  async function setPrimary(id: string) {
    setError("");

    try {
      const response = await fetch(`/api/payout-methods/${encodeURIComponent(id)}/primary`, {
        body: JSON.stringify({ email: userEmail }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      setMethods((current) => movePrimaryMethodToFront(current, id));
      setSavedCarouselIndex(0);
      requestAnimationFrame(() => {
        savedMethodsCarouselRef.current?.scrollTo({ left: 0, behavior: "smooth" });
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cambiar el metodo principal.");
    }
  }

  async function deleteMethod(id: string) {
    setError("");

    try {
      const response = await fetch(`/api/payout-methods/${encodeURIComponent(id)}`, {
        body: JSON.stringify({ email: userEmail }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(await getResponseErrorMessage(response));
      }

      setMethods((current) => {
        const deletedMethod = current.find((method) => method.id === id);
        const remaining = current.filter((method) => method.id !== id);

        if (!deletedMethod?.isPrimary || remaining.some((method) => method.isPrimary)) {
          return remaining;
        }

        return remaining.map((method, index) => ({ ...method, isPrimary: index === 0 }));
      });
      setSavedCarouselIndex((current) => Math.max(0, Math.min(current, methods.length - 2)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar el metodo de pago.");
    }
  }

  function updateSavedCarouselIndex(event: UIEvent<HTMLDivElement>) {
    setSavedCarouselIndex(getCarouselIndex(event.currentTarget, ".savedMethodRow"));
  }

  function updatePaymentCarouselIndex(event: UIEvent<HTMLDivElement>) {
    setPaymentCarouselIndex(getCarouselIndex(event.currentTarget, ".paymentTypeCard"));
  }

  const walletSummary = getWalletSummary(portfolio);
  const scheduledPayments = getScheduledPayments(portfolio);
  const primaryMethod = methods.find((method) => method.isPrimary) ?? methods[0];
  const visibleMethods = primaryMethod ? [primaryMethod] : [];

  return (
    <>
      <section className="walletBalanceCard">
        <div>
          <span>Saldo disponible <InfoIcon /></span>
          <strong>{formatMoney(walletSummary.availableBalance)} <em>MXN</em></strong>
          <p>Ganancias disponibles para retiro</p>
        </div>
        <WalletWithdrawModal amount={walletSummary.availableBalance} onCompleted={loadWalletData} userEmail={userEmail} />
      </section>

      <section className="walletSchedulePanel">
        <div className="walletScheduleHeader">
          <div>
            <CalendarIcon />
            <h2>Pagos programados</h2>
          </div>
        </div>

        <div className="walletScheduleList">
          {scheduledPayments.length ? (
            scheduledPayments.map((payment) => (
              <article className={payment.status === "next" ? "walletScheduleRow next" : "walletScheduleRow"} key={`${payment.group}-${payment.investmentIndex}-${payment.weekNumber}`}>
                <span className={`walletScheduleBadge ${payment.status}`}>
                  {payment.status === "completed" ? <CheckIcon /> : payment.weekNumber}
                </span>
                <div>
                  <strong>Semana {payment.weekNumber}</strong>
                  <small>{payment.dateLabel}</small>
                </div>
                <b>{formatMoney(payment.amount)} MXN</b>
                <em className={`walletScheduleStatus ${payment.status}`}>{payment.label}</em>
                <ChevronIcon />
              </article>
            ))
          ) : (
            <div className="emptyWalletState compactWalletEmpty">
              <CalendarIcon />
              <strong>Sin pagos cobrados</strong>
              <span>Cuando cobres una semana, veras aqui el saldo enviado a tu wallet.</span>
            </div>
          )}
        </div>
      </section>

      <section className="walletPanel savedMethodsPanel walletSavedMethodsCompact">
        <div className="walletSectionHeader">
          <div>
            <h2>Metodos de retiro</h2>
            <p>Metodo principal para recibir tus ganancias.</p>
          </div>
        </div>

        {isLoadingMethods ? (
          <div className="emptyWalletState">
            <PaymentBrandIcon type="bank" />
            <strong>Cargando tus metodos</strong>
            <span>Estamos consultando la informacion guardada.</span>
          </div>
        ) : methods.length === 0 ? (
          <div className="emptyWalletState">
            <PaymentBrandIcon type="bank" />
            <strong>Aun no tienes metodos guardados</strong>
            <span>Agrega al menos un metodo para preparar tus retiros.</span>
          </div>
        ) : (
          <>
          <div className="savedMethodsTable" onScroll={updateSavedCarouselIndex} ref={savedMethodsCarouselRef}>
            <div className="savedMethodsHead">
              <span>Metodo</span>
              <span>Informacion</span>
              <span>Principal</span>
              <span>Acciones</span>
            </div>
            {visibleMethods.map((method) => (
              <div className="savedMethodRow" key={method.id}>
                <div>
                  <PaymentBrandIcon type={method.type} />
                  <strong>{getMethodTitle(method)}</strong>
                </div>
                <span>{getMethodInfo(method)}</span>
                <div className="savedMethodActions">
                  <button
                    className={method.isPrimary ? "walletStatus primary" : "setPrimaryAction"}
                    type="button"
                    onClick={() => setPrimary(method.id)}
                  >
                    {method.isPrimary ? "Principal" : "Marcar principal"}
                  </button>
                  <button className="deleteWalletAction" type="button" onClick={() => deleteMethod(method.id)} aria-label="Eliminar metodo">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <CarouselDots activeIndex={savedCarouselIndex} count={visibleMethods.length} />
          </>
        )}
      </section>
      {error ? <p className="walletError">{error}</p> : null}
    </>
  );
}

function getCarouselIndex(element: HTMLElement, itemSelector: string) {
  const items = Array.from(element.querySelectorAll<HTMLElement>(itemSelector));

  if (!items.length) {
    return 0;
  }

  return items.reduce(
    (closest, item, index) => {
      const distance = Math.abs(item.offsetLeft - element.scrollLeft);
      return distance < closest.distance ? { distance, index } : closest;
    },
    { distance: Number.POSITIVE_INFINITY, index: 0 }
  ).index;
}

function movePrimaryMethodToFront(methods: PaymentMethod[], primaryId: string) {
  const updated = methods.map((method) => ({ ...method, isPrimary: method.id === primaryId }));
  const primary = updated.find((method) => method.id === primaryId);

  if (!primary) {
    return updated;
  }

  return [primary, ...updated.filter((method) => method.id !== primaryId)];
}

function CarouselDots({ activeIndex, count }: { activeIndex: number; count: number }) {
  if (count < 2) {
    return null;
  }

  return (
    <div className="walletCarouselDots" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span className={index === activeIndex ? "active" : ""} key={index} />
      ))}
    </div>
  );
}

function WalletWithdrawModal({
  amount,
  onCompleted,
  userEmail
}: {
  amount: number;
  onCompleted: () => Promise<void>;
  userEmail: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasBalance = amount > 0;

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
    setAcceptedTerms(false);
    setError("");
    setIsSubmitting(false);
  }

  async function submitWithdrawal() {
    if (!acceptedTerms) {
      setError("Debes aceptar terminos y condiciones para solicitar el retiro.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/wallet/withdraw", {
      body: JSON.stringify({
        acceptedTerms,
        email: userEmail
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      setError(await getResponseErrorMessage(response));
      setIsSubmitting(false);
      return;
    }

    await onCompleted();
    closeModal();
  }

  return (
    <>
      <button className="walletWithdrawButton" type="button" disabled={!hasBalance} onClick={() => setIsOpen(true)}>
        <WithdrawIcon />
        Retirar saldo
      </button>

      {isOpen ? (
        <div className="modalOverlay" role="presentation">
          <section className="investmentModal walletWithdrawModal" role="dialog" aria-modal="true" aria-labelledby="wallet-withdraw-title">
            <div className="modalHeader">
              <div>
                <span className="loginEyebrow">Retiro wallet</span>
                <h2 id="wallet-withdraw-title">Confirmar retiro</h2>
              </div>
              <button className="modalClose" type="button" aria-label="Cerrar" onClick={closeModal}>
                x
              </button>
            </div>

            <div className="walletWithdrawSummary">
              <span>Monto a retirar</span>
              <strong>{formatMoney(amount)} MXN</strong>
              <p>El pago sera realizado en un plazo de 1 a 2 dias habiles al metodo principal registrado.</p>
            </div>

            <label className="walletTermsCheck">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => {
                  setAcceptedTerms(event.target.checked);
                  setError("");
                }}
              />
              <span>Acepto terminos y condiciones del retiro.</span>
            </label>

            {error ? <p className="modalError">{error}</p> : null}

            <div className="modalActions walletWithdrawActions">
              <button className="secondaryModalAction" type="button" onClick={closeModal} disabled={isSubmitting}>
                Cancelar
              </button>
              <button className="primaryModalAction" type="button" onClick={submitWithdrawal} disabled={isSubmitting || !acceptedTerms}>
                {isSubmitting ? "Procesando" : "Retirar"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function BankForm(props: FormProps) {
  return (
    <PaymentFormCard active={props.active} accent="green" onSave={props.onSave} title="Transferencia Bancaria (CLABE)" type="bank" isSaving={props.isSaving}>
      <WalletField label="Nombre del titular" value={props.draft.accountHolder} placeholder="Ej. Juan Perez Garcia" onChange={(value) => props.onChange("accountHolder", value)} />
      <label className="walletField">
        <span>Nombre del banco</span>
        <select value={props.draft.bankName} onChange={(event) => props.onChange("bankName", event.target.value)}>
          <option value="">Selecciona tu banco</option>
          {bankOptions.map((bank) => (
            <option key={bank} value={bank}>
              {bank}
            </option>
          ))}
        </select>
      </label>
      <WalletField label="CLABE interbancaria" value={props.draft.clabe} placeholder="Ej. 012 180 015012345678 9" onChange={(value) => props.onChange("clabe", onlyDigits(value).slice(0, 18))} />
      <span className={props.draft.clabe.length === 18 ? "walletHelper success" : "walletHelper"}>{props.draft.clabe.length}/18 digitos</span>
      <div className="walletAdvice green">
        <InfoIcon />
        <span>Asegurate de que la CLABE sea correcta. Los pagos se realizaran a esta cuenta.</span>
      </div>
    </PaymentFormCard>
  );
}

function PayPalForm(props: FormProps) {
  return (
    <PaymentFormCard active={props.active} accent="blue" onSave={props.onSave} title="PayPal" type="paypal" isSaving={props.isSaving}>
      <WalletField label="Correo de PayPal" value={props.draft.email} placeholder="Ej. juanperez@correo.com" onChange={(value) => props.onChange("email", value)} />
      <div className="walletAdvice blue">
        <ShieldIcon />
        <div>
          <strong>Consejos importantes</strong>
          <span>Asegurate de usar el correo asociado a tu cuenta PayPal. Los pagos se enviaran a esta direccion.</span>
        </div>
      </div>
    </PaymentFormCard>
  );
}

function PaxumForm(props: FormProps) {
  return (
    <PaymentFormCard active={props.active} accent="red" onSave={props.onSave} title="Paxum" type="paxum" isSaving={props.isSaving}>
      <WalletField label="Nombre del titular" value={props.draft.accountHolder} placeholder="Ej. Juan Perez Garcia" onChange={(value) => props.onChange("accountHolder", value)} />
      <WalletField label="Correo de Paxum" value={props.draft.email} placeholder="Ej. juanperez@paxum.com" onChange={(value) => props.onChange("email", value)} />
      <WalletField label="Numero de cuenta Paxum" value={props.draft.paxumAccount} placeholder="Ej. 1234567" onChange={(value) => props.onChange("paxumAccount", value)} />
      <div className="walletAdvice red">
        <InfoIcon />
        <span>Verifica que tu cuenta Paxum este verificada para recibir pagos sin inconvenientes.</span>
      </div>
    </PaymentFormCard>
  );
}

function CryptoForm(props: FormProps) {
  return (
    <PaymentFormCard active={props.active} accent="purple" onSave={props.onSave} title="Criptomonedas" type="crypto" isSaving={props.isSaving}>
      <label className="walletField">
        <span>Selecciona la criptomoneda</span>
        <select value={props.draft.coin} onChange={(event) => props.onChange("coin", event.target.value)}>
          {coinOptions.map((coin) => (
            <option key={coin} value={coin}>
              {coin}
            </option>
          ))}
        </select>
      </label>
      <WalletField label="Direccion de billetera" value={props.draft.walletAddress} placeholder="Ej. 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" onChange={(value) => props.onChange("walletAddress", value)} />
      <div className="walletAdvice purple">
        <InfoIcon />
        <span>Asegurate de que la red sea la correcta. Los pagos en cripto no son reversibles.</span>
      </div>
    </PaymentFormCard>
  );
}

type FormProps = {
  active: boolean;
  draft: MethodDraft;
  isSaving: boolean;
  onChange: (field: keyof MethodDraft, value: string) => void;
  onSave: () => void | Promise<void>;
};

function PaymentFormCard({
  accent,
  active,
  children,
  isSaving,
  onSave,
  title,
  type
}: {
  accent: "green" | "blue" | "red" | "purple";
  active: boolean;
  children: ReactNode;
  isSaving: boolean;
  onSave: () => void | Promise<void>;
  title: string;
  type: PaymentType;
}) {
  return (
    <article className={active ? `paymentFormCard ${accent} active` : `paymentFormCard ${accent}`}>
      <div className="paymentFormTitle">
        <PaymentBrandIcon type={type} />
        <h3>{title}</h3>
      </div>
      {children}
      <button type="button" onClick={onSave} disabled={isSaving}>
        {isSaving ? "Guardando..." : "Guardar metodo"}
      </button>
    </article>
  );
}

function WalletField({
  label,
  onChange,
  placeholder,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="walletField">
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function buildMethod(type: PaymentType, draft: MethodDraft): Omit<PaymentMethod, "createdAt" | "id" | "isPrimary"> {
  if (type === "bank") {
    return {
      accountHolder: draft.accountHolder.trim(),
      bankName: draft.bankName,
      clabe: draft.clabe,
      type
    };
  }

  if (type === "paypal") {
    return {
      email: draft.email.trim(),
      type
    };
  }

  if (type === "paxum") {
    return {
      accountHolder: draft.accountHolder.trim(),
      email: draft.email.trim(),
      paxumAccount: draft.paxumAccount.trim(),
      type
    };
  }

  return {
    coin: draft.coin,
    type,
    walletAddress: draft.walletAddress.trim()
  };
}

function toApiPayoutMethod(email: string, method: Omit<PaymentMethod, "createdAt" | "id" | "isPrimary">) {
  return {
    accountHolder: method.accountHolder,
    bankName: method.bankName,
    clabe: method.clabe,
    coin: method.coin,
    email,
    paxumAccount: method.paxumAccount,
    payoutEmail: method.email,
    type: method.type.toUpperCase(),
    walletAddress: method.walletAddress
  };
}

function validateDraft(type: PaymentType, draft: MethodDraft) {
  if (type === "bank") {
    if (!draft.accountHolder.trim()) return "Ingresa el nombre del titular.";
    if (!draft.bankName) return "Selecciona el banco.";
    if (draft.clabe.length !== 18) return "La CLABE debe tener 18 digitos.";
  }

  if (type === "paypal" && !isEmail(draft.email)) {
    return "Ingresa un correo valido de PayPal.";
  }

  if (type === "paxum") {
    if (!draft.accountHolder.trim()) return "Ingresa el nombre del titular.";
    if (!isEmail(draft.email)) return "Ingresa un correo valido de Paxum.";
    if (!draft.paxumAccount.trim()) return "Ingresa el numero de cuenta Paxum.";
  }

  if (type === "crypto" && draft.walletAddress.trim().length < 16) {
    return "Ingresa una direccion de billetera valida.";
  }

  return "";
}

function getMethodTitle(method: PaymentMethod) {
  if (method.type === "bank") return "Transferencia Bancaria (CLABE)";
  if (method.type === "paypal") return "PayPal";
  if (method.type === "paxum") return "Paxum";
  return `Criptomonedas (${method.coin?.match(/\(([^)]+)\)/)?.[1] ?? "Wallet"})`;
}

function getWalletSummary(portfolio: PortfolioResponse) {
  const investmentPaymentsTotal = portfolio.investments.reduce((investmentTotal, investment) => {
    const paymentTotal = investment.payments?.reduce((total, payment) => total + Number(payment.amount), 0) ?? 0;
    return investmentTotal + paymentTotal;
  }, 0);
  const walletPaymentsTotal = portfolio.walletPayments?.reduce((total, payment) => total + Number(payment.amount), 0) ?? 0;

  return {
    availableBalance: roundWalletAmount(investmentPaymentsTotal + walletPaymentsTotal)
  };
}

function getScheduledPayments(portfolio: PortfolioResponse) {
  return portfolio.investments
    .flatMap((investment, investmentIndex) =>
      (investment.weeks ?? []).flatMap((week) => {
        const paidWeeks = investment.paidWeeks ?? 0;
        const isCompleted = week.weekNumber <= paidWeeks;

        if (!isCompleted) {
          return [];
        }

        const paidAmount = getPaidWeekAmount(investment.payments ?? [], week.weekNumber);

        return [{
          amount: roundWalletAmount(paidAmount),
          dateLabel: formatWalletDate(new Date(week.paymentAt)),
          group: investment.group,
          investmentIndex,
          label: "Completado",
          status: "completed",
          weekNumber: week.weekNumber
        }];
      })
    )
    .sort((current, next) => {
      return current.investmentIndex - next.investmentIndex || current.weekNumber - next.weekNumber;
    })
    .slice(0, 4);
}

function getPaidWeekAmount(payments: PortfolioPayment[], weekNumber: number) {
  const payment = payments.find((currentPayment) => currentPayment.notes?.toLowerCase().startsWith(`semana ${weekNumber}:`));
  return Number(payment?.amount ?? 0);
}

function roundWalletAmount(amount: number) {
  return Math.round(amount * 100) / 100;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(amount);
}

function formatWalletDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getMethodInfo(method: PaymentMethod) {
  if (method.type === "bank") {
    return `Banco: ${method.bankName} | CLABE: ${maskValue(method.clabe ?? "")}`;
  }

  if (method.type === "paypal") {
    return `Correo: ${method.email}`;
  }

  if (method.type === "paxum") {
    return `Cuenta: ${method.paxumAccount} | Correo: ${method.email}`;
  }

  return `Direccion: ${maskValue(method.walletAddress ?? "", 8, 6)}`;
}

function maskValue(value: string, start = 4, end = 4) {
  if (value.length <= start + end) {
    return value;
  }

  return `${value.slice(0, start)} **** **** ${value.slice(-end)}`;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function getResponseErrorMessage(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? "No se pudo procesar la solicitud.";
}

function PaymentBrandIcon({ type }: { type: PaymentType }) {
  if (type === "paypal") {
    return <span className="paymentBrandIcon paypal">P</span>;
  }

  if (type === "paxum") {
    return <span className="paymentBrandIcon paxum">PAXUM</span>;
  }

  if (type === "crypto") {
    return (
      <span className="cryptoIconStack" aria-hidden="true">
        <i>BTC</i>
        <i>ETH</i>
        <i>SOL</i>
      </span>
    );
  }

  return (
    <span className="paymentBrandIcon bank" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M3 9.4 12 4l9 5.4v1.8H3Zm2 3.2h3v6H5Zm5.5 0h3v6h-3Zm5.5 0h3v6h-3ZM4 20h16v2H4Z" />
      </svg>
    </span>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.6 20 6v5.8c0 5-3.2 8.6-8 10-4.8-1.4-8-5-8-10V6Zm0 2.2L6 7.3v4.5c0 3.7 2.2 6.5 6 7.7 3.8-1.2 6-4 6-7.7V7.3Zm4.2 5-5 5-2.5-2.5 1.3-1.3 1.2 1.2 3.7-3.7Z" />
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

function CheckBadgeIcon() {
  return (
    <svg className="checkBadgeIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.7 7.6-5.6 5.6-3-3 1.4-1.4 1.6 1.6 4.2-4.2Z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 10h2v7h-2Zm0-3h2v2h-2Zm1-5a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
    </svg>
  );
}

function WithdrawIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 4h2v8.2l2.8-2.8 1.4 1.4L12 16l-5.2-5.2 1.4-1.4 2.8 2.8Zm-6 13h2v2h10v-2h2v4H5Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2h2v3h6V2h2v3h3a1 1 0 0 1 1 1v15H3V6a1 1 0 0 1 1-1h3Zm12 8H5v9h14ZM5 8h14V7H5Zm2 4h3v3H7Zm5 0h3v3h-3Z" />
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9.2 16.2-4-4 1.4-1.4 2.6 2.6 8.2-8.2 1.4 1.4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 3h8l1 2h4v2H3V5h4Zm1 6h2v9H9Zm4 0h2v9h-2Zm4 0h2v9h-2ZM6 9h2l1 11h10l1-11h2l-1.2 12.2c-.1.6-.6 1-1.2 1H8.4c-.6 0-1.1-.4-1.2-1Z" />
    </svg>
  );
}
