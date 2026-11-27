import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  LocateFixed,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Store,
  Truck,
  Clock,
  Navigation,
} from "lucide-react";
import LocationSelector from "./LocationSelector";
import ReflectiveCard from "./ReflectiveCard";
import { useToast } from "./ToastProvider";
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

// وقت التوصيل المتوقع بالدقائق: أساس قصير + مسافة/تحضير (نبقيه ضمن نطاق منطقي للدقيقة)
const MIN_DELIVERY_MINUTES = 20;
const MAX_DELIVERY_MINUTES = 55;

function estimateDeliveryMinutes(pharmacy, distanceMeters) {
  const estimated = pharmacy?.delivery?.estimatedMinutes;
  const base = Number.isFinite(estimated)
    ? Math.min(estimated, 45) - 15
    : DEFAULT_DELIVERY_MINUTES - 15;
  const transportMinutes = Number.isFinite(distanceMeters)
    ? Math.round(distanceMeters / 450) // حركة داخل المدينة
    : 5;
  return Math.min(
    MAX_DELIVERY_MINUTES,
    Math.max(MIN_DELIVERY_MINUTES, Math.round(base + transportMinutes)),
  );
}

function formatMinutes(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  return `${Math.round(minutes)} دقيقة`;
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
  // الخطوة الحالية: اختيار الطريقة، أو التحديد اليدوي
  const [step, setStep] = useState("choice");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [busy, setBusy] = useState(false);
  // الإشعار الموحّد (منتصف الشاشة) عند نجاح تحديد الموقع
  const showToast = useToast();
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

  function storeChoice(next) {
    setResult(next);
    setBusy(false);
    setGpsLoading(false);
    if (next?.governorate && next?.mode !== "all") {
      showToast("تم تحديد موقعك بنجاح! جاري عرض أقرب صيدلية متاحة");
    }
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
  }

  // التحديد التلقائي: نحفظ ونغلق مباشرة بمجرد جلب الإحداثيات
  function applyAndSave(next) {
    storeChoice(next);
    window.setTimeout(() => {
      if (onChoose) onChoose(next);
      if (onClose) onClose();
    }, 900);
  }

  // التحديد اليدوي: نعرض بطاقة النتيجة ونترك إغلاق البطاقة بيد المستخدم
  function applyAndShow(next) {
    storeChoice(next);
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
    applyAndShow({
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

  function skip() {
    if (onChoose) onChoose({ mode: "all" });
    if (onClose) onClose();
  }

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
        width="auto"
        height="auto"
        className={`loc-card loc-card--${step}`}
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

          {step === "choice" ? (
            <div className="loc-step loc-step--choice">
              <h2 id="location-modal-title">حدد موقع التوصيل 📍</h2>
              <p className="loc-sub">
                اختر الطريقة المناسبة للوصول لأقرب صيدلية.
              </p>

              <div className="loc-choices">
                <button
                  className="loc-choice"
                  type="button"
                  onClick={openGps}
                  disabled={busy || gpsLoading}
                >
                  <span className="loc-choice-icon">
                    <LocateFixed size={20} />
                  </span>
                  <span className="loc-choice-text">
                    <strong>
                      {gpsLoading ? "جارٍ تحديد موقعك..." : "تحديد تلقائي (GPS) 📡"}
                    </strong>
                    <small>أقرب صيدلية ووقت التوصيل فوراً</small>
                  </span>
                  <ChevronLeft size={16} className="loc-choice-arrow" />
                </button>

                <button
                  className="loc-choice loc-choice--manual"
                  type="button"
                  onClick={() => {
                    setStep("manual");
                    setGpsError("");
                  }}
                  disabled={busy || gpsLoading}
                >
                  <span className="loc-choice-icon">
                    <MapPin size={20} />
                  </span>
                  <span className="loc-choice-text">
                    <strong>تحديد يدوي 🗺️</strong>
                    <small>اختر المحافظة والمدينة والمنطقة</small>
                  </span>
                  <ChevronLeft size={16} className="loc-choice-arrow" />
                </button>
              </div>

              {gpsError && (
                <p className="loc-error" role="alert">
                  {gpsError}
                </p>
              )}

              <button className="loc-skip" type="button" onClick={skip}>
                <ChevronLeft size={14} aria-hidden="true" />
                تخطي الآن
              </button>
            </div>
          ) : (
            <div className="loc-step loc-step--manual">
              <button
                className="loc-back"
                type="button"
                onClick={() => setStep("choice")}
              >
                <ChevronRight size={14} aria-hidden="true" />
                تغيير الطريقة
              </button>

              <h2 id="location-modal-title">حدد موقع التوصيل 📍</h2>
              <p className="loc-sub">
                اختر المحافظة والمدينة والمنطقة لأقرب صيدلية.
              </p>

              <div className="loc-body">
                <div className="loc-field">
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
                    onClick={handleManualConfirm}
                    disabled={busy || !manualLocation.governorate}
                  >
                    <CheckCircle2 size={16} />
                    {busy ? "جارٍ الحفظ..." : "تأكيد الموقع"}
                  </button>
                </div>

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
                          <small>وقت التوصيل</small>
                          <strong>{formatMinutes(deliveryMinutes)}</strong>
                        </div>
                      </div>
                      <div className="loc-delivery-row">
                        <span className="loc-delivery-icon">
                          <Clock size={15} />
                        </span>
                        <div>
                          <small>التوصيل</small>
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
                            <small>المسافة</small>
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
                    اختر المنطقة لعرض أقرب صيدلية ووقت التوصيل.
                  </p>
                )}

                {result && (
                  <button className="loc-save-close" type="button" onClick={skip}>
                    <CheckCircle2 size={15} />
                    متابعة
                  </button>
                )}

                <button className="loc-skip" type="button" onClick={skip}>
                  <ChevronLeft size={14} aria-hidden="true" />
                  تخطي الآن
                </button>
              </div>
            </div>
          )}
        </section>
      </ReflectiveCard>
    </div>
  );
}
