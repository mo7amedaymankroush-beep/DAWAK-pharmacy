import { useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import LocationSelector from "./LocationSelector";

const initialArea = { governorate: "", city: "", area: "" };

export default function PharmacyLocationDialog({ initialLocation, onChoose, onClose }) {
  const [manualOpen, setManualOpen] = useState(false);
  const [manualLocation, setManualLocation] = useState(initialLocation || initialArea);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function activateLocation() {
    if (!navigator.geolocation) {
      setError("خدمة تحديد الموقع غير متاحة في هذا المتصفح. يمكنك اختيار المنطقة يدويًا.");
      setManualOpen(true);
      return;
    }

    setBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChoose({
          mode: "gps",
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      },
      (geoError) => {
        const message = geoError.code === geoError.PERMISSION_DENIED
          ? "لم يتم السماح بالوصول للموقع. اختر منطقتك يدويًا للمتابعة."
          : "تعذر تحديد موقعك الآن. يمكنك اختيار المنطقة يدويًا للمتابعة.";
        setError(message);
        setManualOpen(true);
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  function chooseManual() {
    if (!manualLocation.governorate) {
      setError("اختر المحافظة أولاً.");
      return;
    }
    onChoose({ mode: "manual", ...manualLocation });
  }

  return (
    <div className="dw-overlay pharmacy-location-overlay" onClick={onClose}>
      <section
        className="dw-modal pharmacy-location-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pharmacy-location-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="pharmacy-location-close" type="button" onClick={onClose} aria-label="إغلاق نافذة الموقع">
          <X size={18} />
        </button>
        <span className="pharmacy-location-dialog-icon"><MapPin size={24} /></span>
        <h2 id="pharmacy-location-title">اعثر على الدواء بالقرب منك</h2>
        <p>اسمح لدواك بالوصول إلى موقعك لنعرض الصيدليات القريبة المتوفر بها هذا المنتج ونساعدك في مقارنة الأسعار.</p>

        {!manualOpen ? (
          <div className="pharmacy-location-dialog-actions">
            <button type="button" className="pharmacy-location-primary" onClick={activateLocation} disabled={busy}>
              <LocateFixed size={17} />{busy ? "جارٍ تحديد الموقع..." : "تفعيل الموقع"}
            </button>
            <button type="button" className="pharmacy-location-secondary" onClick={() => { setManualOpen(true); setError(""); }}>
              اختيار المنطقة يدويًا
            </button>
            <button type="button" className="pharmacy-location-skip" onClick={() => onChoose({ mode: "all" })}>
              متابعة بدون تحديد الموقع
            </button>
          </div>
        ) : (
          <div className="pharmacy-manual-location">
            <LocationSelector
              value={manualLocation}
              onChange={(value) => { setManualLocation(value); setError(""); }}
              showLocate={false}
            />
            <div className="pharmacy-location-dialog-actions manual-actions">
              <button type="button" className="pharmacy-location-primary" onClick={chooseManual}>عرض صيدليات المنطقة</button>
              <button type="button" className="pharmacy-location-secondary" onClick={() => setManualOpen(false)}>رجوع</button>
            </div>
          </div>
        )}
        {error && <p className="pharmacy-location-dialog-error" role="alert">{error}</p>}
      </section>
    </div>
  );
}