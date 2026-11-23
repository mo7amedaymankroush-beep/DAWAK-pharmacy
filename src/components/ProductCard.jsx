import { useState } from "react";
import { CalendarPlus, Plus, Lightbulb, BellRing } from "lucide-react";
import { drugs } from "../data/drugs";
import { useToast } from "./ToastProvider";
import { isAlertActive } from "../utils/stockAlerts";
import money from "../utils/money";

// بدائل متوفرة بنفس المادة الفعالة
function findAvailableAlternatives(product) {
  if (!product.activeIngredient || product.activeIngredient === "غير منطبق")
    return [];
  return drugs.filter(
    (item) =>
      item.id !== product.id &&
      item.inStock === true &&
      item.activeIngredient === product.activeIngredient,
  );
}

export default function ProductCard({
  product,
  onOpen,
  onAdd,
  onBook,
  onShowAlternatives,
  chronicCategory,
  originalPrice,
  priceAfterDiscount,
}) {
  const spec =
    product.detail || `${product.strength || ""} ${product.form || ""}`.trim();
  const isOutOfStock = product.inStock === false;
  const imageSrc = product.image || `/images/clean/${product.id}.jpg`;
  const [alertActive, setAlertActive] = useState(() =>
    isAlertActive(product.id),
  );
  const toast = useToast();

  const alternatives = isOutOfStock ? findAvailableAlternatives(product) : [];

  const discountBadge = originalPrice && priceAfterDiscount
    ? (
      <span className="monthly-rx-badge">
       صرف شهري منتظم 🔄
      </span>
    )
    : null;

  const priceDisplay = originalPrice && priceAfterDiscount ? (
    <div className="product-pricing">
      <span className="original-price">
        {originalPrice} ج.م
      </span>
      <span className="discounted-price">
        {priceAfterDiscount} ج.م{' '}
        <small>خصم 5% للصرف الشهري</small>
      </span>
    </div>
  ) : (
    <span className="product-price">{money(product.price)}</span>
  );

  return (
    <article className="product-card">
      <div
        className="product-card-open"
        role="button"
        tabIndex={0}
        aria-label={`عرض تفاصيل ${product.name}`}
        onClick={() => onOpen?.(product)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen?.(product);
          }
        }}
      >
        <div
          className="product-image-wrapper"
          style={{
            width: "100%",
            height: "140px",
            minHeight: "140px",
            flexShrink: 0,
            marginBottom: "10px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            borderRadius: "8px",
            backgroundColor: "#f8fafc",
          }}
        >
          <img
            src={imageSrc}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/dawak-logo.jpg";
            }}
          />
        </div>

        <span className="product-info">
          {product.isOffer && <span className="product-offer-tag">عرض</span>}

          <strong>{product.name}</strong>
          <span>{product.brand}</span>
          <span>{spec}</span>

          {/* شارة المادة الفعالة */}
          {product.activeIngredient &&
            product.activeIngredient !== "غير منطبق" && (
              <span className="product-ingredient-tag" title="المادة الفعالة">
                المادة الفعالة: {product.activeIngredient}
              </span>
            )}

          {isOutOfStock && (
            <span className="product-stock-tag">غير متوفر حاليًا</span>
          )}

          {discountBadge}
        </span>

        <div className="product-actions">
          {priceDisplay}
          {product.inStock ? (
            <button
              className="product-add-button"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onAdd?.(product);
                if (!onAdd) toast(`تم إضافة ${product.name} للعربة`);
              }}
            >
              <Plus size={16} /> إضافة للعربة
            </button>
          ) : (
            <span className="product-stock-tag">غير متوفر</span>
          )}
        </div>
      </div>

      {isOutOfStock && (
        <div className="product-outofstock-actions">
          {alternatives.length > 0 && (
            <button
              className="product-alternatives-button"
              type="button"
              aria-label={`عرض البدائل المتاحة لـ ${product.name}`}
              onClick={() => onShowAlternatives?.(product, alternatives)}
            >
              <Lightbulb size={16} />
              💡 عرض البدائل المتاحة ({alternatives.length})
            </button>
          )}

          <button
            className={`product-book-button${alertActive ? " is-alert-active" : ""}`}
            type="button"
            aria-label={
              alertActive
                ? `تنبيه التوفر مفعّل لـ ${product.name}`
                : `احجز ${product.name}`
            }
            onClick={(event) => {
              event.stopPropagation();
              if (alertActive) return;
              Promise.resolve(onBook?.(product))?.finally?.(() => {
                setAlertActive(isAlertActive(product.id));
              });
            }}
          >
            {alertActive ? (
              <>
                <BellRing size={16} /> 🔔 تم تفعيل التنبيه
              </>
            ) : (
              <>
                <CalendarPlus size={16} /> احجز
              </>
            )}
          </button>
        </div>
      )}
    </article>
  );
}
