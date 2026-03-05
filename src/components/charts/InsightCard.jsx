export default function InsightCard({ icon, title, sub, accent }) {
  return (
    <div className={`insight-card${accent ? " accent" : ""}`}>
      <div className="insight-icon">{icon}</div>
      <div>
        <div className="insight-title">{title}</div>
        <div className="insight-sub">{sub}</div>
      </div>
    </div>
  );
}
