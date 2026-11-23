import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  Send,
  X,
  Bot,
  UserRound,
  RotateCcw,
  Stethoscope,
  MessageSquareShare,
  Thermometer,
  Brain,
  Pill,
  Sparkles,
} from "lucide-react";
import {
  chatbotQuestions,
  chatbotSymptomGroups,
  chatbotGreeting,
  audienceLabels,
} from "../data/chatbotKnowledge";
import { saveConsultation, formatConsultationMessage } from "../api/consultationsApi";
import { openWhatsAppMessage } from "./WhatsAppSupport";
import "./pharmacy-chatbot.css";

const groupIcons = {
  Thermometer,
  Brain,
  Pill,
  Sparkles,
  MessageCircle,
};

// أنواع رسائل البوت
const BOT = "bot";
const USER = "user";

let messageSeq = 0;
const nextId = () => `m${++messageSeq}`;

/**
 * المساعد الصيدلي الذكي — شات بوت يعمل بالكامل في الواجهة الأمامية.
 * Props:
 *  - phone : رقم العميل (اختياري) لإرفاقه بالاستشارة
 *  - fullPage : يعرض المحادثة داخل الصفحة بدل نافذة عائمة (اختياري)
 *  - open / onOpenChange : فتح/إغلاق الشات من خارج المكوّن (مثل زر الفوتر)
 */
export default function PharmacyChatbot({
  phone = "",
  fullPage = false,
  initialOpen = false,
  open: openProp,
  onOpenChange,
}) {
  const [internalOpen, setInternalOpen] = useState(initialOpen || fullPage);
  const controlled = openProp !== undefined;
  const open = controlled ? Boolean(openProp) : internalOpen;
  const setOpen = (next) => {
    const value = typeof next === "function" ? next(open) : next;
    if (!controlled) setInternalOpen(value);
    onOpenChange?.(value);
  };
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [stage, setStage] = useState("intro"); // intro | questions | summary | sent
  const [activeGroup, setActiveGroup] = useState(null);
  const [answers, setAnswers] = useState({});
  const [draft, setDraft] = useState("");
  const [savedRecord, setSavedRecord] = useState(null);

  const timers = useRef([]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const groupMap = useMemo(
    () => Object.fromEntries(chatbotSymptomGroups.map((group) => [group.id, group])),
    [],
  );

  // تنظيف المؤقتات عند الخروج
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  // عند فتح الشات من زر الفوتر نرجع لأول المحادثة ليجد الترحيب فورًا
  useEffect(() => {
    if (!open) return;
    if (messages.length || stage !== "intro") {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
      setMessages([]);
      setTyping(false);
      setStage("intro");
      setActiveGroup(null);
      setAnswers({});
      setDraft("");
      setSavedRecord(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // التمرير لآخر رسالة
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, typing, open]);

  // رسالة الترحيب عند أول فتح
  useEffect(() => {
    if (!open || messages.length) return;
    pushBot(chatbotGreeting.welcome, 250);
  }, [open, messages.length]);

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timers.current.push(timer);
    return timer;
  }

  function appendMessage(message) {
    setMessages((current) => [...current, { id: nextId(), ...message }]);
  }

  // رسالة بوت بعد مؤشر كتابة
  function pushBot(text, delay = 500, options = {}) {
    setTyping(true);
    schedule(() => {
      setTyping(false);
      appendMessage({ role: BOT, text, ...options });
    }, delay);
  }

  function pushUser(text) {
    appendMessage({ role: USER, text });
  }

  // اختيار نوع الاستفسار
  function chooseGroup(group) {
    setActiveGroup(group.id);
    setAnswers({});
    setSavedRecord(null);

    pushUser(group.label);
    setTyping(true);

    schedule(() => {
      setTyping(false);
      appendMessage({ role: BOT, text: group.intro });
      schedule(() => {
        setTyping(true);
        schedule(() => {
          setTyping(false);
          setStage("questions");
          appendMessage({
            role: BOT,
            text: chatbotQuestions[0].text,
            hint: chatbotQuestions[0].hint,
            questionId: chatbotQuestions[0].id,
          });
          inputRef.current?.focus();
        }, 700);
      }, 400);
    }, 550);
  }

  const currentQuestion = useMemo(() => {
    if (stage !== "questions") return null;
    const answeredCount = Object.keys(answers).length;
    return chatbotQuestions[answeredCount] || null;
  }, [stage, answers]);

  // إرسال إجابة على سؤال
  function submitAnswer(value, optionLabel) {
    const question = currentQuestion;
    if (!question) return;

    const clean = String(value || "").trim();
    if (question.required && !clean) return;

    pushUser(optionLabel || clean);
    setDraft("");

    const nextAnswers = { ...answers, [question.id]: clean };
    setAnswers(nextAnswers);

    const nextIndex = Object.keys(nextAnswers).length;
    const nextQuestion = chatbotQuestions[nextIndex];

    if (nextQuestion) {
      setTyping(true);
      setStage("questions-typing");
      schedule(() => {
        setTyping(false);
        setStage("questions");
        appendMessage({
          role: BOT,
          text: nextQuestion.text,
          hint: nextQuestion.hint,
          questionId: nextQuestion.id,
        });
        inputRef.current?.focus();
      }, 750);
      return;
    }

    // انتهت الأسئلة → عرض النصائح والملخص
    finishConsultation(nextAnswers);
  }

  function finishConsultation(finalAnswers) {
    const group = groupMap[activeGroup];
    setStage("summarizing");
    setTyping(true);

    schedule(() => {
      setTyping(false);
      appendMessage({
        role: BOT,
        text: `شكرًا على التفاصيل. دي نصائح عامة وآمنة تناسب حالة «${group.label}»:`,
        tips: group.tips,
      });

      schedule(() => {
        setTyping(true);
        schedule(() => {
          setTyping(false);
          setStage("summary");
          setAnswers(finalAnswers);
          appendMessage({
            role: BOT,
            text: chatbotGreeting.summaryTitle,
            summary: {
              group,
              answers: finalAnswers,
            },
          });
        }, 900);
      }, 600);
    }, 800);
  }

  // إرسال الاستشارة للصيدلي
  function sendToPharmacist() {
    if (savedRecord) return;

    try {
      const record = saveConsultation({
        symptomGroupId: activeGroup,
        symptomLabel: groupMap[activeGroup]?.label,
        symptoms: answers.symptoms,
        audience: answers.audience,
        history: answers.history,
        phone,
      });

      setSavedRecord(record);
      setStage("sent");
      pushUser("إرسال الاستشارة للصيدلي الآن");
      pushBot(chatbotGreeting.summarySaved, 600, { tone: "success" });
    } catch (error) {
      pushBot(error.message, 400, { tone: "error" });
    }
  }

  // متابعة عبر واتساب
  function continueOnWhatsApp() {
    const group = groupMap[activeGroup];
    const message = formatConsultationMessage(
      {
        symptomLabel: group.label,
        symptoms: answers.symptoms,
        audience: answers.audience,
        history: answers.history,
        phone,
        createdAt: Date.now(),
      },
      audienceLabels[answers.audience],
    );

    pushUser("متابعة عبر واتساب بالملخص");
    openWhatsAppMessage(message);
    pushBot(chatbotGreeting.summaryWhatsApp, 500);
  }

  function resetChat() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setMessages([]);
    setTyping(false);
    setStage("intro");
    setActiveGroup(null);
    setAnswers({});
    setDraft("");
    setSavedRecord(null);
    schedule(() => pushBot(chatbotGreeting.welcome, 200), 60);
  }

  const isFreeText =
    stage === "questions" &&
    (currentQuestion?.inputType === "text" || !currentQuestion?.inputType);

  return (
    <>
      {/* الزر العائم */}
      {!fullPage && (
        <button
          type="button"
          className={`chatbot-launcher${open ? " is-open" : ""}`}
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "إغلاق المساعد الصيدلي" : "افتح المساعد الصيدلي الذكي"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <MessageCircle size={24} />}
          {!open && <span className="chatbot-launcher-dot" aria-hidden="true" />}
        </button>
      )}

      {open && (
        <section
          className={`chatbot-panel${fullPage ? " chatbot-panel--full" : ""}`}
          role="dialog"
          aria-label={chatbotGreeting.title}
          aria-modal={fullPage ? undefined : false}
        >
          <header className="chatbot-header">
            <span className="chatbot-avatar" aria-hidden="true">
              <Bot size={20} />
            </span>
            <div className="chatbot-header-copy">
              <strong>{chatbotGreeting.title}</strong>
              <span>
                <i className="chatbot-online-dot" aria-hidden="true" />
                {chatbotGreeting.subtitle}
              </span>
            </div>
            <button
              type="button"
              className="chatbot-icon-btn"
              onClick={resetChat}
              aria-label={chatbotGreeting.resetLabel}
              title={chatbotGreeting.resetLabel}
            >
              <RotateCcw size={16} />
            </button>
            {!fullPage && (
              <button
                type="button"
                className="chatbot-icon-btn"
                onClick={() => setOpen(false)}
                aria-label="إغلاق المحادثة"
              >
                <X size={17} />
              </button>
            )}
          </header>

          <div className="chatbot-body" ref={scrollRef} aria-live="polite">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                savedRecord={savedRecord}
                onSendToPharmacist={sendToPharmacist}
                onWhatsApp={continueOnWhatsApp}
              />
            ))}

            {/* أزرار نوع الاستفسار تظهر مع رسالة الترحيب */}
            {stage === "intro" && messages.length > 0 && !typing && (
              <div className="chatbot-quick-replies">
                {chatbotSymptomGroups.map((group) => {
                  const Icon = groupIcons[group.icon] || Stethoscope;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      className="chatbot-quick-reply"
                      onClick={() => chooseGroup(group)}
                    >
                      <Icon size={15} />
                      {group.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* خيارات السؤال الثاني (الفئة) */}
            {stage === "questions" && currentQuestion?.inputType === "choice" && (
              <div className="chatbot-quick-replies chatbot-quick-replies--inline">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="chatbot-quick-reply"
                    onClick={() => submitAnswer(option.value, option.label)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {typing && (
              <div className="chatbot-row chatbot-row--bot">
                <span className="chatbot-bubble-avatar" aria-hidden="true">
                  <Bot size={14} />
                </span>
                <div className="chatbot-typing" aria-label="البوت يكتب الآن">
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <footer className="chatbot-footer">
            {isFreeText || stage === "questions" ? (
              <form
                className="chatbot-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitAnswer(draft);
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={currentQuestion?.hint || "اكتب رسالتك..."}
                  aria-label={currentQuestion?.text || "اكتب رسالتك"}
                  disabled={!isFreeText}
                />
                <button
                  type="submit"
                  className="chatbot-send"
                  aria-label="إرسال"
                  disabled={!isFreeText || !draft.trim()}
                >
                  <Send size={16} />
                </button>
              </form>
            ) : (
              <p className="chatbot-disclaimer">{chatbotGreeting.disclaimer}</p>
            )}
          </footer>
        </section>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                              فقاعة رسالة واحدة                              */
/* -------------------------------------------------------------------------- */
function ChatBubble({ message, savedRecord, onSendToPharmacist, onWhatsApp }) {
  const isBot = message.role === BOT;

  return (
    <div className={`chatbot-row chatbot-row--${isBot ? "bot" : "user"}`}>
      <span className="chatbot-bubble-avatar" aria-hidden="true">
        {isBot ? <Bot size={14} /> : <UserRound size={14} />}
      </span>

      <div className={`chatbot-bubble${message.tone ? ` is-${message.tone}` : ""}`}>
        <p>{message.text}</p>

        {message.hint && <span className="chatbot-bubble-hint">{message.hint}</span>}

        {message.tips && (
          <ul className="chatbot-tips">
            {message.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        )}

        {message.summary && (
          <ConsultationSummary
            group={message.summary.group}
            answers={message.summary.answers}
            saved={Boolean(savedRecord)}
            onSendToPharmacist={onSendToPharmacist}
            onWhatsApp={onWhatsApp}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             بطاقة ملخص الاستشارة                            */
/* -------------------------------------------------------------------------- */
function ConsultationSummary({ group, answers, onSendToPharmacist, onWhatsApp, saved }) {
  return (
    <div className="chatbot-summary-card">
      <div className="chatbot-summary-head">
        <Stethoscope size={16} />
        <strong>{chatbotGreeting.summaryTitle}</strong>
      </div>

      <dl className="chatbot-summary-grid">
        <div>
          <dt>نوع الشكوى</dt>
          <dd>{group?.label}</dd>
        </div>
        <div>
          <dt>تفاصيل الأعراض</dt>
          <dd>{answers.symptoms || "غير محدد"}</dd>
        </div>
        <div>
          <dt>الفئة العمرية</dt>
          <dd>{audienceLabels[answers.audience] || answers.audience}</dd>
        </div>
        <div>
          <dt>الحساسية / الأمراض المزمنة</dt>
          <dd>{answers.history || "لا يوجد"}</dd>
        </div>
      </dl>

      {group?.redFlags?.length > 0 && (
        <div className="chatbot-redflags">
          <strong>راجع طبيبًا فورًا لو ظهرت:</strong>
          <ul>
            {group.redFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {group?.followUp && <p className="chatbot-follow-up">{group.followUp}</p>}

      <div className="chatbot-summary-actions">
        <button
          type="button"
          className="chatbot-action-btn chatbot-action-btn--primary"
          onClick={onSendToPharmacist}
          disabled={saved}
        >
          <Stethoscope size={15} />
          {saved ? "تم الإرسال للصيدلي" : "إرسال الاستشارة للصيدلي الآن"}
        </button>

        <button
          type="button"
          className="chatbot-action-btn chatbot-action-btn--whatsapp"
          onClick={onWhatsApp}
        >
          <MessageSquareShare size={15} />
          متابعة عبر واتساب بالملخص
        </button>
      </div>
    </div>
  );
}
