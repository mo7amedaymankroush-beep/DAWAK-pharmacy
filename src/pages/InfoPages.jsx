import { useState } from "react";
import {
  BadgeHelp,
  Clock3,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

const questions = [
  {
    question: "كيف أبحث عن منتج؟",
    answer: "اكتب اسم الدواء أو المنتج في مربع البحث، أو اختر قسمًا من التصنيفات. اضغط على بطاقة المنتج لعرض معلوماته والتوافر.",
  },
  {
    question: "هل يمكنني رفع روشتة؟",
    answer: "يمكنك اختيار صورة للروشتة أو ملف PDF من بطاقة رفع الروشتة في الصفحة الرئيسية. إرسال الملف فعليًا يحتاج ربط الخدمة بالخادم.",
  },
  {
    question: "كيف أتابع حجوزاتي؟",
    answer: "افتح صفحة حجوزاتي من القائمة لمراجعة الطلبات المسجلة على هذا المتصفح.",
  },
  {
    question: "هل المنتجات والأسعار نهائية؟",
    answer: "المنتجات والأسعار المعروضة بيانات تجريبية، والتوافر يحتاج ربطًا بمخزون الصيدليات الفعلي.",
  },
];

function InfoPageLayout({ icon: Icon, eyebrow, title, description, children, centerHeading = false }) {
  return (
    <main className="info-page">
      <header className={`info-page-heading ${centerHeading ? "centered" : ""}`}>
        <span className="info-page-icon"><Icon size={22} /></span>
        <div>
          <span className="section-kicker">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </main>
  );
}

export function ConsultationPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <InfoPageLayout
      icon={Stethoscope}
      eyebrow="رعاية وإرشاد صحي"
      title="استشارة صيدلي"
      description="اكتب سؤالك الصحي ليكون جاهزًا لمراجعته من الصيدلي."
      centerHeading={true}
    >
      <div className="consultation-split-card consultation-centered">
        <aside className="consultation-sidebar">
          <ShieldCheck size={40} />
          <h2>معلومة مهمة</h2>
          <p>الاستشارة هنا لا تستبدل تشخيص الطبيب أو مراجعة الصيدلي المباشرة، ولا تستخدمها في الحالات الطارئة.</p>
        </aside>
        <form className="info-form" onSubmit={handleSubmit}>
          <label>
            الاسم
            <input name="name" autoComplete="name" required placeholder="اسمك" />
          </label>
          <label>
            رقم الهاتف
            <input name="phone" type="tel" autoComplete="tel" required placeholder="رقم للتواصل" />
          </label>
          <label>
            موضوع الاستشارة
            <select name="topic" defaultValue="">
              <option value="" disabled>اختر الموضوع</option>
              <option>طريقة استخدام منتج</option>
              <option>التوافر والبدائل</option>
              <option>سؤال صحي عام</option>
            </select>
          </label>
          <label>
            سؤالك
            <textarea name="question" rows="5" required placeholder="اكتب تفاصيل استفسارك" />
          </label>
          <button className="info-submit" type="submit">
            <Send size={17} /> إرسال الاستفسار
          </button>
          {submitted && (
            <p className="form-feedback" role="status">
              تم تسجيل الاستفسار في هذه المعاينة. الإرسال للصيدلي يحتاج ربط الخدمة بالخادم.
            </p>
          )}
        </form>
      </div>
    </InfoPageLayout>
  );
}

export function FAQPage() {
  return (
    <InfoPageLayout
      icon={BadgeHelp}
      eyebrow="إجابات سريعة"
      title="الأسئلة الشائعة"
      description="معلومات تساعدك على استخدام دواك وطلب المنتجات."
    >
      <div className="faq-list">
        {questions.map(({ question, answer }) => (
          <details className="faq-item" key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </InfoPageLayout>
  );
}

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <InfoPageLayout
      icon={MessageCircle}
      eyebrow="نحن هنا للمساعدة"
      title="اتصل بنا"
      description="أرسل رسالتك أو استفسارك، وسنراجع طريقة التواصل المناسبة بعد ربط الخدمة."
    >
      <div className="contact-layout">
        <form className="info-form" onSubmit={handleSubmit}>
          <label>
            الاسم
            <input name="name" autoComplete="name" required placeholder="اسمك" />
          </label>
          <label>
            البريد الإلكتروني
            <input name="email" type="email" autoComplete="email" required placeholder="name@example.com" />
          </label>
          <label>
            الرسالة
            <textarea name="message" rows="5" required placeholder="كيف يمكننا مساعدتك؟" />
          </label>
          <button className="info-submit" type="submit">
            <Send size={17} /> إرسال الرسالة
          </button>
          {submitted && (
            <p className="form-feedback" role="status">
              تم تسجيل الرسالة في هذه المعاينة. إرسالها فعليًا يحتاج ربط الخدمة بالخادم.
            </p>
          )}
        </form>
        <aside className="contact-details">
          <div><Mail size={18} /><span>نموذج التواصل متاح لإرسال استفسارك</span></div>
          <div><Phone size={18} /><span>بيانات الهاتف ستضاف عند ربط خدمة التواصل</span></div>
          <div><MapPin size={18} /><span>خدمة الصيدليات تعتمد على موقع التوصيل</span></div>
          <div><Clock3 size={18} /><span>أوقات الرد تحدد عند تشغيل الخدمة</span></div>
        </aside>
      </div>
    </InfoPageLayout>
  );
}

export function PrivacyPolicyPage() {
  return (
    <InfoPageLayout
      icon={ShieldCheck}
      eyebrow="بياناتك وخصوصيتك"
      title="سياسة الخصوصية"
      description="توضح هذه السياسة طريقة تعامل النسخة الحالية من دواك مع البيانات أثناء استخدام الموقع."
    >
      <div className="legal-content">
        <section>
          <h2>البيانات التي يتعامل معها الموقع</h2>
          <p>تختلف البيانات بحسب الميزة التي تستخدمها. عند إتمام طلب، قد يرسل الموقع اسمك ورقم هاتفك وعنوان التوصيل والمنتجات والكميات إلى خادم الطلبات.</p>
          <p>تُحفظ محتويات عربة التسوق في التخزين المحلي للمتصفح. الحجوزات في النسخة التجريبية مؤقتة داخل التطبيق وليست سجلًا دائمًا.</p>
        </section>
        <section>
          <h2>النماذج والروشتات</h2>
          <p>نموذجا التواصل والاستشارة يعرضان تأكيدًا تجريبيًا فقط ولا يرسلان البيانات إلى الخادم حاليًا. اختيار ملف الروشتة لا يرفعه أو يرسله من هذه النسخة.</p>
        </section>
        <section>
          <h2>استخدام البيانات وحفظها</h2>
          <p>تُستخدم بيانات الطلب لتسجيل الطلب ومراجعته وتجهيزه. عند تشغيل الخادم وربطه بقاعدة البيانات، تُحفظ بيانات العميل والطلب في قاعدة بيانات MySQL الخاصة بالمشغّل.</p>
          <p>مدة الاحتفاظ بالبيانات وآلية حذفها تعتمد على إعدادات الجهة التي تشغّل الموقع، وهي غير محددة في هذه النسخة التجريبية.</p>
        </section>
        <section>
          <h2>حماية البيانات</h2>
          <p>احرص على استخدام الموقع من جهاز موثوق، ولا تشارك بيانات الدخول أو معلوماتك الصحية عبر قنوات غير معتمدة. على مشغّل الخدمة ضبط الخادم وقاعدة البيانات وصلاحيات الوصول قبل استقبال طلبات حقيقية.</p>
        </section>
        <section>
          <h2>تحديث السياسة</h2>
          <p>قد تتغير هذه السياسة عند إضافة خدمات أو وسائل معالجة جديدة. يجب مراجعة النص وتحديثه بما يناسب طريقة تشغيل الخدمة الفعلية قبل إطلاقها للجمهور.</p>
        </section>
      </div>
    </InfoPageLayout>
  );
}

export function TermsPage() {
  return (
    <InfoPageLayout
      icon={FileText}
      eyebrow="استخدام مسؤول وواضح"
      title="الشروط والأحكام"
      description="تسري الإرشادات التالية على استخدام النسخة الحالية من منصة دواك."
    >
      <div className="legal-content">
        <section>
          <h2>طبيعة الخدمة</h2>
          <p>تساعدك دواك على استعراض منتجات صيدلية وإرسال طلبات أو استفسارات بحسب الخدمات المتاحة. بعض بيانات المنتجات والأسعار والتوافر في النسخة الحالية تجريبية، ولا تمثل تأكيدًا لمخزون أو سعر فعلي.</p>
        </section>
        <section>
          <h2>الطلبات والحجوزات</h2>
          <p>إضافة منتج إلى العربة أو تسجيل حجز تجريبي لا يعني قبول الطلب أو ضمان توافر المنتج. يصبح الطلب قابلًا للمعالجة عند تشغيل الخادم وقاعدة البيانات ومراجعته من الصيدلية.</p>
          <p>تأكد من صحة بيانات التواصل وعنوان التوصيل قبل إرسال أي طلب، وتواصل مع الصيدلية لتأكيد التفاصيل عند توفر قنوات التواصل الفعلية.</p>
        </section>
        <section>
          <h2>المعلومات الصحية</h2>
          <p>المحتوى المعروض والاستشارة عبر الموقع لا يغنيان عن تشخيص الطبيب أو مراجعة الصيدلي. لا تعتمد على الموقع في حالات الطوارئ، ولا تبدأ أو توقف دواءً دون الرجوع إلى مختص صحي.</p>
        </section>
        <section>
          <h2>الاستخدام المقبول</h2>
          <p>استخدم الموقع لتقديم معلومات صحيحة ولأغراض مشروعة فقط. لا تحاول تعطيل الخدمة أو الوصول غير المصرح به إلى بيانات أو وظائف إدارية.</p>
        </section>
        <section>
          <h2>تحديث الشروط</h2>
          <p>قد تُحدّث هذه الشروط عند تغير الخدمات أو طريقة تشغيلها. هذه صياغة أولية للنسخة التجريبية، وينبغي مراجعتها قانونيًا قبل اعتمادها كوثيقة نهائية.</p>
        </section>
      </div>
    </InfoPageLayout>
  );
}
