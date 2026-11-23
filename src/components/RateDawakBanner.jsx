import { useMemo, useState } from "react";
import {
  Star,
  Quote,
  UserRound,
  CalendarDays,
  Sparkles,
  X,
  PenLine,
} from "lucide-react";
import "./RateDawakBanner.css";

const STORAGE_KEY = "dawak-ratings";

const STAR_DESCRIPTIONS = {
  1: "سيئة جدًا 😞",
  2: "غير مُرضية 😕",
  3: "مقبولة 😐",
  4: "جيدة 🙂",
  5: "جيدة جدًا 😃",
  6: "ممتازة 🤩",
  7: "استثنائية! 🏆",
};

const FORMAT_LABELS = {
  1: { value: "سيئة", tone: "bad" },
  2: { value: "ضعيفة", tone: "bad" },
  3: { value: "مقبولة", tone: "mid" },
  4: { value: "جيدة", tone: "mid" },
  5: { value: "قوية", tone: "good" },
  6: { value: "ممتازة", tone: "good" },
  7: { value: "استثنائية", tone: "good" },
};

function loadRatings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(isoDate) {
  try {
    return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(
      new Date(isoDate),
    );
  } catch {
    return "";
  }
}

function StarRow({
  count = 7,
  filled,
  onHover,
  onSelect,
  interactive = false,
  hovered = 0,
  size = 26,
}) {
  return (
    <div
      className={interactive ? "rate-stars rate-stars--input" : "rate-stars"}
      role={interactive ? "radiogroup" : undefined}
      aria-label={interactive ? "اختر تقييمك من 1 إلى 7 نجوم" : undefined}
    >
      {Array.from({ length: count }, (_, index) => {
        const value = index + 1;
        const active = interactive
          ? (hovered || filled) >= value
          : filled >= value;
        return (
          <button
            key={value}
            type="button"
            className={`rate-star${active ? " is-active" : ""}${interactive ? "" : " rate-star--static"}`}
            {...(interactive
              ? {
                  onMouseEnter: () => onHover?.(value),
                  onMouseLeave: () => onHover?.(0),
                  onClick: () => onSelect?.(value),
                  role: "radio",
                  "aria-checked": filled === value,
                  "aria-label": `${value} من 7 — ${STAR_DESCRIPTIONS[value]}`,
                }
              : { tabIndex: -1, "aria-hidden": "true" })}
          >
            <Star size={size} />
          </button>
        );
      })}
    </div>
  );
}

export default function RateDawakBanner({ customerName }) {
  const [ratings, setRatings] = useState(loadRatings);
  const [formOpen, setFormOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);

  const displayName = name.trim() || customerName || "عميل دواك";

  const average = useMemo(() => {
    if (!ratings.length) return 0;
    return (
      ratings.reduce((sum, item) => sum + item.stars, 0) / ratings.length
    ).toFixed(1);
  }, [ratings]);

  const latest = useMemo(
    () => [...ratings].sort((a, b) => b.date - a.date).slice(0, 3),
    [ratings],
  );

  function submitRating() {
    if (!stars) return;

    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      stars,
      comment: comment.trim(),
      name: displayName,
      date: Date.now(),
    };

    const nextRatings = [...ratings, entry];
    setRatings(nextRatings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRatings));
    } catch {
      /* التخزين غير متاح */
    }

    setJustSubmitted(true);
    setFormOpen(false);
    setStars(0);
    setHoveredStar(0);
    setComment("");
    setName("");
  }

  function closeForm() {
    setFormOpen(false);
    setStars(0);
    setHoveredStar(0);
    setComment("");
  }

  const format = FORMAT_LABELS[hoveredStar || stars];

  return (
    <section
      className={`rate-banner${formOpen ? " rate-banner--open" : ""}`}
      aria-labelledby="rate-banner-title"
    >
      <div className="rate-banner-head">
        <div className="rate-banner-copy">
          <span className="rate-banner-kicker">
            <Sparkles size={14} />
            تقييم العملاء
          </span>

          <h2 id="rate-banner-title">رأيك يهمنا.. قيّم تجربتك مع دواك ⭐</h2>

          <p>شاركنا تقييمك وساعدنا نطور خدماتنا عشان نوصلك أسرع وأفضل</p>

          {justSubmitted && (
            <div className="rate-thanks" role="status">
              <Star size={16} />
              شكرًا لك! تم حفظ تقييمك وسنستخدمه لتطوير خدمتنا 💚
            </div>
          )}

          <button
            type="button"
            className="rate-open-button"
            onClick={() => {
              setJustSubmitted(false);
              setFormOpen(true);
            }}
          >
            <PenLine size={16} />
            قيّم دواك الآن
          </button>
        </div>

        <div className="rate-banner-score" aria-hidden="true">
          <span className="rate-score-number">{average || "—"}</span>
          <span className="rate-score-of">من 7</span>
          <StarRow filled={Math.round(Number(average))} size={20} />
          <span className="rate-score-count">{ratings.length} تقييم</span>
        </div>
      </div>

      {/* نموذج التقييم — يتوسع بسلاسة داخل نفس الكارت */}
      <div className={`rate-form-wrap${formOpen ? " is-open" : ""}`}>
        <div className="rate-form" role="form" aria-label="نموذج تقييم دواك">
          <button
            type="button"
            className="rate-form-close"
            onClick={closeForm}
            aria-label="إغلاق نموذج التقييم"
          >
            <X size={15} />
          </button>

          <span className="rate-form-title">كم قيمتك لتجربتك؟</span>

          <div className="rate-stars-block">
            <StarRow
              count={7}
              filled={stars}
              hovered={hoveredStar}
              onHover={setHoveredStar}
              onSelect={setStars}
              interactive
            />

            <span
              className={`rate-format${format ? ` is-${format.tone}` : ""}`}
              aria-live="polite"
            >
              {hoveredStar || stars
                ? (hoveredStar || stars) +
                  " — " +
                  STAR_DESCRIPTIONS[hoveredStar || stars]
                : "مرّر على النجوم للتقييم"}
            </span>
          </div>

          <textarea
            className="rate-comment"
            rows={3}
            maxLength={300}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="اكتب تعليقك أو اقتراحك هنا (اختياري)..."
            aria-label="تعليق اختياري"
          />

          <div className="rate-form-foot">
            <label className="rate-name-field">
              <UserRound size={15} />
              <input
                type="text"
                maxLength={40}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={displayName}
                aria-label="اسمك (اختياري)"
              />
            </label>

            <div className="rate-form-actions">
              <button type="button" className="rate-cancel" onClick={closeForm}>
                إلغاء
              </button>

              <button
                type="button"
                className="rate-submit"
                onClick={submitRating}
                disabled={!stars}
              >
                <Star size={15} />
                إرسال التقييم
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* آراء العملاء */}
      {ratings.length > 0 && (
        <div className="rate-reviews">
          <div className="rate-reviews-head">
            <Quote size={15} />
            آراء عملائنا
          </div>

          <div className="rate-reviews-list">
            {latest.map((item) => (
              <article className="rate-review" key={item.id}>
                <div className="rate-review-top">
                  <span className="rate-review-name">
                    <UserRound size={13} />
                    {item.name}
                  </span>

                  <span className="rate-review-date">
                    <CalendarDays size={12} />
                    {formatDate(item.date)}
                  </span>
                </div>

                <StarRow filled={item.stars} size={14} />

                {item.comment && (
                  <p className="rate-review-text">{item.comment}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
