"use client";

import type { ReactNode, UIEvent } from "react";
import { useEffect, useState } from "react";

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
  const [selectedType, setSelectedType] = useState<PaymentType>("bank");
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [draft, setDraft] = useState<MethodDraft>(initialDraft);
  const [error, setError] = useState("");
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [isSavingMethod, setIsSavingMethod] = useState(false);
  const [savedCarouselIndex, setSavedCarouselIndex] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function loadMethods() {
      setIsLoadingMethods(true);
      setError("");

      try {
        const response = await fetch(`/api/payout-methods?email=${encodeURIComponent(userEmail)}`);

        if (!response.ok) {
          throw new Error(await getResponseErrorMessage(response));
        }

        const data = (await response.json()) as PaymentMethod[];

        if (isCurrent) {
          setMethods(data);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar tus metodos de pago.");
        }
      } finally {
        if (isCurrent) {
          setIsLoadingMethods(false);
        }
      }
    }

    loadMethods();

    return () => {
      isCurrent = false;
    };
  }, [userEmail]);

  function updateDraft(field: keyof MethodDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function selectType(type: PaymentType) {
    setSelectedType(type);
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

      setMethods((current) => current.map((method) => ({ ...method, isPrimary: method.id === id })));
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
    const element = event.currentTarget;
    const nextIndex = Math.round(element.scrollLeft / Math.max(1, element.clientWidth));
    setSavedCarouselIndex(nextIndex);
  }

  return (
    <>
      <section className="walletSecurityPanel">
        <div className="walletSecurityItem">
          <ShieldIcon />
          <div>
            <strong>La seguridad de tu informacion es nuestra prioridad</strong>
            <span>Tu informacion financiera esta cifrada y protegida. Solo tu puedes ver tus datos.</span>
          </div>
        </div>
        <div className="walletSecurityItem compact">
          <LockIcon />
          <div>
            <strong>Conexion segura</strong>
            <span>Tus datos estan protegidos</span>
          </div>
        </div>
      </section>

      <section className="walletPanel">
        <div className="walletSectionHeader">
          <div>
            <h2>Metodos de pago</h2>
            <p>Agrega y administra los metodos donde recibiras tus pagos.</p>
          </div>
        </div>

        <div className="paymentTypeGrid">
          {methodOptions.map((option) => (
            <button
              className={selectedType === option.type ? "paymentTypeCard active" : "paymentTypeCard"}
              key={option.type}
              onClick={() => selectType(option.type)}
              type="button"
            >
              <PaymentBrandIcon type={option.type} />
              <div>
                <strong>{option.label}</strong>
                {option.tag ? <span>{option.tag}</span> : null}
                <p>{option.description}</p>
              </div>
              {selectedType === option.type ? <CheckBadgeIcon /> : null}
            </button>
          ))}
        </div>
        <CarouselDots
          activeIndex={methodOptions.findIndex((option) => option.type === selectedType)}
          count={methodOptions.length}
        />

        <p className="walletInfoNote">
          <InfoIcon />
          Puedes agregar mas de un metodo de pago. Elige tu metodo principal para recibir tus ganancias.
        </p>

        <div className="paymentFormGrid">
          <BankForm
            active={selectedType === "bank"}
            draft={draft}
            onChange={updateDraft}
            onSave={saveMethod}
            isSaving={isSavingMethod}
          />
          <PayPalForm
            active={selectedType === "paypal"}
            draft={draft}
            onChange={updateDraft}
            onSave={saveMethod}
            isSaving={isSavingMethod}
          />
          <PaxumForm
            active={selectedType === "paxum"}
            draft={draft}
            onChange={updateDraft}
            onSave={saveMethod}
            isSaving={isSavingMethod}
          />
          <CryptoForm
            active={selectedType === "crypto"}
            draft={draft}
            onChange={updateDraft}
            onSave={saveMethod}
            isSaving={isSavingMethod}
          />
        </div>
        {error ? <p className="walletError">{error}</p> : null}
      </section>

      <section className="walletPanel savedMethodsPanel">
        <div className="walletSectionHeader">
          <div>
            <h2>Mis metodos guardados</h2>
            <p>Estos son los metodos donde puedes recibir tus pagos.</p>
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
          <div className="savedMethodsTable" onScroll={updateSavedCarouselIndex}>
            <div className="savedMethodsHead">
              <span>Metodo</span>
              <span>Informacion</span>
              <span>Principal</span>
              <span>Acciones</span>
            </div>
            {methods.map((method) => (
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
          <CarouselDots activeIndex={savedCarouselIndex} count={methods.length} />
          </>
        )}
      </section>
    </>
  );
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

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 3h8l1 2h4v2H3V5h4Zm1 6h2v9H9Zm4 0h2v9h-2Zm4 0h2v9h-2ZM6 9h2l1 11h10l1-11h2l-1.2 12.2c-.1.6-.6 1-1.2 1H8.4c-.6 0-1.1-.4-1.2-1Z" />
    </svg>
  );
}
