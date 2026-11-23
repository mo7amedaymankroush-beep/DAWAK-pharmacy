import { useMemo, useState } from "react";
import {
  MapPin,
  Hospital,
  BadgeCheck,
  Star,
  Truck,
  ArrowRight,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { pharmacies } from "../data/pharmacies";
import { getRegisteredPharmacies } from "../api/pharmacyRegistry";
import "./PharmaciesPage.css";

export default function PharmaciesPage({ onOpenPharmacy, onSelectPharmacy, onBack, onNavigate }) {
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  // نقبل كل أسماء الـ props المحتملة حتى لا يتعطل أي زر في أي صفحة
  const openPharmacy = onOpenPharmacy || onSelectPharmacy;
  const goHome = onBack || (() => onNavigate?.("home"));

  // الصيدليات التجريبية + الصيدليات المسجّلة عبر نموذج الانضمام (تظهر فورًا)
  const allPharmacies = useMemo(
    () => [...getRegisteredPharmacies(), ...pharmacies],
    [],
  );

  const areas = useMemo(
    () => [...new Set(allPharmacies.map((item) => item.area))],
    [allPharmacies],
  );

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    return allPharmacies.filter((item) => {
      const matchesArea = areaFilter === "all" || item.area === areaFilter;
      const matchesQuery =
        !trimmed ||
        item.name.includes(trimmed) ||
        item.city.includes(trimmed) ||
        item.area.includes(trimmed) ||
        item.address.includes(trimmed);
      return matchesArea && matchesQuery;
    });
  }, [query, areaFilter, allPharmacies]);

  return (
    <main className="pharmacies-page">
      <div className="pharmacies-hero">
        <button type="button" className="pharmacies-back info-back-btn" onClick={goHome}>
          <ArrowRight size={16} />
          العودة للرئيسية
        </button>

        <span className="pharmacies-kicker">
          <Hospital size={15} />
          شبكة دواك
        </span>

        <h1>جميع الصيدليات المسجلة</h1>

        <p>
          تصفح {allPharmacies.length} صيدلية معتمدة في خدمتك، قارن التوفر ووقت
          التوصيل، واطلب دوائك بضغطة زر.
        </p>

        <div className="pharmacies-tools">
          <div className="pharmacies-search">
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم الصيدلية أو المنطقة..."
              aria-label="ابحث في الصيدليات"
            />
          </div>

          <div className="pharmacies-area-filter">
            <SlidersHorizontal size={15} />
            <select
              value={areaFilter}
              onChange={(event) => setAreaFilter(event.target.value)}
              aria-label="فلترة حسب المنطقة"
            >
              <option value="all">كل المناطق</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="pharmacies-grid">
          {filtered.map((pharmacy) => (
            <article className="pharmacy-tile" key={pharmacy.id}>
              <div className="pharmacy-tile-top">
                <span className="pharmacy-tile-logo">
                  <Hospital size={22} />
                </span>

                <span className="pharmacy-tile-verified">
                  <BadgeCheck size={14} />
                  موثّقة
                </span>
              </div>

              <h2>{pharmacy.name}</h2>

              <p className="pharmacy-tile-address">
                <MapPin size={14} />
                {pharmacy.address} · {pharmacy.governorate}
              </p>

              <div className="pharmacy-tile-stats">
                <span className="pharmacy-tile-rating">
                  <Star size={14} />
                  4.{5 + (pharmacy.id % 5)}
                </span>

                <span className="pharmacy-tile-delivery">
                  <Truck size={14} />
                  {pharmacy.delivery?.available
                    ? `توصيل خلال ${pharmacy.delivery.estimatedMinutes || 90} دقيقة`
                    : "استلام من الصيدلية"}
                </span>
              </div>

              <button
                type="button"
                className="pharmacy-tile-button"
                onClick={() => openPharmacy?.(pharmacy.id)}
              >
                تصفح الصيدلية
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="pharmacies-empty">
          <Hospital size={34} />
          <h2>لا توجد نتائج مطابقة</h2>
          <p>جرّب تعديل البحث أو اختيار منطقة أخرى.</p>
        </div>
      )}
    </main>
  );
}
