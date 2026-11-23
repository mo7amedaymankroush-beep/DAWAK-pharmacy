import React from 'react';
import { MessageCircle } from "lucide-react";

/**
 * Handles opening WhatsApp support with the order details.
 * Requires `order` object to be in scope with {id, pharmacy?: {name}} properties.
 */
// رقم واتساب الصيدلية أو الدعم الفني بصيغة دولية (مصر: 20...)
// رقم الصيدلية: 201069147470 (تنسيق دول بدون علامة +)
export const supportWhatsAppNumber = "201069147470";

/** يفتح واتساب برسالة جاهزة — يُستخدم من الشات بوت وبطاقات الطلبات. */
export function openWhatsAppMessage(message) {
  const whatsappUrl = `https://wa.me/${supportWhatsAppNumber}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  return whatsappUrl;
}

export function handleWhatsAppSupport(order) {
  // نص الرسالة التلقائية مع مطابقة أسماء المتغيرات لكود الطلب والصيدلية
  // استخدم order.pharmacy?.name لتتوافق مع تنسيق الكود الحالي
  const message = `مرحباً فريق دواك، أحتاج للمساعدة بخصوص طلبي رقم #${order.id} (الصيدلية المنفذة: ${order.pharmacy?.name || 'غير محدد'})`;

  // التنسيق الصحيح: https://wa.me/PhoneNumber?text=Message
  openWhatsAppMessage(message);
}

/**
 * مكون زر دعم واتساب العائم (Floating WhatsApp Support Button)
 */
export default function WhatsAppSupport({ phoneNumber = supportWhatsAppNumber, message = "مرحباً، أود الاستفسار عن خدمة في دواك" }) {
  const handleSupportClick = () => {
    openWhatsAppMessage(message);
  };

  return (
    <button
      onClick={handleSupportClick}
      aria-label="تواصل مع الدعم عبر واتساب"
      title="تواصل معنا عبر واتساب"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: 999,
        backgroundColor: '#25D366',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: '50px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        direction: 'rtl'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }}
    >
      <MessageCircle size={22} color="#FFF" />
      <span>الدعم الفني</span>
    </button>
  );
}
