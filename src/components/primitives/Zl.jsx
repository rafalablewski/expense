import { useAppData } from "../../contexts/AppDataContext";
import { convertAmt } from "../../utils/helpers";
import { FX_SYMBOLS } from "../../config/defaults";

export default function Zl({ v, size = 14 }) {
  const { currency } = useAppData();
  const sym = FX_SYMBOLS[currency] || "zł";
  if (v == null || v === "") return <span className="zl-dash">—</span>;
  return (
    <span className="mono" style={{ fontSize: size }}>
      {convertAmt(v, currency)}<span className="zl-unit" style={{ fontSize: size - 2 }}> {sym}</span>
    </span>
  );
}
