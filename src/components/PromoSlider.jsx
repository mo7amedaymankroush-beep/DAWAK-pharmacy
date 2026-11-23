import { useEffect, useRef, useState } from "react";
import {
  MapPin,
  Navigation,
  Pill,
  Truck,
  Clock,
  Hospital,
  BadgeCheck,
  ArrowLeft,
  ArrowRight,
  Store,
  CalendarDays,
  Percent,
  BellRing,
} from "lucide-react";
import { pharmacies } from "../data/pharmacies";
import "./PromoSlider.css";

const SLIDE_COUNT = 3;

export default function PromoSlider({ onOpenLocationPicker, onBrowsePharmacies, onOpenMonthlyRx }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const hoverRef = useRef(false);

  // تقليب تلقائي كل 5 ثوانٍ — يتوقف عند تمرير الماوس
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!hoverRef.current) {
        setActiveSlide((current) => (current + 1) % SLIDE_COUNT);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  function goToSlide(index) {
    setActiveSlide((index + SLIDE_COUNT) % SLIDE_COUNT);
  }

  const featuredPharmacies = pharmacies.filter((item) => item.isActive).slice(0, 3);

  return (
    <section
      className="promo-slider"
      aria-roledescription="carousel"
      aria-label="عروض وخدمات دواك"
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; }}
    >

      {/* في RTL الشرائح تترتب من اليمين لليسار، لذا الإزاحة موجبة */}
      <div className="promo-viewport">
        <div className="promo-track" style={{ transform: `translateX(${activeSlide * 100}%)` }}>

          {/* الشريحة الأولى — تحديد الموقع الجغرافي */}
          <div
            className={`promo-slide promo-slide--location ${activeSlide === 0 ? "is-active" : ""}`}
            role="group"
            aria-roledescription="شريحة"
            aria-label="1 من 3"
            aria-hidden={activeSlide !== 0}
          >
            <div className="promo-slide-copy">

              <span className="promo-tag">
                <MapPin size={14} />
                خدمة جديدة
              </span>

              <h2>حدّد موقعك لسرعة الطلب</h2>

              <p>
                اعرف الصيدليات القريبة منك ووقت التوصيل المتوقع في ثواني
              </p>

              <button
                type="button"
                className="promo-cta promo-cta--orange"
                onClick={() => {
                  if (onOpenLocationPicker) onOpenLocationPicker();
                  else window.location.hash = "#products";
                }}
              >
                📍 تحديد موقعي الآن
                <ArrowLeft size={17} />
              </button>

            </div>

            <div className="promo-visual promo-visual--location" aria-hidden="true">

              <div className="promo-pin-ring">
                <span className="promo-ring promo-ring--1" />
                <span className="promo-ring promo-ring--2" />
                <span className="promo-pin-core">
                  <Navigation size={30} />
                </span>
              </div>

              <span className="promo-float-icon promo-float-icon--pill">
                <Pill size={20} />
              </span>

              <span className="promo-float-icon promo-float-icon--truck">
                <Truck size={20} />
              </span>

              <span className="promo-float-icon promo-float-icon--clock">
                <Clock size={18} />
                <small>~ 30 دقيقة</small>
              </span>

            </div>

          </div>

          {/* الشريحة الثانية — الصيدليات المسجلة */}
          <div
            className={`promo-slide promo-slide--pharmacies ${activeSlide === 1 ? "is-active" : ""}`}
            role="group"
            aria-roledescription="شريحة"
            aria-label="2 من 3"
            aria-hidden={activeSlide !== 1}
          >
            <div className="promo-slide-copy">

              <span className="promo-tag promo-tag--light">
                <Store size={14} />
                شبكة الصيدليات
              </span>

              <h2>صيدليات معتمدة في خدمتك</h2>

              <p>
                تصفح جميع الصيدليات المسجلة في منطقتك، قارن التوفر، واطلب دوائك بضغطة زر
              </p>

              <button
                type="button"
                className="promo-cta promo-cta--white"
                onClick={() => {
                  if (onBrowsePharmacies) onBrowsePharmacies();
                  else window.location.hash = "#pharmacies";
                }}
              >
                🏥 تصفح الصيدليات المسجلة
                <ArrowLeft size={17} />
              </button>

            </div>

            <div className="promo-visual promo-visual--pharmacies" aria-hidden="true">

              {featuredPharmacies.map((pharmacy, index) => (
                <button
                  type="button"
                  className={`promo-mini-card promo-mini-card--${index + 1}`}
                  key={pharmacy.id}
                  onClick={() => {
                    if (onBrowsePharmacies) onBrowsePharmacies();
                    else window.location.hash = "#pharmacies";
                  }}
                  aria-label={`تصفح ${pharmacy.name}`}
                >

                  <div className="promo-mini-card-head">
                    <span className="promo-mini-logo">
                      <Hospital size={16} />
                    </span>

                    <span className="promo-mini-verified">
                      <BadgeCheck size={14} />
                      موثّقة
                    </span>
                  </div>

                  <strong>{pharmacy.name.replace("فرع دواك التجريبي - ", "")}</strong>

                  <small>{pharmacy.city} · {pharmacy.area}</small>

                  <span className="promo-mini-delivery">
                    توصيل خلال {pharmacy.delivery?.estimatedMinutes || 60} دقيقة
                  </span>

                </button>
              ))}

            </div>

          </div>

          {/* الشريحة الثالثة — الروشتة الشهرية */}
          <div
            className={`promo-slide promo-slide--monthly ${activeSlide === 2 ? "is-active" : ""}`}
            role="group"
            aria-roledescription="شريحة"
            aria-label="3 من 3"
            aria-hidden={activeSlide !== 2}
          >
            <div className="promo-slide-copy">

              <span className="promo-tag promo-tag--monthly">
                <Percent size={14} />
                خصم 5% دائم
              </span>

              <h2>روشتتك الشهرية.. توصلك قبل ما تخلص بخصم 5% 💊</h2>

              <p>
                سجّل أدوية الضغط، السكر، أو العلاج الشهري مرة واحدة وهنفكرك ونوصلهالك بانتظام.
              </p>

              <button
                type="button"
                className="promo-cta promo-cta--mint"
                onClick={() => {
                  if (onOpenMonthlyRx) onOpenMonthlyRx();
                  else window.location.hash = "#consultation";
                }}
              >
                📅 جدولة روشتتي الشهرية
                <ArrowLeft size={17} />
              </button>

            </div>

            <div className="promo-visual promo-visual--monthly" aria-hidden="true">

              <div className="promo-monthly-card">

                <div className="promo-monthly-head">
                  <span className="promo-monthly-pill-icon"><Pill size={18} /></span>
                  <span className="promo-monthly-badge">اشتراك شهري</span>
                </div>

                <strong>أدوية الضغط والسكر</strong>

                <div className="promo-monthly-facts">
                  <span><CalendarDays size={13} /> يوم 15 من كل شهر</span>
                  <span><BellRing size={13} /> تذكير قبل يومين</span>
                  <span className="is-discount"><Percent size={13} /> خصم 5% تلقائي</span>
                </div>

              </div>

              <span className="promo-float-icon promo-monthly-float">
                <Percent size={18} />
                <small>- 5%</small>
              </span>

            </div>

          </div>

        </div>
      </div>

      {/* أسهم التنقل الجانبية */}
      <button
        type="button"
        className="promo-arrow promo-arrow--prev"
        aria-label="الشريحة السابقة"
        onClick={() => goToSlide(activeSlide - 1)}
      >
        <ArrowRight size={18} />
      </button>

      <button
        type="button"
        className="promo-arrow promo-arrow--next"
        aria-label="الشريحة التالية"
        onClick={() => goToSlide(activeSlide + 1)}
      >
        <ArrowLeft size={18} />
      </button>

      {/* نقاط التنقل */}
      <div className="promo-dots" role="tablist" aria-label="التنقل بين الشرائح">
        {Array.from({ length: SLIDE_COUNT }, (_, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={activeSlide === index}
            aria-label={`الشريحة ${index + 1}`}
            className={`promo-dot ${activeSlide === index ? "is-active" : ""}`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>

    </section>
  );
}
