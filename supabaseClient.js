import { useState, useEffect, useMemo } from "react";
import { ShoppingCart, X, Plus, Minus, MessageCircle, Mail, Settings, Package, ClipboardList, Lock, Check, Trash2 } from "lucide-react";
import { supabase } from "./supabaseClient";

const C = {
  paper: "#EDEFEC",
  paperDeep: "#E2E5DF",
  ink: "#14181A",
  steel: "#4B5563",
  steelLight: "#8A93A0",
  hivis: "#D4FF3B",
  rust: "#E4572E",
  line: "#CBD0C9",
};

const FONTS = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
    .f-display{font-family:'Archivo Black', sans-serif;}
    .f-mono{font-family:'IBM Plex Mono', monospace;}
    .f-body{font-family:'Inter', sans-serif;}
    .ticket-notch{position:absolute; width:22px; height:22px; border-radius:9999px; background:${C.paper}; top:50%; transform:translateY(-50%);}
  `}</style>
);

const DEFAULT_PRODUCTS = [
  { id: "p1", name: "Chambre à air 700x23/25c", category: "Chambres à air", price: 4.9, active: true, img: "https://placehold.co/400x300/14181A/EDEFEC?text=Chambre+a+air" },
  { id: "p2", name: "Guidoline gel noire", category: "Accessoires", price: 12.9, active: true, img: "https://placehold.co/400x300/14181A/EDEFEC?text=Guidoline" },
  { id: "p3", name: "Plaquettes de frein VTT (paire)", category: "Freinage", price: 9.5, active: true, img: "https://placehold.co/400x300/14181A/EDEFEC?text=Plaquettes" },
  { id: "p4", name: "Chaîne 11 vitesses", category: "Transmission", price: 18.9, active: true, img: "https://placehold.co/400x300/14181A/EDEFEC?text=Chaine" },
  { id: "p5", name: "Patins de frein route (paire)", category: "Freinage", price: 6.9, active: true, img: "https://placehold.co/400x300/14181A/EDEFEC?text=Patins" },
];

const DEFAULT_SETTINGS = {
  shopName: "Relais Cycles",
  pickupName: "Mon point relais",
  pickupAddress: "12 rue des Cycles, 93360 Neuilly-Plaisance",
  paymentLinkTemplate: "https://paypal.me/votre-compte/{amount}",
  adminPin: "1234",
};

function genCode() {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `R-${n}`;
}

// --- Mapping entre les colonnes Supabase (snake_case) et l'app (camelCase) ---
function settingsFromDb(row) {
  return {
    shopName: row.shop_name,
    pickupName: row.pickup_name,
    pickupAddress: row.pickup_address,
    paymentLinkTemplate: row.payment_link_template,
    adminPin: row.admin_pin,
  };
}
function settingsToDb(s) {
  return {
    id: 1,
    shop_name: s.shopName,
    pickup_name: s.pickupName,
    pickup_address: s.pickupAddress,
    payment_link_template: s.paymentLinkTemplate,
    admin_pin: s.adminPin,
  };
}
function orderFromDb(row) {
  return {
    id: row.id,
    code: row.code,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    notes: row.notes,
    items: row.items || [],
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at,
  };
}
function orderToDb(o) {
  return {
    id: o.id,
    code: o.code,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    customer_email: o.customerEmail,
    notes: o.notes,
    items: o.items,
    total: o.total,
    status: o.status,
    created_at: o.createdAt,
  };
}

function Ticket({ code, title, pickupName, pickupAddress, children }) {
  const pending = !code;
  return (
    <div className="relative rounded-lg overflow-hidden" style={{ background: pending ? C.steel : C.ink, color: C.paper }}>
      <div className="ticket-notch" style={{ left: -11 }} />
      <div className="ticket-notch" style={{ right: -11 }} />
      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs tracking-widest uppercase f-body" style={{ color: C.steelLight }}>
            {title || (pending ? "EN ATTENTE DE PAIEMENT" : "COUPON DE RETRAIT")}
          </span>
          {!pending && <span className="text-xs f-body" style={{ color: C.steelLight }}>à retirer sur place</span>}
        </div>
        <div className="border-t border-dashed my-2" style={{ borderColor: "#5B6570" }} />
        <div className="flex items-end justify-between mt-3">
          <div>
            {pending ? (
              <div className="text-2xl f-mono font-bold tracking-wider" style={{ color: C.steelLight }}>• • • • •</div>
            ) : (
              <div className="text-3xl f-mono font-bold tracking-wider" style={{ color: C.hivis }}>{code}</div>
            )}
            {pending && <div className="text-xs f-body mt-2" style={{ color: C.steelLight }}>Le code sera attribué dès réception du paiement.</div>}
            {pickupName && <div className="text-sm f-body mt-2">{pickupName}</div>}
            {pickupAddress && <div className="text-xs f-body" style={{ color: C.steelLight }}>{pickupAddress}</div>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState(null);
  const [orders, setOrders] = useState(null);
  const [settings, setSettings] = useState(null);
  const [view, setView] = useState("shop");
  const [category, setCategory] = useState("Tous");
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [adminTab, setAdminTab] = useState("commandes");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);
    setLoadError(false);
    try {
      // Réglages : une seule ligne (id=1). Créée si absente.
      let { data: settingsRow } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
      if (!settingsRow) {
        const seed = settingsToDb(DEFAULT_SETTINGS);
        await supabase.from("settings").insert(seed);
        settingsRow = seed;
      }
      setSettings(settingsFromDb(settingsRow));

      // Produits : seedés si la table est vide.
      let { data: productRows } = await supabase.from("products").select("*").order("name");
      if (!productRows || productRows.length === 0) {
        await supabase.from("products").insert(DEFAULT_PRODUCTS);
        productRows = DEFAULT_PRODUCTS;
      }
      setProducts(productRows);

      // Commandes
      const { data: orderRows } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      setOrders((orderRows || []).map(orderFromDb));
    } catch (e) {
      console.error(e);
      setLoadError(true);
    }
    setLoading(false);
  }

  const categories = useMemo(() => {
    if (!products) return ["Tous"];
    return ["Tous", ...Array.from(new Set(products.map((p) => p.category)))];
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => p.active && (category === "Tous" || p.category === category));
  }, [products, category]);

  const cartItems = useMemo(() => {
    if (!products) return [];
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ ...products.find((p) => p.id === id), qty }))
      .filter((i) => i.id);
  }, [cart, products]);

  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.qty * i.price, 0);

  function updateQty(id, delta) {
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + delta) }));
  }

  async function submitOrder(form) {
    const order = {
      id: `o_${Date.now()}`,
      code: null,
      customerName: form.name,
      customerPhone: form.phone,
      customerEmail: form.email,
      notes: form.notes,
      items: cartItems.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
      total: cartTotal,
      status: "attente",
      createdAt: new Date().toISOString(),
    };
    const { error } = await supabase.from("orders").insert(orderToDb(order));
    if (error) {
      console.error(error);
      alert("Erreur lors de l'enregistrement de la commande. Merci de réessayer.");
      return;
    }
    setOrders((prev) => [order, ...(prev || [])]);
    setCart({});
    setCheckoutOpen(false);
    setCartOpen(false);
    setConfirmedOrder(order);
  }

  async function updateOrderStatus(id, status) {
    const current = orders.find((o) => o.id === id);
    if (!current) return;
    const code = status === "payee" && !current.code ? genCode() : current.code;
    const { error } = await supabase.from("orders").update({ status, code }).eq("id", id);
    if (error) {
      console.error(error);
      alert("Erreur lors de la mise à jour du statut.");
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status, code } : o)));
  }

  async function reloadOrders() {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (!error) setOrders((data || []).map(orderFromDb));
  }

  async function saveSettingsForm(next) {
    const { error } = await supabase.from("settings").upsert(settingsToDb(next));
    if (!error) setSettings(next);
    return !error;
  }

  async function saveProductsList(next) {
    const rows = next.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, active: p.active, img: p.img }));
    const { error } = await supabase.from("products").upsert(rows);
    if (!error) setProducts(next);
    return !error;
  }

  async function deleteProduct(id) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) setProducts((prev) => prev.filter((p) => p.id !== id));
    return !error;
  }

  function paymentLink(order) {
    return (settings.paymentLinkTemplate || "")
      .replace("{amount}", order.total.toFixed(2))
      .replace("{code}", order.code || "");
  }

  function waLinkPayment(order) {
    const msg = `Bonjour ${order.customerName}, voici votre lien de paiement pour votre commande chez ${settings.shopName} : ${paymentLink(order)}\nVotre code de retrait vous sera envoyé dès réception du paiement.`;
    const phone = (order.customerPhone || "").replace(/[^0-9+]/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }
  function mailLinkPayment(order) {
    const subject = `Votre lien de paiement - ${settings.shopName}`;
    const body = `Bonjour ${order.customerName},\n\nVoici votre lien de paiement : ${paymentLink(order)}\n\nVotre code de retrait vous sera envoyé dès réception du paiement.\n\nMerci !`;
    return `mailto:${order.customerEmail || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  function waLinkCode(order) {
    const msg = `Merci ${order.customerName}, votre paiement est bien reçu !\nVotre code de retrait : ${order.code}\nÀ retirer chez : ${settings.pickupName} - ${settings.pickupAddress}`;
    const phone = (order.customerPhone || "").replace(/[^0-9+]/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }
  function mailLinkCode(order) {
    const subject = `Votre code de retrait - ${settings.shopName}`;
    const body = `Merci ${order.customerName}, votre paiement est bien reçu !\n\nVotre code de retrait : ${order.code}\nÀ retirer chez : ${settings.pickupName} - ${settings.pickupAddress}\n\nMerci !`;
    return `mailto:${order.customerEmail || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center f-body" style={{ background: C.paper, color: C.ink }}>
        {FONTS}
        Chargement…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center f-body p-6 text-center" style={{ background: C.paper, color: C.ink }}>
        {FONTS}
        <div>
          <div className="f-display text-lg mb-2">Connexion impossible</div>
          <div className="text-sm" style={{ color: C.steel }}>
            Vérifiez que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont bien configurées (fichier .env en local, ou variables d'environnement sur Vercel), puis rechargez la page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen f-body" style={{ background: C.paper, color: C.ink }}>
      {FONTS}
      <header className="sticky top-0 z-30 border-b" style={{ background: C.paper, borderColor: C.line }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="f-display text-xl tracking-tight" style={{ color: C.ink }}>{settings.shopName}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("shop")}
              className="px-3 py-1.5 rounded text-sm font-medium f-body"
              style={{ background: view === "shop" ? C.ink : "transparent", color: view === "shop" ? C.paper : C.steel }}
            >
              Boutique
            </button>
            <button
              onClick={() => setView("admin")}
              className="px-3 py-1.5 rounded text-sm font-medium f-body flex items-center gap-1"
              style={{ background: view === "admin" ? C.ink : "transparent", color: view === "admin" ? C.paper : C.steel }}
            >
              <Settings size={14} /> Gérant
            </button>
            {view === "shop" && (
              <button onClick={() => setCartOpen(true)} className="relative ml-2 p-2 rounded-full" style={{ background: C.ink }}>
                <ShoppingCart size={18} color={C.paper} />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
                    style={{ background: C.hivis, color: C.ink }}
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {view === "shop" && (
        <main className="max-w-5xl mx-auto px-4 py-6">
          <p className="text-sm mb-4" style={{ color: C.steel }}>
            Ajoutez vos articles au panier. Après validation, vous recevrez un lien de paiement par WhatsApp ou email, puis vous récupérerez votre commande au point relais avec votre code.
          </p>
          <div className="flex gap-2 flex-wrap mb-5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="px-3 py-1.5 rounded-full text-sm font-medium border"
                style={{
                  borderColor: category === c ? C.ink : C.line,
                  background: category === c ? C.ink : "transparent",
                  color: category === c ? C.paper : C.steel,
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {visibleProducts.map((p) => (
              <div key={p.id} className="rounded-lg overflow-hidden border flex flex-col" style={{ borderColor: C.line, background: "#fff" }}>
                <img
                  src={p.img}
                  alt={p.name}
                  className="w-full h-28 object-cover"
                  onError={(e) => { e.target.src = "https://placehold.co/400x300/EDEFEC/8A93A0?text=Photo+indisponible"; }}
                />
                <div className="p-3 flex flex-col flex-1">
                  <div className="text-xs uppercase tracking-wide mb-1" style={{ color: C.steelLight }}>{p.category}</div>
                  <div className="text-sm font-medium mb-2 flex-1">{p.name}</div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="f-mono font-semibold">{Number(p.price).toFixed(2)} €</span>
                    {cart[p.id] > 0 ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(p.id, -1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: C.paperDeep }}>
                          <Minus size={12} />
                        </button>
                        <span className="f-mono text-sm w-4 text-center">{cart[p.id]}</span>
                        <button onClick={() => updateQty(p.id, 1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: C.ink }}>
                          <Plus size={12} color={C.paper} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => updateQty(p.id, 1)}
                        className="px-2.5 py-1 rounded text-xs font-semibold"
                        style={{ background: C.hivis, color: C.ink }}
                      >
                        Ajouter
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {visibleProducts.length === 0 && (
              <div className="col-span-full text-sm py-10 text-center" style={{ color: C.steel }}>Aucun produit dans cette catégorie.</div>
            )}
          </div>
        </main>
      )}

      {view === "admin" && (
        <AdminView
          adminUnlocked={adminUnlocked}
          setAdminUnlocked={setAdminUnlocked}
          pinInput={pinInput}
          setPinInput={setPinInput}
          settings={settings}
          orders={orders}
          products={products}
          adminTab={adminTab}
          setAdminTab={setAdminTab}
          updateOrderStatus={updateOrderStatus}
          reloadOrders={reloadOrders}
          saveSettingsForm={saveSettingsForm}
          saveProductsList={saveProductsList}
          deleteProduct={deleteProduct}
          waLinkPayment={waLinkPayment}
          mailLinkPayment={mailLinkPayment}
          waLinkCode={waLinkCode}
          mailLinkCode={mailLinkCode}
        />
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-sm h-full flex flex-col" style={{ background: C.paper }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.line }}>
              <span className="f-display text-lg">Panier</span>
              <button onClick={() => setCartOpen(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {cartItems.length === 0 && <div className="text-sm" style={{ color: C.steel }}>Votre panier est vide.</div>}
              {cartItems.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div style={{ color: C.steel }}>{i.qty} x {Number(i.price).toFixed(2)} €</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(i.id, -1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: C.paperDeep }}><Minus size={12} /></button>
                    <button onClick={() => updateQty(i.id, 1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: C.ink }}><Plus size={12} color={C.paper} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t" style={{ borderColor: C.line }}>
              <div className="flex items-center justify-between mb-3 f-mono font-semibold">
                <span>Total</span>
                <span>{cartTotal.toFixed(2)} €</span>
              </div>
              <button
                disabled={cartItems.length === 0}
                onClick={() => setCheckoutOpen(true)}
                className="w-full py-2.5 rounded font-semibold text-sm disabled:opacity-40"
                style={{ background: C.ink, color: C.paper }}
              >
                Valider la commande
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && <CheckoutModal onClose={() => setCheckoutOpen(false)} onSubmit={submitOrder} total={cartTotal} />}

      {confirmedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(20,24,26,0.6)" }}>
          <div className="w-full max-w-sm">
            <Ticket code={confirmedOrder.code} pickupName={settings.pickupName} pickupAddress={settings.pickupAddress}>
              <div className="mt-4 pt-3 border-t border-dashed text-xs f-body" style={{ borderColor: "#5B6570", color: C.steelLight }}>
                Vous allez recevoir un lien de paiement par WhatsApp ou email. Votre code de retrait vous sera envoyé une fois le paiement confirmé.
              </div>
            </Ticket>
            <button
              onClick={() => setConfirmedOrder(null)}
              className="w-full mt-3 py-2.5 rounded font-semibold text-sm"
              style={{ background: C.paper, color: C.ink }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckoutModal({ onClose, onSubmit, total }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = form.name.trim() && (form.phone.trim() || form.email.trim());

  async function handleSubmit() {
    setSubmitting(true);
    await onSubmit(form);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(20,24,26,0.5)" }}>
      <div className="w-full max-w-sm rounded-lg p-5" style={{ background: C.paper }}>
        <div className="flex items-center justify-between mb-4">
          <span className="f-display text-lg">Vos coordonnées</span>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input placeholder="Nom et prénom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded border text-sm" style={{ borderColor: C.line }} />
          <input placeholder="Téléphone (WhatsApp)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded border text-sm" style={{ borderColor: C.line }} />
          <input placeholder="Email (optionnel)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded border text-sm" style={{ borderColor: C.line }} />
          <textarea placeholder="Notes (optionnel)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 rounded border text-sm" style={{ borderColor: C.line }} rows={2} />
          <div className="flex items-center justify-between text-sm font-semibold f-mono pt-1">
            <span>Total</span>
            <span>{total.toFixed(2)} €</span>
          </div>
          <button
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="w-full py-2.5 rounded font-semibold text-sm disabled:opacity-40"
            style={{ background: C.ink, color: C.paper }}
          >
            {submitting ? "Envoi…" : "Confirmer la commande"}
          </button>
          <div className="text-xs" style={{ color: C.steel }}>Merci de renseigner au moins un téléphone ou un email pour recevoir votre lien de paiement.</div>
        </div>
      </div>
    </div>
  );
}

function AdminView(props) {
  const {
    adminUnlocked, setAdminUnlocked, pinInput, setPinInput, settings, orders, products,
    adminTab, setAdminTab, updateOrderStatus, reloadOrders, saveSettingsForm, saveProductsList,
    deleteProduct, waLinkPayment, mailLinkPayment, waLinkCode, mailLinkCode,
  } = props;

  if (!adminUnlocked) {
    return (
      <main className="max-w-sm mx-auto px-4 py-16 text-center">
        <Lock size={28} className="mx-auto mb-3" style={{ color: C.steel }} />
        <div className="f-display text-lg mb-3">Espace gérant</div>
        <input
          type="password"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && pinInput === settings.adminPin && setAdminUnlocked(true)}
          placeholder="Code PIN"
          className="w-full px-3 py-2 rounded border text-sm text-center mb-3 f-mono"
          style={{ borderColor: C.line }}
        />
        <button
          onClick={() => pinInput === settings.adminPin && setAdminUnlocked(true)}
          className="w-full py-2.5 rounded font-semibold text-sm"
          style={{ background: C.ink, color: C.paper }}
        >
          Accéder
        </button>
        <div className="text-xs mt-3" style={{ color: C.steelLight }}>PIN par défaut : 1234 (modifiable dans Réglages)</div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex gap-2 mb-5">
        {[
          ["commandes", "Commandes", ClipboardList],
          ["produits", "Produits", Package],
          ["reglages", "Réglages", Settings],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setAdminTab(key)}
            className="px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 border"
            style={{
              borderColor: adminTab === key ? C.ink : C.line,
              background: adminTab === key ? C.ink : "transparent",
              color: adminTab === key ? C.paper : C.steel,
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {adminTab === "commandes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs" style={{ color: C.steel }}>
            <span>{orders.length} commande{orders.length > 1 ? "s" : ""} enregistrée{orders.length > 1 ? "s" : ""}</span>
            <button onClick={reloadOrders} className="px-2.5 py-1 rounded border font-medium" style={{ borderColor: C.line }}>
              ↻ Recharger
            </button>
          </div>
          {orders.length === 0 && <div className="text-sm" style={{ color: C.steel }}>Aucune commande pour le moment.</div>}
          {orders.map((o) => (
            <div key={o.id} className="grid sm:grid-cols-2 gap-3">
              <Ticket code={o.code} pickupName={o.customerName} pickupAddress={o.customerPhone || o.customerEmail} />
              <div className="rounded-lg border p-4 flex flex-col justify-between" style={{ borderColor: C.line, background: "#fff" }}>
                <div>
                  <div className="text-sm font-medium mb-1">{o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}</div>
                  <div className="f-mono text-sm mb-2">{o.total.toFixed(2)} €</div>
                  {o.notes && <div className="text-xs mb-2" style={{ color: C.steel }}>Note : {o.notes}</div>}
                  <select
                    value={o.status}
                    onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded border mb-3"
                    style={{ borderColor: C.line }}
                  >
                    <option value="attente">En attente de paiement</option>
                    <option value="envoyee">Lien envoyé</option>
                    <option value="payee">Payée</option>
                    <option value="remise">Remise effectuée</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs font-medium mb-1.5" style={{ color: C.steel }}>
                    {o.code ? "Envoyer le code de retrait" : "Envoyer le lien de paiement"}
                  </div>
                  <div className="flex gap-2">
                    {o.customerPhone && (
                      <a href={o.code ? waLinkCode(o) : waLinkPayment(o)} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold" style={{ background: "#25D366", color: "#fff" }}>
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}
                    {o.customerEmail && (
                      <a href={o.code ? mailLinkCode(o) : mailLinkPayment(o)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold" style={{ background: C.ink, color: C.paper }}>
                        <Mail size={14} /> Email
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {adminTab === "produits" && <ProductsEditor products={products} onSave={saveProductsList} onDelete={deleteProduct} />}

      {adminTab === "reglages" && <SettingsEditor settings={settings} onSave={saveSettingsForm} />}
    </main>
  );
}

function ProductsEditor({ products, onSave, onDelete }) {
  const [list, setList] = useState(products);
  const [saveStatus, setSaveStatus] = useState("idle");
  useEffect(() => setList(products), [products]);

  function update(id, field, value) {
    setList((l) => l.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }
  async function remove(id) {
    const ok = await onDelete(id);
    if (ok) setList((l) => l.filter((p) => p.id !== id));
    else alert("Impossible de supprimer ce produit, réessayez.");
  }
  function addNew() {
    setList((l) => [...l, { id: `p_${Date.now()}`, name: "Nouveau produit", category: "Accessoires", price: 0, active: true, img: "https://placehold.co/400x300/14181A/EDEFEC?text=Produit" }]);
  }
  async function handleSave() {
    setSaveStatus("saving");
    const ok = await onSave(list);
    setSaveStatus(ok === false ? "error" : "ok");
    if (ok !== false) setTimeout(() => setSaveStatus("idle"), 2000);
  }

  return (
    <div>
      <div className="space-y-3 mb-4">
        {list.map((p) => (
          <div key={p.id} className="border rounded p-3 text-sm space-y-2" style={{ borderColor: C.line, background: "#fff" }}>
            <div className="flex items-center gap-3">
              <img
                src={p.img || "https://placehold.co/100x100/EDEFEC/8A93A0?text=?"}
                alt={p.name}
                className="w-14 h-14 object-cover rounded border flex-shrink-0"
                style={{ borderColor: C.line }}
                onError={(e) => { e.target.src = "https://placehold.co/100x100/EDEFEC/8A93A0?text=?"; }}
              />
              <input
                value={p.img || ""}
                onChange={(e) => update(p.id, "img", e.target.value)}
                placeholder="Coller le lien (URL) de la photo ici"
                className="flex-1 px-2 py-1 rounded border text-xs"
                style={{ borderColor: C.line }}
              />
            </div>
            <div className="grid sm:grid-cols-6 gap-2 items-center">
              <input value={p.name} onChange={(e) => update(p.id, "name", e.target.value)} className="sm:col-span-2 px-2 py-1 rounded border" style={{ borderColor: C.line }} />
              <input value={p.category} onChange={(e) => update(p.id, "category", e.target.value)} className="px-2 py-1 rounded border" style={{ borderColor: C.line }} />
              <input type="number" step="0.01" value={p.price} onChange={(e) => update(p.id, "price", parseFloat(e.target.value) || 0)} className="px-2 py-1 rounded border f-mono" style={{ borderColor: C.line }} />
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={p.active} onChange={(e) => update(p.id, "active", e.target.checked)} /> actif
              </label>
              <button onClick={() => remove(p.id)} className="flex items-center justify-center gap-1 py-1 rounded text-xs font-semibold" style={{ background: C.rust, color: "#fff" }}>
                <Trash2 size={12} /> Suppr.
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={addNew} className="px-3 py-2 rounded text-sm font-semibold flex items-center gap-1.5" style={{ background: C.paperDeep, color: C.ink }}>
          <Plus size={14} /> Ajouter un produit
        </button>
        <button onClick={handleSave} disabled={saveStatus === "saving"} className="px-3 py-2 rounded text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60" style={{ background: C.ink, color: C.paper }}>
          <Check size={14} /> {saveStatus === "saving" ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saveStatus === "ok" && <span className="text-sm font-medium" style={{ color: "#2E7D32" }}>✓ Enregistré</span>}
        {saveStatus === "error" && <span className="text-sm font-medium" style={{ color: C.rust }}>Échec de l'enregistrement, réessayez</span>}
      </div>
    </div>
  );
}

function SettingsEditor({ settings, onSave }) {
  const [form, setForm] = useState(settings);
  const [saveStatus, setSaveStatus] = useState("idle");
  useEffect(() => setForm(settings), [settings]);

  async function handleSave() {
    setSaveStatus("saving");
    const ok = await onSave(form);
    setSaveStatus(ok === false ? "error" : "ok");
    if (ok !== false) setTimeout(() => setSaveStatus("idle"), 2000);
  }

  const field = (label, key, placeholder) => (
    <div className="mb-3">
      <label className="text-xs uppercase tracking-wide block mb-1" style={{ color: C.steel }}>{label}</label>
      <input
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded border text-sm"
        style={{ borderColor: C.line }}
      />
    </div>
  );
  return (
    <div className="max-w-md">
      {field("Nom de la boutique", "shopName")}
      {field("Nom du point relais", "pickupName")}
      {field("Adresse du point relais", "pickupAddress")}
      {field("Modèle de lien de paiement", "paymentLinkTemplate", "https://paypal.me/vous/{amount}")}
      <div className="text-xs mb-3" style={{ color: C.steelLight }}>Utilisez {"{amount}"} pour le montant et {"{code}"} pour le code de retrait.</div>
      {field("Code PIN gérant", "adminPin")}
      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={saveStatus === "saving"} className="px-3 py-2 rounded text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60" style={{ background: C.ink, color: C.paper }}>
          <Check size={14} /> {saveStatus === "saving" ? "Enregistrement…" : "Enregistrer"}
        </button>
        {saveStatus === "ok" && <span className="text-sm font-medium" style={{ color: "#2E7D32" }}>✓ Enregistré</span>}
        {saveStatus === "error" && <span className="text-sm font-medium" style={{ color: C.rust }}>Échec, réessayez</span>}
      </div>
    </div>
  );
}
