import { drugs } from "../data/drugs";
import { pharmacies } from "../data/pharmacies";
import { pharmacyInventory } from "../data/pharmacyInventory";

const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));
const INVENTORY_STORAGE_KEY = "dawak-pharmacy-inventory";

function readInventory() {
  try {
    const saved = JSON.parse(localStorage.getItem(INVENTORY_STORAGE_KEY) || "null");
    const savedById = new Map((Array.isArray(saved) ? saved : []).map((item) => [item.id, item]));
    return pharmacyInventory.map((item) => ({
      ...item,
      quantity: savedById.has(item.id) ? savedById.get(item.id).quantity : item.quantity,
      updatedAt: savedById.get(item.id)?.updatedAt || item.updatedAt,
    }));
  } catch {
    return pharmacyInventory.map((item) => ({ ...item }));
  }
}

function writeInventory(items) {
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items.map(({ id, quantity, updatedAt }) => ({ id, quantity, updatedAt }))));
  } catch {
    throw new Error("تعذر تحديث المخزون المحلي في هذا المتصفح.");
  }
}

// معرفات المنتجات التي يوجد منها مخزون متاح في أي صيدلية مسجلة
export function getAvailableProductIds() {
  return new Set(
    readInventory()
      .filter((item) => item.quantity > 0)
      .map((item) => item.productId),
  );
}

function openingStatus(openingHours) {
  if (!openingHours) return "unknown";

  const today = openingHours[new Date().getDay()];
  if (!today?.open || !today?.close) return "unknown";

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMinute] = today.open.split(":").map(Number);
  const [closeHour, closeMinute] = today.close.split(":").map(Number);
  const opensAt = openHour * 60 + openMinute;
  const closesAt = closeHour * 60 + closeMinute;

  return currentMinutes >= opensAt && currentMinutes < closesAt ? "open" : "closed";
}

function inventoryFor(pharmacyId, query = "") {
  const normalizedQuery = query.trim().toLocaleLowerCase("ar");

  return readInventory()
    .filter((item) => item.pharmacyId === pharmacyId)
    .map((item) => {
      const product = drugs.find((entry) => entry.id === item.productId);
      return product ? {
        ...product,
        inventoryId: item.id,
        pharmacyId,
        price: item.price,
        quantity: item.quantity,
        isAvailable: item.quantity > 0,
      } : null;
    })
    .filter(Boolean)
    .filter((item) => !normalizedQuery ||
      `${item.name} ${item.activeIngredient} ${item.category}`.toLocaleLowerCase("ar").includes(normalizedQuery));
}

function withProductCount(pharmacy) {
  return {
    ...pharmacy,
    openingStatus: openingStatus(pharmacy.openingHours),
    availableProductCount: pharmacyInventory.filter(
      (item) => item.pharmacyId === pharmacy.id && readInventory().find((stockItem) => stockItem.id === item.id)?.quantity > 0,
    ).length,
  };
}

export async function getPharmacies(location = {}) {
  await delay();
  return pharmacies
    .filter((pharmacy) => pharmacy.isActive)
    .filter((pharmacy) => !location.governorate || pharmacy.governorate === location.governorate)
    .filter((pharmacy) => !location.city || pharmacy.city === location.city)
    .filter((pharmacy) => !location.area || pharmacy.area === location.area)
    .map(withProductCount);
}

export async function getPharmacyDetails(pharmacyId, query = "") {
  await delay();
  const pharmacy = pharmacies.find((entry) => entry.id === Number(pharmacyId) && entry.isActive);
  if (!pharmacy) throw new Error("الصيدلية غير موجودة");

  return {
    pharmacy: withProductCount(pharmacy),
    products: inventoryFor(pharmacy.id, query),
  };
}

export async function getPharmaciesForProduct(productId, location = {}, { includeUnavailable = false } = {}) {
  await delay();
  const product = drugs.find((entry) => entry.id === Number(productId));
  if (!product) throw new Error("المنتج غير موجود");

  const inventory = readInventory();
  return inventory
    .filter((item) => item.productId === product.id)
    .map((item) => {
      const pharmacy = pharmacies.find((entry) => entry.id === item.pharmacyId && entry.isActive);
      return pharmacy ? {
        ...withProductCount(pharmacy),
        productId: product.id,
        productName: product.name,
        productBasePrice: product.price,
        price: item.price,
        quantity: item.quantity,
        isAvailable: item.quantity > 0,
        inventoryUpdatedAt: item.updatedAt || null,
      } : null;
    })
    .filter(Boolean)
    .filter((pharmacy) => includeUnavailable || pharmacy.isAvailable)
    .filter((pharmacy) => !location.governorate || pharmacy.governorate === location.governorate)
    .filter((pharmacy) => !location.city || pharmacy.city === location.city)
    .filter((pharmacy) => !location.area || pharmacy.area === location.area);
}

// المنتجات ذات inStock: true متوفرة دائماً بكمية كافية في أي صيدلية نشطة
const ALWAYS_IN_STOCK_QUANTITY = 9999;

function findStockEntry(inventory, pharmacyId, productId) {
  const product = drugs.find((entry) => entry.id === productId);
  const stock = inventory.find((entry) => entry.pharmacyId === pharmacyId && entry.productId === productId) || null;
  if (product?.inStock) {
    // منتج inStock: متوفر دائماً بكمية كافية حتى لو لم يكن له سجل مخزون
    return {
      stock: stock || { pharmacyId, productId, price: product.price, quantity: ALWAYS_IN_STOCK_QUANTITY },
      product,
      effectiveQuantity: ALWAYS_IN_STOCK_QUANTITY,
    };
  }
  return { stock, product, effectiveQuantity: stock?.quantity || 0 };
}

export async function getCheckoutPharmacies(items, location = {}) {
  await delay(120);
  const requested = items.map((item) => ({ 
    productId: Number(item.productId ?? item.id),
    quantity: Number(item.quantity),
  }));
  const inventory = readInventory();

  return pharmacies
    .filter((pharmacy) => pharmacy.isActive)
    .filter((pharmacy) => location.mode !== "manual" || !location.governorate || pharmacy.governorate === location.governorate)
    .filter((pharmacy) => location.mode !== "manual" || !location.city || pharmacy.city === location.city)
    .filter((pharmacy) => location.mode !== "manual" || !location.area || pharmacy.area === location.area)
    .map((pharmacy) => {
      const pharmacyItems = requested.map((requestedItem) => {
        const { stock, product } = findStockEntry(inventory, pharmacy.id, requestedItem.productId);
        if (!product) {
          return {
            productId: requestedItem.productId,
            name: "منتج غير معروف",
            quantity: requestedItem.quantity,
            availableQuantity: 0,
            unitPrice: 0,
            lineTotal: 0,
            isAvailable: false,
          };
        }
        const unitPrice = stock?.price ?? product.price;
        const availableQuantity = product.inStock ? ALWAYS_IN_STOCK_QUANTITY : (stock?.quantity || 0);
        return {
          productId: product.id,
          name: product.name,
          quantity: requestedItem.quantity,
          availableQuantity,
          unitPrice,
          lineTotal: Number((unitPrice * requestedItem.quantity).toFixed(2)),
          isAvailable: product.inStock || availableQuantity >= requestedItem.quantity,
        };
      });
      const subtotal = pharmacyItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const delivery = pharmacy.delivery?.available ? { ...pharmacy.delivery } : null;

      return {
        ...withProductCount(pharmacy),
        distanceMeters: location.mode === "gps" && Number.isFinite(pharmacy.latitude) && Number.isFinite(pharmacy.longitude)
          ? distanceBetween(location.latitude, location.longitude, pharmacy.latitude, pharmacy.longitude)
          : null,
        items: pharmacyItems,
        canFulfill: pharmacyItems.every((item) => item.isAvailable),
        subtotal: Number(subtotal.toFixed(2)),
        delivery,
        preparationMinutes: 30,
      };
    })
    .filter((pharmacy) => pharmacy.delivery);
}

export async function consumePharmacyInventory(pharmacyId, items) {
  const inventory = readInventory();
  const requested = items.map((item) => ({
    productId: Number(item.productId),
    quantity: Number(item.quantity),
  }));
  const updates = requested.map((requestedItem) => {
    const { stock, product } = findStockEntry(inventory, Number(pharmacyId), requestedItem.productId);
    return {
      productId: requestedItem.productId,
      name: product?.name || "منتج غير معروف",
      requestedQuantity: requestedItem.quantity,
      availableQuantity: product?.inStock ? ALWAYS_IN_STOCK_QUANTITY : (stock?.quantity || 0),
      inStock: Boolean(product?.inStock),
      stock,
      product,
    };
  });
  const unavailable = updates.filter((item) => !item.inStock && (!item.stock || !Number.isInteger(item.requestedQuantity) || item.requestedQuantity < 1 || item.stock.quantity < item.requestedQuantity));
  if (unavailable.length) {
    return { ok: false, unavailable: unavailable.map(({ productId, name, requestedQuantity, availableQuantity }) => ({ productId, name, requestedQuantity, availableQuantity })) };
  }

  const updatedAt = new Date().toISOString();
  updates.forEach((item) => {
    // منتجات inStock لا يُخصم منها مخزون فعلي
    if (item.inStock) return;
    item.stock.quantity -= item.requestedQuantity;
    item.stock.updatedAt = updatedAt;
  });
  writeInventory(inventory);
  return { ok: true, inventory };
}

export async function restorePharmacyInventory(pharmacyId, items) {
  const inventory = readInventory();
  const updatedAt = new Date().toISOString();
  for (const item of items) {
    const stock = inventory.find((entry) => entry.pharmacyId === Number(pharmacyId) && entry.productId === Number(item.productId));
    if (stock) {
      stock.quantity += Number(item.quantity);
      stock.updatedAt = updatedAt;
    }
  }
  writeInventory(inventory);
}

function distanceBetween(latitudeA, longitudeA, latitudeB, longitudeB) {
  const earthRadiusMeters = 6371000;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const arc = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB))
    * Math.sin(deltaLongitude / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}