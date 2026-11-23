import {
  Facebook,
  Instagram,
  MessageCircle,
  Headset,
  ArrowLeft,
  Send,
} from "lucide-react";
import "./Footer.css";

const quickLinks = [
  { label: "الرئيسية", page: "home" },
  { label: "الأدوية والمنتجات", page: "products" },
  { label: "حجوزاتي", page: "reservations" },
  { label: "استشارة صيدلي", page: "consultation" },
];

const supportLinks = [
  { label: "تواصل معنا", page: "contact" },
  { label: "الأسئلة الشائعة", page: "faq" },
  { label: "سياسة الخصوصية", page: "privacy" },
  { label: "الشروط والأحكام", page: "terms" },
  { label: "سجّل صيدليتك", page: "register-pharmacy" },
  { label: "دخول الصيدليات", page: "pharmacist" },
];

export default function Footer({
  onNavigate,
  onOpenSupportChat,
  onOpenWhatsAppSupport,
  supportWhatsAppNumber = "",
}) {
  const pageUrl = typeof window === "undefined" ? "" : window.location.href;
  const shareText = encodeURIComponent("اكتشف منصة دواك للأدوية والمنتجات الطبية");
  const shareUrl = encodeURIComponent(pageUrl);

  // كل رابط/زر في الفوتر ينقل للصفحة المطلوبة ثم يرجع لأول الصفحة فوراً
  function goTo(page) {
    onNavigate?.(page);
    if (typeof window === "undefined") return;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch {
      window.scrollTo(0, 0);
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function renderPageLink({ label, page }) {
    return (
      <li key={page}>
        <a
          href={`#${page}`}
          onClick={(event) => {
            event.preventDefault();
            goTo(page);
          }}
        >
          {label}
        </a>
      </li>
    );
  }

  return (
    <footer className="dawak-footer" dir="rtl">
      <div className="dawak-footer-main">
        <section className="dawak-footer-brand" aria-label="عن دواك">
          <a
            className="dawak-footer-brand-link"
            href="#home"
            onClick={(event) => {
              event.preventDefault();
              goTo("home");
            }}
          >
            <img src="/dawak-logo.jpg" alt="" />
            <span className="dawak-footer-brand-name">
              <strong>DAWAK</strong>
              <span>دواك</span>
            </span>
          </a>
          <h2>صحتك تهمنا، وراحتك هدفنا</h2>
          <p>
            منصة دواك بتسهّل عليك الوصول للأدوية والمنتجات الطبية وحجز احتياجاتك
            والتواصل مع الصيدلي.
          </p>
        </section>

        <nav className="dawak-footer-column" aria-label="روابط سريعة">
          <h2>روابط سريعة</h2>
          <ul>{quickLinks.map(renderPageLink)}</ul>
        </nav>

        <nav className="dawak-footer-column" aria-label="دعم العملاء">
          <h2>دعم العملاء</h2>
          <ul>
            {supportLinks.map(renderPageLink)}
          </ul>
        </nav>

        <section className="dawak-footer-social" aria-labelledby="dawak-footer-social-title">
          <h2 id="dawak-footer-social-title">تابعنا وشارك دواك</h2>
          <p>يسعدنا أن تكون دواك جزءًا من يومك.</p>
          <div className="dawak-footer-social-links">
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
              target="_blank"
              rel="noreferrer"
              aria-label="مشاركة دواك على فيسبوك"
              title="مشاركة على فيسبوك"
            >
              <Facebook size={19} aria-hidden="true" />
            </a>
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="زيارة إنستغرام"
              title="إنستغرام"
            >
              <Instagram size={19} aria-hidden="true" />
            </a>
            <a
              href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
              target="_blank"
              rel="noreferrer"
              aria-label="مشاركة دواك على واتساب"
              title="مشاركة على واتساب"
            >
              <MessageCircle size={19} aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>

      <div className="dawak-footer-bottom">
        <p>© 2026 DAWAK – جميع الحقوق محفوظة</p>
      </div>

      {/* زر شات الدعم الفني داخل الفوتر (بديل الزر العائم أسفل الشاشة) */}
      <section className="dawak-footer-support" aria-labelledby="dawak-footer-support-title">
        <div className="dawak-footer-support-copy">
          <span className="dawak-footer-support-icon" aria-hidden="true">
            <Headset size={20} />
          </span>
          <div>
            <h2 id="dawak-footer-support-title">محتاج مساعدة في طلبك؟</h2>
            <p>فريق الدعم الفني متاح للرد على استفساراتك عن الطلبات والحجوزات.</p>
          </div>
        </div>
        <div className="dawak-footer-support-actions">
          <button
            type="button"
            className="dawak-footer-support-btn"
            onClick={() => onOpenSupportChat?.()}
          >
            <Send size={17} aria-hidden="true" />
            شات الدعم الفني
            <ArrowLeft size={15} aria-hidden="true" />
          </button>
          {onOpenWhatsAppSupport && (
            <button
              type="button"
              className="dawak-footer-support-btn dawak-footer-support-btn--ghost"
              onClick={() => onOpenWhatsAppSupport?.()}
            >
              <MessageCircle size={17} aria-hidden="true" />
              واتساب{supportWhatsAppNumber ? ` · ${supportWhatsAppNumber}` : ""}
            </button>
          )}
        </div>
      </section>
    </footer>
  );
}