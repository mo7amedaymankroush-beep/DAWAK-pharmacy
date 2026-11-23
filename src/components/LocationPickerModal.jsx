import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  LocateFixed,
  X,
  CheckCircle2,
  ChevronLeft,
  Store,
  ShieldCheck,
  Truck,
  Clock,
  Navigation,
} from "lucide-react";
import LocationSelector from "./LocationSelector";
import ReflectiveCard from "./ReflectiveCard";
import { pharmacies } from "../data/pharmacies";
import { distanceBetween } from "../utils/locationUtils";
import "./location-picker.css";

export const LOCATION_CHOICE_KEY = "dawak-pharmacy-location-choice";

const initialArea = { governorate: "", city: "", area: "" };
const DEFAULT_DELIVERY_MINUTES = 90;
const DEFAULT_DELIVERY_FEE = 30;

function readSavedChoice() {
  try {
    const raw = localStorage.getItem(LOCATION_CHOICE_KEY);
    return raw ? JSON.parse(raw) || null : null;
  } catch {
    return null;
  }
}

function pickNearestPharmacy(filters) {
  let candidates = pharmacies.filter((item) => item.isActive);
  if (filters.governorate) {
    candidates = candidates.filter(
      (item) => item.governorate === filters.governorate,
    );
  }
  if (filters.city) {
    candidates = candidates.filter((item) => item.city === filters.city);
  }
  if (filters.area) {
    candidates = candidates.filter((item) => item.area === filters.area);
  }
  candidates.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return candidates[0] || null;
}

// وقت التوصيل المتوقع: حسب المسافة لو الموقع GPS، أو التقدير الافتراضي للصيدلية
function estimateDeliveryMinutes(pharmacy, distanceMeters) {
  if (Number.isFinite(distanceMeters)) {
    const transportMinutes = Math.round(distanceMeters / 300); // ~18 كم/س داخل المدينة
    return Math.max(
      20,
      (pharmacy?.delivery?.estimatedMinutes ?? DEFAULT_DELIVERY_MINUTES) -
        40 +
        transportMinutes,
    );
  }
  return pharmacy?.delivery?.estimatedMinutes ?? DEFAULT_DELIVERY_MINUTES;
}

function formatMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ساعة و${rest} دقيقة` : `${hours} ساعة`;
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.round(meters)} م`;
  return `${(meters / 1000).toFixed(1)} كم`;
}

export default function LocationPickerModal({
  initialLocation = initialArea,
  onChoose,
  onClose,
}) {
  const savedChoice = useMemo(readSavedChoice, []);
  const startLocation = useMemo(() => {
    if (initialLocation?.governorate) return initialLocation;
    if (savedChoice?.governorate) {
      return {
        governorate: savedChoice.governorate,
        city: savedChoice.city || "",
        area: savedChoice.area || "",
      };
    }
    return initialArea;
  }, [initialLocation, savedChoice]);

  const resolvedStart = useMemo(() => {
    if (!startLocation.governorate) return null;
    return (
      pharmacies.find(
        (item) =>
          item.isActive &&
          item.governorate === startLocation.governorate &&
          (!startLocation.city || item.city === startLocation.city) &&
          (!startLocation.area || item.area === startLocation.area),
      ) || null
    );
  }, [startLocation]);

  const [manualLocation, setManualLocation] = useState(startLocation);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(() =>
    savedChoice?.governorate || savedChoice?.mode === "gps"
      ? {
          ...savedChoice,
          pharmacy: resolvedStart
            ? { name: resolvedStart.name, address: resolvedStart.address }
            : savedChoice.pharmacy || null,
        }
      : null,
  );

  // مزامنة الاختيارات اليدوية عند تغيّر الموقع الأولي القادم من التطبيق
  useEffect(() => {
    if (!initialLocation?.governorate) return;
    setManualLocation(initialLocation);
    setGpsError("");
    setConfirmError("");
  }, [initialLocation]);

  // نفس سلوك بطاقة تسجيل الدخول: منع تمرير الخلفية وإغلاق بـ Escape
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && onClose) onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  function applyAndSave(next) {
    setResult(next);
    setBusy(false);
    setGpsLoading(false);
    try {
      localStorage.setItem(LOCATION_CHOICE_KEY, JSON.stringify(next));
      try {
        sessionStorage.setItem(LOCATION_CHOICE_KEY, JSON.stringify(next));
      } catch {
        /* تخزين الجلسة اختياري */
      }
    } catch {
      /* تخزين الموقع اختياري؛ لن يمنع المتابعة إذا تعذّر الحفظ */
    }
    // نعطي المستخدم لحظة يرى فيها وقت التوصيل قبل إغلاق البطاقة
    window.setTimeout(() => {
      if (onChoose) onChoose(next);
      if (onClose) onClose();
    }, 900);
  }

  function openGps() {
    if (!navigator.geolocation) {
      setGpsError(
        "خدمة تحديد الموقع غير متاحة في هذا المتصفح. اختر منطقتك يدويًا.",
      );
      return;
    }

    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const candidates = pharmacies.filter((item) => item.isActive);
        const withDistance = candidates.map((pharmacy) => ({
          ...pharmacy,
          distanceMeters: distanceBetween(
            coords.latitude,
            coords.longitude,
            pharmacy.latitude,
            pharmacy.longitude,
          ),
        }));
        withDistance.sort(
          (a, b) =>
            (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
        );
        const nearest = withDistance[0];
        if (!nearest || !Number.isFinite(nearest.distanceMeters)) {
          setGpsError(
            "لم نجد صيدلية قريبة من موقعك. اختر منطقتك يدويًا للمتابعة.",
          );
          setGpsLoading(false);
          return;
        }

        applyAndSave({
          mode: "gps",
          governorate: nearest.governorate,
          city: nearest.city,
          area: nearest.area,
          address: nearest.address,
          latitude: coords.latitude,
          longitude: coords.longitude,
          pharmacyId: nearest.id,
          pharmacyName: nearest.name,
          pharmacy: { name: nearest.name, address: nearest.address },
          distanceMeters: nearest.distanceMeters,
          deliveryMinutes: estimateDeliveryMinutes(
            nearest,
            nearest.distanceMeters,
          ),
          deliveryFee:
            nearest.delivery?.available === false
              ? null
              : (nearest.delivery?.fee ?? DEFAULT_DELIVERY_FEE),
          savedAt: Date.now(),
        });
      },
      (geoError) => {
        const message =
          geoError.code === geoError.PERMISSION_DENIED
            ? "لم يتم السماح بالوصول للموقع. اختر المحافظة والحي يدويًا."
            : "تعذر تحديد موقعك الآن. اختر المحافظة والحي يدويًا.";
        setGpsError(message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  function handleManualConfirm() {
    if (!manualLocation.governorate) {
      setConfirmError("اختر المحافظة أولاً.");
      return;
    }

    const pharmacy = pickNearestPharmacy({
      governorate: manualLocation.governorate,
      city: manualLocation.city,
      area: manualLocation.area,
    });

    if (!pharmacy) {
      setConfirmError("لا توجد صيدلية متاحة في هذه المنطقة. جرّب منطقة قريبة.");
      return;
    }

    setBusy(true);
    setConfirmError("");
    applyAndSave({
      mode: "manual",
      governorate: pharmacy.governorate,
      city: pharmacy.city,
      area: pharmacy.area,
      address: pharmacy.address,
      latitude: pharmacy.latitude ?? null,
      longitude: pharmacy.longitude ?? null,
      pharmacyId: pharmacy.id,
      pharmacyName: pharmacy.name,
      pharmacy: { name: pharmacy.name, address: pharmacy.address },
      distanceMeters: null,
      deliveryMinutes: estimateDeliveryMinutes(pharmacy, null),
      deliveryFee:
        pharmacy.delivery?.available === false
          ? null
          : (pharmacy.delivery?.fee ?? DEFAULT_DELIVERY_FEE),
      savedAt: Date.now(),
    });
  }

  const successPharmacy = result?.pharmacy || null;
  const deliveryMinutes =
    result?.deliveryMinutes ??
    estimateDeliveryMinutes(successPharmacy, result?.distanceMeters);
  const deliveryFee = result?.deliveryFee;

  return (
    <div
      className="loc-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && onClose) onClose();
      }}
    >
      <ReflectiveCard
        theme="dark"
        tint="#10b981"
        webcam={false}
        width={420}
        height={720}
      >
        <section
          className="loc-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-modal-title"
          dir="rtl"
        >
          <button
            className="loc-close"
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة تحديد الموقع"
          >
            <X size={18} />
          </button>

          <h2 id="location-modal-title">تحديد موقعك للتوصيل</h2>
          <p className="loc-sub">
            اختار المحافظة والحي، أو حدّد موقعك بالـ GPS، ونعرض لك وقت التوصيل
            المتوقع من أقرب صيدلية.
          </p>

          <div className="loc-body">
            <div className="loc-field">
              <label>المحافظة والحي</label>
              <LocationSelector
                value={manualLocation}
                onChange={(value) => {
                  setManualLocation(value);
                  setConfirmError("");
                }}
                showLocate={false}
              />
            </div>

            <div className="loc-actions">
              <button
                className="loc-btn loc-btn--primary"
                type="button"
                onClick={openGps}
                disabled={busy || gpsLoading}
              >
                <LocateFixed size={16} />
                {gpsLoading ? "جارٍ تحديد موقعك..." : "تحديد موقعي بالـ GPS"}
              </button>

              <button
                className="loc-btn loc-btn--ghost"
                type="button"
                onClick={handleManualConfirm}
                disabled={busy || gpsLoading || !manualLocation.governorate}
              >
                <CheckCircle2 size={16} />
                {busy ? "جارٍ الحفظ..." : "تأكيد المحافظة والحي"}
              </button>
            </div>

            {gpsError && (
              <p className="loc-error" role="alert">
                {gpsError}
              </p>
            )}
            {confirmError && (
              <p className="loc-error" role="alert">
                {confirmError}
              </p>
            )}

            {result ? (
              <div className="loc-result" aria-live="polite">
                <div className="loc-success">
                  <CheckCircle2 size={16} />
                  <span>تم حفظ الموقع</span>
                </div>

                <div className="loc-delivery">
                  <div className="loc-delivery-row">
                    <span className="loc-delivery-icon">
                      <Truck size={15} />
                    </span>
                    <div>
                      <small>وقت التوصيل المتوقع</small>
                      <strong>{formatMinutes(deliveryMinutes)}</strong>
                    </div>
                  </div>
                  <div className="loc-delivery-row">
                    <span className="loc-delivery-icon">
                      <Clock size={15} />
                    </span>
                    <div>
                      <small>رسوم التوصيل</small>
                      <strong>
                        {deliveryFee == null
                          ? "غير متاح"
                          : `${deliveryFee} ج.م`}
                      </strong>
                    </div>
                  </div>
                  {Number.isFinite(result.distanceMeters) && (
                    <div className="loc-delivery-row">
                      <span className="loc-delivery-icon">
                        <Navigation size={15} />
                      </span>
                      <div>
                        <small>المسافة لأقرب صيدلية</small>
                        <strong>{formatDistance(result.distanceMeters)}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {successPharmacy ? (
                  <div className="loc-pharmacy">
                    <div className="loc-pharmacy-pin">
                      <Store size={16} />
                    </div>
                    <div>
                      <p className="loc-pharmacy-name">
                        {successPharmacy.name}
                      </p>
                      <p className="loc-pharmacy-address">
                        {successPharmacy.address}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="loc-hint">
                    لم يتم العثور على صيدلية قريبة في هذا المجال.
                  </p>
                )}
              </div>
            ) : (
              <p className="loc-hint">
                <MapPin size={13} aria-hidden="true" />
                هنعرض أقرب صيدلية ووقت التوصيل أول ما تحدد الموقع.
              </p>
            )}

            <button
              className="loc-skip"
              type="button"
              onClick={() => {
                if (onChoose) onChoose({ mode: "all" });
                if (onClose) onClose();
              }}
            >
              <ChevronLeft size={14} aria-hidden="true" />
              متابعة بدون تحديد الموقع
            </button>
          </div>

          <p className="loc-note">
            <ShieldCheck size={15} aria-hidden="true" />
            الموقع بيُستخدم لاقتراح أقرب صيدلية وحساب وقت التوصيل فقط، ويمكنك
            تغييره في أي وقت.
          </p>
        </section>
      </ReflectiveCard>
    </div>
  );
}
