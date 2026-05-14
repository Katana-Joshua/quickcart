"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: string;
  discount_percent?: string | number | null;
  category_id?: number | null;
  category_name?: string | null;
  image_url?: string | null;
  stock_quantity: number;
  is_featured: boolean | number;
};

type Category = {
  id: number;
  name: string;
  description?: string | null;
};

type Order = {
  id: number;
  order_number: string;
  full_name: string;
  email: string;
  total: string;
  status: string;
  created_at: string;
};

type ProductFormState = {
  id?: number;
  name: string;
  description: string;
  price: string;
  discount_percent: string;
  category_id: string;
  stock_quantity: string;
  is_featured: boolean;
  image?: File | null;
};

const blankProductForm: ProductFormState = {
  name: "",
  description: "",
  price: "",
  discount_percent: "",
  category_id: "",
  stock_quantity: "0",
  is_featured: false,
  image: null,
};

function resolveImageUrl(raw?: string | null) {
  if (!raw) return "";
  if (raw.startsWith("http") || raw.startsWith("data:")) return raw;
  const api = new URL(API_BASE);
  return `${api.origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function QuickCartLogo() {
  return (
    <span className="logo" aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <rect x="7" y="14" width="30" height="24" rx="8" />
        <path d="M16 15c0-5 3.8-9 8.5-9S33 10 33 15" />
        <path d="M35 19h6l-4 15h-5" />
        <circle cx="17" cy="40" r="3" />
        <circle cx="34" cy="40" r="3" />
      </svg>
    </span>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "categories" | "orders">("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productForm, setProductForm] = useState<ProductFormState>(blankProductForm);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryImage, setCategoryImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("quickcart_admin_token");
    if (stored) {
      setToken(stored);
      void loadDashboard(stored);
    }
  }, []);

  const revenue = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders],
  );

  async function apiFetch(path: string, options: RequestInit = {}, authToken = token) {
    const headers = new Headers(options.headers);
    if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || data.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  async function loadDashboard(authToken = token) {
    try {
      setLoading(true);
      setError("");
      const [productData, categoryData, orderData] = await Promise.all([
        apiFetch("/panel/products", {}, authToken),
        apiFetch("/panel/categories", {}, authToken),
        apiFetch("/panel/orders", {}, authToken),
      ]);
      setProducts(productData.products || []);
      setCategories(categoryData.categories || []);
      setOrders(orderData.orders || []);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Could not load dashboard";
      setError(text);
      if (text.toLowerCase().includes("admin") || text.includes("401") || text.includes("403")) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      if (!data.user?.is_admin) throw new Error("This account is not an admin user.");

      window.localStorage.setItem("quickcart_admin_token", data.token);
      setToken(data.token);
      await loadDashboard(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    window.localStorage.removeItem("quickcart_admin_token");
    setToken("");
    setPassword("");
  }

  function updateProductForm(field: keyof ProductFormState, value: string | boolean | File | null) {
    setProductForm(current => ({ ...current, [field]: value }));
  }

  function editProduct(product: Product) {
    setProductForm({
      id: product.id,
      name: product.name,
      description: product.description || "",
      price: String(product.price || ""),
      discount_percent: product.discount_percent ? String(product.discount_percent) : "",
      category_id: product.category_id ? String(product.category_id) : "",
      stock_quantity: String(product.stock_quantity || 0),
      is_featured: product.is_featured === true || product.is_featured === 1,
      image: null,
    });
    setActiveTab("products");
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const body = new FormData();
      body.append("name", productForm.name);
      body.append("description", productForm.description);
      body.append("price", productForm.price);
      body.append("discount_percent", productForm.discount_percent);
      body.append("category_id", productForm.category_id);
      body.append("stock_quantity", productForm.stock_quantity);
      body.append("is_featured", String(productForm.is_featured));
      if (productForm.image) body.append("image", productForm.image);

      await apiFetch(`/panel/products${productForm.id ? `/${productForm.id}` : ""}`, {
        method: productForm.id ? "PUT" : "POST",
        body,
      });

      setProductForm(blankProductForm);
      setMessage(productForm.id ? "Product updated." : "Product created.");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save product");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(id: number) {
    if (!window.confirm("Delete this product?")) return;
    try {
      setLoading(true);
      await apiFetch(`/panel/products/${id}`, { method: "DELETE" });
      setMessage("Product deleted.");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete product");
    } finally {
      setLoading(false);
    }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const body = new FormData();
      body.append("name", categoryName);
      body.append("description", categoryDescription);
      if (categoryImage) body.append("image", categoryImage);
      await apiFetch("/panel/categories", { method: "POST", body });
      setCategoryName("");
      setCategoryDescription("");
      setCategoryImage(null);
      setMessage("Category created.");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save category");
    } finally {
      setLoading(false);
    }
  }

  async function deleteCategory(id: number) {
    if (!window.confirm("Delete this category? Products in it will be uncategorized.")) return;
    try {
      setLoading(true);
      await apiFetch(`/panel/categories/${id}`, { method: "DELETE" });
      setMessage("Category deleted.");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete category");
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: number, status: string) {
    try {
      await apiFetch(`/panel/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setOrders(current => current.map(order => (order.id === orderId ? { ...order, status } : order)));
      setMessage("Order status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order");
    }
  }

  if (!token) {
    return (
      <main className="loginPage">
        <form className="loginCard" onSubmit={login}>
          <div className="brand">
            <QuickCartLogo />
            <div>
              <h1>QuickCart Admin</h1>
              <p className="muted">Sign in with an admin account.</p>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <div className="formGrid">
            <label>
              Email
              <input value={email} onChange={event => setEmail(event.target.value)} type="email" required />
            </label>
            <label>
              Password
              <input value={password} onChange={event => setPassword(event.target.value)} type="password" required />
            </label>
            <button className="primary" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Sign in"}
            </button>
            <p className="helperText">
              Create an admin in the backend with <code>ADMIN_EMAIL</code> and{" "}
              <code>ADMIN_PASSWORD</code>, then run <code>npm run create-admin</code>.
            </p>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="page dashboardShell">
      <aside className="sidebar">
        <div className="brand">
          <QuickCartLogo />
          <div>
            <strong>QuickCart</strong>
            <div className="muted">Official dashboard</div>
          </div>
        </div>
        {(["overview", "products", "categories", "orders"] as const).map(tab => (
          <button
            className={`navButton ${activeTab === tab ? "active" : ""}`}
            key={tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </aside>

      <section className="main">
        <div className="topbar">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="muted">Manage products, categories, and orders from one place.</p>
          </div>
          <div className="row">
            <button className="secondary" onClick={() => loadDashboard()} disabled={loading}>
              Refresh
            </button>
            <button className="danger" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        {message && <p className="successText">{message}</p>}

        <section className="grid stats">
          <div className="statCard">
            <span>Products</span>
            <strong>{products.length}</strong>
          </div>
          <div className="statCard">
            <span>Categories</span>
            <strong>{categories.length}</strong>
          </div>
          <div className="statCard">
            <span>Orders</span>
            <strong>{orders.length}</strong>
          </div>
          <div className="statCard">
            <span>Revenue</span>
            <strong>UGX {revenue.toLocaleString()}</strong>
          </div>
        </section>

        {activeTab === "overview" && (
          <section className="panel">
            <h2>Recent Orders</h2>
            <OrdersTable orders={orders.slice(0, 8)} onStatusChange={updateOrderStatus} />
          </section>
        )}

        {activeTab === "products" && (
          <section className="grid split">
            <form className="panel formGrid" onSubmit={saveProduct}>
              <h2>{productForm.id ? "Edit Product" : "New Product"}</h2>
              <input placeholder="Product name" value={productForm.name} onChange={event => updateProductForm("name", event.target.value)} required />
              <textarea placeholder="Description" value={productForm.description} onChange={event => updateProductForm("description", event.target.value)} />
              <div className="row">
                <input placeholder="Price" value={productForm.price} onChange={event => updateProductForm("price", event.target.value)} required />
                <input placeholder="Discount %" value={productForm.discount_percent} onChange={event => updateProductForm("discount_percent", event.target.value)} />
              </div>
              <div className="row">
                <select value={productForm.category_id} onChange={event => updateProductForm("category_id", event.target.value)}>
                  <option value="">No category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <input placeholder="Stock" value={productForm.stock_quantity} onChange={event => updateProductForm("stock_quantity", event.target.value)} />
              </div>
              <label className="row">
                <input checked={productForm.is_featured} onChange={event => updateProductForm("is_featured", event.target.checked)} type="checkbox" />
                Featured product
              </label>
              <input accept="image/*" onChange={(event: ChangeEvent<HTMLInputElement>) => updateProductForm("image", event.target.files?.[0] || null)} type="file" />
              <div className="row rowEnd">
                {productForm.id && (
                  <button className="secondary" onClick={() => setProductForm(blankProductForm)} type="button">
                    Cancel
                  </button>
                )}
                <button className="primary" disabled={loading} type="submit">
                  {productForm.id ? "Update product" : "Create product"}
                </button>
              </div>
            </form>

            <section className="panel">
              <h2>Products</h2>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id}>
                        <td className="row">
                          {product.image_url ? <img className="productThumb" src={resolveImageUrl(product.image_url)} alt="" /> : <span className="productThumb" />}
                          <strong>{product.name}</strong>
                        </td>
                        <td>{product.category_name || "Uncategorized"}</td>
                        <td>UGX {Number(product.price || 0).toLocaleString()}</td>
                        <td>{product.stock_quantity}</td>
                        <td className="row">
                          <button className="secondary" onClick={() => editProduct(product)} type="button">Edit</button>
                          <button className="danger" onClick={() => deleteProduct(product.id)} type="button">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeTab === "categories" && (
          <section className="grid split">
            <form className="panel formGrid" onSubmit={saveCategory}>
              <h2>New Category</h2>
              <input placeholder="Category name" value={categoryName} onChange={event => setCategoryName(event.target.value)} required />
              <textarea placeholder="Description" value={categoryDescription} onChange={event => setCategoryDescription(event.target.value)} />
              <input accept="image/*" onChange={event => setCategoryImage(event.target.files?.[0] || null)} type="file" />
              <button className="primary" disabled={loading} type="submit">Create category</button>
            </form>
            <section className="panel">
              <h2>Categories</h2>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(category => (
                      <tr key={category.id}>
                        <td><strong>{category.name}</strong></td>
                        <td>{category.description || "No description"}</td>
                        <td>
                          <button className="danger" onClick={() => deleteCategory(category.id)} type="button">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeTab === "orders" && (
          <section className="panel">
            <h2>Orders</h2>
            <OrdersTable orders={orders} onStatusChange={updateOrderStatus} />
          </section>
        )}
      </section>
    </main>
  );
}

function OrdersTable({
  orders,
  onStatusChange,
}: {
  orders: Order[];
  onStatusChange: (orderId: number, status: string) => void;
}) {
  if (orders.length === 0) return <p className="muted">No orders yet.</p>;

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Total</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td><strong>{order.order_number}</strong></td>
              <td>
                {order.full_name}
                <div className="muted">{order.email}</div>
              </td>
              <td>UGX {Number(order.total || 0).toLocaleString()}</td>
              <td>
                <select value={order.status} onChange={event => onStatusChange(order.id, event.target.value)}>
                  {["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

