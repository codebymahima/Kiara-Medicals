/** Single-line medicine batch row for billing & unbilled search results */
export function MedicineSearchRow({ item, onAddPack, onAddUnit }) {
  const packLabel = item.stock_unit_label || "pack";
  const unitLabel = item.smallest_unit_label || "unit";

  return (
    <div className="medicine-search-row">
      <div className="medicine-search-row-text">
        <span className="medicine-search-row-name">{item.product_name}</span>
        <span className="medicine-search-row-meta">
          {item.brand || item.salt_name || "—"} · Batch {item.batch_number} · Exp{" "}
          {item.expiry_date ? String(item.expiry_date).slice(0, 10) : "—"} · ₹
          {Number(item.selling_price).toFixed(2)}/{packLabel} ·{" "}
          {item.available_smallest_units} {unitLabel}
        </span>
      </div>
      <div className="medicine-search-row-actions">
        <button
          type="button"
          className="medicine-search-row-btn"
          onClick={() => onAddPack(item)}
        >
          +1 {packLabel}
        </button>
        <button
          type="button"
          className="medicine-search-row-btn"
          onClick={() => onAddUnit(item)}
        >
          +1 {unitLabel}
        </button>
      </div>
    </div>
  );
}
