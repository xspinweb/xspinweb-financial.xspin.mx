const settings = [
  ["Duracion del ciclo", "8 semanas"],
  ["Reinversion minima", "82%"],
  ["Nivel Starter", "13% rendimiento / 5% bono"],
  ["Nivel Builder", "16% rendimiento / 5.3% bono"],
  ["Nivel Elite", "17.5% rendimiento / 6% bono"],
  ["Nivel Legend", "18.2% rendimiento / 6.2% bono"],
  ["Metodos de pago", "Banco, PayPal, Paxum, Criptomonedas"]
];

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <section className="adminPanel adminRoutePage">
      <div className="adminPanelHeader">
        <div>
          <span className="adminEyebrow">Configuracion</span>
          <h1>Reglas del sistema</h1>
        </div>
      </div>
      <div className="adminSettingsGrid">
        {settings.map(([label, value]) => (
          <article className="adminMini" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
