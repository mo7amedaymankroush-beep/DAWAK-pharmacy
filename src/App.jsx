import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import {
  ShoppingCart,
  CalendarCheck,
  UserRound,
  ArrowRight,
  Sun,
  Moon,
  Search,
  Stethoscope,
  Upload,
  FileUp,
  Send,
  Pill,
  Bell,
  BadgePercent,
  Receipt,
  ScanBarcode,
} from "lucide-react";

import { drugs, coreCategories, collectionCategories } from "./data/drugs";
import { chronicProducts } from "./data/chronicDrugs";
import { submitOrder } from "./api/ordersApi";
import { linkGuestReservations } from "./api/mockApi";

import ProductCard from "./components/ProductCard";
import SearchSection from "./components/SearchSection";
import WeightLossSection from "./components/WeightLossSection";
import PromoSlider from "./components/PromoSlider";
import RateDawakBanner from "./components/RateDawakBanner";
import MonthlyPrescriptionModal from "./components/MonthlyPrescriptionModal";
import InsuranceCard from "./components/InsuranceCard";
import PhoneLoginModal from "./components/PhoneLoginModal";
import PharmacyChatbot from "./components/PharmacyChatbot";
import Footer from "./components/Footer";
import AccountMenu from "./components/AccountMenu";
import ReserveModal from "./components/ReserveModal";
import ScannerModal from "./components/ScannerModal";
import AdvertiseBanner, { AdvertiseModal } from "./components/AdvertiseBanner";
import LocationPickerModal from "./components/LocationPickerModal";
import {
  readMonthlyRxList,
  setMonthlyRxStorageKey,
} from "./components/MonthlyPrescriptionModal";
import { ToastProvider } from "./components/ToastProvider";
import { runInkTransition } from "./utils/inkTransition";
import { supportWhatsAppNumber, openWhatsAppMessage } from "./components/WhatsAppSupport";
import PharmacyRegister from "./components/PharmacyRegister";

import ProductsPage from "./pages/ProductsPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import CartPage, { CustomerOrdersPage } from "./pages/CartPage";
import PharmaciesPage from "./components/PharmaciesPage";
import PharmacyDetails from "./pages/PharmacyDetails";
import * as InfoPages from "./pages/InfoPages";
import MyBookings from "./pages/MyBookings";
import MyReservations from "./pages/MyReservations";
import PharmacistOrders from "./pages/PharmacistOrders";

const initialArea = { governorate: "", city: "", area: "" };

// آخر موقع محفوظ (محافظة/حي) — يُستخدم كقيمة ابتدائية لنافذة تحديد الموقع
function readLocationChoice() {
  try {
    const raw =
      localStorage.getItem("dawak-pharmacy-location-choice") ||
      sessionStorage.getItem("dawak-pharmacy-location-choice");
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || !parsed.governorate) return initialArea;
    return {
      governorate: parsed.governorate || "",
      city: parsed.city || "",
      area: parsed.area || "",
    };
  } catch {
    return initialArea;
  }
}

export default function App() {
  const [view, setView] = useState(() => window.location.hash.replace("#", "").split("?")[0] || "home");
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("dawak_dark_mode") === "true");
  const [showLogin, setShowLogin] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [showMonthlyRx, setShowMonthlyRx] = useState(false);
  const [rxTab, setRxTab] = useState("upload");
  // عداد الروشتات الشهرية المحفوظة — يتحدث فورًا عند الإضافة أو الحذف
  const [monthlyRxCount, setMonthlyRxCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState(coreCategories[0]);
  const [reservingDrug, setReservingDrug] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState(null);
  const [cart, setCart] = useState([]);
  const [checkoutState, setCheckoutState] = useState({ submitting: false, error: "", confirmation: null });
  const [chronicFilter, setChronicFilter] = useState("الكل");

  // نافذة تحديد الموقع (بطاقة المحافظة/الحي + GPS + وقت التوصيل)
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  // فتح المساعد الصيدلي (شات الدعم) من الفوتر
  const [showSupportChat, setShowSupportChat] = useState(false);
  // نافذة «صوّر العلبة / الباركود»
  const [showScanner, setShowScanner] = useState(false);
  const [locationChoice, setLocationChoice] = useState(readLocationChoice);
  const [userPhone, setUserPhone] = useState(() => localStorage.getItem("dawak_phone") || "");
  const isLoggedIn = Boolean(userPhone);
  // حالة صفحة المنتجات: القسم النشط عند فتحها، وعدّاد لإعادة التركيز على البحث
  const [catalogKey, setCatalogKey] = useState(0);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [focusSearchTicket, setFocusSearchTicket] = useState(0);
  const [initialProductQuery, setInitialProductQuery] = useState(searchQuery);
  // هل وصل المستخدم لصفحة المنتجات عن طريق بحث الهيرو؟ (لعودة تلقائية عند مسح النص)
  const heroSearchRef = useRef({ active: false, queryLength: 0 });

  useEffect(() => {
    const handleHashChange = () => {
      const hashPath = window.location.hash.replace("#", "").split("?")[0] || "home";
      setView(hashPath);
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // تبديل الوضع الليلي/النهاري مع تأثير سكب الحبر من أعلى الزاوية اليمنى
  const toggleDarkMode = useCallback(() => {
    runInkTransition(() => setDarkMode((prev) => !prev));
  }, []);

  useEffect(() => {
    const html = window.document.documentElement;
    // كل قواعد الوضع الليلي في index.css مبنية على [data-theme="dark"]
    if (darkMode) {
      html.setAttribute("data-theme", "dark");
      html.classList.add("dark-mode");
    } else {
      html.removeAttribute("data-theme");
      html.classList.remove("dark-mode");
    }
    localStorage.setItem("dawak_dark_mode", String(darkMode));
  }, [darkMode]);

  // التنبيه يُعرض داخل ToastProvider في منتصف الشاشة (2.5 ثانية).
  // نستخدم window.showToast الذي يضبطه المزوّد حتى يبقى الإشعار واحدًا
  // لكل التطبيق (App + الصفحات) دون تكرار.
  const showToast = useCallback((msg) => {
    if (!msg) return;
    if (typeof window !== "undefined" && typeof window.showToast === "function") {
      window.showToast(msg);
    }
  }, []);

  const handlePrescriptionFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isAllowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!isAllowed) {
      showToast("من فضلك اختر صورة الروشتة أو ملف PDF فقط");
      return;
    }
    setPrescriptionFile(file);
    showToast(
      `تم استلام صورة الروشتة بنجاح! سيقوم الصيدلي بمراجعتها خلال دقائق`,
    );
  };

  const addToCart = (product) => {
    if (!product) return;
    setCart((current) => {
      const existing = current.find((item) => String(item.id) === String(product.id));
      if (existing) {
        return current.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price) || 0,
          quantity: 1,
          image: product.image || "",
          detail: product.detail || `${product.strength || ""} ${product.form || ""}`.trim(),
          strength: product.strength,
          form: product.form,
        },
      ];
    });
    showToast("تمت إضافة المنتج إلى العربة بنجاح");
  };

  // تعديل كمية صنف في العربة — القيمة <= 0 تحذف الصنف
  const changeCartQuantity = (productId, quantity) => {
    const nextQuantity = Number(quantity);
    if (!Number.isFinite(nextQuantity)) return;
    if (nextQuantity <= 0) {
      setCart((current) => current.filter((item) => item.id !== productId));
      showToast("تم حذف المنتج من العربة");
      return;
    }
    setCart((current) =>
      current.map((item) => (item.id === productId ? { ...item, quantity: nextQuantity } : item))
    );
  };

  const removeFromCart = (productId) => {
    setCart((current) => current.filter((item) => item.id !== productId));
    showToast("تم حذف المنتج من العربة");
  };

  const clearCart = () => setCart([]);

  // حجز المنتج يفتح نافذة الحجز مع تنبيه واضح يبقى ظاهرًا بعد إغلاقها
  const bookProduct = (product) => {
    if (!product) return;
    setReservingDrug(product);
    showToast(`اختر طريقة الحجز لـ ${product.name}`);
  };

  // "اطلب الآن" من صفحة التفاصيل: يضيف للعربة مع تنبيه واضح
  const quickOrder = (product) => {
    if (!product) return;
    addToCart(product);
  };

  // بعد تأكيد الحجز من النافذة: رسالة واضحة مختصرة مع اسم المنتج
  const handleBooked = (product, reservation) => {
    const name = product?.name || "المنتج";
    const waitlist = reservation?.type === "waitlist";
    showToast(
      waitlist
        ? `تم تسجيل ${name} في قائمة انتظار التوفر 🔔`
        : `تم حجز ${name} بنجاح · صالح لمدة 24 ساعة`
    );
    setReservingDrug(null);
  };

  const addToMonthlyRx = (product) => {
    showToast(`تم إضافة ${product.name} للروشتة الشهرية بخصم 5%`);
    setShowMonthlyRx(true);
  };

  const addAllToMonthlyRx = () => {
    showToast("تم إضافة جميع المنتجات للروشتة الشهرية");
    setShowMonthlyRx(true);
  };

  // إجماليات العربة (قبل اختيار الصيدلية)
  const cartSubtotal = useMemo(
    () => Number(cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)),
    [cart]
  );
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  // تأكيد الطلب من صفحة العربة
  const submitCartOrder = async (customer, options = {}) => {
    if (!cart.length || checkoutState.submitting) return;
    setCheckoutState({ submitting: true, error: "", confirmation: null });
    try {
      const order = await submitOrder({
        customer,
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
        pharmacyId: options.pharmacyId ?? null,
        orderSource: options.orderSource || "cart",
      });
      // createOrder ترجع { order } — نطبّع الشكل لأي استجابة
      const confirmation = order?.order && order.order.id ? order.order : order;
      setCart([]);
      setCheckoutState({ submitting: false, error: "", confirmation });
      // إشعار صفحة «طلباتي» لتحديث القائمة فورًا في نفس التاب
      window.dispatchEvent(new CustomEvent("dawak:orders-updated"));
      showToast(`تم استلام طلبك بنجاح · رقم الطلب #${confirmation?.id}`);
    } catch (error) {
      const message = error?.message || "تعذر تأكيد الطلب، حاول مرة أخرى.";
      setCheckoutState({ submitting: false, error: message, confirmation: null });
      showToast(message);
    }
  };

  const filteredChronic = useMemo(() => {
    if (chronicFilter === "الكل") return chronicProducts;
    return chronicProducts.filter((p) => p.chronicCategory === chronicFilter);
  }, [chronicFilter]);

  // منتجات القسم النشط في «تسوّق بسهولة» (12 منتجًا لكل قسم)
  const activeCategoryProducts = useMemo(
    () => drugs.filter((d) => d.category === activeCategory).slice(0, 12),
    [activeCategory],
  );

  const navigate = (v, query, options = {}) => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (options.categories?.length) params.set("cats", options.categories.join(","));
    const search = params.toString();
    const hash = search ? `#${v}?${search}` : `#${v}`;

    if (options.categories) {
      setCatalogCategories(options.categories);
      setCatalogKey((key) => key + 1);
    }
    if (options.focusSearch) setFocusSearchTicket((ticket) => ticket + 1);

    window.location.hash = hash;
    setView(v);

    // أي تنقل (هيدر/فوتر/أزرار الصفحات) يبدأ من أول الصفحة
    scrollToTop();
  };

  // تمرير فوري لأعلى الصفحة بدون حركة سلسة
  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch {
      window.scrollTo(0, 0);
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleSearchSubmit = (q = searchQuery) => {
    setSearchQuery(q);
    navigate("products", q);
  };

  const handleLoginSuccess = (phone) => {
    const cleanPhone = String(phone || "").trim();
    if (!cleanPhone) return;
    localStorage.setItem("dawak_phone", cleanPhone);
    setUserPhone(cleanPhone);
    setShowLogin(false);

    // ربط الحجوزات التي تمت كزائر بنفس الرقم بحساب المستخدم
    const linked = linkGuestReservations(cleanPhone);

    showToast(
      linked
        ? `تم تسجيل الدخول وربط ${linked} حجز بحسابك — تابعها من «حجوزاتي»`
        : "تم تسجيل الدخول بنجاح"
    );
  };

  // مزامنة مفتاح التخزين وعدّاد الروشتات مع رقم الهاتف (زائر => guest)
  useEffect(() => {
    setMonthlyRxStorageKey(userPhone);
    setMonthlyRxCount(readMonthlyRxList(userPhone).length);
  }, [userPhone]);

  const handleLogout = () => {
    localStorage.removeItem("dawak_phone");
    setUserPhone("");
    navigate("home");
    showToast("تم تسجيل الخروج");
  };

  const renderContent = () => {
    if (view === "products") {
      return (
        <ProductsPage
          key={catalogKey}
          initialQuery={initialProductQuery}
          initialCategories={catalogCategories}
          autoFocusSearch={Boolean(initialProductQuery.trim())}
          focusSearchTicket={focusSearchTicket}
          onQueryChange={handleCatalogQueryChange}
          onAddToCart={addToCart}
          onBookProduct={bookProduct}
          onOpenProduct={(p) => {
            setSelectedProduct(p);
            navigate("product-details");
          }}
        />
      );
    }
    if (view === "product-details" && selectedProduct) {
      return (
        <ProductDetailsPage
          product={selectedProduct}
          onAddToCart={addToCart}
          onBookProduct={bookProduct}
          onQuickOrder={quickOrder}
          onBack={() => navigate("products")}
        />
      );
    }
    if (view === "cart") {
      return (
        <CartPage
          cart={cart}
          subtotal={cartSubtotal}
          deliveryFee={0}
          discount={0}
          total={cartSubtotal}
          onChangeQuantity={changeCartQuantity}
          onRemove={removeFromCart}
          onCheckout={submitCartOrder}
          submitting={checkoutState.submitting}
          checkoutError={checkoutState.error}
          orderConfirmation={checkoutState.confirmation}
          customerPhone={userPhone}
          onBack={() => navigate("home")}
          onContinueShopping={() => navigate("products")}
          onTrackOrder={() => navigate("orders")}
        />
      );
    }
    if (view === "about") return <InfoPages.FAQPage />;
    if (view === "consultation") return <InfoPages.ConsultationPage />;
    if (view === "privacy") return <InfoPages.PrivacyPolicyPage />;
    if (view === "terms") return <InfoPages.TermsPage />;
    if (view === "contact") return <InfoPages.ContactPage />;
    if (view === "bookings") return <MyBookings onBack={() => navigate("home")} />;
    if (view === "reservations") return <MyReservations onBack={() => navigate("home")} />;
    if (view === "orders") {
      // صفحة «طلباتي» الحقيقية تقرأ الطلبات من التخزين وتتحدث فور تأكيد أي طلب
      return (
        <CustomerOrdersPage
          key={checkoutState.confirmation?.id || "orders"}
          phone={userPhone}
          onBack={() => navigate("home")}
          onLogin={() => setShowLogin(true)}
        />
      );
    }
    if (view === "pharmacist") return <PharmacistOrders />;
    if (view === "pharmacies") {
      return (
        <PharmaciesPage
          onSelectPharmacy={(id) => {
            setSelectedPharmacyId(id);
            navigate("pharmacy-details");
          }}
          onBack={() => navigate("home")}
          onNavigate={navigate}
        />
      );
    }
    if (view === "pharmacy-details" && selectedPharmacyId) {
      return <PharmacyDetails pharmacyId={selectedPharmacyId} onBack={() => navigate("pharmacies")} />;
    }
    if (view === "register-pharmacy") {
      return (
        <PharmacyRegister
          onGoPharmacist={() => navigate("pharmacist")}
          onGoHome={() => navigate("home")}
        />
      );
    }

    return (
      <>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              <span>أكبر شبكة صيدليات في مصر</span>
            </div>
            <h1>
              دواؤك يصلك إلى البيت، <span>بأسرع وقت وبإشراف صيدلي.</span>
            </h1>
            <p>استمتع بالراحة، واطلب احتياجاتك الصحية بسهولة، ووفر وقتك.</p>
            <div className="dw-search">
              <SearchSection
                query={searchQuery}
                onQueryChange={handleHeroSearchChange}
                onAddToCart={addToCart}
                onQuickOrder={bookProduct}
                initialLocation={locationChoice}
              />
            </div>
          </div>
          <div className="hero-cards">
            <article className="prescription-card">
              <div className="rx-tabs" role="tablist" aria-label="روشتتك">
                <button
                  type="button"
                  role="tab"
                  id="rx-tab-upload"
                  aria-selected={rxTab === "upload"}
                  aria-controls="rx-panel-upload"
                  className={`rx-tab${rxTab === "upload" ? " is-active" : ""}`}
                  onClick={() => setRxTab("upload")}
                >
                  <FileUp size={15} />
                  عندك روشتة؟
                </button>
                <button
                  type="button"
                  role="tab"
                  id="rx-tab-monthly"
                  aria-selected={rxTab === "monthly"}
                  aria-controls="rx-panel-monthly"
                  className={`rx-tab${rxTab === "monthly" ? " is-active" : ""}`}
                  onClick={() => setRxTab("monthly")}
                >
                  <CalendarCheck size={15} />
                  روشتتك الشهرية
                </button>
              </div>

              <div className="rx-panels" data-tab={rxTab}>
                {rxTab === "upload" ? (
                  <div
                    className="rx-panel"
                    role="tabpanel"
                    id="rx-panel-upload"
                    aria-labelledby="rx-tab-upload"
                  >
                    <h2>عندك روشتة؟</h2>
                    <p>صوّرها وارفعها والصيدلي يراجعها</p>
                    <input
                      id="hero-prescription-input"
                      type="file"
                      accept="image/*,application/pdf"
                      hidden
                      onChange={handlePrescriptionFile}
                    />
                    <label
                      htmlFor="hero-prescription-input"
                      className={`upload-area${prescriptionFile ? " has-file" : ""}`}
                    >
                      <Upload size={17} />
                      <span>
                        {prescriptionFile ? prescriptionFile.name : "اضغط لاختيار صورة الروشتة أو PDF"}
                      </span>
                    </label>
                    <button className="submit-prescription" onClick={() => setShowMonthlyRx(true)}>
                      <Send size={16} />
                      أرسل الروشتة
                    </button>
                  </div>
                ) : (
                  <div
                    className="rx-panel rx-panel--monthly"
                    role="tabpanel"
                    id="rx-panel-monthly"
                    aria-labelledby="rx-tab-monthly"
                  >
                    <h2>روشتتك الشهرية</h2>
                    <p>توصلك قبل ما تخلص بخصم 5% تلقائي وتذكير قبل يومين</p>
                    {monthlyRxCount > 0 && (
                      <span className="rx-monthly-count">محفوظ لديك: {monthlyRxCount} {monthlyRxCount === 1 ? "روشتة" : "روشتات"}</span>
                    )}
                    <ul className="rx-monthly-list">
                      <li>
                        <Pill size={14} />
                        أدوية الضغط والسكر
                      </li>
                      <li>
                        <BadgePercent size={14} />
                        خصم 5% تلقائي على كل شهر
                      </li>
                      <li>
                        <Bell size={14} />
                        تذكير قبل يومين من موعد الاستلام
                      </li>
                      <li>
                        <CalendarCheck size={14} />
                        يوم 15 من كل شهر
                      </li>
                    </ul>
                    <button className="submit-prescription" onClick={() => setShowMonthlyRx(true)}>
                      <CalendarCheck size={16} />
                      ابدأ جدولتك الآن
                    </button>
                  </div>
                )}
              </div>
            </article>
            <InsuranceCard />
          </div>
        </section>

        <PromoSlider
          onOpenLocationPicker={() => setShowLocationPicker(true)}
          onBrowsePharmacies={() => navigate("pharmacies")}
          onOpenMonthlyRx={() => setShowMonthlyRx(true)}
        />

        <section className="categories-section">
          <div className="section-heading">
            <div>
              <div className="heading-line"></div>
              <h2>تسوّق بسهولة</h2>
            </div>
          </div>
          <div className="category-list" role="tablist" aria-label="أقسام المنتجات">
            {coreCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={cat === activeCategory}
                className={`category-pill${cat === activeCategory ? " is-active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="category-products" id="category-products" role="tabpanel" aria-label={activeCategory}>
            {activeCategoryProducts.length > 0 ? (
              <div className="products-grid products-grid--six" key={activeCategory}>
                {activeCategoryProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onAdd={addToCart}
                    onBook={bookProduct}
                    onOpen={(product) => {
                      setSelectedProduct(product);
                      navigate("product-details");
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-products">
                <h3>لا توجد منتجات في هذا القسم حاليًا</h3>
                <p>جرّب قسمًا آخر من الأقسام بالأعلى.</p>
              </div>
            )}

            <div className="show-more-container">
              <button
                type="button"
                className="show-more-btn show-more-btn--primary"
                onClick={() => {
                  setSearchQuery("");
                  navigate("products", null, { categories: [activeCategory] });
                }}
              >
                عرض المزيد
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        <section className="products-section">
          <div className="section-heading">
            <div>
              <div className="heading-line"></div>
              <h2>أدوية الأمراض المزمنة</h2>
              <span className="product-offer-tag">12 منتجًا</span>
              <p>علاجك الشهري متوفر بانتظام</p>
            </div>
            <button className="product-add-button" onClick={addAllToMonthlyRx}>
              أضف الكل لروشتتي الشهرية 📅
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
            {["الكل", "الضغط والقلب", "السكري", "الكوليسترول", "الغدة الدرقية"].map((f) => (
              <button
                key={f}
                onClick={() => setChronicFilter(f)}
                style={{                  padding: "8px 16px",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  background: chronicFilter === f ? "var(--accent)" : "transparent",
                  color: chronicFilter === f ? "#fff" : "var(--text-primary)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="products-grid products-grid--six">
            {filteredChronic.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAdd={addToCart}
                onBook={bookProduct}
                originalPrice={p.originalPrice}
                priceAfterDiscount={p.price}
              />
            ))}
          </div>

          <div className="show-more-container">
            <button
              type="button"
              className="show-more-btn show-more-btn--primary"
              onClick={() => {
                setSearchQuery("");
                navigate("products");
              }}
            >
              عرض المزيد
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        <WeightLossSection
          products={drugs.filter((d) => d.category === "خسارة الوزن")}
          onAddToCart={addToCart}
          onBookProduct={bookProduct}
          onViewAll={() => {
            setSearchQuery("");
            navigate("products", null, { categories: ["خسارة الوزن"] });
          }}
          onOpenProduct={(product) => {
            setSelectedProduct(product);
            navigate("product-details");
          }}
        />
        {collectionCategories.map((cat, index) => (
          <Fragment key={cat}>
            <section className="products-section">
              <div className="section-heading">
                <h2>{cat}</h2>
              </div>
              <div className="products-grid products-grid--six">
                {drugs
                  .filter((d) => d.category === cat)
                  .slice(0, 6)
                  .map((p) => (
                    <ProductCard key={p.id} product={p} onAdd={addToCart} onBook={bookProduct} />
                  ))}
              </div>

              <div className="show-more-container">
                <button
                  type="button"
                  className="show-more-btn show-more-btn--primary"
                  onClick={() => {
                    setSearchQuery("");
                    navigate("products", null, { categories: [cat] });
                  }}
                >
                  عرض المزيد
                  <ArrowRight size={16} />
                </button>
              </div>
            </section>

            {/* البانر الإعلاني للشركات والماركات — أسفل قسم «العروض» مباشرة */}
            {index === 0 && <AdvertiseBanner />}
          </Fragment>
        ))}
      </>
    );
  };

  // البحث الفوري من الهيرو: أول حرف ينقل لصفحة المنتجات، ومسح النص يعيد للرئيسية
  const handleHeroSearchChange = (value) => {
    setSearchQuery(value);
    const el = typeof document !== "undefined" ? document.activeElement : null;
    const keepFocus = el instanceof HTMLElement && el.closest(".hero") !== null;
    const caret = el instanceof HTMLInputElement ? el.selectionStart : null;
    const isEmpty = value.trim().length === 0;

    if (!isEmpty) {
      heroSearchRef.current = { active: true, queryLength: value.length };
      if (view !== "products") {
        setInitialProductQuery(value);
        setCatalogCategories([]);
        navigate("products", null, { focusSearch: true });
      }
    } else if (heroSearchRef.current.active && view === "products") {
      heroSearchRef.current = { active: false, queryLength: 0 };
      setInitialProductQuery("");
      setCatalogCategories([]);
      navigate("home");
      focusHeroInputLater();
      return;
    }

    if (keepFocus) focusQueryInputLater(caret);
  };

  // إعادة التركيز لحقل بحث صفحة المنتجات (بعد أن يعيد React تركيبها)
  const focusQueryInputLater = (caret) => {
    let frames = 0;
    const restore = () => {
      const input = document.querySelector(".shop-header-search input");
      if (!input) {
        if (++frames < 20) requestAnimationFrame(restore);
        return;
      }
      input.focus({ preventScroll: true });
      const position = caret ?? (input.value || "").length;
      try {
        input.setSelectionRange(position, position);
      } catch {
        /* بعض أنواع الحقول لا تدعم تحديد النص */
      }
    };
    requestAnimationFrame(restore);
  };

  // إعادة التركيز لحقل بحث الرئيسية (Hero) بعد الرجوع التلقائي
  const focusHeroInputLater = () => {
    let frames = 0;
    let settled = 0;
    const attempt = () => {
      const input = Array.from(document.querySelectorAll(".hero .dw-input-row input"))
        .find((node) => node.type === "text");
      if (!input) {
        if (++frames < 30) requestAnimationFrame(attempt);
        return;
      }
      input.focus({ preventScroll: true });
      const end = (input.value || "").length;
      try {
        input.setSelectionRange(end, end);
      } catch {
        /* ignore */
      }
      // نتحقق من بقاء التركيز بعد اكتمال تركيب الصفحة
      if (document.activeElement !== input && ++settled < 10) {
        requestAnimationFrame(attempt);
      }
    };
    requestAnimationFrame(attempt);
  };

  // البحث في صفحة المنتجات (يأتي من حقل البحث بها ومن البحث الفوري في الهيرو)
  const handleCatalogQueryChange = (value) => {
    setSearchQuery(value);
    const text = String(value ?? "");
    if (heroSearchRef.current.active) {
      if (text.trim()) {
        heroSearchRef.current.queryLength = text.length;
      } else if (
        view === "products" &&
        text.length < heroSearchRef.current.queryLength
      ) {
        // مسح النص بالكامل (أو التراجع عنه) => العودة للرئيسية مع التركيز على البحث
        heroSearchRef.current = { active: false, queryLength: 0 };
        setInitialProductQuery("");
        setCatalogCategories([]);
        navigate("home");
        focusHeroInputLater();
        return;
      }
    }
    if (view !== "products") setInitialProductQuery(text);
  };

  return (
    <ToastProvider>
      <div className="app-shell">
        <nav className="navbar">
          <div className="brand" onClick={() => navigate("home")} style={{ cursor: "pointer" }}>
            <img src="/dawak-logo.jpg" alt="Logo" />
            <span>DAWAK</span>
          </div>

          <div className="nav-links">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                setSearchQuery("");
                navigate("home");
              }}
              style={{ cursor: "pointer" }}
            >
              الرئيسية
            </a>
            <a
              href="#products"
              onClick={(e) => {
                e.preventDefault();
                setSearchQuery("");
                navigate("products");
              }}
              style={{ cursor: "pointer" }}
            >
              المنتجات
            </a>

            <div className={`nav-search${searchOpen ? " is-open" : ""}`}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setSearchOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearchOpen(false);
                    handleSearchSubmit(searchQuery);
                  }
                }}
                placeholder="بحث عن دواء أو منتج..."
                aria-label="بحث"
              />
              {/* أيقونة البحث الوحيدة داخل الكبسولة (زر الإرسال) */}
              <button
                type="button"
                className="nav-search-submit"
                title="بحث"
                aria-label="بحث"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSearchOpen(false);
                  handleSearchSubmit(searchQuery);
                }}
              >
                <Search size={15} />
              </button>
            </div>

            <a
              href="#consultation"
              onClick={(e) => {
                e.preventDefault();
                navigate("consultation");
              }}
              style={{ cursor: "pointer" }}
              className="nav-consult-link"
            >
              <Stethoscope size={15} />
              استشارة صيدلي
            </a>
            {/* «حجوزاتي» تظهر للمسجّل فقط، و«طلباتي» مثبتة دائمًا */}
            {isLoggedIn && (
              <a
                href="#reservations"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("reservations");
                }}
                style={{ cursor: "pointer" }}
              >
                حجوزاتي
              </a>
            )}
            <a
              href="#orders"
              onClick={(e) => {
                e.preventDefault();
                navigate("orders");
              }}
              style={{ cursor: "pointer" }}
              className="nav-orders-link"
            >
              <Receipt size={15} />
              طلباتي
            </a>
          </div>

          <div className="nav-actions">
            <button className="monthly-rx-button" onClick={() => setShowMonthlyRx(true)} data-count={monthlyRxCount}>
              <CalendarCheck size={18} />
              <span>روشتتي الشهرية{monthlyRxCount > 0 ? ` (${monthlyRxCount})` : ""}</span>
            </button>
            <button
              type="button"
              className="nav-scan-button"
              onClick={() => setShowScanner(true)}
              title="صوّر العلبة / الباركود"
              aria-label="صوّر العلبة أو الباركود"
            >
              <ScanBarcode size={18} />
            </button>
            <button className="cart-button" onClick={() => navigate("cart")} data-count={cartCount}>
              <ShoppingCart size={18} />
              <span>العربة ({cartCount})</span>
            </button>
            {/* زر الوضع الليلي/النهاري قبل زر «مسجّل» مباشرة */}
            <button
              type="button"
              className={`nav-theme-toggle${darkMode ? " is-dark" : ""}`}
              onClick={toggleDarkMode}
              title={darkMode ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
              aria-label={darkMode ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
              aria-pressed={darkMode}
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {isLoggedIn ? (
              <AccountMenu
                phone={userPhone}
                onOpenBookings={() => navigate("reservations")}
                onLogout={handleLogout}
              />
            ) : (
              <button className="account-button" onClick={() => setShowLogin(true)}>
                <UserRound size={18} />
                مسجل
              </button>
            )}
          </div>
        </nav>

        <main>{renderContent()}</main>

        <RateDawakBanner />

        <section className="pharmacy-cta">
          <div className="pharmacy-cta-content">
            <div className="pharmacy-cta-copy">
              <h2 className="pharmacy-cta-title">انضم إلى شبكة صيدليات دواك</h2>
              <p className="pharmacy-cta-desc">سجّل صيدليتك الآن وكن جزءًا من أكبر شبكة صيدليات في مصر</p>
            </div>
            <button
              className="pharmacy-cta-btn"
              onClick={() => {
                navigate("register-pharmacy");
                scrollToTop();
              }}
            >
              <ArrowRight size={16} /> البدء الآن
            </button>
          </div>
        </section>

        <Footer
          onNavigate={navigate}
          onOpenSupportChat={() => setShowSupportChat(true)}
          onOpenWhatsAppSupport={() =>
            openWhatsAppMessage("مرحباً فريق دواك، أحتاج للمساعدة من صفحة الدعم الفني")
          }
          supportWhatsAppNumber={supportWhatsAppNumber}
        />

        {showLogin && (
          <PhoneLoginModal
            onClose={() => setShowLogin(false)}
            onLogin={handleLoginSuccess}
            onSuccess={handleLoginSuccess}
          />
        )}
        {showMonthlyRx && (
          <MonthlyPrescriptionModal
            phone={userPhone}
            onClose={() => setShowMonthlyRx(false)}
            onNotice={showToast}
            onRxCountChange={setMonthlyRxCount}
            onAddMonthlyToCart={(items) => {
              items.forEach((item) =>
                addToCart({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                }),
              );
              setShowMonthlyRx(false);
            }}
          />
        )}
        {reservingDrug && (
          <ReserveModal
            drug={reservingDrug}
            onClose={() => setReservingDrug(null)}
            customerPhone={userPhone}
            onOpenLogin={() => setShowLogin(true)}
            onBooked={(reservation) => handleBooked(reservingDrug, reservation)}
          />
        )}
        {showLocationPicker && (
          <LocationPickerModal
            initialLocation={locationChoice}
            onClose={() => setShowLocationPicker(false)}
            onChoose={(choice) => {
              // الإشعار يُعرض من داخل LocationPickerModal عند نجاح التحديد
              setLocationChoice(choice);
            }}
          />
        )}
        {showScanner && (
          <ScannerModal
            onClose={() => setShowScanner(false)}
            onAddToCart={addToCart}
          />
        )}
        <PharmacyChatbot
          phone={userPhone}
          open={showSupportChat}
          onOpenChange={setShowSupportChat}
        />

      </div>
    </ToastProvider>
  );
}
