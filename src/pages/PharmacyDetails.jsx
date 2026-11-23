import { useEffect, useRef, useState } from "react";
import { ArrowRight, Clock3, MapPin, PackageCheck, Phone, Pill, Search, Store } from "lucide-react";
import { getPharmacyDetails } from "../api/pharmaciesApi";
import ReserveModal from "../components/ReserveModal";

const openingLabels = { open: "مفتوحة الآن", closed: "مغلقة الآن", unknown: "ساعات العمل غير متاحة" };
const weekdayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default function PharmacyDetails({ pharmacyId, onBack }) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [reserving, setReserving] = useState(null);
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    let cancelled = false;
    setLoading(true);
    setError("");
    const timer = window.setTimeout(async () => {
      try {
        const result = await getPharmacyDetails(pharmacyId, query);
        if (!cancelled && currentRequest === requestId.current) setData(result);
      } catch {
        if (!cancelled && currentRequest === requestId.current) setError("تعذر تحميل بيانات الصيدلية. حاول مرة أخرى.");
      } finally {
        if (!cancelled && currentRequest === requestId.current) setLoading(false);
      }
    }, query ? 180 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pharmacyId, query]);

  if (loading && !data) return <main className="pharmacy-details-page"><p className="pharmacy-state">جارٍ تحميل بيانات الصيدلية...</p></main>;
  if (error && !data) return <main className="pharmacy-details-page"><p className="pharmacy-state pharmacy-error" role="alert">{error}</p><button className="pharmacy-back-button" onClick={onBack}><ArrowRight size={17} />رجوع</button></main>;

  const pharmacy = data?.pharmacy;

  return (
    <main className="pharmacy-details-page">
      <button className="pharmacy-back-button" type="button" onClick={onBack}><ArrowRight size={17} />رجوع</button>
      <header className="pharmacy-details-header">
        <span className="pharmacy-details-logo"><Store size={26} /></span>
        <div>
          <span className="pharmacy-demo-label">بيانات تجريبية</span>
          <h1>{pharmacy?.name}</h1>
          <p><MapPin size={16} />{pharmacy?.address}</p>
        </div>
      </header>

      <div className="pharmacy-details-facts">
        <span><Clock3 size={16} />{openingLabels[pharmacy?.openingStatus] || openingLabels.unknown}</span>
        {pharmacy?.phone ? <a href={`tel:${pharmacy.phone}`}><Phone size={16} />{pharmacy.phone}</a> : <span><Phone size={16} />رقم التواصل غير متاح</span>}
        <span><PackageCheck size={16} />{pharmacy?.availableProductCount || 0} منتجات متاحة</span>
      </div>

      {pharmacy?.openingHours && (
        <section className="pharmacy-hours">
          <h2>مواعيد العمل</h2>
          <div>
            {Object.entries(pharmacy.openingHours).map(([day, hours]) => (
              <p key={day}>
                <strong>{weekdayNames[Number(day)] || day}</strong>
                <span>{hours?.open && hours?.close ? `${hours.open} - ${hours.close}` : "مغلق"}</span>
              </p>
            ))}
          </div>
        </section>
      )}

      <section className="pharmacy-inventory-section">
        <div className="pharmacy-inventory-heading">
          <div><span className="section-kicker">قائمة المنتجات</span><h2>مخزون الصيدلية</h2></div>
          <label className="pharmacy-inventory-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث داخل المخزون..." aria-label="ابحث داخل مخزون الصيدلية" />
          </label>
        </div>

        {loading && <p className="pharmacy-state" role="status">جارٍ تحديث المخزون...</p>}
        {error && <p className="pharmacy-state pharmacy-error" role="alert">{error}</p>}
        {!loading && !error && data?.products.length === 0 && <p className="pharmacy-state pharmacy-empty">لا توجد منتجات مطابقة في مخزون هذه الصيدلية.</p>}
        {!loading && !error && data?.products.length > 0 && (
          <div className="pharmacy-inventory-list">
            {data.products.map((product) => (
              <article className="pharmacy-inventory-item" key={product.inventoryId}>
                <span className="pharmacy-product-icon">{product.image ? <img src={product.image} alt="" /> : <Pill size={24} />}</span>
                <div className="pharmacy-inventory-product">
                  <h3>{product.name}</h3>
                  <p>{product.detail || `${product.strength} · ${product.form}`}</p>
                  <span className={product.isAvailable ? "inventory-availability available" : "inventory-availability unavailable"}>
                    {product.isAvailable ? `متوفر · الكمية ${product.quantity}` : "غير متوفر حاليًا"}
                  </span>
                  {expandedProduct === product.inventoryId && (
                    <div className="pharmacy-product-extra">
                      <p>{product.description || "لا توجد تفاصيل إضافية لهذا المنتج."}</p>
                      <span>المادة الفعالة: {product.activeIngredient}</span>
                    </div>
                  )}
                </div>
                <div className="pharmacy-inventory-actions">
                  <strong>{Number(product.price).toLocaleString("ar-EG")} ج.م</strong>
                  <button type="button" className="pharmacy-text-button" onClick={() => setExpandedProduct((current) => current === product.inventoryId ? null : product.inventoryId)}>
                    {expandedProduct === product.inventoryId ? "إخفاء التفاصيل" : "تفاصيل المنتج"}
                  </button>
                  <button type="button" className="pharmacy-reserve-button" onClick={() => setReserving({ drug: product, pharmacy })}>
                    {product.isAvailable ? "احجز" : "اطلب عند التوفر"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {reserving && <ReserveModal {...reserving} onClose={() => setReserving(null)} />}
    </main>
  );
}