import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Flame, Plus } from "lucide-react";

import money from "../utils/money";
import { useToast } from "./ToastProvider";
import "./weight-loss.css";

export default function WeightLossSection({ products, onOpenProduct, onAddToCart, onBookProduct, onViewAll }) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const isRtlRef = useRef(true);

  const [offset, setOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(0);
  const toast = useToast();

  // نقيس عرض الشريط بعد الرسم (وبعد تغيّر المقاس) لتحديد حدود التمرير
  useEffect(() => {
    function measure() {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (!viewport || !track) return;

      isRtlRef.current = getComputedStyle(track).direction === "rtl";
      setMaxOffset(Math.max(0, track.scrollWidth - viewport.clientWidth));
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [products.length]);

  useEffect(() => {
    setOffset((current) => Math.min(current, maxOffset));
  }, [maxOffset]);

  const atStart = offset <= 0;
  const atEnd = maxOffset === 0 || offset >= maxOffset - 1;

  // التمرير للأمام (1) أو للخلف (-1) بمقدار 80% من عرض الشريط
  function scrollRail(direction) {
    const step = Math.round((viewportRef.current?.clientWidth ?? 320) * 0.8);

    setOffset((current) => {
      const next = current + direction * step;
      return Math.min(Math.max(next, 0), maxOffset);
    });
  }

  // في RTL يتحرك المسار لليمين لإظهار البطاقات التالية
  const shift = isRtlRef.current ? offset : -offset;

  const handleImageError = (event) => {
    event.target.onerror = null;
    event.target.src = "/dawak-logo.jpg";
  };

  // صور البانر الترويجي ( products: 133, 134, 135, 136.jpg )
  const bannerImages = [136, 135, 134, 133];

  return (
    <section className="wl-section" aria-labelledby="weight-loss-title">

      {/* بانر الحملة الترويجي العريض */}
      <div className="wl-banner" aria-label="حملة خسارة الوزن من جريبكسون">
        {/* صور المنتجات على اليسار (RTL end) — مائلة ومتداخلة */}
        <div className="wl-banner-images" aria-hidden="true">
          {bannerImages.map((id) => (
            <img
              key={id}
              src={`/images/clean/${id}.jpg`}
              alt=""
              className="wl-banner-img"
              onError={handleImageError}
            />
          ))}
        </div>

        <div className="wl-banner-copy">
          <span className="wl-banner-icon" aria-hidden="true">
            <Flame size={22} />
          </span>
          <h2 id="weight-loss-title">كل اللي محتاجه لرحلة خسارة الوزن</h2>
          <p>{products.length} منتجات من جريبكسون</p>
        </div>
      </div>

      {/* شريط التحكم: رابط عرض الكل على اليمين + أسهم التمرير */}
      <div className="wl-head">
        <button type="button" className="wl-view-all" onClick={onViewAll}>
          عرض الكل {'>'}
          <ArrowLeft size={15} aria-hidden="true" />
        </button>

        <div className="wl-arrows" role="group" aria-label="التنقل بين منتجات القسم">
          <button
            type="button"
            onClick={() => scrollRail(-1)}
            disabled={atStart}
            aria-label="عرض المنتجات السابقة"
          >
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            onClick={() => scrollRail(1)}
            disabled={atEnd}
            aria-label="عرض المزيد من المنتجات"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* شريط المنتجات الأفقي مع تمرير */}
      <div className="wl-viewport" ref={viewportRef}>
        <div
          className="wl-track"
          ref={trackRef}
          style={{ transform: `translateX(${shift}px)` }}
        >
          {products.map((product) => (
            <div className="wl-item" key={product.id}>
              <article className="wl-card">
                <div className="wl-card-image">
                  <img
                    src={product.image || `/images/clean/${product.id}.jpg`}
                    alt={product.name}
                    className="wl-card-img"
                    onError={handleImageError}
                  />
                </div>
                <div className="wl-card-body">
                  <div className="wl-card-name">{product.name}</div>
                  <div className="wl-card-size">{product.size}</div>
                  <div className="wl-card-price">{money(product.price)}</div>
                </div>
                <button
                  type="button"
                  className="wl-card-add"
                  onClick={() => {
                    if (onAddToCart) onAddToCart(product);
                    else toast(`تم إضافة ${product.name} للعربة`);
                  }}
                  aria-label={`إضافة ${product.name} للعربة`}
                >
                  <Plus size={16} /> إضافة للعربة
                </button>
              </article>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
