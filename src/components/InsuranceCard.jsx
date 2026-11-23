import { useRef, useState } from "react";
import {
  ShieldCheck,
  CreditCard,
  FileUp,
  FileCheck2,
  Send,
} from "lucide-react";
import "./InsuranceCard.css";

const INSURERS = [
  "AXA - أكسا",
  "MetLife - ميتلايف",
  "Globemed - جلوب ميد",
  "NextCare - نكست كير",
  "نقابة المهندسين",
  "نقابة الأطباء",
  "نقابة المحامين",
  "أخرى",
];

export default function InsuranceCard() {
  const [insurer, setInsurer] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileInput = useRef(null);

  function handleFiles(event) {
    const chosen = Array.from(event.target.files || []);
    if (!chosen.length) return;

    const invalid = chosen.find(
      (file) =>
        !file.type.startsWith("image/") && file.type !== "application/pdf",
    );

    if (invalid) {
      setError("من فضلك اختر صورًا أو ملفات PDF فقط");
      return;
    }

    setError("");
    setFiles((current) => [...current, ...chosen].slice(0, 4));
  }

  function removeFile(index) {
    setFiles((current) => current.filter((_, position) => position !== index));
  }

  function submitRequest() {
    if (!insurer) {
      setError("اختر شركة التأمين أو النقابة أولًا");
      return;
    }
    if (!files.length) {
      setError("ارفع صورة الكارنيه أو الروشتة أولًا");
      return;
    }

    setError("");
    setSubmitted(true);
  }

  function resetForm() {
    setSubmitted(false);
    setInsurer("");
    setFiles([]);
    setError("");
  }

  return (
    <div className="insurance-card" aria-labelledby="insurance-card-title">
      <div className="insurance-head">
        <span className="insurance-icon">
          <ShieldCheck size={22} />
        </span>

        <span className="insurance-badge">
          <CreditCard size={12} />
          تأمين ونقابات
        </span>
      </div>

      <h2 id="insurance-card-title">اطلب بالتأمين الطبي</h2>

      <p className="insurance-sub">
        ارفع صورة كارنيه التأمين والروشتة، وهنوصلك بأقرب صيدلية متعاقدة.
      </p>

      {submitted ? (
        <div className="insurance-success" role="status">
          <FileCheck2 size={26} />

          <strong>
            تم استلام طلب التأمين وجاري التحقق من التغطية مع الصيدلية المتعاقدة
            ✅
          </strong>

          <span>
            {insurer} · {files.length} ملف مرفوع
          </span>

          <button type="button" className="insurance-again" onClick={resetForm}>
            إرسال طلب آخر
          </button>
        </div>
      ) : (
        <div className="insurance-form">
          <label className="insurance-select-label" htmlFor="insurer-select">
            شركة التأمين / النقابة
          </label>

          <select
            id="insurer-select"
            className="insurance-select"
            value={insurer}
            onChange={(event) => {
              setInsurer(event.target.value);
              setError("");
            }}
          >
            <option value="">اختر شركة التأمين أو النقابة</option>
            {INSURERS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <input
            ref={fileInput}
            type="file"
            accept="image/*,application/pdf"
            multiple
            hidden
            onChange={handleFiles}
          />

          <button
            type="button"
            className={`insurance-upload${files.length ? " has-files" : ""}`}
            onClick={() => fileInput.current?.click()}
          >
            <FileUp size={19} />
            <span>
              {files.length
                ? files.map((file) => file.name).join(" · ")
                : "اضغط لرفع صورة الكارنيه + الروشتة"}
            </span>
          </button>

          {files.length > 0 && (
            <div className="insurance-files">
              {files.map((file, index) => (
                <span className="insurance-file" key={`${file.name}-${index}`}>
                  {file.name}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    aria-label={`إزالة ${file.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {error && (
            <span className="insurance-error" role="alert">
              {error}
            </span>
          )}

          <button
            type="button"
            className="insurance-submit"
            onClick={submitRequest}
          >
            إرسال طلب التأمين 🏥
            <Send size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
