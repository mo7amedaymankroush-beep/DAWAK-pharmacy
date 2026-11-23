import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ClipboardList,
  MapPin,
  PackageCheck,
  Pill,
  Store,
} from "lucide-react";
import { getMyBookings } from "../api/bookingsApi";
import { cancelReservation } from "../api/mockApi";
import { formatPhone } from "../api/sessionApi";
import money from "../utils/money";
import {
  ORDER_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  orderStatusTone,
  reservationStatusTone,
} from "../utils/statusLabels";
import "./MyBookings.css";

const formatDateTime = (timestamp) => (timestamp
  ? new Date(timestamp).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })
  : "غير متاح");

// المتبقي من صلاحية الحجز 24 ساعة
function countdownLabel(expiresAt) {
  const remaining = Number(expiresAt) - Date.now();

  if (!Number.isFinite(remaining) || remaining <= 0) return "انتهت المدة";

  const totalMinutes = Math.ceil(remaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 1) return minutes ? `${hours} ساعة و${minutes} دقيقة` : `${hours} ساعة`;
  return `${minutes} دقيقة`;
}

function ReservationFacts({ reservation }) {
  return (
    <dl className="bookings-details">
      <div>
        <dt>المنتج</dt>
        <dd>{reservation.product?.detail
          || [reservation.product?.strength, reservation.product?.form].filter(Boolean).join("، ")
          || "تفاصيل المنتج غير مسجلة"}</dd>
      </div>
      {reservation.product?.activeIngredient && (
        <div><dt>المادة الفعالة</dt><dd>{reservation.product.activeIngredient}</dd></div>
      )}
      <div>
        <dt>نوع الطلب</dt>
        <dd>{reservation.type === "waitlist" ? "انتظار حتى التوفر" : "حجز منتج متاح"}</dd>
      </div>
      <div><dt>الصيدلية</dt><dd>{reservation.pharmacy?.name || "لم يتم اختيار صيدلية"}</dd></div>
      {reservation.pharmacy?.address && (
        <div><dt>العنوان</dt><dd>{reservation.pharmacy.address}</dd></div>
      )}
      <div><dt>تاريخ الحجز</dt><dd>{formatDateTime(reservation.createdAt)}</dd></div>
      <div><dt>ينتهي الحجز</dt><dd>{formatDateTime(reservation.expiresAt)}</dd></div>
    </dl>
  );
}

export default function MyBookings({ phone, onBrowse, onTrackOrder }) {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [cancelBusyId, setCancelBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setRecords(await getMyBookings(phone));
      setError("");
    } catch {
      setRecords({ orders: [], reservations: [] });
      setError("تعذر تحميل السجلات الآن. حاول مرة أخرى.");
    }
  }, [phone]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (["dawak-orders", "dawak-reservations"].includes(event.key)) load();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [load]);

  const orders = records?.orders ?? [];
  const reservations = records?.reservations ?? [];

  // الحجوزات المعلّقة هي اللي محتاجة قرار دلوقتي
  const pendingReservations = useMemo(
    () => reservations
      .filter((reservation) => reservation.status === "pending")
      .sort((first, second) => Number(first.expiresAt) - Number(second.expiresAt)),
    [reservations],
  );

  const historyRows = useMemo(() => {
    const orderRows = orders.map((order) => ({
      id: `order-${order.id}`,
      kind: "order",
      at: Number(order.createdAt) || 0,
      order,
    }));

    // السجل يعرض كل الحجوزات بما فيها المعلّقة (المعلّقة تظهر أيضًا كتذكرة أعلى الصفحة)
    const reservationRows = reservations.map((reservation) => ({
      id: `reservation-${reservation.id}`,
      kind: "reservation",
      at: Number(reservation.updatedAt || reservation.createdAt) || 0,
      reservation,
    }));

    return [...orderRows, ...reservationRows].sort((first, second) => second.at - first.at);
  }, [orders, reservations]);

  const filterOptions = [
    { key: "all", label: "الكل", count: historyRows.length },
    { key: "order", label: "الطلبات", count: orders.length },
    { key: "reservation", label: "الحجوزات", count: reservations.length },
  ];
  const visibleRows = filter === "all"
    ? historyRows
    : historyRows.filter((row) => row.kind === filter);

  async function cancelBooking(reservationId) {
    setCancelBusyId(reservationId);
    setError("");

    try {
      await cancelReservation(reservationId);
      setRecords((current) => current && {
        ...current,
        reservations: current.reservations.map((item) => (item.id === reservationId
          ? { ...item, status: "cancelled", updatedAt: Date.now() }
          : item)),
      });
      setConfirmId(null);
    } catch {
      setError("تعذر إلغاء الحجز. حاول مرة أخرى.");
    } finally {
      setCancelBusyId(null);
    }
  }

  const isEmpty = records && orders.length === 0 && reservations.length === 0;

  return (
    <main className="bookings-page">
      <header className="bookings-head">
        <div className="bookings-head-copy">
          <h1>حجوزاتي</h1>
          <p>
            السجلات المرتبطة بالرقم <b dir="ltr">{formatPhone(phone)}</b>
          </p>
        </div>

        <dl className="bookings-tally">
          <div>
            <dt>طلبات توصيل</dt>
            <dd>{orders.length}</dd>
          </div>
          <div>
            <dt>حجوزات</dt>
            <dd>{reservations.length}</dd>
          </div>
        </dl>
      </header>

      {records === null && <p className="bookings-status" role="status">جارٍ تحميل السجلات...</p>}

      {error && <p className="bookings-error" role="alert">{error}</p>}

      {isEmpty && (
        <section className="bookings-empty">
          <ClipboardList size={26} aria-hidden="true" />
          <h2>مفيش سجلات على الرقم ده</h2>
          <p>الطلبات اللي هتأكدها من العربة والحجوزات اللي هتعملها بالرقم ده هتظهر هنا.</p>
          <button type="button" className="booking-button booking-button--primary" onClick={onBrowse}>
            تصفح المنتجات
          </button>
        </section>
      )}

      {!isEmpty && records && (
        <>
          <section className="bookings-pending" aria-labelledby="bookings-pending-title">
            <div className="bookings-pending-head">
              <h2 id="bookings-pending-title">حجوزات معلّقة</h2>
              <span className="bookings-count">{pendingReservations.length}</span>
            </div>

            {pendingReservations.length === 0 ? (
              <p className="bookings-pending-quiet">مفيش حجز معلّق محتاج قرار منك دلوقتي.</p>
            ) : (
              <ul className="booking-tickets">
                {pendingReservations.map((reservation) => {
                  const ticketId = `reservation-${reservation.id}`;
                  const isOpen = openId === ticketId;
                  const isConfirming = confirmId === reservation.id;

                  return (
                    <li key={reservation.id}>
                      <article className="booking-ticket">
                        <div className="booking-ticket-head">
                          <span className="booking-chip booking-chip--amber">
                            {RESERVATION_STATUS_LABELS[reservation.status] || reservation.status}
                          </span>
                          <span className="booking-ticket-type">
                            {reservation.type === "waitlist" ? "انتظار توفر" : "حجز منتج"}
                          </span>
                        </div>

                        <h3>{reservation.drugName}</h3>

                        <p className="booking-ticket-line">
                          <Store size={14} aria-hidden="true" />
                          {reservation.pharmacy?.name || "من غير صيدلية محددة"}
                        </p>
                        <p className="booking-ticket-line">
                          <CalendarClock size={14} aria-hidden="true" />
                          ينتهي {formatDateTime(reservation.expiresAt)}
                        </p>

                        <div className="booking-ticket-facts">
                          <div>
                            <span>باقي</span>
                            <strong>{countdownLabel(reservation.expiresAt)}</strong>
                          </div>
                          <div>
                            <span>السعر</span>
                            <strong>{money(reservation.price)}</strong>
                          </div>
                          <div>
                            <span>رقم الحجز</span>
                            <strong dir="ltr">#{reservation.id}</strong>
                          </div>
                        </div>

                        <div className="booking-ticket-actions">
                          {isConfirming ? (
                            <>
                              <button
                                type="button"
                                className="booking-button booking-button--danger"
                                onClick={() => cancelBooking(reservation.id)}
                                disabled={cancelBusyId === reservation.id}
                              >
                                {cancelBusyId === reservation.id ? "جارٍ الإلغاء..." : "تأكيد الإلغاء"}
                              </button>
                              <button type="button" className="booking-button" onClick={() => setConfirmId(null)}>
                                تراجع
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="booking-button"
                                aria-expanded={isOpen}
                                onClick={() => setOpenId(isOpen ? null : ticketId)}
                              >
                                {isOpen ? "إخفاء التفاصيل" : "تفاصيل الحجز"}
                                <ChevronDown size={14} className={isOpen ? "is-open" : ""} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="booking-button booking-button--danger"
                                onClick={() => setConfirmId(reservation.id)}
                              >
                                إلغاء الحجز
                              </button>
                            </>
                          )}
                        </div>

                        {isOpen && (
                          <div className="booking-ticket-details">
                            <ReservationFacts reservation={reservation} />
                          </div>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bookings-ledger-section" aria-labelledby="bookings-ledger-title">
            <div className="bookings-ledger-head">
              <h2 id="bookings-ledger-title">سجل الطلبات والحجوزات</h2>

              <div className="bookings-filter" role="group" aria-label="تصفية السجل">
                {filterOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={filter === option.key ? "is-active" : ""}
                    aria-pressed={filter === option.key}
                    onClick={() => setFilter(option.key)}
                  >
                    {option.label}
                    <span>{option.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bookings-ledger-wrap">
              <table className="bookings-ledger">
                <thead>
                  <tr>
                    <th scope="col">النوع</th>
                    <th scope="col">التفاصيل</th>
                    <th scope="col">الصيدلية</th>
                    <th scope="col">التاريخ</th>
                    <th scope="col">القيمة</th>
                    <th scope="col">الحالة</th>
                    <th scope="col"><span className="bookings-sr">فتح التفاصيل</span></th>
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.length === 0 && (
                    <tr>
                      <td className="bookings-none" colSpan={7}>
                        مفيش سجلات في التصفية دي.
                      </td>
                    </tr>
                  )}

                  {visibleRows.map((row) => {
                    const isOpen = openId === row.id;
                    const isOrder = row.kind === "order";
                    const status = isOrder ? row.order.status : row.reservation.status;
                    const tone = isOrder ? orderStatusTone(status) : reservationStatusTone(status);
                    const statusLabel = isOrder
                      ? (ORDER_STATUS_LABELS[status] || status)
                      : (RESERVATION_STATUS_LABELS[status] || status);

                    return (
                      <Fragment key={row.id}>
                        <tr className={isOpen ? "is-open" : ""}>
                          <td data-label="النوع">
                            <span className="bookings-kind">
                              {isOrder ? <PackageCheck size={15} aria-hidden="true" /> : <Pill size={15} aria-hidden="true" />}
                              {isOrder ? "طلب توصيل" : "حجز"}
                            </span>
                          </td>

                          <td data-label="التفاصيل">
                            <span className="bookings-row-title">
                              {isOrder ? `طلب #${row.order.id}` : row.reservation.drugName}
                            </span>
                            <span className="bookings-row-sub">
                              {isOrder
                                ? `${row.order.items.length} ${row.order.items.length === 1 ? "منتج" : "منتجات"}`
                                : (row.reservation.type === "waitlist" ? "انتظار توفر" : "حجز منتج متاح")}
                            </span>
                          </td>

                          <td data-label="الصيدلية">
                            {isOrder ? row.order.pharmacy?.name : (row.reservation.pharmacy?.name || "بدون صيدلية")}
                          </td>

                          <td data-label="التاريخ">
                            {formatDateTime(isOrder ? row.order.createdAt : row.reservation.createdAt)}
                          </td>

                          <td data-label="القيمة" className="bookings-value">
                            {money(isOrder ? row.order.total : row.reservation.price)}
                          </td>

                          <td data-label="الحالة">
                            <span className={`booking-chip booking-chip--${tone}`}>{statusLabel}</span>
                          </td>

                          <td className="bookings-expand-cell">
                            <button
                              type="button"
                              className="bookings-expand"
                              aria-expanded={isOpen}
                              aria-label={isOpen ? "إغلاق التفاصيل" : "فتح التفاصيل"}
                              onClick={() => setOpenId(isOpen ? null : row.id)}
                            >
                              <ChevronDown size={15} className={isOpen ? "is-open" : ""} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr className="bookings-row-details">
                            <td colSpan={7}>
                              <div className="bookings-details-inner">
                                {isOrder ? (
                                  <>
                                    <ul className="bookings-items">
                                      {row.order.items.map((item) => (
                                        <li key={item.productId}>
                                          <span>{item.name} × {item.quantity}</span>
                                          <b>{money(item.lineTotal)}</b>
                                        </li>
                                      ))}
                                    </ul>

                                    <p className="bookings-details-meta">
                                      <MapPin size={14} aria-hidden="true" />
                                      {row.order.deliveryAddress}
                                    </p>

                                    <div className="bookings-details-row">
                                      <span>رسوم التوصيل {money(row.order.deliveryFee)}</span>
                                      <strong>الإجمالي {money(row.order.total)}</strong>
                                    </div>

                                    <button
                                      type="button"
                                      className="booking-button booking-button--primary"
                                      onClick={() => onTrackOrder(row.order.id)}
                                    >
                                      متابعة الطلب
                                    </button>
                                  </>
                                ) : (
                                  <ReservationFacts reservation={row.reservation} />
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
