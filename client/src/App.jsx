import { useCallback, useEffect, useState } from "react";
import "./App.css";
import {
  AdminBranches,
  AdminBranchSales,
  AdminDashboard,
  AdminInventoryReadOnly,
  AdminMedicineMaster,
  AdminUsers,
} from "./AdminViews.jsx";
import {
  CustomerReturn,
  EditBill,
  PurchaseStock,
  ShopAlerts,
  ShopAnalytics,
  ShopDashboard,
  SupplierReturn,
  PastBills,
  UnbilledSale,
} from "./ShopOperations.jsx";
import { MedicineSearchRow } from "./MedicineSearchRow.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";


function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inventory, setInventory] = useState([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);

  const [activePage, setActivePage] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [adminBranches, setAdminBranches] = useState([]);

  const [billingBranchId, setBillingBranchId] = useState("");
const [billingSearch, setBillingSearch] = useState("");
const [billingResults, setBillingResults] = useState([]);
const [cart, setCart] = useState([]);
const [patient, setPatient] = useState({
  name: "",
  age: "",
  mobile: "",
  gender: "",
  doctorName: "",
});
const [paymentMethod, setPaymentMethod] = useState("CASH");
const [billDiscount, setBillDiscount] = useState("0");
const [billingLoading, setBillingLoading] = useState(false);
const [savingBill, setSavingBill] = useState(false);
const [billingError, setBillingError] = useState("");
const [savedBill, setSavedBill] = useState(null);
const [patientSuggestions, setPatientSuggestions] = useState([]);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      setSession({ token: data.token, user: data.user });
      setPassword("");
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Server se connect nahi ho pa raha. Backend check karo."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
  setSession(null);
  setUsername("");
  setPassword("");
  setError("");
  setActivePage("dashboard");
  setMobileNavOpen(false);
  setSelectedBranch(null);
  setBillingBranchId("");
  setInventorySearch(""); 
  setInventory([]);
  setCart([]);
  setBillingResults([]);
  setBillingSearch("");
  setBillingError("");
  setSavedBill(null);
}


  
async function loadInventory(searchTerm = "", branchFilter = "") {
  if (!session?.token) return;

  setLoadingInventory(true);
  setInventoryError("");

  try {
    const params = new URLSearchParams();

    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    }

    if (branchFilter) {
      params.set("branchId", branchFilter);
    }

    const query = params.toString();
    const url = `${API_URL}/api/inventory${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load inventory.");
    }

    setInventory(data.inventory || []);
  } catch (err) {
    setInventoryError(
      err.message === "Failed to fetch"
        ? "Backend se connect nahi ho pa raha."
        : err.message
    );
  } finally {
    setLoadingInventory(false);
  }
}

const fetchBillingMedicines = useCallback(
  async (searchTerm) => {
    if (!session?.token || searchTerm.trim().length < 2) return [];

    const params = new URLSearchParams({ search: searchTerm.trim() });
    const response = await fetch(
      `${API_URL}/api/billing/medicines?${params.toString()}`,
      { headers: { Authorization: `Bearer ${session.token}` } }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Medicine search failed.");
    }
    return data.medicines || [];
  },
  [session]
);

const fetchSupplierReturnBatches = useCallback(
  async (searchTerm) => {
    if (!session?.token || searchTerm.trim().length < 2) return [];

    const params = new URLSearchParams({ search: searchTerm.trim() });
    const response = await fetch(
      `${API_URL}/api/inventory/batches-for-return?${params.toString()}`,
      { headers: { Authorization: `Bearer ${session.token}` } }
    );

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "Backend returned an invalid response. Restart the API server on port 5001."
      );
    }

    if (!response.ok) {
      throw new Error(data.message || "Batch search failed.");
    }
    return data.medicines || [];
  },
  [session]
);

const searchBillingMedicines = useCallback(
  async (searchTerm = billingSearch) => {
    if (!session?.token) return;

    const query = searchTerm.trim();
    if (query.length < 2) {
      setBillingResults([]);
      return;
    }

    const userIsAdmin = session.user?.role === "ADMIN";

    setBillingLoading(true);
    setBillingError("");

    try {
      const params = new URLSearchParams({ search: query });

      if (userIsAdmin) {
        if (!billingBranchId) {
          setBillingResults([]);
          setBillingError("Please select a branch before searching.");
          return;
        }
        params.set("branchId", billingBranchId);
      }

      const response = await fetch(
        `${API_URL}/api/billing/medicines?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Medicine search failed.");
      }

      setBillingResults(data.medicines || []);
    } catch (err) {
      setBillingError(
        err.message === "Failed to fetch"
          ? "Backend se connect nahi ho pa raha."
          : err.message
      );
    } finally {
      setBillingLoading(false);
    }
  },
  [session, billingSearch, billingBranchId]
);

function addToCart(medicineResult, unit = "smallest") {
  const packSize = Number(medicineResult.units_per_stock_unit || 1);

  const availableUnits = Number(
    medicineResult.available_smallest_units || 0
  );

  if (availableUnits <= 0) {
    setBillingError("Is batch mein stock available nahi hai.");
    return;
  }

  setBillingError("");

  setCart((previous) => {
    const existing = previous.find(
      (item) =>
        Number(item.batch_id) === Number(medicineResult.batch_id)
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
    previous.filter(
      (item) => Number(item.batch_id) !== Number(batchId)
    )
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


  useEffect(() => {
    if (!session) return;

    if (activePage === "inventory" && session.user.role !== "ADMIN") {
      loadInventory(inventorySearch);
    }
  }, [session, activePage]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!session?.token || activePage !== "billing" || savedBill) return;

    const query = billingSearch.trim();
    if (query.length < 2) {
      setBillingResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      searchBillingMedicines(query);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [billingSearch, activePage, savedBill, session, searchBillingMedicines]);

  useEffect(() => {
    if (!session?.token || activePage !== "billing" || savedBill) {
      setPatientSuggestions([]);
      return;
    }

    const q = patient.name.trim() || patient.mobile.trim();
    if (q.length < 2) {
      setPatientSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q });
        const response = await fetch(
          `${API_URL}/api/billing/patients/search?${params.toString()}`,
          { headers: { Authorization: `Bearer ${session.token}` } }
        );
        const data = await response.json();
        if (response.ok) {
          setPatientSuggestions(data.patients || []);
        } else {
          setPatientSuggestions([]);
        }
      } catch {
        setPatientSuggestions([]);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [
    patient.name,
    patient.mobile,
    activePage,
    savedBill,
    session,
  ]);

  function applyPatientSuggestion(entry) {
    setPatient({
      name: entry.name || "",
      age: entry.age || "",
      mobile: entry.mobile || "",
      gender: entry.gender || "",
      doctorName: entry.doctorName || "",
    });
    setPatientSuggestions([]);
  }

  useEffect(() => {
    if (!session?.token || session.user.role !== "ADMIN") return;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/branches`, {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        const data = await res.json();
        if (res.ok) setAdminBranches(data.branches || []);
      } catch {
        /* overview pages show their own errors */
      }
    })();
  }, [session]);


  async function handleSaveBill() {
  if (!cart.length) {
    setBillingError("Bill mein kam se kam ek medicine add karo.");
    return;
  }

  if (!patient.name.trim()) {
    setBillingError("Patient ka naam enter karo.");
    return;
  }

  if (isAdmin && !billingBranchId) {
    setBillingError("Please select a branch.");
    return;
  }

  setSavingBill(true);
  setBillingError("");
  setSavedBill(null);

  const clientTransactionId = crypto.randomUUID();

  try {
    const payload = {
      ...(isAdmin ? { branchId: Number(billingBranchId) } : {}),
      clientTransactionId,
      paymentMethod,
      saleType: "BILLED",
      notes: [
        `Patient: ${patient.name}`,
        `Age: ${patient.age || "N/A"}`,
        `Mobile: ${patient.mobile || "N/A"}`,
        `Gender: ${patient.gender || "N/A"}`,
        `Doctor: ${patient.doctorName || "N/A"}`,
      ].join(" | "),
      patientName: patient.name.trim(),
      patientMobile: patient.mobile.trim(),
      billDiscount: Number(billDiscount || 0),
      items: cart.map((item) => ({
        batchId: Number(item.batch_id),
        quantity: Number(item.quantity),
        discountAmount: Number(item.discountAmount || 0),
        gstRate: Number(item.gstRate || 5),
      })),
    };

    const response = await fetch(`${API_URL}/api/billing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Bill save nahi ho paya.");
    }

    const sale = data.sale || data;

setSavedBill({
  ...sale,

  // Branch details from backend
  branchName: sale.branchName || sale.branch_name || "",
  legalName: sale.legalName || sale.legal_name || "",
  branchAddress: sale.address || sale.branchAddress || sale.branch_address || "",
  gstin: sale.gstin || sale.branchGstin || sale.branch_gstin || "",

  // Invoice details
  invoiceNumber:
    sale.invoiceNumber ||
    sale.invoice_number ||
    sale.saleId ||
    sale.sale_id ||
    "",

  // Patient and medicine details for the preview
  patient: { ...patient },
  items: [...cart],
  createdAt: new Date().toLocaleString("en-IN"),
  paymentMethod,
});

    setCart([]);
    setPatient({
      name: "",
      age: "",
      mobile: "",
      gender: "",
      doctorName: "",
    });
    setBillingSearch("");
    setBillingResults([]);
    setBillDiscount("0");

    await loadInventory(inventorySearch);
  } catch (err) {
    setBillingError(
      err.message === "Failed to fetch"
        ? "Server se connection fail hua. Bill status verify kiye bina dobara submit mat karna."
        : err.message
    );
  } finally {
    setSavingBill(false);
  }
}

function printInvoice() {
  window.print();
}

  if (!session) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-brand">
            <div className="brand-icon large">K</div>
            <p className="eyebrow">WELCOME TO</p>
            <h1>
  {savedBill?.legalName ||
    savedBill?.branchName ||
    "KIARA MEDICALS"}
</h1>
            <p className="subtitle">
              Your medical store, managed smarter.
            </p>
          </div>

          <div className="form-heading">
            <h2>Sign in to your account</h2>
            <p>Enter your credentials to continue.</p>
          </div>

          <form onSubmit={handleLogin}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="security-note">
            Secure access for authorized Kiara Medicals staff.
          </p>
        </section>

        <footer className="login-footer">
          Kiara Medicals · Medical Store Management
        </footer>
      </main>
    );
  }

  const { user } = session;
  const isAdmin = user.role === "ADMIN";

  return (
    <main className="dashboard-page">
      <header className="topbar">
        <div className="topbar-start">
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <span className="menu-toggle-bar" />
            <span className="menu-toggle-bar" />
            <span className="menu-toggle-bar" />
          </button>
          <div className="brand">
            <div className="brand-icon">K</div>
            <div className="brand-text">
              <h1>Kiara Medicals</h1>
              <p>Medical Store Management System</p>
            </div>
          </div>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {mobileNavOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="app-layout">
        <aside
          className={`app-sidebar ${mobileNavOpen ? "is-open" : ""}`}
          onClick={(event) => {
            if (event.target.closest(".nav-item")) {
              setMobileNavOpen(false);
            }
          }}
        >
          <p className="sidebar-label">MAIN MENU</p>

          <button
            className={`nav-item ${
              activePage === "dashboard" ? "active" : ""
            }`}
            onClick={() => setActivePage("dashboard")}
          >
            <span>▦</span> Dashboard
          </button>

          {!isAdmin && (
            <>
              <button
                className={`nav-item ${
                  activePage === "inventory" ? "active" : ""
                }`}
                onClick={() => {
                  setActivePage("inventory");
                  setInventoryError("");
                }}
              >
                <span>▤</span> Inventory
              </button>

              <button
                className={`nav-item ${activePage === "billing" ? "active" : ""}`}
                onClick={() => {
                  setActivePage("billing");
                  setBillingError("");
                  setSavedBill(null);
                }}
              >
                <span>▣</span> Billing
              </button>
              <button
                className={`nav-item ${activePage === "unbilled" ? "active" : ""}`}
                onClick={() => setActivePage("unbilled")}
              >
                <span>◌</span> Unbilled
              </button>
              <button
                className={`nav-item ${activePage === "past-bills" ? "active" : ""}`}
                onClick={() => setActivePage("past-bills")}
              >
                <span>▤</span> Past bills
              </button>
              <button
                className={`nav-item ${activePage === "purchase" ? "active" : ""}`}
                onClick={() => setActivePage("purchase")}
              >
                <span>⊕</span> Purchase
              </button>
              <button
                className={`nav-item ${activePage === "customer-return" ? "active" : ""}`}
                onClick={() => setActivePage("customer-return")}
              >
                <span>↩</span> Cust. return
              </button>
              <button
                className={`nav-item ${activePage === "supplier-return" ? "active" : ""}`}
                onClick={() => setActivePage("supplier-return")}
              >
                <span>↪</span> Supp. return
              </button>
              <button
                className={`nav-item ${activePage === "edit-bill" ? "active" : ""}`}
                onClick={() => setActivePage("edit-bill")}
              >
                <span>✎</span> Edit bill
              </button>
              <button
                className={`nav-item ${activePage === "alerts" ? "active" : ""}`}
                onClick={() => setActivePage("alerts")}
              >
                <span>!</span> Alerts
              </button>
            </>
          )}

          {isAdmin && (
            <>
              <button
                className={`nav-item ${
                  activePage === "medicine-master" ? "active" : ""
                }`}
                onClick={() => setActivePage("medicine-master")}
              >
                <span>◫</span> Medicine Master
              </button>
              <button
                className={`nav-item ${
                  activePage === "admin-inventory" ? "active" : ""
                }`}
                onClick={() => setActivePage("admin-inventory")}
              >
                <span>▤</span> Inventory
              </button>
              <button
                className={`nav-item ${
                  activePage === "branches" ? "active" : ""
                }`}
                onClick={() => setActivePage("branches")}
              >
                <span>⌂</span> Branches
              </button>
              <button
                className={`nav-item ${activePage === "users" ? "active" : ""}`}
                onClick={() => setActivePage("users")}
              >
                <span>◎</span> Users
              </button>
            </>
          )}

          

          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {(user.fullName || user.username || "U")
                .charAt(0)
                .toUpperCase()}
            </div>
            <div>
              <strong>{user.fullName}</strong>
              <small>{isAdmin ? "Administrator" : "Shop User"}</small>
            </div>
          </div>
        </aside>

        <section className="app-content">
  {activePage === "dashboard" ? (
  isAdmin ? (
    <AdminDashboard
      apiUrl={API_URL}
      token={session.token}
      onSelectBranchSales={(branch) => {
        setSelectedBranch(branch);
        setActivePage("branch-sales");
      }}
    />
  ) : (
    <ShopDashboard
      apiUrl={API_URL}
      token={session.token}
      branchName={user.branchName}
      userName={user.fullName}
    />
  )
) : activePage === "branch-sales" && isAdmin ? (
  <AdminBranchSales
    apiUrl={API_URL}
    token={session.token}
    branch={selectedBranch}
    onBack={() => setActivePage("dashboard")}
  />
) : activePage === "medicine-master" && isAdmin ? (
  <AdminMedicineMaster apiUrl={API_URL} token={session.token} />
) : activePage === "admin-inventory" && isAdmin ? (
  <AdminInventoryReadOnly
    apiUrl={API_URL}
    token={session.token}
    branches={adminBranches}
    loadInventory={loadInventory}
    inventory={inventory}
    loadingInventory={loadingInventory}
    inventoryError={inventoryError}
    inventorySearch={inventorySearch}
    setInventorySearch={setInventorySearch}
  />
) : activePage === "branches" && isAdmin ? (
  <AdminBranches
    apiUrl={API_URL}
    token={session.token}
    onBranchesChanged={setAdminBranches}
  />
) : activePage === "users" && isAdmin ? (
  <AdminUsers
    apiUrl={API_URL}
    token={session.token}
    branches={adminBranches}
  />
) : activePage === "unbilled" && !isAdmin ? (
  <UnbilledSale
    apiUrl={API_URL}
    token={session.token}
    searchMedicines={fetchBillingMedicines}
  />
) : activePage === "past-bills" && !isAdmin ? (
  <PastBills apiUrl={API_URL} token={session.token} />
) : activePage === "purchase" && !isAdmin ? (
  <PurchaseStock apiUrl={API_URL} token={session.token} />
) : activePage === "customer-return" && !isAdmin ? (
  <CustomerReturn apiUrl={API_URL} token={session.token} />
) : activePage === "supplier-return" && !isAdmin ? (
  <SupplierReturn
    apiUrl={API_URL}
    token={session.token}
    searchBatches={fetchSupplierReturnBatches}
  />
) : activePage === "edit-bill" && !isAdmin ? (
  <EditBill
    apiUrl={API_URL}
    token={session.token}
    searchMedicines={fetchBillingMedicines}
  />
) : activePage === "alerts" && !isAdmin ? (
  <ShopAlerts apiUrl={API_URL} token={session.token} />
) : activePage === "analytics" && !isAdmin ? (
  <ShopAnalytics apiUrl={API_URL} token={session.token} />
) : activePage === "billing" && !isAdmin ? (
  <div className="billing-page">
    <div className="page-heading">
      <div>
        <p className="eyebrow">SALES MANAGEMENT</p>
        <h2>New Bill</h2>
        <p>Create a patient bill and deduct stock from the selected batch.</p>
      </div>
    </div>

    {billingError && (
      <div className="error-message" role="alert">
        {billingError}
      </div>
    )}

    {isAdmin && (
      <div className="billing-card">
        <label htmlFor="billingBranch">Branch ID</label>
        <input
          id="billingBranch"
          type="number"
          min="1"
          value={billingBranchId}
          onChange={(event) => {
            setBillingBranchId(event.target.value);
            setBillingResults([]);
          }}
          placeholder="Enter branch ID"
        />
      </div>
    )}

    {savedBill ? (
      <div className="billing-card invoice-preview">
  <div className="invoice-top">
    <div className="invoice-brand">
      <div className="brand-icon">K</div>
      <div>
        <h1>KIARA MEDICALS</h1>
        <p>Medical Store Tax Invoice</p>
      </div>
    </div>

    <button
      type="button"
      className="primary-button no-print"
      onClick={printInvoice}
    >
      Print Invoice
    </button>
  </div>

  <div className="invoice-shop-details">
    <p>
      <strong>Branch:</strong>{" "}
      {savedBill.branchName ||
        savedBill.branch_name ||
        user.branchName ||
        (isAdmin ? `Branch ID: ${billingBranchId}` : "Assigned Branch")}
    </p>

    <p>
      <strong>Address:</strong>{" "}
      {savedBill.branchAddress ||
        savedBill.branch_address ||
        "Branch address not configured"}
    </p>

    <p>
      <strong>GSTIN:</strong>{" "}
      {savedBill.gstin ||
        savedBill.branchGstin ||
        savedBill.branch_gstin ||
        "Branch GSTIN not configured"}
    </p>
  </div>

  <div className="invoice-title">
    <h2>TAX INVOICE</h2>
    <span>Original for recipient</span>
  </div>

  <div className="invoice-meta-grid">
    <div>
      <span>Invoice Number</span>
      <strong>
        {savedBill.invoiceNumber ||
          savedBill.invoice_number ||
          savedBill.billNumber ||
          savedBill.bill_number ||
          savedBill.saleId ||
          savedBill.sale_id ||
          "Not returned by server"}
      </strong>
    </div>

    <div>
      <span>Invoice Date</span>
      <strong>
        {savedBill.createdAt ||
          savedBill.created_at ||
          new Date().toLocaleString("en-IN")}
      </strong>
    </div>

    <div>
      <span>Payment Method</span>
      <strong>{savedBill.paymentMethod || "CASH"}</strong>
    </div>
  </div>

  <div className="invoice-patient">
    <h3>Patient Details</h3>

    <div className="invoice-patient-grid">
      <p><span>Name</span><strong>{savedBill.patient?.name || "—"}</strong></p>
      <p><span>Mobile</span><strong>{savedBill.patient?.mobile || "—"}</strong></p>
      <p><span>Age / Gender</span><strong>{savedBill.patient?.age || "—"} / {savedBill.patient?.gender || "—"}</strong></p>
      <p><span>Doctor</span><strong>{savedBill.patient?.doctorName || "—"}</strong></p>
    </div>
  </div>

  <div className="table-scroll invoice-table-wrap">
    <table className="products-table invoice-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Medicine</th>
          <th>Batch</th>
          <th>Expiry</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Discount</th>
          <th>Amount</th>
        </tr>
      </thead>

      <tbody>
        {savedBill.items.map((item, index) => {
          const packSize = Number(item.packSize || 1);
          const rate = Number(item.selling_price || 0) / packSize;
          const quantity = Number(item.quantity || 0);
          const discount = Number(item.discountAmount || 0);
          const amount = Math.max(0, rate * quantity - discount);

          return (
            <tr key={`${item.batch_id}-${index}`}>
              <td>{index + 1}</td>
              <td>
                <strong>{item.product_name}</strong>
                <small>
                  {item.strength || ""} {item.dosage_form || ""}
                </small>
              </td>
              <td>{item.batch_number || "—"}</td>
              <td>
                {item.expiry_date
                  ? String(item.expiry_date).slice(0, 10)
                  : "—"}
              </td>
              <td>{quantity} {item.smallest_unit_label || "units"}</td>
              <td>₹{rate.toFixed(2)}</td>
              <td>₹{discount.toFixed(2)}</td>
              <td>₹{amount.toFixed(2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>

  <div className="invoice-summary">
    <div>
      <span>Subtotal (GST-inclusive)</span>
      <strong>₹{Number(
        savedBill.subtotal ?? savedBill.sub_total ?? cartSubtotal
      ).toFixed(2)}</strong>
    </div>

    <div>
      <span>Item Discounts</span>
      <strong>− ₹{Number(
        savedBill.itemDiscount ?? savedBill.item_discount ?? cartItemDiscount
      ).toFixed(2)}</strong>
    </div>

    <div>
      <span>Bill Discount</span>
      <strong>− ₹{Number(
        savedBill.billDiscount ?? savedBill.bill_discount ?? billDiscount
      ).toFixed(2)}</strong>
    </div>

    <div className="invoice-grand-total">
      <span>NET AMOUNT PAYABLE</span>
      <strong>
        ₹{Number(
          savedBill.grandTotal ??
          savedBill.grand_total ??
          savedBill.total ??
          finalTotal
        ).toFixed(2)}
      </strong>
    </div>
  </div>

  <div className="invoice-footer">
    <p>Thank you for visiting Kiara Medicals.</p>
    <p>Please retain this invoice for your records.</p>
  </div>

  <button
    type="button"
    className="secondary-button no-print"
    onClick={() => setSavedBill(null)}
  >
    Create Next Bill
  </button>
</div>
    ) : (
      <>
        <div className="billing-card">
          <h3>Patient details</h3>
          <p className="billing-search-hint">
            Start typing name or mobile — past patients from this branch will
            be suggested.
          </p>

          <div className="billing-grid">
            <label className="patient-field-with-suggest">
              Patient name *
              <input
                value={patient.name}
                autoComplete="off"
                onChange={(event) =>
                  setPatient({ ...patient, name: event.target.value })
                }
                placeholder="Patient name"
              />
              {patientSuggestions.length > 0 && (
                <ul className="patient-suggest-list" role="listbox">
                  {patientSuggestions.map((entry, index) => (
                    <li key={`${entry.name}-${entry.mobile}-${index}`}>
                      <button
                        type="button"
                        className="patient-suggest-item"
                        onClick={() => applyPatientSuggestion(entry)}
                      >
                        <strong>{entry.name}</strong>
                        <span>
                          {entry.mobile || "No mobile"}
                          {entry.age ? ` · Age ${entry.age}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </label>

            <label>
              Age
              <input
                type="number"
                min="0"
                value={patient.age}
                onChange={(event) =>
                  setPatient({ ...patient, age: event.target.value })
                }
                placeholder="Age"
              />
            </label>

            <label className="patient-field-with-suggest">
              Mobile
              <input
                value={patient.mobile}
                autoComplete="off"
                onChange={(event) =>
                  setPatient({ ...patient, mobile: event.target.value })
                }
                placeholder="Mobile number"
              />
            </label>

            <label>
              Gender
              <select
                value={patient.gender}
                onChange={(event) =>
                  setPatient({ ...patient, gender: event.target.value })
                }
              >
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </label>

            <label>
              Doctor name
              <input
                value={patient.doctorName}
                onChange={(event) =>
                  setPatient({ ...patient, doctorName: event.target.value })
                }
                placeholder="Doctor name (optional)"
              />
            </label>
          </div>
        </div>

        <div className="billing-card">
          <h3>Add medicines</h3>

          <form
            className="billing-search"
            onSubmit={(event) => {
              event.preventDefault();
              searchBillingMedicines(billingSearch);
            }}
          >
            <input
              id="billing-medicine-search"
              type="search"
              name="billingMedicineSearch"
              autoComplete="off"
              value={billingSearch}
              onChange={(event) => setBillingSearch(event.target.value)}
              placeholder="Type medicine, brand or salt (min 2 letters)..."
            />
            <button
              type="submit"
              className="primary-button billing-search-btn"
              disabled={billingLoading || billingSearch.trim().length < 2}
            >
              {billingLoading ? "Searching..." : "Search"}
            </button>
          </form>

          {billingSearch.trim().length > 0 &&
            billingSearch.trim().length < 2 && (
              <p className="billing-search-hint">
                Keep typing — enter at least 2 characters to search.
              </p>
            )}

          {!billingLoading &&
            billingSearch.trim().length >= 2 &&
            billingResults.length === 0 && (
              <p className="empty-state billing-no-results">
                No in-stock batches found. Try another name or check inventory.
              </p>
            )}

          {billingResults.length > 0 && (
            <div className="billing-results">
              {billingResults.map((item) => (
                <MedicineSearchRow
                  key={item.batch_id}
                  item={item}
                  onAddPack={(row) => addToCart(row, "pack")}
                  onAddUnit={(row) => addToCart(row, "smallest")}
                />
              ))}
            </div>
          )}
        </div>

        <div className="billing-card">
          <h3>Bill items</h3>

          {cart.length === 0 ? (
            <p className="empty-state">Search and add a medicine to begin.</p>
          ) : (
            <div className="table-scroll">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Quantity (smallest units)</th>
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
                          <small>
                            {Math.floor(item.quantity / item.packSize)}{" "}
                            {item.stock_unit_label || "packs"} +{" "}
                            {item.quantity % item.packSize} loose
                          </small>
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
          )}

          <div className="billing-checkout-panel">
            <div className="billing-checkout-fields">
              <label>
                Additional bill discount (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={billDiscount}
                  onChange={(event) => setBillDiscount(event.target.value)}
                />
              </label>

              <label>
                Payment method
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="OTHER">Other</option>
                  <option value="NOT_RECORDED">Not recorded</option>
                </select>
              </label>
            </div>

            <div className="checkout-total">
              <span>Subtotal (GST-inclusive)</span>
              <strong>₹{cartSubtotal.toFixed(2)}</strong>
              <span>Item discounts</span>
              <strong>− ₹{cartItemDiscount.toFixed(2)}</strong>
              <span>Bill discount</span>
              <strong>− ₹{Number(billDiscount || 0).toFixed(2)}</strong>
              <span>Payable total</span>
              <strong className="checkout-payable">₹{finalTotal.toFixed(2)}</strong>
            </div>

            <button
              type="button"
              className="primary-button save-bill-button"
              onClick={handleSaveBill}
              disabled={savingBill || cart.length === 0}
            >
              {savingBill ? "Saving bill..." : "Save bill & generate invoice"}
            </button>
          </div>
        </div>
      </>
    )}
  </div>
) : (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">STOCK MANAGEMENT</p>
          <h2>Inventory</h2>
          <p>Track branch-wise stock, batches and expiry dates.</p>
        </div>

        <button
          className="secondary-button"
          onClick={() => loadInventory(inventorySearch)}
        >
          Refresh
        </button>
      </div>

      {inventoryError && (
        <div className="error-message" role="alert">
          {inventoryError}
        </div>
      )}

      <div className="dashboard-grid">
        <article className="info-card">
          <span className="card-label">Batch records</span>
          <h3>{inventory.length}</h3>
          <p>Inventory entries loaded</p>
        </article>

        <article className="info-card">
          <span className="card-label">Low stock</span>
          <h3>
            {inventory.filter((item) => item.low_stock_alert).length}
          </h3>
          <p>At or below configured threshold</p>
        </article>

        <article className="info-card">
          <span className="card-label">Expiry alerts</span>
          <h3>
            {inventory.filter((item) => item.expiry_alert).length}
          </h3>
          <p>Expired or expiring within 30 days</p>
        </article>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div>
            <h3>Stock Details</h3>
            <p>{inventory.length} batch record(s)</p>
          </div>

          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault();
              loadInventory(inventorySearch);
            }}
          >
            <input
              value={inventorySearch}
              onChange={(event) =>
                setInventorySearch(event.target.value)
              }
              placeholder="Search medicine, brand or batch..."
              aria-label="Search inventory"
            />

            <button type="submit" className="secondary-button">
              Search
            </button>
          </form>
        </div>

        {loadingInventory ? (
          <p className="empty-state">Loading inventory...</p>
        ) : inventory.length === 0 ? (
          <p className="empty-state">
            No stock records found for this account.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th>Rack</th>
                  <th>Quantity</th>
                  <th>MRP</th>
                  <th>Selling Price</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {inventory.map((item) => (
                  <tr key={item.batch_id}>
                    <td>
                      <strong>{item.product_name}</strong>
                      <small>
                        {item.brand || item.salt_name || "—"}
                      </small>
                    </td>
                    <td>{item.batch_number}</td>
                    <td>
                      {item.expiry_date
                        ? String(item.expiry_date).slice(0, 10)
                        : "—"}
                    </td>
                    <td>{item.rack_code || "Not assigned"}</td>
                    <td>{item.quantity}</td>
                    <td>₹{Number(item.mrp).toFixed(2)}</td>
                    <td>
                      ₹{Number(item.selling_price).toFixed(2)}
                    </td>
                    <td>
                      {item.expiry_alert ? (
                        <span className="status-badge status-warning">
                          Expiry alert
                        </span>
                      ) : item.low_stock_alert ? (
                        <span className="status-badge status-warning">
                          Low stock
                        </span>
                      ) : (
                        <span className="status-badge">
                          In stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )}
</section>
      </div>
    </main>
  );
}

export default App;
