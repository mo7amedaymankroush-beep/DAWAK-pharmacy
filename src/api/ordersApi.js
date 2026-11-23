import { drugs } from "../data/drugs";
import { pharmacies } from "../data/pharmacies";
import { consumePharmacyInventory, getCheckoutPharmacies, restorePharmacyInventory } from "./pharmaciesApi";
import { getDemoOrders } from "./mockApi";

const ORDER_STORAGE_KEY = "dawak-orders";
const DEMO_DISCOUNT_PERCENT = 0;
const pendingSubmissions = new Set();
const deliveryStages = ["pending", "pharmacy_accepted", "preparing", "ready_for_pickup", "picked_up", "out_for_delivery", "delivered"];

const readOrders = () => {
  try {
    const orders = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || "[]");
    return Array.isArray(orders) ? orders.map((order) => {
      const { deliveryProvider, ...unifiedOrder } = order;
      return {
        ...unifiedOrder,
        deliveryFee: Number(order.deliveryFee ?? order.deliveryService?.fee ?? 30),
        deliveryService: {
          name: "التوصيل الموحد",
          fee: Number(order.deliveryFee ?? order.deliveryService?.fee ?? 30),
          estimatedMinutes: Number(order.deliveryService?.estimatedMinutes ?? 90),
          demo: true,
        },
        status: order.status === "confirmed" ? "pharmacy_accepted" : order.status,
      };
    }) : [];
  } catch {
    return [];
  }
};

const writeOrders = (orders) => {
  try {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
  } catch {
    throw new Error("تعذر حفظ الطلب في هذا المتصفح.");
  }
};

export async function getCheckoutConfig() {
  return { deliveryFee: 30, discountPercent: DEMO_DISCOUNT_PERCENT, demo: true };
}

export async function getCheckoutPharmacyOptions(items, area = "") {
  return getCheckoutPharmacies(items, area);
}

async function createOrder(orderRequest) {
  const { customer, items: requestedItems, pharmacyId, orderSource = "cart" } = orderRequest || {};
  if (!customer?.name?.trim() || !customer?.phone?.trim() || !customer?.address?.trim()) {
    throw new Error("أدخل الاسم ورقم الهاتف وعنوان التوصيل كاملًا.");
  }
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new Error("لا توجد منتجات في الطلب.");
  }

  const quantities = new Map();
  for (const requested of requestedItems) {
    const productId = Number(requested.productId ?? requested.id);
    const quantity = Number(requested.quantity);
    if (!drugs.some((product) => product.id === productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error("توجد بيانات منتج أو كمية غير صالحة.");
    }
    const combined = (quantities.get(productId) || 0) + quantity;
    if (combined > 99) throw new Error("الحد الأقصى لكل منتج هو 99 قطعة.");
    quantities.set(productId, combined);
  }

  const requested = [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
  const candidates = await getCheckoutPharmacyOptions(requested);
  const pharmacy = candidates.find((candidate) => candidate.id === Number(pharmacyId));
  if (!pharmacy) throw new Error("الصيدلية المختارة غير موجودة أو لا تقدم خدمة توصيل.");

  const unavailable = pharmacy.items.filter((item) => !item.isAvailable);
  if (unavailable.length) {
    throw new Error(`المخزون غير كافٍ لدى ${pharmacy.name}: ${unavailable.map((item) => `${item.name} (المتاح ${item.availableQuantity})`).join("، ")}`);
  }

  const delivery = pharmacy.delivery;
  if (!delivery?.available) throw new Error("خدمة التوصيل غير متاحة لدى هذه الصيدلية.");

  const inventoryResult = await consumePharmacyInventory(pharmacy.id, requested);
  if (!inventoryResult.ok) {
    throw new Error(`تغير المخزون قبل التأكيد: ${inventoryResult.unavailable.map((item) => `${item.name} (المتاح ${item.availableQuantity})`).join("، ")}`);
  }

  const items = pharmacy.items.map(({ productId, name, quantity, unitPrice, lineTotal }) => ({
    productId,
    name,
    quantity,
    unitPrice,
    lineTotal,
  }));
  const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const discount = Number((subtotal * DEMO_DISCOUNT_PERCENT / 100).toFixed(2));
  const deliveryFee = Number(delivery.fee);
  const total = Number((subtotal + deliveryFee - discount).toFixed(2));
  const existingOrders = readOrders();
  const id = existingOrders.reduce((maxId, entry) => Math.max(maxId, Number(entry.id) || 0), 0) + 1;
  const createdAt = Date.now();
  const order = {
    id,
    orderId: id,
    customer: {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      address: customer.address.trim(),
    },
    pharmacyId: pharmacy.id,
    pharmacy: { id: pharmacy.id, name: pharmacy.name, address: pharmacy.address },
    items,
    orderSource: ["cart", "quick_order", "pharmacy_direct"].includes(orderSource) ? orderSource : "cart",
    deliveryAddress: customer.address.trim(),
    deliveryService: {
      name: "التوصيل الموحد",
      fee: deliveryFee,
      estimatedMinutes: delivery.estimatedMinutes,
      demo: true,
    },
    deliveryFee,
    subtotal,
    discount,
    total,
    status: "pending",
    statusHistory: [{ status: "pending", at: createdAt }],
    deliveryStages,
    inventoryDeducted: true,
    createdAt,
    estimatedDeliveryTime: new Date(createdAt + delivery.estimatedMinutes * 60 * 1000).toISOString(),
    demo: true,
  };

  writeOrders([order, ...existingOrders]);
  return { order };
}

export async function submitOrder(orderRequest) {
  const signature = JSON.stringify({
    customer: orderRequest?.customer,
    items: orderRequest?.items,
    pharmacyId: orderRequest?.pharmacyId,
    orderSource: orderRequest?.orderSource,
  });
  if (pendingSubmissions.has(signature)) throw new Error("الطلب قيد الإرسال بالفعل.");
  pendingSubmissions.add(signature);
  try {
    return await createOrder(orderRequest);
  } finally {
    pendingSubmissions.delete(signature);
  }
}

export async function getCustomerOrders() {
  return readOrders();
}

// حفظ حالة الطلبات التجريبية بعد تعديل الصيدلي عليها
const readDemoState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("dawak-demo-order-state") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

export async function getOrders(adminToken) {
  if (!adminToken) throw new Error("رمز لوحة الصيدلية مطلوب.");
  const realOrders = readOrders();
  // طلبات تجريبية تظهر دائمًا حتى لا تبدأ اللوحة فارغة
  const demos = getDemoOrders().map((demo) => {
    const saved = readDemoState().find((entry) => entry.id === demo.id);
    return saved ? { ...demo, status: saved.status, statusHistory: saved.statusHistory || demo.statusHistory } : demo;
  });
  return { orders: [...realOrders, ...demos] };
}

const writeDemoState = (id, status, statusHistory) => {
  try {
    const current = readDemoState();
    const next = current.some((entry) => entry.id === id)
      ? current.map((entry) => entry.id === id ? { id, status, statusHistory } : entry)
      : [...current, { id, status, statusHistory }];
    localStorage.setItem("dawak-demo-order-state", JSON.stringify(next));
  } catch {
    /* التخزين غير متاح */
  }
};

export async function updateOrderStatus(orderId, status, adminToken) {
  if (!adminToken) throw new Error("رمز لوحة الصيدلية مطلوب.");
  const allowedStatuses = [...deliveryStages, "cancelled", "unavailable", "rejected"];
  if (!allowedStatuses.includes(status)) throw new Error("حالة الطلب غير صالحة.");

  // طلب تجريبي: تُحفظ حالته في مفتاح منفصل بدل ملف الطلبات الحقيقي
  if (String(orderId).startsWith("demo-")) {
    const demo = readDemoState().find((entry) => entry.id === orderId);
    const history = [...(demo?.statusHistory || []), { status, at: Date.now() }];
    writeDemoState(orderId, status, history);
    return { id: orderId, status, statusHistory: history };
  }

  const orders = readOrders();
  const timestamp = Date.now();
  const currentOrder = orders.find((order) => order.id === Number(orderId));
  if (!currentOrder) throw new Error("الطلب غير موجود.");
  const terminalStatuses = ["delivered", "cancelled", "unavailable", "rejected"];
  if (terminalStatuses.includes(currentOrder.status) && status !== currentOrder.status) {
    throw new Error("لا يمكن تغيير حالة طلب منتهٍ.");
  }
  const shouldRestoreInventory = ["cancelled", "unavailable", "rejected"].includes(status)
    && currentOrder.inventoryDeducted
    && !currentOrder.inventoryRestoredAt;
  if (shouldRestoreInventory) {
    await restorePharmacyInventory(currentOrder.pharmacyId, currentOrder.items);
  }
  const updated = orders.map((order) => order.id === Number(orderId)
    ? {
      ...order,
      status,
      updatedAt: timestamp,
      inventoryRestoredAt: shouldRestoreInventory ? timestamp : order.inventoryRestoredAt,
      statusHistory: [...(order.statusHistory || [{ status: order.status, at: order.createdAt }]), { status, at: timestamp }],
    }
    : order);
  writeOrders(updated);
  return updated.find((order) => order.id === Number(orderId));
}