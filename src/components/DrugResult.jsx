import { useState } from "react";
import {
  MapPin,
  PackageCheck,
  AlertCircle,
  Pill,
  FlaskConical,
  Clock,
  CheckCircle2,
  LocateFixed,
  ArrowUpDown,
} from "lucide-react";

import ReserveModal from "./ReserveModal";
import { getSessionPhone } from "../api/sessionApi";

export default function DrugResult({
  drug,
  alt,
  onAddToCart,
  onQuickOrder,
  pharmacies = [],
  pharmacyLoading = false,
  pharmacyError = "",
  locationChoice,
  onChangeLocation,
  sortBy = "distance",
  onSortChange,
  onRetryPharmacies,
  onShowOtherPharmacies,
  showingOtherPharmacies = false,
}) {
  const [reserving, setReserving] = useState(null);

  const imageSrc = drug.image;
  const availablePharmacies = pharmacies.filter((pharmacy) => pharmacy.isAvailable);
  const unavailablePharmacies = pharmacies.filter((pharmacy) => !pharmacy.isAvailable);
  const available = availablePharmacies.length > 0;
  const canSortByDistance = locationChoice?.mode === "gps"
    && pharmacies.some((pharmacy) => pharmacy.distanceMeters != null);
  const selectedArea = locationChoice?.mode === "manual"
    ? [locationChoice.area, locationChoice.city, locationChoice.governorate].filter(Boolean).join("، ")
    : locationChoice?.mode === "gps" ? "موقعك الحالي" : "كل المناطق";

  return (
    <div className="dw-result">

      {/* Product Information */}
      <div className="dw-product-details">

        <div className="dw-product-image">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={drug.name}
            />
          ) : (
            <Pill size={42} />
          )}
        </div>

        <div className="dw-product-info">

          <span className="dw-product-category">
            {drug.category || "منتج صحي"}
          </span>

          <h3>{drug.name}</h3>

          <p className="dw-sub">
            {drug.activeIngredient} · {drug.strength} · {drug.form}
          </p>

          <strong className="dw-price">
            {drug.price} ج.م
          </strong>

          {onAddToCart && (
            <div className="dw-product-order-actions">
              <button
                className="dw-add-to-cart"
                type="button"
                onClick={() => onAddToCart(drug)}
              >
                أضف إلى العربة
              </button>
              {onQuickOrder && (
                <button className="dw-quick-order-button" type="button" onClick={() => onQuickOrder(drug)}>
                  اطلب الآن
                </button>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Description */}
      {drug.description && (
        <div className="dw-info-section">
          <h4>
            <Pill size={17} />
            نبذة عن المنتج
          </h4>

          <p>{drug.description}</p>
        </div>
      )}

      {/* Active Ingredient */}
      <div className="dw-info-section">

        <h4>
          <FlaskConical size={17} />
          المادة الفعالة
        </h4>

        <p>{drug.activeIngredient}</p>

      </div>

      {/* Usage */}
      {drug.usage && (
        <div className="dw-usage-section">

          <h4>
            <Clock size={17} />
            طريقة الاستخدام
          </h4>

          <p>{drug.usage}</p>

          <small>
            اتبع النشرة الداخلية وتعليمات الطبيب أو الصيدلي.
          </small>

        </div>
      )}

      {/* Prescription Warning */}
      {drug.requiresPrescription && (
        <div className="dw-warning">
          <AlertCircle size={18} />
          <span>
            هذا المنتج يتطلب وصفة طبية قبل صرفه.
          </span>
        </div>
      )}

      {/* Availability */}
      <div className="dw-availability-section">
        <div className="dw-availability-heading">
          <h4><PackageCheck size={18} />الصيدليات والتوافر</h4>
          {locationChoice && (
            <button type="button" className="dw-location-change" onClick={onChangeLocation}>
              <LocateFixed size={15} />{locationChoice.mode === "manual" ? selectedArea : "تغيير الموقع"}
            </button>
          )}
        </div>

        {locationChoice?.mode === "gps" && pharmacies.some((pharmacy) => pharmacy.distanceMeters == null) && (
          <p className="dw-location-note"><MapPin size={15} />موقعك محدد، لكن مواقع الصيدليات التجريبية غير مسجلة؛ لذلك لا يمكن حساب المسافة أو ترتيبها جغرافيًا.</p>
        )}
        {locationChoice?.mode === "manual" && (
          <p className="dw-location-note"><MapPin size={15} />{showingOtherPharmacies ? "عرض صيدليات من مناطق أخرى" : `المنطقة المختارة: ${selectedArea}`} · بيانات الصيدليات والأسعار للتوضيح فقط.</p>
        )}
        {locationChoice?.mode === "all" && (
          <p className="dw-location-note"><MapPin size={15} />عرض الصيدليات التجريبية في كل المناطق دون مسافات جغرافية.</p>
        )}

        {!locationChoice && <p className="dw-sub">اختر موقعًا أو منطقة لعرض الصيدليات المتوفر بها المنتج.</p>}
        {pharmacyLoading && <p className="dw-sub" role="status">جارٍ البحث عن الصيدليات المتوفر بها المنتج...</p>}
        {pharmacyError && (
          <div className="dw-unavailable" role="alert">
            <AlertCircle size={22} /><p>{pharmacyError}</p>
            <button type="button" onClick={onRetryPharmacies}>إعادة المحاولة</button>
          </div>
        )}
        {!pharmacyLoading && !pharmacyError && locationChoice && available && (
          <>
            <div className="dw-pharmacy-results-toolbar">
              <p className="dw-available-label"><CheckCircle2 size={16} />متوفر في {availablePharmacies.length} صيدلية</p>
              <div className="dw-pharmacy-sort" role="group" aria-label="ترتيب الصيدليات">
                <ArrowUpDown size={15} />
                <button
                  type="button"
                  className={canSortByDistance && sortBy === "distance" ? "active" : ""}
                  onClick={() => onSortChange("distance")}
                  disabled={!canSortByDistance}
                  title={canSortByDistance ? "ترتيب حسب المسافة الفعلية" : "المسافات غير متاحة دون إحداثيات فعلية"}
                >
                  الأقرب إليّ
                </button>
                <button type="button" className={sortBy === "price" ? "active" : ""} onClick={() => onSortChange("price")}>
                  الأقل سعراً
                </button>
              </div>
            </div>
            {availablePharmacies.map((p) => (
              <article className="dw-row" key={p.id}>
                <div className="dw-pharmacy-info">
                  <b>{p.name}</b>
                  <small><MapPin size={13} />{p.address}</small>
                  {locationChoice.mode === "gps" && p.distanceMeters != null && <small className="dw-pharmacy-distance"><MapPin size={13} />المسافة المباشرة: {formatDistance(p.distanceMeters)}</small>}
                  {locationChoice.mode === "gps" && p.distanceMeters == null && <small className="dw-distance-unavailable"><MapPin size={13} />المسافة غير متاحة لعدم تسجيل إحداثيات الفرع</small>}
                  {locationChoice.mode === "manual" && <small>{[p.area, p.city, p.governorate].filter(Boolean).join("، ")}</small>}
                  <small className="dw-stock-label">الكمية المتاحة: {p.quantity}</small>
                  <small className="dw-inventory-updated">آخر تحديث تجريبي للمخزون: {formatInventoryTime(p.inventoryUpdatedAt)}</small>
                </div>
                <div className="dw-pharmacy-action">
                  <strong>{Number(p.price).toLocaleString("ar-EG")} ج.م</strong>
                  <small className="dw-price-source">سعر الصيدلية</small>
                  {Number.isFinite(p.productBasePrice) && p.price !== p.productBasePrice && (
                    <small className="dw-base-price">السعر الأساسي: {Number(p.productBasePrice).toLocaleString("ar-EG")} ج.م</small>
                  )}
                  <div className="dw-pharmacy-order-actions">
                    <button type="button" onClick={() => onAddToCart?.(drug)}>أضف للسلة</button>
                    {onQuickOrder && <button type="button" className="dw-quick-order-button" onClick={() => onQuickOrder(drug, p.id)}>اطلب الآن</button>}
                  </div>
                </div>
              </article>
            ))}
          </>
        )}
        {!pharmacyLoading && !pharmacyError && locationChoice && !available && (
          <div className="dw-unavailable">
            <AlertCircle size={22} />
            <p>لا يوجد المنتج متاحًا {locationChoice.mode === "manual" && !showingOtherPharmacies ? `في ${selectedArea}` : "في الصيدليات المسجلة"}.</p>
            <span>يمكنك طلب حجزه أو البحث في مناطق أخرى. بيانات الصيدليات والأسعار تجريبية.</span>
            <div className="dw-unavailable-actions">
              {unavailablePharmacies.length === 0 && (
                <button type="button" onClick={() => setReserving({ drug, pharmacy: null, alternatives: alt })}>احجز لما يتوفر</button>
              )}
              {locationChoice.mode === "manual" && !showingOtherPharmacies && (
                <button type="button" className="dw-other-pharmacies-button" onClick={onShowOtherPharmacies}>عرض صيدليات أخرى</button>
              )}
              {showingOtherPharmacies && locationChoice.mode === "manual" && (
                <button type="button" className="dw-other-pharmacies-button" onClick={onShowOtherPharmacies}>العودة للمنطقة المختارة</button>
              )}
              <button type="button" className="dw-other-pharmacies-button" onClick={onChangeLocation}>تغيير المنطقة</button>
            </div>
          </div>
        )}
        {!pharmacyLoading && !pharmacyError && locationChoice && !available && unavailablePharmacies.map((p) => (
          <article className="dw-row dw-out-of-stock-row" key={p.id}>
            <div className="dw-pharmacy-info">
              <b>{p.name}</b>
              <small><MapPin size={13} />{p.address}</small>
              {locationChoice.mode === "manual" && <small>{[p.area, p.city, p.governorate].filter(Boolean).join("، ")}</small>}
              <small className="dw-stock-label unavailable">غير متوفر حاليًا</small>
              <small className="dw-inventory-updated">آخر تحديث تجريبي للمخزون: {formatInventoryTime(p.inventoryUpdatedAt)}</small>
            </div>
            <div className="dw-pharmacy-action">
              <strong>{Number(p.price).toLocaleString("ar-EG")} ج.م</strong>
              <small className="dw-price-source">سعر الصيدلية</small>
              {Number.isFinite(p.productBasePrice) && p.price !== p.productBasePrice && (
                <small className="dw-base-price">السعر الأساسي: {Number(p.productBasePrice).toLocaleString("ar-EG")} ج.م</small>
              )}
              <button type="button" className="dw-waitlist-button" onClick={() => setReserving({ drug, pharmacy: p })}>احجز</button>
            </div>
          </article>
        ))}
        {!pharmacyLoading && !pharmacyError && locationChoice && available && unavailablePharmacies.length > 0 && (
          <details className="dw-out-of-stock-list">
            <summary>غير متوفر حاليًا في {unavailablePharmacies.length} صيدلية أخرى</summary>
            {unavailablePharmacies.map((p) => (
              <article className="dw-row dw-out-of-stock-row" key={p.id}>
                <div className="dw-pharmacy-info">
                  <b>{p.name}</b>
                  <small><MapPin size={13} />{p.address}</small>
                  <small className="dw-stock-label unavailable">غير متوفر حاليًا</small>
                  <small className="dw-inventory-updated">آخر تحديث تجريبي للمخزون: {formatInventoryTime(p.inventoryUpdatedAt)}</small>
                </div>
                <div className="dw-pharmacy-action">
                  <strong>{Number(p.price).toLocaleString("ar-EG")} ج.م</strong>
                  <small className="dw-price-source">سعر الصيدلية</small>
                  {Number.isFinite(p.productBasePrice) && p.price !== p.productBasePrice && (
                    <small className="dw-base-price">السعر الأساسي: {Number(p.productBasePrice).toLocaleString("ar-EG")} ج.م</small>
                  )}
                  <button type="button" className="dw-waitlist-button" onClick={() => setReserving({ drug, pharmacy: p })}>احجز</button>
                </div>
              </article>
            ))}
          </details>
        )}
        {!pharmacyLoading && !pharmacyError && locationChoice?.mode === "manual" && available && !showingOtherPharmacies && (
          <button type="button" className="dw-other-pharmacies-link" onClick={onShowOtherPharmacies}>عرض صيدليات أخرى في مناطق مختلفة</button>
        )}
        {!pharmacyLoading && !pharmacyError && locationChoice?.mode === "manual" && showingOtherPharmacies && available && (
          <button type="button" className="dw-other-pharmacies-link" onClick={onShowOtherPharmacies}>العودة إلى {selectedArea}</button>
        )}

      </div>

      {/* Alternatives */}
      <div className="dw-alts">

        <h4>البدائل المتاحة</h4>

        {!alt?.allowed ? (

          <p className="dw-note">
            لا توجد بدائل تلقائية لهذا المنتج.
            استشر الصيدلي لتقييم الخيارات المناسبة.
          </p>

        ) : alt.alternatives.length > 0 ? (

          <>
            <p className="dw-note">
              هذه منتجات متوافقة في بيانات المادة الفعالة
              والتركيز والشكل الدوائي. يجب مراجعة الصيدلي
              قبل الاستبدال.
            </p>

            {alt.alternatives.map((a) => (

              <div className="dw-alt" key={a.id}>

                <div className="dw-alt-head">

                  <b>{a.name}</b>

                  <span className="dw-badge">
                    ✓ متوفر
                  </span>

                </div>

                <p className="dw-sub">
                  {a.activeIngredient} · {a.strength} · {a.form}
                </p>

                {a.pharmacies.map((p) => (

                  <div
                    className="dw-row"
                    key={p.id}
                  >

                    <div className="dw-pharmacy-info">

                      <b>{p.name}</b>

                      <small>{p.address}</small>

                      <small>
                        الكمية: {p.quantity}
                      </small>

                    </div>

                    <div className="dw-pharmacy-action">

                      <span>{p.price ?? a.price} ج.م</span>

                      <button
                        onClick={() =>
                          setReserving({
                            drug: a,
                            pharmacy: p
                          })
                        }
                      >
                        احجز
                      </button>

                    </div>

                  </div>

                ))}

              </div>

            ))}

          </>

        ) : (

          <p className="dw-note">
            لا توجد بدائل متاحة حالياً.
          </p>

        )}

      </div>

      {/* Reservation Modal */}
      {reserving && (
        <ReserveModal
          {...reserving}
          onClose={() => setReserving(null)}
          onBooked={() => setReserving(null)}
        />
      )}

    </div>
  );
}

function formatDistance(distanceMeters) {
  return distanceMeters < 1000
    ? `${Math.round(distanceMeters)} متر`
    : `${(distanceMeters / 1000).toFixed(1)} كم`;
}

function formatInventoryTime(timestamp) {
  if (!timestamp) return "غير متاح";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "غير متاح";
  return `${date.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" })}، ${date.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}`;
}