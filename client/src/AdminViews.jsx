import { useCallback, useEffect, useState } from "react";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function AdminDashboard({ apiUrl, token, onSelectBranchSales }) {
  const [overview, setOverview] = useState(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState("day");
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/admin/overview`, {
          headers: authHeaders(token),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load overview.");
        if (!cancelled) setOverview(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiUrl, token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${apiUrl}/api/analytics/admin?period=${analyticsPeriod}`,
          { headers: authHeaders(token) }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Analytics failed.");
        if (!cancelled) setAnalytics(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiUrl, token, analyticsPeriod]);

  if (error) {
    return (
      <div className="error-message" role="alert">
        {error}
      </div>
    );
  }

  if (!overview) {
    return <p className="empty-state">Loading business overview…</p>;
  }

  const salesMap = new Map(
    (overview.salesByBranch || []).map((row) => [
      Number(row.branch_id),
      row,
    ])
  );

  const activeBranches = (overview.branches || []).filter((b) => b.is_active);

  return (
    <>
      <section className="dashboard-hero dashboard-hero-admin">
        <div className="dashboard-hero-text">
          <p className="eyebrow">Consolidated control</p>
          <h2>Kiara Medicals — All branches</h2>
          <p>Read-only sales, purchases, and branch performance.</p>
        </div>
        <span className="role-badge">Admin</span>
      </section>

      <div className="dashboard-kpi-grid">
        <article className="stat-card stat-card-sales">
          <span className="stat-card-label">Lifetime sales (all branches)</span>
          <p className="stat-card-value">
            ₹{Number(overview.totals?.total_sales || 0).toFixed(2)}
          </p>
          <span className="stat-card-hint">
            {overview.totals?.sale_count || 0} finalized bills
          </span>
        </article>
        <article className="stat-card stat-card-purchase">
          <span className="stat-card-label">
            Stock purchases ({analytics?.label || "period"})
          </span>
          <p className="stat-card-value">
            ₹{Number(analytics?.overall?.stockPurchases || 0).toFixed(2)}
          </p>
          <span className="stat-card-hint">From purchase stock entries</span>
        </article>
        <article className="stat-card stat-card-neutral">
          <span className="stat-card-label">Active branches</span>
          <p className="stat-card-value">{activeBranches.length}</p>
          <span className="stat-card-hint">
            {overview.activeProductCount} medicines in master
          </span>
        </article>
      </div>

      <div className="billing-card dashboard-analytics-panel">
        <div className="dashboard-section-head">
          <h3>Period analytics</h3>
          <p>Shop-wise billed sales, stock purchases, and net totals.</p>
        </div>
        <div className="period-toggle">
          {["day", "week", "month"].map((p) => (
            <button
              key={p}
              type="button"
              className={
                analyticsPeriod === p ? "primary-button" : "secondary-button"
              }
              onClick={() => setAnalyticsPeriod(p)}
            >
              {p === "day" ? "Daily" : p === "week" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
        {analytics?.overall && (
          <div className="dashboard-overall-strip">
            <div>
              <span>Net sales</span>
              <strong>₹{Number(analytics.overall.netTotal).toFixed(2)}</strong>
            </div>
            <div>
              <span>Stock purchases</span>
              <strong className="metric-purchase">
                ₹{Number(analytics.overall.stockPurchases).toFixed(2)}
              </strong>
            </div>
            <div>
              <span>Billed gross</span>
              <strong>₹{Number(analytics.overall.grossBilled).toFixed(2)}</strong>
            </div>
            <div>
              <span>Returns</span>
              <strong>− ₹{Number(analytics.overall.customerReturns).toFixed(2)}</strong>
            </div>
          </div>
        )}
      </div>

      {analytics?.byBranch?.length > 0 && (
        <div className="table-card">
          <h3>Branch-wise — {analytics.label}</h3>
          <div className="table-scroll">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Billed</th>
                  <th>Stock purchases</th>
                  <th>Unbilled</th>
                  <th>Returns</th>
                  <th>Net sales</th>
                </tr>
              </thead>
              <tbody>
                {analytics.byBranch.map((row) => (
                  <tr key={row.branchId}>
                    <td>{row.branchName}</td>
                    <td>₹{Number(row.grossBilled).toFixed(2)}</td>
                    <td className="metric-purchase">
                      ₹{Number(row.stockPurchases || 0).toFixed(2)}
                    </td>
                    <td>₹{Number(row.unbilledTotal).toFixed(2)}</td>
                    <td>₹{Number(row.customerReturns).toFixed(2)}</td>
                    <td>₹{Number(row.netTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="notice-card">
        <h3>Branch performance</h3>
        <p>Select a branch for invoice-level sales (read-only).</p>
      </div>

      <div className="dashboard-grid">
        {(overview.branches || []).map((branch) => {
          const sales = salesMap.get(Number(branch.branch_id));
          return (
            <button
              key={branch.branch_id}
              type="button"
              className="info-card branch-tile-button"
              disabled={!branch.is_active}
              onClick={() =>
                onSelectBranchSales({
                  id: branch.branch_id,
                  name: branch.branch_name,
                  code: branch.branch_code,
                  gstin: branch.gstin,
                })
              }
            >
              <span className="card-label">{branch.branch_code}</span>
              <h3>{branch.branch_name}</h3>
              <p>GSTIN: {branch.gstin}</p>
              <p>
                Sales: ₹{Number(sales?.total_sales || 0).toFixed(2)} (
                {sales?.sale_count || 0} bills)
              </p>
              {!branch.is_active && (
                <span className="status-badge status-warning">Inactive</span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

export function AdminBranchSales({ apiUrl, token, branch, onBack }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!branch?.id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${apiUrl}/api/admin/sales?branchId=${branch.id}`,
          { headers: authHeaders(token) }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load sales.");
        if (!cancelled) setSales(data.sales || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiUrl, token, branch?.id]);

  return (
    <div className="billing-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BRANCH REPORT</p>
          <h2>{branch?.name}</h2>
          <p>
            {branch?.code} · GSTIN {branch?.gstin || "—"}
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={onBack}>
          Back to Dashboard
        </button>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="table-card">
        <div className="table-toolbar">
          <div>
            <h3>Sales (read-only)</h3>
            <p>{sales.length} recent record(s)</p>
          </div>
        </div>

        {loading ? (
          <p className="empty-state">Loading sales…</p>
        ) : sales.length === 0 ? (
          <p className="empty-state">No finalized sales for this branch yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Type</th>
                  <th>Payment</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.sale_id}>
                    <td>
                      {sale.sale_datetime
                        ? String(sale.sale_datetime).slice(0, 19)
                        : "—"}
                    </td>
                    <td>{sale.invoice_number || "—"}</td>
                    <td>{sale.sale_type}</td>
                    <td>{sale.payment_method}</td>
                    <td>₹{Number(sale.grand_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminMedicineMaster({ apiUrl, token }) {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (term = "") => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (term.trim()) params.set("search", term.trim());
        const res = await fetch(
          `${apiUrl}/api/products?${params.toString()}`,
          { headers: authHeaders(token) }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load products.");
        setProducts(data.products || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl, token]
  );

  useEffect(() => {
    load("");
  }, [load]);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SHARED CATALOG</p>
          <h2>Medicine Master</h2>
          <p>Same product data for all branches (read-only for admin).</p>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="table-card">
        <div className="table-toolbar">
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              load(search);
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, brand, or salt…"
            />
            <button type="submit" className="secondary-button">
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <p className="empty-state">Loading products…</p>
        ) : (
          <div className="table-scroll">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand / Salt</th>
                  <th>Strength</th>
                  <th>HSN</th>
                  <th>GST %</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.product_id}>
                    <td>
                      <strong>{p.product_name}</strong>
                      <small>{p.packaging || ""}</small>
                    </td>
                    <td>
                      {p.brand || "—"}
                      <small>{p.salt_name || ""}</small>
                    </td>
                    <td>
                      {p.strength || "—"} {p.dosage_form || ""}
                    </td>
                    <td>{p.default_hsn_code || "—"}</td>
                    <td>{Number(p.default_gst_rate).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export function AdminInventoryReadOnly({
  apiUrl,
  token,
  branches,
  loadInventory,
  inventory,
  loadingInventory,
  inventoryError,
  inventorySearch,
  setInventorySearch,
}) {
  const [branchFilter, setBranchFilter] = useState("");

  useEffect(() => {
    loadInventory(inventorySearch, branchFilter);
  }, [branchFilter]);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">STOCK (READ-ONLY)</p>
          <h2>Branch inventory</h2>
          <p>View stock by branch; admin cannot modify quantities.</p>
        </div>
        <label className="branch-filter">
          Branch
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="">All branches</option>
            {branches
              .filter((b) => b.is_active)
              .map((b) => (
                <option key={b.branch_id} value={String(b.branch_id)}>
                  {b.branch_name}
                </option>
              ))}
          </select>
        </label>
      </div>

      {inventoryError && (
        <div className="error-message" role="alert">
          {inventoryError}
        </div>
      )}

      <div className="table-card">
        <div className="table-toolbar">
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              loadInventory(inventorySearch, branchFilter);
            }}
          >
            <input
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              placeholder="Search medicine or batch…"
            />
            <button type="submit" className="secondary-button">
              Search
            </button>
          </form>
        </div>

        {loadingInventory ? (
          <p className="empty-state">Loading inventory…</p>
        ) : inventory.length === 0 ? (
          <p className="empty-state">No stock records found.</p>
        ) : (
          <div className="table-scroll">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Medicine</th>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th>Qty</th>
                  <th>Selling</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={`${item.branch_id}-${item.batch_id}`}>
                    <td>{item.branch_name}</td>
                    <td>
                      <strong>{item.product_name}</strong>
                    </td>
                    <td>{item.batch_number}</td>
                    <td>
                      {item.expiry_date
                        ? String(item.expiry_date).slice(0, 10)
                        : "—"}
                    </td>
                    <td>{item.quantity}</td>
                    <td>₹{Number(item.selling_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export function AdminBranches({ apiUrl, token, onBranchesChanged }) {
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    branchCode: "",
    branchName: "",
    legalName: "Kiara Medicals",
    address: "",
    phone: "",
    gstin: "",
    invoicePrefix: "KM",
  });

  const load = useCallback(async () => {
    setError("");
    const res = await fetch(`${apiUrl}/api/admin/branches`, {
      headers: authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load branches.");
    setBranches(data.branches || []);
    onBranchesChanged?.(data.branches || []);
  }, [apiUrl, token, onBranchesChanged]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${apiUrl}/api/admin/branches`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not create branch.");
      setMessage(data.message);
      setForm({
        branchCode: "",
        branchName: "",
        legalName: "Kiara Medicals",
        address: "",
        phone: "",
        gstin: "",
        invoicePrefix: "KM",
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(branch) {
    setError("");
    setMessage("");
    try {
      const res = await fetch(
        `${apiUrl}/api/admin/branches/${branch.branch_id}`,
        {
          method: "PATCH",
          headers: authHeaders(token),
          body: JSON.stringify({ isActive: !branch.is_active }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed.");
      setMessage(data.message);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ORGANIZATION</p>
          <h2>Branches</h2>
          <p>Add branches or deactivate them to change store count.</p>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {message && <div className="notice-card">{message}</div>}

      <div className="table-card">
        <table className="products-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>GSTIN</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.branch_id}>
                <td>{b.branch_code}</td>
                <td>{b.branch_name}</td>
                <td>{b.gstin}</td>
                <td>{b.is_active ? "Active" : "Inactive"}</td>
                <td>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => toggleActive(b)}
                  >
                    {b.is_active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="billing-card">
        <h3>Add branch</h3>
        <form className="billing-grid" onSubmit={handleCreate}>
          <label>
            Branch code *
            <input
              required
              value={form.branchCode}
              onChange={(e) =>
                setForm({ ...form, branchCode: e.target.value })
              }
              placeholder="BR004"
            />
          </label>
          <label>
            Display name *
            <input
              required
              value={form.branchName}
              onChange={(e) =>
                setForm({ ...form, branchName: e.target.value })
              }
            />
          </label>
          <label>
            Legal name *
            <input
              required
              value={form.legalName}
              onChange={(e) =>
                setForm({ ...form, legalName: e.target.value })
              }
            />
          </label>
          <label>
            GSTIN (15 chars) *
            <input
              required
              value={form.gstin}
              onChange={(e) =>
                setForm({ ...form, gstin: e.target.value.toUpperCase() })
              }
              placeholder="29AABCU9603R1ZM"
            />
          </label>
          <label>
            Address
            <input
              value={form.address}
              onChange={(e) =>
                setForm({ ...form, address: e.target.value })
              }
            />
          </label>
          <label>
            Phone
            <input
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
            />
          </label>
          <button type="submit" className="primary-button">
            Create branch
          </button>
        </form>
      </div>
    </>
  );
}

export function AdminUsers({ apiUrl, token, branches }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "SHOP_USER",
    branchId: "",
  });

  const load = useCallback(async () => {
    const res = await fetch(`${apiUrl}/api/admin/users`, {
      headers: authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load users.");
    setUsers(data.users || []);
  }, [apiUrl, token]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const payload = {
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        role: form.role,
        branchId:
          form.role === "SHOP_USER" ? Number(form.branchId) : null,
      };
      const res = await fetch(`${apiUrl}/api/admin/users`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not create user.");
      setMessage(data.message);
      setForm({
        username: "",
        password: "",
        fullName: "",
        role: "SHOP_USER",
        branchId: "",
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const activeBranches = branches.filter((b) => b.is_active);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ACCESS CONTROL</p>
          <h2>Users</h2>
          <p>Add shop users (branch-bound) or additional admins.</p>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {message && <div className="notice-card">{message}</div>}

      <div className="table-card">
        <table className="products-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id}>
                <td>{u.full_name}</td>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td>{u.branch_name || "—"}</td>
                <td>{u.is_active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="billing-card">
        <h3>Add user</h3>
        <form className="billing-grid" onSubmit={handleCreate}>
          <label>
            Full name *
            <input
              required
              value={form.fullName}
              onChange={(e) =>
                setForm({ ...form, fullName: e.target.value })
              }
            />
          </label>
          <label>
            Username *
            <input
              required
              value={form.username}
              onChange={(e) =>
                setForm({ ...form, username: e.target.value })
              }
            />
          </label>
          <label>
            Password (min 8) *
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />
          </label>
          <label>
            Role *
            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value })
              }
            >
              <option value="SHOP_USER">Shop user</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          {form.role === "SHOP_USER" && (
            <label>
              Branch *
              <select
                required
                value={form.branchId}
                onChange={(e) =>
                  setForm({ ...form, branchId: e.target.value })
                }
              >
                <option value="">Select branch</option>
                {activeBranches.map((b) => (
                  <option key={b.branch_id} value={String(b.branch_id)}>
                    {b.branch_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button type="submit" className="primary-button">
            Create user
          </button>
        </form>
      </div>
    </>
  );
}
