import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MapPin, RotateCw } from "lucide-react";
import { getPharmacies } from "../api/pharmaciesApi";
import LocationSelector from "./LocationSelector";
import PharmacyCard from "./PharmacyCard";

export default function NearbyPharmacies({ location, onLocationChange, onOpenPharmacy }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const requestId = useRef(0);

  async function loadPharmacies() {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const results = await getPharmacies(location);
      if (currentRequest === requestId.current) setItems(results);
    } catch {
      if (currentRequest === requestId.current) setError("تعذر تحميل الصيدليات الآن. حاول مرة أخرى.");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }

  useEffect(() => {
    loadPharmacies();
    return () => { requestId.current++; };
  }, [location.governorate, location.city, location.area]);

  function locate() {
    if (!navigator.geolocation) {
      setLocationMessage("الموقع الجغرافي غير مدعوم في هذا المتصفح.");
      return;
    }

    setLocating(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationMessage("تم تحديد إحداثيات جهازك. اختر منطقتك يدويًا لمطابقة الصيدليات المتاحة.");
        setLocating(false);
      },
      () => {
        setLocationMessage("تعذر تحديد الموقع. يمكنك اختيار المحافظة والمنطقة يدويًا.");
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }

  const selectedArea = [location.area, location.city, location.governorate].filter(Boolean).join("، ") || "كل المناطق";
  const visibleItems = expanded ? items : items.slice(0, 2);

  return (
    <section className="nearby-pharmacies-section" aria-labelledby="nearby-pharmacies-title">
      <div className="section-heading pharmacy-section-heading">
        <div>
          <span className="section-kicker">اعرف المتاح حولك</span>
          <h2 id="nearby-pharmacies-title">صيدليات قريبة منك</h2>
          <p>اكتشف الصيدليات المتاحة بالقرب منك وتعرّف على المنتجات المتوفرة لديها.</p>
        </div>
        <span className="selected-area-indicator"><MapPin size={16} />{selectedArea}</span>
      </div>

      <LocationSelector
        value={location}
        onChange={onLocationChange}
        onLocate={locate}
        locating={locating}
        locationMessage={locationMessage}
      />

      {loading && <div className="pharmacy-state" role="status">جارٍ تحميل الصيدليات...</div>}
      {error && (
        <div className="pharmacy-state pharmacy-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadPharmacies}><RotateCw size={15} />إعادة المحاولة</button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="pharmacy-state pharmacy-empty">لا توجد صيدليات تجريبية مسجلة في هذه المنطقة بعد.</div>
      )}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="pharmacy-cards-grid">
            {visibleItems.map((pharmacy) => (
              <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} onOpen={onOpenPharmacy} />
            ))}
          </div>
          {items.length > 2 && (
            <button type="button" className="pharmacy-show-all" onClick={() => setExpanded((current) => !current)}>
              {expanded ? "عرض أقل" : "عرض الكل"}<ArrowLeft size={16} />
            </button>
          )}
        </>
      )}
    </section>
  );
}