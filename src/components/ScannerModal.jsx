import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ScanLine,
  ScanBarcode,
  Camera,
  ImageUp,
  Sparkles,
  ShieldCheck,
  Plus,
  CheckCircle2,
  X,
  TriangleAlert,
  RotateCcw,
} from "lucide-react";
import money from "../utils/money";
import "./scanner.css";

/**
 * ScannerModal — «صوّر العلبة / الباركود»
 * يعمل 100% في الواجهة: يرفع المستخدم صورة العلبة، تُعرض معاينة مع
 * حركة مسح ضوئي (1.5 ثانية) ثم تُعرض بطاقة النتيجة.
 * قسم «تجربة سريعة» يعرض 3 أدوية جاهزة بدون رفع أي صورة.
 */

const DEMO_DRUGS = [
  {
    id: "panadol-500",
    name: "بانادول 500 مج",
    price: 35,
    activeIngredient: "باراسيتامول",
    barcode: "6281001001019",
  },
  {
    id: "augmentin-1g",
    name: "أوجمنتين 1 جم",
    price: 165,
    activeIngredient: "أموكسيسيلين + حمض الكلافولانيك",
    barcode: "6281001002023",
  },
  {
    id: "enalapril-10",
    name: "إينالابريل 10 مج",
    price: 45,
    activeIngredient: "إينالابريل ماليات",
    barcode: "6281001003030",
  },
];

// مدة حركة المسح الضوئي
const SCAN_DURATION = 1500;

export default function ScannerModal({ onClose, onAddToCart }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef(null);
  const timerRef = useRef(0);
  const previewRef = useRef("");

  // تنظيف عنوان الصورة والمؤقّت عند الإغلاق
  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  // إغلاق بـ Esc
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const runScan = useCallback((drug) => {
    window.clearTimeout(timerRef.current);
    setError("");
    setResult(null);
    setScanning(true);
    timerRef.current = window.setTimeout(() => {
      setScanning(false);
      setResult(drug);
    }, SCAN_DURATION);
  }, []);

  function clearPreview() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPreviewUrl("");
    setFileName("");
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("من فضلك اختر صورة للعلبة (JPG أو PNG).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("حجم الصورة كبير جدًا — الحد الأقصى 8 ميجابايت.");
      return;
    }

    window.clearTimeout(timerRef.current);
    clearPreview();
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreviewUrl(url);
    setFileName(file.name || "صورة العلبة");
    setResult(null);
    setDragging(false);

    // لا يوجد تحليل حقيقي بدون سيرفر — نطابق الروشتة بالنتيجة الأولى كمحاكاة
    runScan(DEMO_DRUGS[0]);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    handleFile(file);
  }

  function resetAll() {
    window.clearTimeout(timerRef.current);
    clearPreview();
    setScanning(false);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function addToCart() {
    if (!result) return;
    onAddToCart?.({
      id: result.id,
      name: result.name,
      price: result.price,
      activeIngredient: result.activeIngredient,
      detail: result.activeIngredient,
    });
    onClose?.();
  }

  return createPortal(
    <div className="scanner-overlay" onClick={onClose}>
      <div
        className="scanner-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scanner-title"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ===== الرأس ===== */}
        <header className="scanner-head">
          <span className="scanner-head-icon" aria-hidden="true">
            <ScanBarcode size={22} />
          </span>
          <div className="scanner-head-copy">
            <h2 id="scanner-title">صوّر العلبة / الباركود</h2>
            <p>ارفع صورة علبة الدواء وسنعرض لك بياناتها فورًا</p>
          </div>
          <button
            type="button"
            className="scanner-close"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            title="إغلاق"
          >
            <X size={18} />
          </button>
        </header>

        <div className="scanner-body">
          {/* ===== منطقة الرفع / المعاينة ===== */}
          <section className="scanner-upload">
            <input
              ref={inputRef}
              id="scanner-file-input"
              className="scanner-file-input"
              type="file"
              accept="image/*"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />

            <div
              className={`scanner-frame${dragging ? " is-dragging" : ""}${
                previewUrl ? " has-image" : ""
              }${scanning ? " is-scanning" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              {previewUrl ? (
                <>
                  <img
                    className="scanner-preview"
                    src={previewUrl}
                    alt="معاينة صورة العلبة"
                  />
                  <span className="scanner-corners" aria-hidden="true" />
                  {scanning && (
                    <span className="scanner-laser" aria-hidden="true" />
                  )}
                  {scanning && (
                    <span className="scanner-status">
                      <ScanLine size={15} />
                      جاري التعرف على العلبة...
                    </span>
                  )}
                </>
              ) : scanning ? (
                <div className="scanner-demo-scan" role="status">
                  <span className="scanner-demo-scan-icon" aria-hidden="true">
                    <ScanLine size={24} />
                  </span>
                  <strong>جاري التعرف على العلبة...</strong>
                  <span className="scanner-demo-scan-track" aria-hidden="true">
                    <span className="scanner-demo-scan-bar" />
                  </span>
                </div>
              ) : (
                <label htmlFor="scanner-file-input" className="scanner-drop">
                  <span className="scanner-drop-icon" aria-hidden="true">
                    <ImageUp size={26} />
                  </span>
                  <strong>اسحب صورة العلبة هنا أو اضغط للاختيار</strong>
                  <span>JPG أو PNG · حتى 8 ميجابايت</span>
                  <span className="scanner-pick">
                    <Camera size={15} />
                    اختيار صورة
                  </span>
                </label>
              )}
            </div>

            {previewUrl && (
              <div className="scanner-file-row">
                <span className="scanner-file-name" title={fileName}>
                  {fileName}
                </span>
                <button
                  type="button"
                  className="scanner-reset"
                  onClick={resetAll}
                >
                  <RotateCcw size={14} />
                  صورة أخرى
                </button>
              </div>
            )}

            {error && (
              <p className="scanner-error" role="alert">
                <TriangleAlert size={15} />
                {error}
              </p>
            )}
          </section>

          <div className="scanner-divider">
            <span>أو</span>
          </div>

          {/* ===== التجربة السريعة ===== */}
          <section className="scanner-demo">
            <h3 className="scanner-section-title">
              <Sparkles size={16} />
              تجربة سريعة بدون صورة (Demo)
            </h3>
            <div className="scanner-demo-grid">
              {DEMO_DRUGS.map((drug) => (
                <button
                  key={drug.id}
                  type="button"
                  className={`scanner-demo-btn${result?.id === drug.id ? " is-active" : ""}`}
                  onClick={() => {
                    clearPreview();
                    runScan(drug);
                  }}
                >
                  <b>{drug.name}</b>
                  <span>{money(drug.price)}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ===== بطاقة النتيجة ===== */}
          {result && !scanning && (
            <section className="scanner-result" aria-live="polite">
              <div className="scanner-result-head">
                <span className="scanner-result-icon" aria-hidden="true">
                  <CheckCircle2 size={20} />
                </span>
                <div>
                  <small>تم التعرف على الدواء</small>
                  <h3>{result.name}</h3>
                </div>
                <strong className="scanner-result-price">
                  {money(result.price)}
                </strong>
              </div>

              <dl className="scanner-result-facts">
                <div>
                  <dt>المادة الفعالة</dt>
                  <dd>{result.activeIngredient}</dd>
                </div>
                <div>
                  <dt>الباركود</dt>
                  <dd dir="ltr">{result.barcode}</dd>
                </div>
              </dl>

              <button type="button" className="scanner-add" onClick={addToCart}>
                <Plus size={17} />
                إضافة للعربة
              </button>
            </section>
          )}
        </div>

        <footer className="scanner-foot">
          <ShieldCheck size={14} />
          صورتك تُعالج على جهازك فقط ولا تُرسل إلى أي سيرفر.
        </footer>
      </div>
    </div>,
    document.body,
  );
}
