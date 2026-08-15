import "./Spinner.css";

export default function Spinner({ size = "medium", color = "#1D9E75" }) {
  return (
    <div className={`spinner-wrapper spinner-${size}`}>
      <div className="spinner" style={{ borderTopColor: color }} />
    </div>
  );
}
