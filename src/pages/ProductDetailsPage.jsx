import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  PackageCheck,
  ShoppingCart,
  CalendarPlus,
  MapPin,
  Phone,
} from "lucide-react";
import { getPharmaciesForProduct } from "../api/pharmaciesApi";
import { useToast } from "../components/ToastProvider";
import money from "../utils/money";

export default function ProductDetailsPage({
  product,
  onBack,
  onAddToCart,
  onBookProduct,
  onBook,
  onQuickOrder,
}) {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const showToast = useToast();

  // إضافة للعربة: توست واضح ثم الرجوع لصفحة المنتجات
  function handleAddToCart() {
    onAddToCart?.(product);
    showToast(`تم إضافة ${product?.name || "المنتج"} للعربة`);
    if (onBack) onBack();
  }

  // احجز / اطلب الآن: نوستر ثم نفتح نافذة الحجز
  function handleBook() {
    const opening = onBookProduct || onBook;
    opening?.(product);
    if (product?.inStock === false) {
      showToast(`تم تسجيل طلب التنبيه عند توفر ${product.name}`);
    } else {
      showToast(`تم فتح حجز ${product?.name || "المنتج"}`);
    }
  }

  function handleQuickOrder() {
    onQuickOrder?.(product);
    showToast(`تم إضافة ${product?.name || "المنتج"} للعربة — اطلب الآن`);
    if (onBack) onBack();
  }

  const imageSrc = useMemo(
    () => product.image || `/images/clean/${product.id}.jpg`,
    [product.image, product.id]
  );

  const isOutOfStock = product.inStock === false;

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPharmaciesForProduct(product.id, {}, { includeUnavailable: true })
      .then((list) => {
        if (active) setPharmacies(list);
      })
      .catch((err) => {
        if (active) setError(err.message || "تعذر تحميل الصيدليات");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [product.id]);

  return (
    <main className="product-details-page" style={pageStyle}>
      <div className="product-details-container" style={containerStyle}>
        <header className="product-details-header" style={headerStyle}>
          <button
            type="button"
            className="back-btn"
            style={backBtnStyle}
            onClick={() => onBack?.()}
          >
            <ArrowLeft size={18} /> رجوع للمنتجات
          </button>
          <div className="breadcrumb" style={breadcrumbStyle}>
            <span style={breadcrumbItemStyle}>{product.category}</span>
            <span style={breadcrumbSepStyle}>/</span>
            <span style={breadcrumbItemStyle}>{product.subCategory}</span>
          </div>
        </header>

        <div className="product-details-grid" style={gridStyle}>
          <div className="product-details-image-col" style={imageColStyle}>
            <div className="product-image-frame" style={imageFrameStyle}>
              <img
                src={imageSrc}
                alt={product.name}
                style={productImageStyle}
                onError={(event) => {
                  event.target.onerror = null;
                  event.target.src = "/dawak-logo.jpg";
                }}
              />
            </div>
          </div>

          <div className="product-details-info-col" style={infoColStyle}>
            <div className="product-header-row" style={headerRowStyle}>
              <h1 className="product-name" style={nameStyle}>
                {product.name}
              </h1>
              <span className="brand-badge" style={brandBadgeStyle}>
                {product.brand}
              </span>
            </div>

            <p className="product-price" style={priceStyle}>
              {money(product.price)}
            </p>

            <div className="spec-table" style={specTableStyle}>
              <div className="spec-row" style={specRowStyle}>
                <span className="spec-label" style={specLabelStyle}>القسم</span>
                <strong className="spec-value" style={specValueStyle}>
                  {product.category}
                </strong>
              </div>
              <div className="spec-row" style={specRowStyle}>
                <span className="spec-label" style={specLabelStyle}>
                  التصنيف الفرعي
                </span>
                <strong className="spec-value" style={specValueStyle}>
                  {product.subCategory}
                </strong>
              </div>
              <div className="spec-row" style={specRowStyle}>
                <span className="spec-label" style={specLabelStyle}>
                  المادة الفعالة
                </span>
                <strong className="spec-value" style={specValueStyle}>
                  {product.activeIngredient}
                </strong>
              </div>
              <div className="spec-row" style={specRowStyle}>
                <span className="spec-label" style={specLabelStyle}>التركيز</span>
                <strong className="spec-value" style={specValueStyle}>
                  {product.strength}
                </strong>
              </div>
              <div className="spec-row" style={specRowStyle}>
                <span className="spec-label" style={specLabelStyle}>
                  الصيغة الصيدلانية
                </span>
                <strong className="spec-value" style={specValueStyle}>
                  {product.form}
                </strong>
              </div>
              <div className="spec-row" style={specRowStyle}>
                <span className="spec-label" style={specLabelStyle}>
                  حجم العبوة
                </span>
                <strong className="spec-value" style={specValueStyle}>
                  {product.size}
                </strong>
              </div>
              <div className="spec-row" style={specRowStyle}>
                <span className="spec-label" style={specLabelStyle}>
                  دواعى الاستعمال
                </span>
                <strong className="spec-value" style={specValueStyle}>
                  {product.description}
                </strong>
              </div>
              <div className="spec-row" style={specRowStyle}>
                <span className="spec-label" style={specLabelStyle}>
                  طريقة الاستخدام
                </span>
                <strong className="spec-value" style={specValueStyle}>
                  {product.usage}
                </strong>
              </div>
            </div>

            <div className="product-actions" style={actionsStyle}>
              {isOutOfStock ? (
                <button
                  type="button"
                  className="book-btn"
                  style={bookBtnStyle}
                  onClick={handleBook}
                >
                  <CalendarPlus size={16} /> احجز المنتج
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="add-btn"
                    style={addBtnStyle}
                    onClick={handleAddToCart}
                  >
                    <ShoppingCart size={16} /> إضافة للعربة
                  </button>
                  <button
                    type="button"
                    className="order-btn"
                    style={orderBtnStyle}
                    onClick={handleQuickOrder}
                  >
                    <MapPin size={16} /> اطلب الآن
                  </button>
                </>
              )}
            </div>

            {product.requiresPrescription && (
              <p className="prescription-note" style={prescriptionNoteStyle}>
                <PackageCheck size={14} /> هذا المنتج يتطلب وصفة طبية قبل صرفه.
              </p>
            )}
          </div>
        </div>

        <section className="pharmacies-section" style={pharmaciesSectionStyle}>
          <h2 className="section-title" style={sectionTitleStyle}>
            متوفر في الصيدليات التالية
          </h2>
          {loading ? (
            <p className="loading-msg" style={loadingMsgStyle}>
              جاري تحميل توفر المنتج في الصيدليات المسجلة...
            </p>
          ) : error ? (
            <p className="error-msg" style={errorMsgStyle}>
              تعذر تحميل الصيدليات: {error}
            </p>
          ) : pharmacies.length === 0 ? (
            <p className="empty-msg" style={emptyMsgStyle}>
              غير متوفر حاليًا في الصيدليات المسجلة.
            </p>
          ) : (
            <div className="pharmacy-list" style={pharmacyListStyle}>
              {pharmacies.map((ph) => {
                const qty = ph.quantity ?? 0;
                const status =
                  qty > 0
                    ? qty <= 2
                      ? "كمية محدودة"
                      : "متوفر"
                    : "غير متوفر";
                const statusColor =
                  qty > 0 ? (qty <= 2 ? "#b24636" : "#B08D56") : "#708783";
                return (
                  <div
                    key={ph.id}
                    className="pharmacy-card"
                    style={pharmacyCardStyle}
                  >
                    <div className="pharmacy-info" style={pharmacyInfoStyle}>
                      <strong style={pharmacyNameStyle}>{ph.name}</strong>
                      <span style={pharmacyAddressStyle}>
                        {ph.area}, {ph.city}
                      </span>
                    </div>
                    <div
                      className="pharmacy-status"
                      style={{ ...pharmacyStatusStyle, color: statusColor }}
                    >
                      {status}
                    </div>
                    <button
                      type="button"
                      className="order-pharmacy-btn"
                      style={{
                        ...orderPharmacyBtnStyle,
                        background: qty <= 0 ? "#e2e8f0" : "#B08D56",
                        color: qty <= 0 ? "#708783" : "#fff",
                        borderColor: qty <= 0 ? "#cbd5e1" : "#B08D56",
                        cursor: qty <= 0 ? "not-allowed" : "pointer",
                      }}
                      disabled={qty <= 0}
                      onClick={() => {
                        if (qty > 0 && onQuickOrder) {
                          showToast(`تم إضافة ${product.name} للعربة من ${ph.name}`);
                          onQuickOrder(product);
                          if (onBack) onBack();
                        }
                      }}
                    >
                      {qty <= 0 ? "غير متوفر" : "اطلب من هذه الصيدلية"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
/* Inline styles aligned with DAWAK identity (index.css / ProductsPage.css) */
const pageStyle = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #f0faf6 0%, #e1f4ed 35%, #f6fbf9 100%)",
  fontFamily: '"Cairo", "Inter", sans-serif',
  color: "#123d38",
  paddingBottom: 40,
};

const containerStyle = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "24px clamp(16px, 4vw, 40px) 0",
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 8,
};

const backBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 16px",
  fontSize: 15,
  fontWeight: 700,
  color: "#B08D56",
  background: "#fff",
  border: "1px solid #dcebe6",
  borderRadius: 10,
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(6,72,63,.06)",
  fontFamily: 'inherit',
};
const breadcrumbStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  color: "#708783",
  fontWeight: 600,
};
const breadcrumbItemStyle = { color: "#345a54" };
const breadcrumbSepStyle = { margin: "0 4px", color: "#b9d3cd" };

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "32px",
  alignItems: "start",
};

const imageColStyle = { display: "flex", flexDirection: "column", gap: 10 };
const imageFrameStyle = {
  border: "1px solid #dcebe6",
  borderRadius: 16,
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};
const productImageStyle = {
  maxWidth: 300,
  maxHeight: 300,
  width: "100%",
  objectFit: "contain",
  display: "block",
};

const infoColStyle = { display: "flex", flexDirection: "column", gap: 14 };

const headerRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
const nameStyle = {
  fontSize: 28,
  fontWeight: 800,
  margin: 0,
  color: "#123d38",
  lineHeight: 1.2,
};
const brandBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 800,
  background: "#e1f4ed",
  color: "#B08D56",
  border: "1px solid #b9d3cd",
  borderRadius: 8,
  marginLeft: "auto",
};

const priceStyle = {
  fontSize: 26,
  fontWeight: 800,
  color: "#B08D56",
  margin: 0,
};

const specTableStyle = { display: "flex", flexDirection: "column", gap: 8 };
const specRowStyle = {
  display: "flex",
  alignItems: "baseline",
  gap: 10,
  padding: "10px 14px",
  background: "#fff",
  border: "1px solid #dcebe6",
  borderRadius: 12,
};
const specLabelStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#708783",
  minWidth: 110,
};
const specValueStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#123d38",
  flex: 1,
};

const actionsStyle = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 };
const addBtnStyle = {
  flex: 1,
  minWidth: 170,
  padding: "12px 18px",
  fontSize: 15,
  fontWeight: 800,
  color: "#fff",
  background: "#B08D56",
  border: "1px solid #B08D56",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: 'inherit',
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  justifyContent: "center",
};
const orderBtnStyle = {
  flex: 1,
  minWidth: 170,
  padding: "12px 18px",
  fontSize: 15,
  fontWeight: 800,
  color: "#B08D56",
  background: "#fff",
  border: "1px solid #B08D56",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: 'inherit',
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  justifyContent: "center",
};
const bookBtnStyle = {
  flex: 1,
  minWidth: 170,
  padding: "12px 18px",
  fontSize: 15,
  fontWeight: 800,
  color: "#b24636",
  background: "#fff3d6",
  border: "1px solid #f5e7b3",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: 'inherit',
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  justifyContent: "center",
};

const prescriptionNoteStyle = {
  fontSize: 13,
  color: "#7a5200",
  background: "#fff3d6",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #f5e7b3",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const pharmaciesSectionStyle = {
  borderTop: "1px solid #dcebe6",
  paddingTop: 20,
};
const sectionTitleStyle = {
  fontSize: 18,
  fontWeight: 800,
  color: "#123d38",
  margin: "0 0 14px 0",
  display: "flex",
  alignItems: "center",
  gap: 8,
};
const pharmacyListStyle = { display: "grid", gap: 10 };
const pharmacyCardStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  background: "#fff",
  border: "1px solid #dcebe6",
  borderRadius: 12,
};
const pharmacyInfoStyle = { display: "flex", flexDirection: "column", gap: 2, flex: 1 };
const pharmacyNameStyle = { fontSize: 15, fontWeight: 800, color: "#123d38" };
const pharmacyAddressStyle = { fontSize: 13, color: "#708783" };
const pharmacyStatusStyle = {
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap",
};
const orderPharmacyBtnStyle = {
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 800,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: 'inherit',
};

const loadingMsgStyle = { color: "#708783", fontSize: 14 };
const errorMsgStyle = { color: "#b24636", fontSize: 14 };
const emptyMsgStyle = { color: "#708783", fontSize: 14 };