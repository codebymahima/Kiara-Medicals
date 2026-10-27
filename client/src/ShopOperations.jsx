import { useCallback, useEffect, useState } from "react";
import { MedicineSearchRow } from "./MedicineSearchRow.jsx";

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function readJsonResponse(response, fallbackMessage) {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      fallbackMessage ||
        "Server returned HTML instead of JSON. Is the API running on port 5001?"
    );
  }
}

function MetricGrid({ title, data, highlight }) {
  if (!data) return null;
  return (
    <article
      className={`metric-period-card${highlight ? " metric-period-card-highlight" : ""}`}
    >
      <h3>{title}</h3>
      <div className="metric-period-rows">
        <div className="metric-period-row">
          <span>Billed sales</span>
          <strong>₹{Number(data.grossBilled || 0).toFixed(2)}</strong>
        </div>
        <div className="metric-period-row">
          <span>Stock purchases</span>
          <strong className="metric-purchase">
            ₹{Number(data.stockPurchases || 0).toFixed(2)}
          </strong>
        </div>
        <div className="metric-period-row">
          <span>Unbilled sales</span>
          <strong>₹{Number(data.unbilledTotal || 0).toFixed(2)}</strong>
        </div>
        <div className="metric-period-row">
          <span>Customer returns</span>
          <strong>− ₹{Number(data.customerReturns || 0).toFixed(2)}</strong>
        </div>
        <div className="metric-period-row metric-period-net">
          <span>Net sales</span>
          <strong>₹{Number(data.netTotal || 0).toFixed(2)}</strong>
        </div>
      </div>
    </article>
  );
}

function useBranchAnalytics(apiUrl, token) {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/analytics/branch`, {
          headers: headers(token),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load analytics.");
        setAnalytics(data.analytics);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [apiUrl, token]);

  return { analytics, error };
}

export function ShopDashboard({ apiUrl, token, branchName, userName }) {
  const { analytics, error } = useBranchAnalytics(apiUrl, token);
  const [alertCounts, setAlertCounts] = useState({ low: 0, expiry: 0 });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/alerts`, {
          headers: headers(token),
        });
        const data = await res.json();
        if (res.ok) {
          setAlertCounts({
            low: (data.lowStock || []).length,
            expiry: (data.expiryAlerts || []).length,
          });
        }
      } catch {
        /* optional */
      }
    })();
  }, [apiUrl, token]);

  const month = analytics?.month;

  return (
    <>
      <section className="dashboard-hero">
        <div className="dashboard-hero-text">
          <p className="eyebrow">Branch dashboard</p>
          <h2>{branchName || "Your branch"}</h2>
          <p>Welcome back, {userName}. Here is how your shop is performing.</p>
        </div>
        <span className="role-badge">Shop</span>
      </section>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-kpi-grid">
        <article className="stat-card stat-card-sales">
          <span className="stat-card-label">Net sales (this month)</span>
          <p className="stat-card-value">
            ₹{Number(month?.netTotal || 0).toFixed(2)}
          </p>
          <span className="stat-card-hint">Billed + unbilled − returns</span>
        </article>
        <article className="stat-card stat-card-purchase">
          <span className="stat-card-label">Stock purchases (this month)</span>
          <p className="stat-card-value">
            ₹{Number(month?.stockPurchases || 0).toFixed(2)}
          </p>
          <span className="stat-card-hint">Supplier invoices recorded</span>
        </article>
        <article className="stat-card stat-card-alert">
          <span className="stat-card-label">Alerts</span>
          <p className="stat-card-value">
            {alertCounts.low + alertCounts.expiry}
          </p>
          <span className="stat-card-hint">
            {alertCounts.low} low stock · {alertCounts.expiry} expiry
          </span>
        </article>
      </div>

      {!analytics && !error && <p className="empty-state">Loading metrics…</p>}

      <div className="dashboard-section-head">
        <h3>Sales & purchases by period</h3>
        <p>Includes monthly stock purchase totals from purchase entries.</p>
      </div>
      <div className="dashboard-grid dashboard-grid-metrics">
        <MetricGrid title={analytics?.day?.label || "Today"} data={analytics?.day} />
        <MetricGrid
          title={analytics?.week?.label || "This week"}
          data={analytics?.week}
        />
        <MetricGrid
          title={analytics?.month?.label || "This month"}
          data={analytics?.month}
          highlight
        />
      </div>
    </>
  );
}

export function ShopAnalytics({ apiUrl, token }) {
  const { analytics, error } = useBranchAnalytics(apiUrl, token);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">REPORTS</p>
          <h2>Branch analytics</h2>
          <p>Daily, weekly, and monthly sales and stock purchases.</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      {!analytics && !error && <p className="empty-state">Loading…</p>}
      <div className="dashboard-grid dashboard-grid-metrics">
        <MetricGrid title={analytics?.day?.label || "Today"} data={analytics?.day} />
        <MetricGrid title={analytics?.week?.label || "This week"} data={analytics?.week} />
        <MetricGrid
          title={analytics?.month?.label || "This month"}
          data={analytics?.month}
          highlight
        />
      </div>
    </>
  );
}

export function ShopAlerts({ apiUrl, token }) {
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/alerts`, { headers: headers(token) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load alerts.");
        setAlerts(data);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [apiUrl, token]);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ALERTS</p>
          <h2>Low stock & expiry</h2>
          <p>Threshold: ≤10 units · Expiry window: 30 days (FR-30, FR-31).</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="table-card">
        <h3>Low stock medicines</h3>
        {!alerts?.lowStock?.length ? (
          <p className="empty-state">No low-stock alerts.</p>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Total units left</th>
              </tr>
            </thead>
            <tbody>
              {alerts.lowStock.map((row) => (
                <tr key={`${row.product_id}-${row.branch_id}`}>
                  <td>{row.product_name}</td>
                  <td>{row.total_smallest_units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="table-card">
        <h3>Expiry alerts</h3>
        {!alerts?.expiryAlerts?.length ? (
          <p className="empty-state">No batches expiring within 30 days.</p>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Batch</th>
                <th>Expiry</th>
                <th>Days left</th>
              </tr>
            </thead>
            <tbody>
              {alerts.expiryAlerts.map((row) => (
                <tr key={row.batch_id}>
                  <td>{row.product_name}</td>
                  <td>{row.batch_number}</td>
                  <td>{String(row.expiry_date).slice(0, 10)}</td>
                  <td>{row.days_to_expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

const emptyPurchaseLine = () => ({
  productId: "",
  batchNumber: "",
  expiryDate: "",
  quantityPacks: "1",
  purchasePrice: "",
  mrp: "",
  sellingPrice: "",
});

export function PurchaseStock({ apiUrl, token }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [header, setHeader] = useState({
    supplierId: "",
    supplierInvoiceNumber: "",
    paymentMethod: "CASH",
  });
  const [lineDraft, setLineDraft] = useState(emptyPurchaseLine());
  const [productFilter, setProductFilter] = useState("");
  const [cart, setCart] = useState([]);
  const [newSupplier, setNewSupplier] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [sRes, pRes, hRes] = await Promise.all([
      fetch(`${apiUrl}/api/purchases/suppliers`, { headers: headers(token) }),
      fetch(`${apiUrl}/api/products`, { headers: headers(token) }),
      fetch(`${apiUrl}/api/purchases`, { headers: headers(token) }),
    ]);
    const sData = await sRes.json();
    const pData = await pRes.json();
    const hData = await hRes.json();
    if (sRes.ok) setSuppliers(sData.suppliers || []);
    if (pRes.ok) setProducts(pData.products || []);
    if (hRes.ok) setHistory(hData.purchases || []);
  }, [apiUrl, token]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  async function addSupplier(event) {
    event.preventDefault();
    setError("");
    try {
      const res = await fetch(`${apiUrl}/api/purchases/suppliers`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ supplierName: newSupplier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setNewSupplier("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredProducts = products.filter((p) => {
    const q = productFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      String(p.product_name || "").toLowerCase().includes(q) ||
      String(p.brand || "").toLowerCase().includes(q)
    );
  });

  const cartLineTotal = (line) =>
    Number(line.purchasePrice || 0) * Number(line.quantityPacks || 0);

  const purchaseGrandTotal = cart.reduce(
    (sum, line) => sum + cartLineTotal(line),
    0
  );

  function addLineToCart(event) {
    event.preventDefault();
    setError("");
    if (!lineDraft.productId) {
      setError("Select a medicine for this line.");
      return;
    }
    if (!lineDraft.batchNumber.trim()) {
      setError("Batch number is required.");
      return;
    }
    const product = products.find(
      (p) => Number(p.product_id) === Number(lineDraft.productId)
    );
    setCart((prev) => [
      ...prev,
      {
        ...lineDraft,
        productName: product?.product_name || "Medicine",
        quantityPacks: Number(lineDraft.quantityPacks) || 1,
        purchasePrice: Number(lineDraft.purchasePrice),
        mrp: Number(lineDraft.mrp),
        sellingPrice: Number(lineDraft.sellingPrice || lineDraft.mrp),
      },
    ]);
    setLineDraft(emptyPurchaseLine());
    setProductFilter("");
  }

  async function savePurchase(event) {
    event.preventDefault();
    if (!cart.length) {
      setError("Add at least one medicine line to the purchase.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        supplierId: Number(header.supplierId),
        supplierInvoiceNumber: header.supplierInvoiceNumber,
        paymentMethod: header.paymentMethod,
        clientTransactionId: crypto.randomUUID(),
        items: cart.map((line) => ({
          productId: Number(line.productId),
          batchNumber: line.batchNumber.trim(),
          expiryDate: line.expiryDate || null,
          quantityPacks: Number(line.quantityPacks),
          purchasePrice: Number(line.purchasePrice),
          mrp: Number(line.mrp),
          sellingPrice: Number(line.sellingPrice || line.mrp),
        })),
      };
      const res = await fetch(`${apiUrl}/api/purchases`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Purchase failed.");
      setMessage(
        `${data.message || "Purchase saved."} Total ₹${Number(data.grandTotal).toFixed(2)} (${cart.length} line(s)).`
      );
      setCart([]);
      setLineDraft(emptyPurchaseLine());
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">INVENTORY</p>
          <h2>Purchase stock</h2>
          <p>Supplier → invoice → batch → stock update (SRS 4.3).</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      {message && <div className="notice-card">{message}</div>}

      <div className="billing-card">
        <h3>Add supplier</h3>
        <form className="billing-search" onSubmit={addSupplier}>
          <input
            value={newSupplier}
            onChange={(e) => setNewSupplier(e.target.value)}
            placeholder="Supplier name"
            required
          />
          <button type="submit" className="secondary-button">
            Save supplier
          </button>
        </form>
      </div>

      <div className="billing-card">
        <h3>Purchase header</h3>
        <div className="billing-grid">
          <label>
            Supplier *
            <select
              required
              value={header.supplierId}
              onChange={(e) =>
                setHeader({ ...header, supplierId: e.target.value })
              }
            >
              <option value="">Select</option>
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.supplier_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Purchase invoice no. *
            <input
              required
              value={header.supplierInvoiceNumber}
              onChange={(e) =>
                setHeader({ ...header, supplierInvoiceNumber: e.target.value })
              }
            />
          </label>
          <label>
            Payment
            <select
              value={header.paymentMethod}
              onChange={(e) =>
                setHeader({ ...header, paymentMethod: e.target.value })
              }
            >
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </label>
        </div>
      </div>

      <div className="billing-card">
        <h3>Add medicine line</h3>
        <p className="billing-search-hint">
          Add each medicine/batch on this supplier invoice, then save once.
        </p>
        <form className="billing-grid" onSubmit={addLineToCart}>
          <label>
            Search medicine
            <input
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              placeholder="Filter by name or brand…"
            />
          </label>
          <label>
            Product *
            <select
              required
              value={lineDraft.productId}
              onChange={(e) =>
                setLineDraft({ ...lineDraft, productId: e.target.value })
              }
            >
              <option value="">Select medicine</option>
              {filteredProducts.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name}
                  {p.brand ? ` (${p.brand})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Batch number *
            <input
              required
              value={lineDraft.batchNumber}
              onChange={(e) =>
                setLineDraft({ ...lineDraft, batchNumber: e.target.value })
              }
            />
          </label>
          <label>
            Expiry date
            <input
              type="date"
              value={lineDraft.expiryDate}
              onChange={(e) =>
                setLineDraft({ ...lineDraft, expiryDate: e.target.value })
              }
            />
          </label>
          <label>
            Qty (packs) *
            <input
              type="number"
              min="1"
              required
              value={lineDraft.quantityPacks}
              onChange={(e) =>
                setLineDraft({ ...lineDraft, quantityPacks: e.target.value })
              }
            />
          </label>
          <label>
            Purchase price / pack *
            <input
              type="number"
              step="0.01"
              required
              value={lineDraft.purchasePrice}
              onChange={(e) =>
                setLineDraft({ ...lineDraft, purchasePrice: e.target.value })
              }
            />
          </label>
          <label>
            MRP *
            <input
              type="number"
              step="0.01"
              required
              value={lineDraft.mrp}
              onChange={(e) =>
                setLineDraft({ ...lineDraft, mrp: e.target.value })
              }
            />
          </label>
          <label>
            Selling price / pack
            <input
              type="number"
              step="0.01"
              value={lineDraft.sellingPrice}
              onChange={(e) =>
                setLineDraft({ ...lineDraft, sellingPrice: e.target.value })
              }
            />
          </label>
          <button type="submit" className="secondary-button">
            Add line to purchase
          </button>
        </form>
      </div>

      <form className="billing-card" onSubmit={savePurchase}>
        <h3>Purchase lines ({cart.length})</h3>
        {cart.length === 0 ? (
          <p className="empty-state">No lines yet — add medicines above.</p>
        ) : (
          <>
            <div className="table-scroll">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Batch</th>
                    <th>Packs</th>
                    <th>Rate/pack</th>
                    <th>Line total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line, index) => (
                    <tr key={`${line.productId}-${line.batchNumber}-${index}`}>
                      <td>{line.productName}</td>
                      <td>{line.batchNumber}</td>
                      <td>{line.quantityPacks}</td>
                      <td>₹{Number(line.purchasePrice).toFixed(2)}</td>
                      <td>₹{cartLineTotal(line).toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          className="remove-item-button"
                          onClick={() =>
                            setCart((p) => p.filter((_, i) => i !== index))
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="checkout-total supplier-return-total">
              <span>Purchase total</span>
              <strong>₹{purchaseGrandTotal.toFixed(2)}</strong>
            </div>
            <button
              type="submit"
              className="primary-button save-bill-button"
              disabled={saving || !header.supplierId || !header.supplierInvoiceNumber.trim()}
            >
              {saving ? "Saving…" : "Save purchase & update stock"}
            </button>
          </>
        )}
      </form>

      <div className="table-card">
        <h3>Purchase history</h3>
        <table className="products-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Supplier</th>
              <th>Invoice</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {history.map((p) => (
              <tr key={p.purchase_id}>
                <td>{String(p.purchase_datetime).slice(0, 19)}</td>
                <td>{p.supplier_name}</td>
                <td>{p.supplier_invoice_number}</td>
                <td>₹{Number(p.grand_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function UnbilledSale({ apiUrl, token, searchMedicines }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [notes, setNotes] = useState("");
  const [billDiscount, setBillDiscount] = useState("0");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setError("");
      try {
        const meds = await searchMedicines(query);
        setResults(meds || []);
      } catch (err) {
        setError(err.message);
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchMedicines]);

  function addLine(medicineResult, unit = "smallest") {
    const packSize = Number(medicineResult.units_per_stock_unit || 1);
    const availableUnits = Number(
      medicineResult.available_smallest_units || 0
    );
    if (availableUnits <= 0) {
      setError("No stock available for this batch.");
      return;
    }
    setError("");
    setCart((previous) => {
      const existing = previous.find(
        (item) => Number(item.batch_id) === Number(medicineResult.batch_id)
      );
      if (existing) {
        return previous.map((item) =>
          Number(item.batch_id) === Number(medicineResult.batch_id)
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + (unit === "pack" ? packSize : 1),
                  availableUnits
                ),
              }
            : item
        );
      }
      return [
        ...previous,
        {
          ...medicineResult,
          quantity: unit === "pack" ? packSize : 1,
          packSize,
          availableUnits,
          discountAmount: 0,
          gstRate: 5,
        },
      ];
    });
  }

  function updateCartItem(batchId, changes) {
    setCart((previous) =>
      previous.map((item) =>
        Number(item.batch_id) === Number(batchId)
          ? { ...item, ...changes }
          : item
      )
    );
  }

  function removeCartItem(batchId) {
    setCart((previous) =>
      previous.filter((item) => Number(item.batch_id) !== Number(batchId))
    );
  }

  const cartSubtotal = cart.reduce((sum, item) => {
    const unitPrice =
      Number(item.selling_price || 0) / Number(item.packSize || 1);
    return sum + unitPrice * Number(item.quantity || 0);
  }, 0);

  const cartItemDiscount = cart.reduce(
    (sum, item) => sum + Number(item.discountAmount || 0),
    0
  );

  const totalBeforeBillDiscount = Math.max(
    0,
    cartSubtotal - cartItemDiscount
  );

  const finalTotal = Math.max(
    0,
    totalBeforeBillDiscount - Number(billDiscount || 0)
  );

  async function submit() {
    if (!cart.length) {
      setError("Add at least one item.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/billing/unbilled`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({
          clientTransactionId: crypto.randomUUID(),
          paymentMethod: "NOT_RECORDED",
          notes,
          billDiscount: Number(billDiscount || 0),
          items: cart.map((c) => ({
            batchId: c.batch_id,
            quantity: c.quantity,
            discountAmount: Number(c.discountAmount || 0),
            gstRate: Number(c.gstRate || 5),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage(
        `Unbilled sale saved — ₹${Number(data.grandTotal ?? finalTotal).toFixed(2)}`
      );
      setCart([]);
      setNotes("");
      setBillDiscount("0");
      setSearch("");
      setResults([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SALES</p>
          <h2>Unbilled sale</h2>
          <p>Reduce stock without a customer invoice.</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      {message && <div className="notice-card">{message}</div>}

      <div className="billing-card">
        <h3>Search medicine</h3>
        <form
          className="billing-search"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type medicine, brand or salt (min 2 letters)…"
            autoComplete="off"
          />
        </form>
        {search.trim().length > 0 && search.trim().length < 2 && (
          <p className="billing-search-hint">
            Enter at least 2 characters to search.
          </p>
        )}
        {searchLoading && <p className="billing-search-hint">Searching…</p>}
        {!searchLoading &&
          search.trim().length >= 2 &&
          results.length === 0 && (
            <p className="empty-state billing-no-results">No matches found.</p>
          )}
        {results.length > 0 && (
          <div className="billing-results">
            {results.map((item) => (
              <MedicineSearchRow
                key={item.batch_id}
                item={item}
                onAddPack={(row) => addLine(row, "pack")}
                onAddUnit={(row) => addLine(row, "smallest")}
              />
            ))}
          </div>
        )}
      </div>

      <div className="billing-card">
        <h3>Bill items</h3>
        {cart.length === 0 ? (
          <p className="empty-state">Search and add medicines above.</p>
        ) : (
          <>
            <div className="table-scroll">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Qty (smallest units)</th>
                    <th>Discount (₹)</th>
                    <th>Line total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => {
                    const unitPrice =
                      Number(item.selling_price) / item.packSize;
                    const lineTotal = Math.max(
                      0,
                      unitPrice * item.quantity -
                        Number(item.discountAmount || 0)
                    );
                    return (
                      <tr key={item.batch_id}>
                        <td>
                          <strong>{item.product_name}</strong>
                          <small>
                            Batch {item.batch_number} · ₹
                            {unitPrice.toFixed(2)} per{" "}
                            {item.smallest_unit_label || "unit"}
                          </small>
                        </td>
                        <td>
                          <input
                            className="billing-number"
                            type="number"
                            min="1"
                            max={item.availableUnits}
                            value={item.quantity}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              updateCartItem(item.batch_id, {
                                quantity: Math.max(
                                  1,
                                  Math.min(value || 1, item.availableUnits)
                                ),
                              });
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="billing-number"
                            type="number"
                            min="0"
                            max={unitPrice * item.quantity}
                            step="0.01"
                            value={item.discountAmount}
                            onChange={(event) =>
                              updateCartItem(item.batch_id, {
                                discountAmount: Math.max(
                                  0,
                                  Number(event.target.value || 0)
                                ),
                              })
                            }
                          />
                        </td>
                        <td>₹{lineTotal.toFixed(2)}</td>
                        <td>
                          <button
                            type="button"
                            className="remove-item-button"
                            onClick={() => removeCartItem(item.batch_id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="billing-checkout-panel">
              <label>
                Notes (optional)
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason or reference…"
                />
              </label>
              <div className="billing-checkout-fields">
                <label>
                  Bill discount (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={billDiscount}
                    onChange={(e) => setBillDiscount(e.target.value)}
                  />
                </label>
              </div>
              <div className="checkout-total">
                <span>Subtotal</span>
                <strong>₹{cartSubtotal.toFixed(2)}</strong>
                <span>Line discounts</span>
                <strong>− ₹{cartItemDiscount.toFixed(2)}</strong>
                <span>Bill discount</span>
                <strong>− ₹{Number(billDiscount || 0).toFixed(2)}</strong>
                <span>Total</span>
                <strong>₹{finalTotal.toFixed(2)}</strong>
              </div>
              <button
                type="button"
                className="primary-button save-bill-button"
                disabled={saving}
                onClick={submit}
              >
                {saving ? "Saving…" : "Record unbilled sale"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function PastBills({ apiUrl, token }) {
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadHistory = useCallback(
    async (term) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        const query = term.trim();
        if (query) params.set("search", query);
        const res = await fetch(
          `${apiUrl}/api/billing/history?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Unable to load bill history.");
        }
        setSales(Array.isArray(data.sales) ? data.sales : []);
      } catch (err) {
        setError(
          err.message === "Failed to fetch"
            ? "Could not reach the server. Is the backend running?"
            : err.message
        );
        setSales([]);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl, token]
  );

  useEffect(() => {
    loadHistory("");
  }, [loadHistory]);

  function runSearch(event) {
    event.preventDefault();
    const query = searchDraft.trim();
    setAppliedSearch(query);
    loadHistory(query);
  }

  function showAllBills() {
    setSearchDraft("");
    setAppliedSearch("");
    loadHistory("");
  }

  async function openBill(saleId) {
    setSelectedId(saleId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/billing/${saleId}`, {
        headers: headers(token),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setDetail(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SALES</p>
          <h2>Past bills</h2>
          <p>Search by patient name, mobile, or invoice number.</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}

      <div className="billing-card">
        <h3>Search bills</h3>
        <form className="billing-search" onSubmit={runSearch}>
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Patient name, mobile, or invoice…"
            autoComplete="off"
          />
          <button
            type="submit"
            className="primary-button billing-search-btn"
            disabled={loading}
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>
        <div className="past-bills-toolbar">
          <button
            type="button"
            className="secondary-button medicine-add-btn"
            onClick={showAllBills}
            disabled={loading}
          >
            Show all recent
          </button>
          {!loading && sales.length > 0 && (
            <span className="billing-search-hint past-bills-count">
              {appliedSearch
                ? `${sales.length} match(es) for “${appliedSearch}”`
                : `${sales.length} recent bill(s)`}
            </span>
          )}
        </div>
        {loading && <p className="billing-search-hint">Loading…</p>}
        {!loading && sales.length === 0 && (
          <p className="empty-state">
            {appliedSearch
              ? `No bills found for “${appliedSearch}”. Try invoice number or mobile.`
              : "No billed sales yet for this branch."}
          </p>
        )}
        {sales.length > 0 && (
          <div className="table-scroll past-bills-table">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Patient</th>
                  <th>Mobile</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((row) => (
                  <tr
                    key={row.sale_id}
                    className={
                      selectedId === row.sale_id ? "past-bill-row-active" : ""
                    }
                  >
                    <td>{String(row.sale_datetime).slice(0, 16)}</td>
                    <td>{row.invoice_number || `#${row.sale_id}`}</td>
                    <td>{row.patientName || "—"}</td>
                    <td>{row.patientMobile || "—"}</td>
                    <td>₹{Number(row.grand_total).toFixed(2)}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button medicine-add-btn"
                        onClick={() => openBill(row.sale_id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <div className="billing-card">
          <h3>Bill detail</h3>
          {detailLoading && <p className="billing-search-hint">Loading…</p>}
          {detail?.sale && (
            <>
              <p>
                <strong>{detail.sale.invoice_number}</strong> ·{" "}
                {String(detail.sale.sale_datetime).slice(0, 19)} ·{" "}
                {detail.sale.payment_method}
              </p>
              {detail.sale.notes && (
                <p className="past-bill-notes">{detail.sale.notes}</p>
              )}
              <div className="table-scroll">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Batch</th>
                      <th>Qty</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.items || []).map((line) => (
                      <tr key={line.sale_item_id}>
                        <td>{line.product_name_snapshot}</td>
                        <td>{line.batch_number_snapshot}</td>
                        <td>{line.quantity}</td>
                        <td>₹{Number(line.line_total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="invoice-total">
                Grand total: ₹{Number(detail.sale.grand_total).toFixed(2)}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}

export function CustomerReturn({ apiUrl, token }) {
  const [bills, setBills] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [bill, setBill] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [successPopup, setSuccessPopup] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${apiUrl}/api/billing/recent`, {
        headers: headers(token),
      });
      const data = await res.json();
      if (res.ok) setBills(data.sales || []);
    })();
  }, [apiUrl, token]);

  async function loadBill(saleId) {
    setSelectedId(saleId);
    setBill(null);
    const res = await fetch(`${apiUrl}/api/billing/${saleId}`, {
      headers: headers(token),
    });
    const data = await res.json();
    if (res.ok) {
      setBill(data);
      const q = {};
      for (const item of data.items || []) {
        q[item.sale_item_id] = 0;
      }
      setQuantities(q);
    }
  }

  async function submitReturn(event) {
    event.preventDefault();
    if (processing) return;

    setError("");
    setMessage("");
    const items = Object.entries(quantities)
      .filter(([, q]) => Number(q) > 0)
      .map(([saleItemId, quantity]) => ({
        saleItemId: Number(saleItemId),
        quantity: Number(quantity),
      }));
    if (!items.length) {
      setError("Enter return quantity for at least one line.");
      return;
    }

    setProcessing(true);
    const startedAt = Date.now();

    try {
      const res = await fetch(`${apiUrl}/api/returns/customer`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({
          saleId: Number(selectedId),
          clientTransactionId: crypto.randomUUID(),
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const creditNote = data.creditNoteNumber || data.credit_note_number;
      const total = Number(data.returnTotal ?? data.return_total ?? 0).toFixed(
        2
      );
      setSuccessPopup({
        title: "Return processed",
        detail: creditNote
          ? `Credit note ${creditNote} · ₹${total} credited. Stock has been restocked.`
          : `Return of ₹${total} was recorded. Stock has been restocked.`,
      });

      const resetQty = {};
      for (const item of bill.items || []) {
        resetQty[item.sale_item_id] = 0;
      }
      setQuantities(resetQty);
    } catch (err) {
      setError(err.message);
    } finally {
      const elapsed = Date.now() - startedAt;
      const waitMs = Math.max(0, 1000 - elapsed);
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      setProcessing(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">RETURNS</p>
          <h2>Customer return</h2>
          <p>Select bill → return qty → restock (SRS 4.6 / FR-28).</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      {message && <div className="notice-card">{message}</div>}

      {successPopup && (
        <div
          className="app-modal-overlay"
          role="presentation"
          onClick={() => setSuccessPopup(null)}
        >
          <div
            className="app-modal"
            role="dialog"
            aria-labelledby="return-success-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="return-success-title">{successPopup.title}</h3>
            <p>{successPopup.detail}</p>
            <button
              type="button"
              className="primary-button"
              autoFocus
              onClick={() => setSuccessPopup(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <label>
        Recent bills
        <select
          value={selectedId}
          onChange={(e) => loadBill(e.target.value)}
        >
          <option value="">Select invoice</option>
          {bills.map((b) => (
            <option key={b.sale_id} value={b.sale_id}>
              {b.invoice_number} — ₹{Number(b.grand_total).toFixed(2)}
            </option>
          ))}
        </select>
      </label>
      {bill?.items && (
        <form className="billing-card" onSubmit={submitReturn}>
          <table className="products-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Sold</th>
                <th>Return qty</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item) => (
                <tr key={item.sale_item_id}>
                  <td>{item.product_name_snapshot}</td>
                  <td>{item.quantity}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={quantities[item.sale_item_id] ?? 0}
                      onChange={(e) =>
                        setQuantities({
                          ...quantities,
                          [item.sale_item_id]: e.target.value,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="submit"
            className="primary-button"
            disabled={processing}
          >
            {processing ? "Processing…" : "Process return"}
          </button>
        </form>
      )}
    </>
  );
}

function supplierCreditAmount(item, quantity) {
  const packSize = Number(item.packSize || item.units_per_stock_unit || 1);
  const purchasePerPack = Number(item.purchase_price || 0);
  return Number(
    (purchasePerPack * (Number(quantity) / packSize)).toFixed(2)
  );
}

export function SupplierReturn({ apiUrl, token, searchBatches }) {
  const [suppliers, setSuppliers] = useState([]);
  const [header, setHeader] = useState({
    supplierId: "",
    referenceNumber: "",
    reason: "",
  });
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/purchases/suppliers`, {
          headers: headers(token),
        });
        const data = await readJsonResponse(res, "Could not load suppliers.");
        if (res.ok) setSuppliers(data.suppliers || []);
        else setError(data.message || "Could not load suppliers.");
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [apiUrl, token]);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setError("");
      try {
        const batches = await searchBatches(query);
        setResults(batches || []);
      } catch (err) {
        setError(err.message);
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchBatches]);

  function addLine(medicineResult, unit = "smallest") {
    const packSize = Number(medicineResult.units_per_stock_unit || 1);
    const availableUnits = Number(
      medicineResult.available_smallest_units || 0
    );
    if (availableUnits <= 0) {
      setError("No stock available for this batch.");
      return;
    }
    setError("");
    setCart((previous) => {
      const existing = previous.find(
        (item) => Number(item.batch_id) === Number(medicineResult.batch_id)
      );
      if (existing) {
        return previous.map((item) =>
          Number(item.batch_id) === Number(medicineResult.batch_id)
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + (unit === "pack" ? packSize : 1),
                  availableUnits
                ),
              }
            : item
        );
      }
      return [
        ...previous,
        {
          ...medicineResult,
          quantity: unit === "pack" ? packSize : 1,
          packSize,
          availableUnits,
        },
      ];
    });
  }

  function updateCartItem(batchId, changes) {
    setCart((previous) =>
      previous.map((item) =>
        Number(item.batch_id) === Number(batchId)
          ? { ...item, ...changes }
          : item
      )
    );
  }

  function removeCartItem(batchId) {
    setCart((previous) =>
      previous.filter((item) => Number(item.batch_id) !== Number(batchId))
    );
  }

  const returnTotal = cart.reduce(
    (sum, item) => sum + supplierCreditAmount(item, item.quantity),
    0
  );

  async function submit(event) {
    event.preventDefault();
    if (!cart.length) {
      setError("Add at least one medicine line to return.");
      return;
    }
    if (!header.supplierId) {
      setError("Select a supplier.");
      return;
    }
    if (!header.referenceNumber.trim()) {
      setError("Enter a supplier reference / RGA number.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/returns/supplier`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({
          supplierId: Number(header.supplierId),
          referenceNumber: header.referenceNumber.trim(),
          reason: header.reason.trim(),
          clientTransactionId: crypto.randomUUID(),
          items: cart.map((c) => ({
            batchId: c.batch_id,
            quantity: Number(c.quantity),
          })),
        }),
      });
      const data = await readJsonResponse(
        res,
        "Supplier return failed — check the API server."
      );
      if (!res.ok) throw new Error(data.message);
      setMessage(
        `Supplier return saved — expected credit ₹${Number(data.returnTotal).toFixed(2)}`
      );
      setCart([]);
      setSearch("");
      setResults([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">RETURNS</p>
          <h2>Supplier return</h2>
          <p>
            Return damaged or expired stock to the supplier. Credit is based on
            batch purchase price.
          </p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      {message && <div className="notice-card">{message}</div>}

      <div className="billing-card">
        <h3>Supplier details</h3>
        <div className="billing-grid">
          <label>
            Supplier *
            <select
              required
              value={header.supplierId}
              onChange={(e) =>
                setHeader({ ...header, supplierId: e.target.value })
              }
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.supplier_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reference / RGA no. *
            <input
              required
              value={header.referenceNumber}
              onChange={(e) =>
                setHeader({ ...header, referenceNumber: e.target.value })
              }
              placeholder="Supplier return reference"
            />
          </label>
          <label>
            Reason
            <input
              value={header.reason}
              onChange={(e) =>
                setHeader({ ...header, reason: e.target.value })
              }
              placeholder="Damaged, expired, etc."
            />
          </label>
        </div>
      </div>

      <div className="billing-card">
        <h3>Add medicines to return</h3>
        <form className="billing-search" onSubmit={(e) => e.preventDefault()}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine, brand, salt, or batch (min 2 letters)…"
            autoComplete="off"
          />
        </form>
        {search.trim().length > 0 && search.trim().length < 2 && (
          <p className="billing-search-hint">
            Enter at least 2 characters to search.
          </p>
        )}
        {searchLoading && <p className="billing-search-hint">Searching…</p>}
        {!searchLoading &&
          search.trim().length >= 2 &&
          results.length === 0 && (
            <p className="empty-state billing-no-results">No batches found.</p>
          )}
        {results.length > 0 && (
          <div className="billing-results">
            {results.map((item) => (
              <MedicineSearchRow
                key={item.batch_id}
                item={item}
                onAddPack={(row) => addLine(row, "pack")}
                onAddUnit={(row) => addLine(row, "smallest")}
              />
            ))}
          </div>
        )}
      </div>

      <form className="billing-card" onSubmit={submit}>
        <h3>Return lines</h3>
        {cart.length === 0 ? (
          <p className="empty-state">
            Search and add medicines you are sending back to the supplier.
          </p>
        ) : (
          <>
            <div className="table-scroll">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Medicine / batch</th>
                    <th>Purchase rate</th>
                    <th>Return qty</th>
                    <th>Credit (₹)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => {
                    const packSize = item.packSize;
                    const purchasePerPack = Number(item.purchase_price || 0);
                    const credit = supplierCreditAmount(item, item.quantity);
                    const expired =
                      item.expiry_date &&
                      String(item.expiry_date).slice(0, 10) <
                        new Date().toISOString().slice(0, 10);
                    return (
                      <tr key={item.batch_id}>
                        <td>
                          <strong>{item.product_name}</strong>
                          <small>
                            Batch {item.batch_number}
                            {item.expiry_date
                              ? ` · Exp ${String(item.expiry_date).slice(0, 10)}`
                              : ""}
                            {expired ? " · EXPIRED" : ""}
                          </small>
                        </td>
                        <td>
                          ₹{purchasePerPack.toFixed(2)}/
                          {item.stock_unit_label || "pack"}
                        </td>
                        <td>
                          <input
                            className="billing-number"
                            type="number"
                            min="1"
                            max={item.availableUnits}
                            value={item.quantity}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              updateCartItem(item.batch_id, {
                                quantity: Math.max(
                                  1,
                                  Math.min(value || 1, item.availableUnits)
                                ),
                              });
                            }}
                          />
                          <small>
                            {item.smallest_unit_label || "units"} (max{" "}
                            {item.availableUnits})
                          </small>
                        </td>
                        <td>₹{credit.toFixed(2)}</td>
                        <td>
                          <button
                            type="button"
                            className="remove-item-button"
                            onClick={() => removeCartItem(item.batch_id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="checkout-total supplier-return-total">
              <span>Expected credit from supplier</span>
              <strong>₹{returnTotal.toFixed(2)}</strong>
            </div>
            <p className="billing-search-hint">
              Credit uses the batch purchase price (what the shop paid the
              supplier), pro-rated by quantity returned.
            </p>
            <button
              type="submit"
              className="primary-button save-bill-button"
              disabled={saving}
            >
              {saving ? "Submitting…" : "Submit supplier return"}
            </button>
          </>
        )}
      </form>
    </>
  );
}

export function EditBill({ apiUrl, token, searchMedicines }) {
  const [bills, setBills] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [bill, setBill] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function refreshBillList() {
    const res = await fetch(`${apiUrl}/api/billing/recent`, {
      headers: headers(token),
    });
    const data = await res.json();
    if (res.ok) setBills(data.sales || []);
  }

  useEffect(() => {
    refreshBillList().catch(() => {});
  }, [apiUrl, token]);

  async function loadBill(saleId) {
    if (!saleId) {
      setSelectedId("");
      setBill(null);
      setEditItems([]);
      return;
    }
    setSelectedId(String(saleId));
    setError("");
    const res = await fetch(`${apiUrl}/api/billing/${saleId}`, {
      headers: headers(token),
    });
    const data = await res.json();
    if (res.ok) {
      setBill(data.sale);
      setEditItems(
        (data.items || []).map((item) => ({
          saleItemId: item.sale_item_id,
          batchId: item.batch_id,
          quantity: item.quantity,
          discountAmount: item.discount_amount,
          gstRate: item.gst_rate,
          label: item.product_name_snapshot,
          lineTotal: item.line_total,
        }))
      );
    } else {
      setError(data.message || "Could not load bill.");
    }
  }

  async function saveEdit() {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/billing/${selectedId}`, {
        method: "PUT",
        headers: headers(token),
        body: JSON.stringify({
          paymentMethod: bill?.payment_method,
          items: editItems.map((item) => ({
            batchId: item.batchId,
            quantity: Number(item.quantity),
            discountAmount: Number(item.discountAmount || 0),
            gstRate: Number(item.gstRate || 5),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await loadBill(selectedId);
      await refreshBillList();
      setMessage(
        `Bill updated. New total ₹${Number(data.grandTotal ?? bill?.grand_total ?? 0).toFixed(2)}. Past bills and returns will show the corrected quantities.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addFromSearch(event) {
    event.preventDefault();
    const meds = await searchMedicines(search);
    setResults(meds || []);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">BILLING</p>
          <h2>Edit bill</h2>
          <p>Adjust lines; stock is restored then re-deducted (FR-14 style correction).</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      {message && <div className="notice-card">{message}</div>}
      <label>
        Bill to edit
        <select value={selectedId} onChange={(e) => loadBill(e.target.value)}>
          <option value="">Select bill to edit</option>
          {bills.map((b) => (
            <option key={b.sale_id} value={b.sale_id}>
              {b.invoice_number} — ₹{Number(b.grand_total).toFixed(2)}
            </option>
          ))}
        </select>
      </label>

      {bill && (
        <div className="notice-card">
          <strong>{bill.invoice_number}</strong>
          <p>
            Saved bill total: ₹{Number(bill.grand_total).toFixed(2)} ·{" "}
            {String(bill.sale_datetime).slice(0, 16)}
          </p>
        </div>
      )}

      {editItems.length > 0 && (
        <div className="billing-card">
          <h3>Bill lines (updates save to this invoice)</h3>
          <div className="table-scroll">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Qty (units)</th>
                  <th>Discount ₹</th>
                  <th>Line total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {editItems.map((item, index) => (
                  <tr key={item.saleItemId || `${item.batchId}-${index}`}>
                    <td>{item.label}</td>
                    <td>
                      <input
                        className="billing-number"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...editItems];
                          next[index] = {
                            ...next[index],
                            quantity: e.target.value,
                          };
                          setEditItems(next);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="billing-number"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discountAmount}
                        onChange={(e) => {
                          const next = [...editItems];
                          next[index] = {
                            ...next[index],
                            discountAmount: e.target.value,
                          };
                          setEditItems(next);
                        }}
                      />
                    </td>
                    <td>
                      {item.lineTotal != null
                        ? `₹${Number(item.lineTotal).toFixed(2)}`
                        : "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="remove-item-button"
                        onClick={() =>
                          setEditItems(editItems.filter((_, i) => i !== index))
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="billing-search-hint">
            After save, reopen this bill under Past bills or Customer return to
            see updated quantities.
          </p>
          <form className="billing-search" onSubmit={addFromSearch}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Add medicine…"
            />
            <button type="submit" className="secondary-button">
              Search
            </button>
          </form>
          {results.slice(0, 5).map((r) => (
            <button
              key={r.batch_id}
              type="button"
              className="secondary-button"
              onClick={() =>
                setEditItems([
                  ...editItems,
                  {
                    saleItemId: null,
                    batchId: r.batch_id,
                    quantity: 1,
                    discountAmount: 0,
                    gstRate: 5,
                    label: r.product_name,
                    lineTotal: null,
                  },
                ])
              }
            >
              + {r.product_name}
            </button>
          ))}
          <button
            type="button"
            className="primary-button"
            disabled={saving}
            onClick={saveEdit}
          >
            {saving ? "Saving…" : "Save bill changes"}
          </button>
        </div>
      )}
    </>
  );
}
