import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, Ban, Check, Clock3, MapPin, Minus, PackageCheck, Pill, Plus, ShoppingBag, Store, Trash2, LayoutGrid, ListOrdered, History, ChevronRight, Truck } from "lucide-react";
import { Repeat, UserRound } from "lucide-react";
import { getCustomerOrders, getCheckoutPharmacyOptions } from "../api/ordersApi";
import { normalizePhone } from "../api/sessionApi";
import { ORDER_STATUS_LABELS as statusLabels } from "../utils/statusLabels";
import { handleWhatsAppSupport } from "../components/WhatsAppSupport";
import "./CartPage.css";

const currency = (amount) => `${Number(amount || 0).toLocaleString("ar-EG")} ج.م`;

function readMonthlyRxDraft() {
  try {
    const parsed = JSON.parse(localStorage.getItem("dawak-monthly-rx") || "null");
    return parsed && Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
}

function saveMonthlyRx(rx) {
  try {
    localStorage.setItem("dawak-monthly-rx", JSON.stringify(rx));
  } catch {
    /* التخزين غير متاح */
  }
}

function readLocationChoice() {
  try {
    return JSON.parse(sessionStorage.getItem("dawak-pharmacy-location-choice") || "null") || {};
  } catch {
    return {};
  }
}

export default function CartPage({
  cart,
  subtotal,
  deliveryFee,
  discount,
  total,
  onChangeQuantity,
  onRemove,
  onCheckout,
  submitting,
  checkoutError,
  orderConfirmation,
  orderSource = "cart",
  initialPharmacyId = null,
  customerPhone = "",
  onBack,
  onTrackOrder,
  onContinueShopping,
}) {
  const [customer, setCustomer] = useState({ name: "", phone: customerPhone, address: "" });
  const [monthlyRepeat, setMonthlyRepeat] = useState(false);
  const [pharmacyOptions, setPharmacyOptions] = useState([]);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(initialPharmacyId ? Number(initialPharmacyId) : null);
  const [pharmacyError, setPharmacyError] = useState("");

  useEffect(() => {
    let active = true;
    if (!cart.length) {
      setPharmacyOptions([]);
      return () => { active = false; };
    }

    setPharmacyLoading(true);
    setPharmacyError("");
    getCheckoutPharmacyOptions(cart.map((item) => ({ productId: item.id, quantity: item.quantity })), readLocationChoice())
      .then((options) => {
        if (!active) return;
        setPharmacyOptions(options);
        const preferred = options.find((option) => option.id === Number(initialPharmacyId) && option.canFulfill)
          || options.filter((option) => option.canFulfill).sort((first, second) => {
            if (first.distanceMeters != null && second.distanceMeters != null) return first.distanceMeters - second.distanceMeters;
            if (first.distanceMeters != null) return -1;
            if (second.distanceMeters != null) return 1;
            return first.subtotal - second.subtotal;
          })[0];
        setSelectedPharmacyId((current) => {
          const currentOption = options.find((option) => option.id === current && option.canFulfill);
          return currentOption?.id ?? preferred?.id ?? options[0]?.id ?? null;
        });
      })
      .catch((requestError) => { if (active) setPharmacyError(requestError.message || "تعذر التحقق من المخزون."); })
      .finally(() => { if (active) setPharmacyLoading(false); });

    return () => { active = false; };
  }, [cart.map((item) => `${item.id}:${item.quantity}`).join("|"), initialPharmacyId]);

  const selectedPharmacy = pharmacyOptions.find((option) => option.id === Number(selectedPharmacyId)) || null;
  const delivery = selectedPharmacy?.delivery || null;
  const checkoutSubtotal = selectedPharmacy?.subtotal ?? subtotal;
  const checkoutDeliveryFee = delivery?.fee ?? 0;
  const checkoutDiscount = Number((checkoutSubtotal * (monthlyRepeat ? 0.05 : 0)).toFixed(2));
  const checkoutTotal = Number((checkoutSubtotal + checkoutDeliveryFee - checkoutDiscount).toFixed(2));
  const canConfirm = Boolean(selectedPharmacy?.canFulfill && delivery?.available && !pharmacyLoading && !submitting);

  function updateCustomer(event) {
    setCustomer((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function submit(event) {
    event.preventDefault();
    if (!selectedPharmacy?.canFulfill || !delivery?.available || submitting) return;

    if (monthlyRepeat) {
      saveMonthlyRx({
        items: cart.map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
        deliveryDay: 15,
        remindBefore: true,
        paused: false,
        updatedAt: Date.now(),
      });
    }

    onCheckout(customer, {
      pharmacyId: selectedPharmacy.id,
      orderSource,
    });
  }

  if (orderConfirmation) {
    return (
      <main className="cart-page">
        <section className="order-success" role="status">
          <span className="order-success-icon"><ShoppingBag size={25} /></span>
          <p className="section-kicker">تم استلام طلبك</p>
          <h1>طلبك قيد المراجعة</h1>
          <p>رقم الطلب: <strong>#{orderConfirmation.id}</strong></p>
          <p>الإجمالي: <strong>{currency(orderConfirmation.total)}</strong></p>
          <p>سيظهر الطلب لدى الصيدلي لمراجعته وتجهيزه.</p>
          {orderConfirmation.pharmacy && <p>الصيدلية: <strong>{orderConfirmation.pharmacy.name}</strong></p>}
          {orderConfirmation.deliveryService && <p>التوصيل: {currency(orderConfirmation.deliveryFee)} · خلال {orderConfirmation.deliveryService.estimatedMinutes} دقيقة تقريبًا <small>(تقدير تجريبي)</small></p>}
          <p>الطلب محفوظ في سجل الطلبات التجريبي على هذا الجهاز.</p>
          {onTrackOrder && <button type="button" className="info-submit" onClick={() => onTrackOrder(orderConfirmation.id)}>متابعة الطلب</button>}
          {onContinueShopping && (
            <button type="button" className="pharmacy-back-button cart-success-back" onClick={onContinueShopping}>
              متابعة التسوق
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <header className="cart-page-heading">
        <span className="info-page-icon"><ShoppingBag size={22} /></span>
        <div>
          <span className="section-kicker">مراجعة الطلب</span>
          <h1>{orderSource === "cart" ? "عربة التسوق" : "إتمام الطلب السريع"}</h1>
          <p>راجع المخزون والصيدلية والتوصيل قبل تأكيد الطلب.</p>
        </div>
        {onBack && <button type="button" className="pharmacy-back-button" onClick={onBack}>رجوع</button>}
      </header>

      {cart.length === 0 ? (
        <section className="cart-empty">
          <ShoppingBag size={32} />
          <h2>العربة فارغة</h2>
          <p>أضف المنتجات التي تحتاجها، وستظهر هنا للمراجعة.</p>
          {onContinueShopping && (
            <button type="button" className="info-submit" onClick={onContinueShopping}>
              تصفّح المنتجات
            </button>
          )}
        </section>
      ) : (
        <div className="cart-layout">
          <section className="cart-items" aria-label="منتجات العربة">
            {cart.map((item) => {
              const pharmacyItem = selectedPharmacy?.items.find((stockItem) => stockItem.productId === item.id);
              return <article className="cart-item" key={item.id}>
                <span className="cart-item-image">{item.image ? <img src={item.image} alt="" /> : <Pill size={22} />}</span>
                <div className="cart-item-info">
                  <h2>{item.name}</h2>
                  <p>{item.detail || `${item.strength || ""} ${item.form || ""}`}</p>
                  {selectedPharmacy && !pharmacyItem?.isAvailable ? (
                    <strong className="checkout-line-unavailable">غير متاح لدى {selectedPharmacy.name} · المتاح {pharmacyItem?.availableQuantity || 0}</strong>
                  ) : (
                    <strong>{currency(pharmacyItem?.unitPrice ?? item.price)} للقطعة</strong>
                  )}
                  {selectedPharmacy && pharmacyItem?.isAvailable && <small>{selectedPharmacy.name} · إجمالي هذا الصنف {currency(pharmacyItem.lineTotal)}</small>}
                </div>
                <div className="cart-item-actions">
                  <div className="quantity-control" aria-label={`كمية ${item.name}`}>
                    <button type="button" aria-label="تقليل الكمية" onClick={() => onChangeQuantity(item.id, item.quantity - 1)}>
                      <Minus size={16} />
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" aria-label="زيادة الكمية" onClick={() => onChangeQuantity(item.id, item.quantity + 1)}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <strong className="cart-line-total">{currency(pharmacyItem?.lineTotal ?? item.price * item.quantity)}</strong>
                  <button className="remove-cart-item" type="button" aria-label={`حذف ${item.name}`} onClick={() => onRemove(item.id)}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>;
            })}
            {pharmacyLoading && <p className="dw-sub" role="status">جارٍ التحقق من مخزون الصيدليات...</p>}
            {pharmacyError && <p className="dw-error" role="alert">{pharmacyError}</p>}
            {!pharmacyLoading && pharmacyOptions.length > 0 && (
              <section className="checkout-pharmacy-selection">
                <h2><Store size={19} />اختيار الصيدلية</h2>
                <label className="checkout-select-label">
                  الصيدليات المتاحة لهذا الطلب (اختر صيدلية واحدة)
                  <select value={selectedPharmacyId ?? ""} onChange={(event) => setSelectedPharmacyId(Number(event.target.value))}>
                    {pharmacyOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}{option.canFulfill ? ` · ${currency(option.subtotal)}` : " · مخزون غير كافٍ"}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedPharmacy && (
                  <>
                    <p className="checkout-pharmacy-address"><MapPin size={15} />{selectedPharmacy.address}</p>
                    {!selectedPharmacy.canFulfill && (
                      <div className="checkout-stock-warning" role="alert">
                        <PackageCheck size={17} />
                        <span>الصيدلية لا تستطيع تجهيز كل المنتجات:</span>
                        <ul>
                          {selectedPharmacy.items.filter((item) => !item.isAvailable).map((item) => (
                            <li key={item.productId}>{item.name}: المطلوب {item.quantity}، المتاح {item.availableQuantity}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedPharmacy.canFulfill && (
                      <p className="checkout-stock-confirmed"><BadgeCheck size={16} />المخزون متاح للطلب بالكامل. ستتم إعادة مراجعته عند التأكيد.</p>
                    )}
                    <div className="checkout-unified-delivery">
                      <h3><Clock3 size={17} />التوصيل الموحد</h3>
                      <p>رسوم التوصيل: <strong>{currency(delivery.fee)}</strong></p>
                      <small>الوقت المتوقع: حوالي {delivery.estimatedMinutes} دقيقة <span>(تقدير تجريبي)</span></small>
                    </div>
                  </>
                )}
              </section>
            )}
          </section>

          <aside className="checkout-panel">
            <h2>مراجعة الطلب والتوصيل</h2>
            <form className="info-form" onSubmit={submit}>
              <label>
                الاسم
                <input name="name" autoComplete="name" value={customer.name} onChange={updateCustomer} required maxLength={120} />
              </label>
              <label>
                رقم الهاتف
                <input name="phone" type="tel" autoComplete="tel" value={customer.phone} onChange={updateCustomer} required maxLength={30} />
              </label>
              <label>
                عنوان التوصيل
                <textarea name="address" rows="3" value={customer.address} onChange={updateCustomer} required maxLength={500} />
              </label>

              <button
                type="button"
                className={`monthly-repeat-toggle${monthlyRepeat ? " is-active" : ""}`}
                onClick={() => setMonthlyRepeat((current) => !current)}
                aria-pressed={monthlyRepeat}
              >
                <span className="monthly-repeat-mark"><Repeat size={13} /></span>
                <span className="monthly-repeat-text">
                  <strong>🔄 اجعل هذا الطلب روشتة شهرية متكررة</strong>
                  <small>احصل على خصم 5% وتذكير قبل الموعد بيومين</small>
                </span>
                <span className="monthly-repeat-badge">-5%</span>
              </button>

              <div className="order-totals">
                <div><span>قيمة المنتجات لدى الصيدلية</span><strong>{currency(checkoutSubtotal)}</strong></div>
                <div><span>رسوم التوصيل الموحد</span><strong>{delivery?.available ? currency(checkoutDeliveryFee) : "غير متاح"}</strong></div>
                <div className={monthlyRepeat ? "is-monthly-discount" : ""}>
                  <span>{monthlyRepeat ? "خصم الروشتة الشهرية (5%)" : "الخصم التجريبي"}</span>
                  <strong>- {currency(checkoutDiscount)}</strong>
                </div>
                <div className="order-grand-total"><span>الإجمالي</span><strong>{currency(checkoutTotal)}</strong></div>
              </div>

              {checkoutError && <p className="dw-error" role="alert">{checkoutError}</p>}
              <button className="info-submit checkout-submit" type="submit" disabled={!canConfirm}>
                {submitting ? "جارٍ تأكيد الطلب..." : !selectedPharmacy?.canFulfill ? "المخزون غير كافٍ" : "تأكيد الطلب"}
              </button>
              <p className="checkout-footnote">طلب واحد من صيدلية واحدة. رسوم ووقت التوصيل المعروضان بيانات تجريبية.</p>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
}

const trackingStages = [
  { status: "pending", label: "وصلنا طلبك بنجاح! 🎉", desc: "طلبك قيد المراجعة الآن لدى أقرب صيدلية معتمدة.", icon: PackageCheck },
  { status: "pharmacy_accepted", label: "الصيدلي اعتمد طلبك ✅", desc: "تم التأكد من توفر جميع الأصناف ومراجعة الجرعات.", icon: BadgeCheck },
  { status: "preparing", label: "بنجهّز أدويتك بعناية 💊", desc: "يتم الآن تغليف طلبك بأمان وفق معايير الحفظ الطبية.", icon: Pill },
  { status: "picked_up", label: "طلبك مع الكابتن وجاهز للانطلاق 🛵", desc: "تم تسليم الشحنة لمندوب التوصيل المختص.", icon: Truck },
  { status: "out_for_delivery", label: "الطيار في طريقه إليك الآن 📍", desc: "دقائق معدودة ويكون دواءك عند باب البيت.", icon: MapPin },
  { status: "delivered", label: "تم التوصيل بالسلامة! 💚", desc: "نتمنى لك دوام الصحة والعافية.", icon: Check },
];

const trackingStatusLabels = {
  pending: "قيد المراجعة",
  pharmacy_accepted: "معتمد من الصيدلي",
  preparing: "قيد التجهيز",
  picked_up: "مع المندوب",
  out_for_delivery: "في الطريق إليك",
  delivered: "تم التوصيل",
};

function trackingStageIndex(status) {
  if (status === "ready_for_pickup") return 2;
  return trackingStages.findIndex((stage) => stage.status === status);
}

export function CustomerOrdersPage({ onBack, phone = "", onLogin, onTrackOrder }) {
  const [orders, setOrders] = useState(null);
  // بدون رقم موبايل: نعرض الطلبات المحفوظة على هذا الجهاز بدل شاشة مقفلة
  const isGuest = !phone;
  const [activeTab, setActiveTab] = useState("new"); // "new", "old", "tracking", "details"
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    let active = true;
    const refresh = () => getCustomerOrders().then((items) => {
      const ownOrders = phone
        ? items.filter((order) => normalizePhone(order.customer?.phone) === normalizePhone(phone))
        : items;
      if (active) setOrders(ownOrders);
    }).catch(() => { if (active) setOrders([]); });
    refresh();
    const handleStorage = (event) => { if (event.key === "dawak-orders") refresh(); };
    // إشعار داخلي فوري بعد تأكيد طلب جديد من العربة (في نفس التاب)
    const handleLocalUpdate = () => refresh();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("dawak:orders-updated", handleLocalUpdate);
    return () => {
      active = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("dawak:orders-updated", handleLocalUpdate);
    };
  }, [phone]);

  const newOrders = orders?.filter(o => !["delivered", "cancelled", "unavailable", "rejected"].includes(o.status)) || [];
  const oldOrders = orders?.filter(o => ["delivered", "cancelled", "unavailable", "rejected"].includes(o.status)) || [];

  const displayedOrders = activeTab === "new" ? newOrders : oldOrders;

  const handleShowDetails = (order) => {
    setSelectedOrder(order);
    setActiveTab("details");
  };

  const handleTrackOrder = (order) => {
    setSelectedOrder(order);
    setActiveTab("tracking");
  };

  return (
    <main className="orders-dashboard-layout">
      {/* Sidebar */}
      <aside className="orders-sidebar">
        <div className="orders-sidebar-header">
          <div className="orders-sidebar-icon"><LayoutGrid size={22} /></div>
          <div>
            <strong>إدارة الطلبات</strong>
            <span>DAWAK Pharmacy</span>
          </div>
        </div>

        <nav className="orders-sidebar-nav">
          <button
            className={`orders-nav-item ${activeTab === "new" ? "active" : ""}`}
            onClick={() => setActiveTab("new")}
          >
            <ListOrdered size={18} />
            طلباتي الجديدة
            <span className="orders-count">{newOrders.length}</span>
          </button>
          <button
            className={`orders-nav-item ${activeTab === "old" ? "active" : ""}`}
            onClick={() => setActiveTab("old")}
          >
            <History size={18} />
            طلباتي القديمة
            <span className="orders-count">{oldOrders.length}</span>
          </button>
          <button
            className={`orders-nav-item ${activeTab === "tracking" ? "active" : ""}`}
            disabled={!selectedOrder}
            onClick={() => setActiveTab("tracking")}
          >
            <Clock3 size={18} />
            متابعة الطلب
          </button>
          <button
            className={`orders-nav-item ${activeTab === "details" ? "active" : ""}`}
            disabled={!selectedOrder}
            onClick={() => setActiveTab("details")}
          >
            <PackageCheck size={18} />
            تفاصيل الطلب
          </button>
        </nav>

        <button className="orders-back-btn" onClick={onBack}>رجوع للرئيسية</button>
      </aside>

      {/* Main Area */}
      <section className="orders-main-area">
        <header className="orders-header-bar">
          <div>
            <h1>{activeTab === "new" ? "الطلبات الحالية" : activeTab === "old" ? "سجل الطلبات" : activeTab === "tracking" ? "تتبع الطلب" : "تفاصيل الطلب"}</h1>
            <p>لديك إجمالي {orders?.length || 0} طلب في السجل.</p>
          </div>
        </header>

        {isGuest && onLogin && (
          <div className="orders-guest-banner" role="status">
            <UserRound size={17} />
            <span>تسجّل دخولك برقم موبايلك لربط طلباتك بحسابك ومتابعتها من أي جهاز.</span>
            <button type="button" onClick={onLogin}>تسجيل الدخول</button>
          </div>
        )}

        <div className="orders-content">
          {(activeTab === "new" || activeTab === "old") && (
            <div className="orders-list">
              {orders === null && <p className="dw-sub">جارٍ تحميل الطلبات...</p>}
              {displayedOrders.length === 0 && orders !== null && (
                <p className="orders-empty-msg">
                  {activeTab === "new"
                    ? "لا توجد طلبات حالية. أضف منتجات للعربة وأكمل الطلب لتظهر هنا فورًا."
                    : "لا توجد طلبات مكتملة أو ملغاة بعد."}
                </p>
              )}
              {displayedOrders.map((order) => {
                const isException = ["cancelled", "unavailable", "rejected"].includes(order.status);
                return (
                  <article className="order-row-card" key={order.id} onClick={() => handleShowDetails(order)}>
                    <div className="order-row-id">#{order.id}</div>
                    <div className="order-row-info">
                      <strong>{order.pharmacy?.name || "صيدلية تجريبية"}</strong>
                      <span>
                        {new Date(order.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                        {` · ${order.items?.length || 0} صنف`}
                      </span>
                    </div>
                    <div className="order-row-total">{currency(order.total)}</div>
                    <div className="order-row-status">
                      <span className={`status-badge ${order.status} ${isException ? "exception" : ""}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    <div className="order-row-actions">
                      <button onClick={(e) => { e.stopPropagation(); handleTrackOrder(order); }} title="تتبع"><Clock3 size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleShowDetails(order); }} title="تفاصيل"><ChevronRight size={16} /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {activeTab === "details" && selectedOrder && (
            <div className="order-full-details">
              <div className="details-card">
                <h2>محتويات الطلب #{selectedOrder.id}</h2>
                <div className="details-items">
                  {selectedOrder.items.map((item) => (
                    <div key={item.productId} className="details-item">
                      <span>{item.name} × {item.quantity}</span>
                      <strong>{currency(item.lineTotal)}</strong>
                    </div>
                  ))}
                </div>
                <div className="details-customer">
                  <strong>العميل: {selectedOrder.customer.name}</strong>
                  <span>الهاتف: {selectedOrder.customer.phone}</span>
                  <span>العنوان: {selectedOrder.deliveryAddress}</span>
                </div>
                <div className="details-summary">
                  <div><span>الصيدلية</span> <span>{selectedOrder.pharmacy?.name}</span></div>
                  <div><span>رسوم التوصيل</span> <span>{currency(selectedOrder.deliveryFee)}</span></div>
                  <div className="grand-total"><span>الإجمالي</span> <span>{currency(selectedOrder.total)}</span></div>
                </div>
                <button className="details-track-btn" onClick={() => setActiveTab("tracking")}>تتبع مسار الطلب</button>
              </div>
            </div>
          )}

          {activeTab === "tracking" && selectedOrder && (
            <div className="order-tracking-view">
              <OrderTrackingContent order={selectedOrder} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function OrderTrackingContent({ order, onBack }) {
  const isException = ["cancelled", "unavailable", "rejected"].includes(order.status);
  const currentStage = trackingStageIndex(order.status);
  const pharmacyName = order.pharmacy?.name || "أقرب صيدلية معتمدة";
  const eta = order.deliveryService?.estimatedMinutes || order.delivery?.estimatedMinutes || 90;

  return (
    <div className="tracking-modern">

      {/* العمود الرئيسي: مراحل التتبع */}
      <div className="tracking-main">

        {isException ? (
          <div className="tracking-exception-box">
            <AlertTriangle size={24} />
            <p>{order.status === "cancelled" ? "تم إلغاء الطلب." : "تعذر توفير الطلب من قبل الصيدلية."}</p>
          </div>
        ) : (
          <div className="tracking-timeline">
            {trackingStages.map((stage, index) => {
              const completed = index < currentStage || order.status === "delivered" || (order.status === "ready_for_pickup" && index <= 2);
              const current = index === currentStage && order.status !== "ready_for_pickup" && order.status !== "delivered";
              const StageIcon = stage.icon;
              return (
                <div
                  className={`timeline-step ${completed ? "completed" : ""} ${current ? "current" : ""}`}
                  key={stage.status}
                >
                  <div className="step-rail" aria-hidden="true">
                    <div className="step-icon">
                      {completed ? <Check size={15} /> : <StageIcon size={15} />}
                    </div>
                    {index < trackingStages.length - 1 && <span className="step-line" />}
                  </div>

                  <div className="step-body">
                    <div className="step-label">
                      {stage.label}
                      {current && <span className="step-current-badge">المرحلة الحالية</span>}
                    </div>
                    <div className="step-desc">{stage.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="tracking-footer">
          <Clock3 size={14} />
          آخر تحديث: {new Date(order.updatedAt || order.createdAt).toLocaleString("ar-EG", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </div>

      </div>

      {/* العمود الجانبي: ملخص الطلب */}
      <aside className="tracking-side">

        <div className="tracking-side-card">

          <span className="tracking-side-icon"><PackageCheck size={24} /></span>

          <h3>ملخص الطلب</h3>

          <div className="tracking-side-facts">
            <div><span>رقم الطلب</span><strong>#{order.id}</strong></div>
            <div><span>الصيدلية المنفذة</span><strong>{pharmacyName}</strong></div>
            <div><span>الحالة الحالية</span><strong>{trackingStatusLabels[order.status] || statusLabels[order.status] || order.status}</strong></div>
            <div><span>وقت الوصول المتوقع</span><strong>{order.status === "delivered" ? "تم التوصيل ✅" : `~ ${eta} دقيقة`}</strong></div>
            <div><span>إجمالي الطلب</span><strong>{currency(order.total)}</strong></div>
          </div>

          <div className="tracking-side-actions">
            {onBack && (
              <button type="button" className="tracking-side-btn tracking-side-btn--primary" onClick={onBack}>
                العودة لطلباتي
              </button>
            )}
            <button
              className="tracking-side-btn tracking-side-btn--ghost"
              onClick={() => handleWhatsAppSupport(order)}
            >
              تواصل معنا
            </button>
          </div>

        </div>

      </aside>

    </div>
  );
}

export function OrderTrackingPage({ orderId, onBack }) {
  const [order, setOrder] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => getCustomerOrders()
      .then((orders) => {
        if (active) setOrder(orders.find((entry) => entry.id === Number(orderId)) || null);
      })
      .finally(() => { if (active) setLoaded(true); });
    refresh();
    const handleStorage = (event) => { if (event.key === "dawak-orders") refresh(); };
    window.addEventListener("storage", handleStorage);
    return () => {
      active = false;
      window.removeEventListener("storage", handleStorage);
    };
  }, [orderId]);

  if (!loaded) return <main className="cart-page"><p className="dw-sub">جارٍ تحميل تتبع الطلب...</p></main>;
  if (!order) return <main className="cart-page"><section className="cart-empty"><PackageCheck size={30} /><h1>الطلب غير موجود</h1><button className="info-submit" onClick={onBack}>العودة إلى طلباتي</button></section></main>;

  return (
    <main className="order-tracking-page">
      <header className="tracking-page-hero">

        <div className="tracking-hero-info">
          <span className="tracking-hero-icon"><PackageCheck size={24} /></span>
          <div>
            <span className="section-kicker">تتبع الشراء</span>
            <h1>متابعة الطلب #{order.id}</h1>
          </div>
        </div>

        <div className="tracking-hero-side">
          <span className={`status-badge ${order.status} tracking-live-badge`}>
            <Clock3 size={13} />
            {trackingStatusLabels[order.status] || statusLabels[order.status] || order.status}
          </span>
          {onBack && <button type="button" className="tracking-hero-back" onClick={onBack}>طلباتي</button>}
        </div>

      </header>

      <OrderTrackingContent order={order} onBack={onBack} />

      <footer className="tracking-page-date">
        <Clock3 size={14} />
        تاريخ الطلب: {new Date(order.createdAt).toLocaleString("ar-EG", { dateStyle: "long", timeStyle: "short" })}
      </footer>
    </main>
  );
}
