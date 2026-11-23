import { ArrowLeft, Clock3, MapPin, PackageCheck, Store } from "lucide-react";

const openingLabels = { open: "مفتوحة الآن", closed: "مغلقة الآن", unknown: "ساعات العمل غير متاحة" };

export default function PharmacyCard({ pharmacy, onOpen, productOffer, compact = false }) {
  const hasHours = pharmacy.openingStatus !== "unknown";

  return (
    <article className={`pharmacy-card${compact ? " pharmacy-card-compact" : ""}`}>
      <div className="pharmacy-card-top">
        <span className="pharmacy-logo" aria-hidden="true"><Store size={23} /></span>
        <span className="pharmacy-demo-label">بيانات تجريبية</span>
      </div>
      <h3>{pharmacy.name}</h3>
      <p className="pharmacy-address"><MapPin size={15} />{pharmacy.address}</p>
      {productOffer ? (
        <div className="pharmacy-offer">
          <span>{productOffer.isAvailable ? "متوفر" : "غير متوفر"}</span>
          <strong>{Number(productOffer.price).toLocaleString("ar-EG")} ج.م</strong>
          {productOffer.isAvailable && <small>الكمية: {productOffer.quantity}</small>}
        </div>
      ) : (
        <div className="pharmacy-card-meta">
          <span className={hasHours && pharmacy.openingStatus === "open" ? "pharmacy-status available" : hasHours ? "pharmacy-status unavailable" : "pharmacy-status unknown"}>
            <Clock3 size={15} />{openingLabels[pharmacy.openingStatus] || openingLabels.unknown}
          </span>
          <span className="pharmacy-product-count"><PackageCheck size={15} />{pharmacy.availableProductCount} منتجات متاحة</span>
        </div>
      )}
      <button type="button" className="pharmacy-open-button" onClick={() => onOpen(pharmacy.id)}>
        عرض الصيدلية <ArrowLeft size={16} />
      </button>
    </article>
  );
}