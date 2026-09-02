const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// This runs as its own standalone process at each restaurant's physical location (next
// to its printer), not as part of the main backend/server.js deploy - so it needs its own
// local config file rather than sharing backend/.env (which holds unrelated DB/JWT/payment
// secrets that a kitchen PC has no business having). Copy printer.env.example -> printer.env
// on that machine and fill in the values for that specific restaurant/printer.
require("dotenv").config({ path: path.join(__dirname, "printer.env") });

const { Printer, Image } = require("@node-escpos/core");
const UsbAdapterPkg = require("@node-escpos/usb-adapter");
const USB = UsbAdapterPkg.default || UsbAdapterPkg;
const NetworkAdapterPkg = require("@node-escpos/network-adapter");
const Network = NetworkAdapterPkg.default || NetworkAdapterPkg;
const sharp = require("sharp");
const QRCode = require("qrcode");

const app = express();
app.use(cors());
app.use(express.json());

const RECEIPT_WIDTH = 576; // 80mm printers (SVG canvas)
const PRINTER_DOTS = 512; // try 512 first; if clipped, try 576
const USE_ENGLISH = false;
const MARGIN = 30;
const LEFT_TEXT_OFFSET = 80; // push LTR text further right
const SIZE_SCALE = 1.8; // increase text sizes globally
const FONT_PATH = process.env.PRINTER_FONT_PATH || "C:\\Windows\\Fonts\\DAVID.TTF";
const FONT_FAMILY = "DavidEmbedded, David, Arial, sans-serif";

// ✅ Per-location config - defaults reproduce Hungry's original hardcoded USB setup
// unchanged, so existing installs keep working with no printer.env at all.
const SERVICE_PORT = Number(process.env.PRINTER_SERVICE_PORT) || 9100;
const PRINTER_MODE = (process.env.PRINTER_MODE || "usb").toLowerCase(); // "usb" | "network"
const USB_VENDOR_ID = Number(process.env.PRINTER_USB_VENDOR_ID) || 0x1504;
const USB_PRODUCT_ID = Number(process.env.PRINTER_USB_PRODUCT_ID) || 0x011c;
const NETWORK_HOST = process.env.PRINTER_NETWORK_HOST || ""; // e.g. the WiFi printer's LAN IP
const NETWORK_PORT = Number(process.env.PRINTER_NETWORK_PORT) || 9100;
// Which restaurant this specific agent/printer belongs to. Optional - when unset, any
// order is accepted (back-compat with the original single-restaurant Hungry setup).
// When set, guards against a misconfigured printerUrl on another restaurant's dashboard
// printing to the wrong location.
const RESTAURANT_ID = process.env.RESTAURANT_ID || "";
const DEFAULT_RESTAURANT_NAME = process.env.RESTAURANT_NAME || "HUNGRY";

// Returns a fresh escpos adapter for this print job (usb-adapter devices can't be reused
// across opens once closed, matching the original per-request `new USB(...)` pattern).
function createDevice() {
  if (PRINTER_MODE === "network") {
    if (!NETWORK_HOST) {
      throw new Error("PRINTER_MODE=network but PRINTER_NETWORK_HOST is not set in printer.env");
    }
    return new Network(NETWORK_HOST, NETWORK_PORT);
  }
  return new USB(USB_VENDOR_ID, USB_PRODUCT_ID);
}

const COUNTER_FILE = path.join(__dirname, "daily-counter.json");
let cachedFontCss = "";

const loadDailyCounter = () => {
  try {
    const raw = fs.readFileSync(COUNTER_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { date: "", count: 0 };
  }
};

const saveDailyCounter = (data) => {
  try {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch {}
};

const getTodayKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const nextDailyOrderNumber = () => {
  const today = getTodayKey();
  const data = loadDailyCounter();
  if (data.date !== today) {
    data.date = today;
    data.count = 0;
  }
  data.count += 1;
  saveDailyCounter(data);
  return data.count;
};

const escapeXml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const num = (v) => (typeof v === "number" ? v : Number(v || 0));
const label = (he, en) => (USE_ENGLISH ? en : he);

const getEmbeddedFontCss = () => {
  if (cachedFontCss) return cachedFontCss;
  try {
    const fontData = fs.readFileSync(FONT_PATH);
    const b64 = fontData.toString("base64");
    cachedFontCss = `@font-face { font-family: 'DavidEmbedded'; src: url(data:font/ttf;base64,${b64}) format('truetype'); }`;
    return cachedFontCss;
  } catch (err) {
    console.warn("Could not load David font, using fallback:", err.message);
    cachedFontCss = "";
    return cachedFontCss;
  }
};

const rtlText = (s) => String(s ?? "");

const formatPrice = (n) => {
  if (n == null || n === "") return "";
  const val = typeof n === "number" ? n : Number(n || 0);
  return `₪ ${val.toFixed(2)}`;
};

const translateDeliveryOption = (option) => {
  if (USE_ENGLISH) {
    return option === "EatIn" ? "Dine In" : option === "Delivery" ? "Delivery" : option === "Pickup" ? "Pickup" : option || "";
  }
  return option === "EatIn" ? "אכילה במקום" : option === "Delivery" ? "משלוח" : option === "Pickup" ? "איסוף עצמי" : option || "";
};

const translatePaymentMethod = (method) => {
  if (USE_ENGLISH) {
    return method === "Card"
      ? "Card"
      : method === "Cash"
        ? "Cash"
        : method === "Bit"
          ? "Bit"
          : method === "GOOGLE_PAY"
            ? "Google Pay"
            : method === "APPLE_PAY"
              ? "Apple Pay"
              : method || "";
  }
  return method === "Card"
    ? "כרטיס אשראי"
    : method === "Cash"
      ? "מזומן"
      : method === "Bit"
        ? "ביט"
        : method === "GOOGLE_PAY"
          ? "Google Pay"
          : method === "APPLE_PAY"
            ? "Apple Pay"
            : method || "";
};

const getItemName = (it) => it?.name_he || it?.title || it?.name || it?.product?.name_he || it?.product?.name || "פריט";

const getQtyLabel = (it) => {
  if (it?.isWeighted) {
    const grams = it?.weightGrams || it?.grams || it?.quantity;
    return grams ? `${grams} גרם` : "";
  }
  return it?.quantity != null ? `${it.quantity}` : "1";
};

const getItemBasePrice = (item) => {
  if (item?.isWeighted) {
    const grams = num(item.weightGrams || item.grams || item.quantity);
    const per100 =
      item.pricePer100g != null
        ? num(item.pricePer100g)
        : item.product?.pricePer100g != null
          ? num(item.product.pricePer100g)
          : item.price != null
            ? num(item.price)
            : 0;

    if (grams && per100) return (grams / 100) * per100;
  }
  if (item?.price != null) return num(item.price);
  if (item?.product?.price != null) return num(item.product.price);
  return 0;
};

const shouldShowBasePrice = (item) => {
  if (item?.isWeighted) return true;
  const name = String(getItemName(item) || "").toLowerCase();
  return (
    name.includes("sandwich") || name.includes("burger") || name.includes("סנדוויץ") || name.includes("בורגר") || name.includes("המבורגר")
  );
};

const getAdditionsTotal = (item) => {
  if (!Array.isArray(item?.additions)) return 0;
  return item.additions.reduce((sum, a) => {
    const p = a?.price;
    if (p != null) return sum + num(p);

    const grams = num(a?.grams);
    const per100 = num(a?.pricePer100g);
    if (grams && per100) return sum + (grams / 100) * per100;

    return sum;
  }, 0);
};

const getLineTotal = (item) => {
  const base = getItemBasePrice(item);
  const adds = getAdditionsTotal(item);

  if (item?.isWeighted) return base + adds;

  const qty = num(item?.quantity || 1);
  return (base + adds) * qty;
};

const wrapText = (text, maxChars) => {
  const str = String(text ?? "");
  if (str.length <= maxChars) return [str];
  const words = str.split(" ");
  const lines = [];
  let line = "";
  words.forEach((w) => {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [str];
};

// One receipt is printed as two separate physical print jobs, cut apart between them: the
// header/customer-info part (handed to the customer / posted at pickup) and the order-items
// part (goes to the kitchen). Each part is its own independent canvas - own elements array,
// own y cursor starting fresh from the top - so createCanvas is a factory called once per
// part rather than a single shared canvas for the whole receipt.
const createCanvas = (startY, { centerX, rightX, leftX }) => {
  const elements = [];
  let y = startY;

  const addText = (text, opts = {}) => {
    const size = Math.round((opts.size ?? 28) * SIZE_SCALE);
    const weight = opts.weight ?? "normal";
    const align = opts.align ?? "right";

    const x = align === "center" ? centerX : align === "left" ? leftX : rightX;
    const anchor = align === "center" ? "middle" : align === "left" ? "start" : "end";
    const rtlAttrs = "";
    const displayText = String(text ?? "");

    elements.push(
      `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" font-family="${FONT_FAMILY}" ${rtlAttrs}>${escapeXml(
        displayText,
      )}</text>`,
    );
    y += Math.round(size * (opts.lineHeight ?? 1.45));
  };

  const addDivider = () => {
    elements.push(
      `<line x1="${MARGIN}" x2="${RECEIPT_WIDTH - MARGIN}" y1="${y}" y2="${y}" stroke="#000" stroke-width="2" stroke-dasharray="8,4" />`,
    );
    // Scaled like every other spacing constant below - left unscaled, this gap stayed a
    // flat 28px while text grew to SIZE_SCALE, so the line ended up sitting almost on top
    // of (visually striking through) whatever text followed it.
    y += Math.round(28 * SIZE_SCALE);
  };

  const addBadge = (text, size = 32, rtl = false, padYOverride) => {
    const scaledSize = Math.round(size * SIZE_SCALE);
    const padX = Math.round(36 * SIZE_SCALE);
    const padY = Math.round((padYOverride ?? 16) * SIZE_SCALE);
    const textWidth = Math.max(180, text.length * Math.round(size * 0.65));
    const badgeW = Math.round(textWidth * SIZE_SCALE) + padX * 2;
    const badgeH = scaledSize + padY * 2;
    const x = centerX - badgeW / 2;
    const yTop = y;

    elements.push(
      `<rect x="${x}" y="${yTop}" width="${badgeW}" height="${badgeH}" rx="16" ry="16" fill="none" stroke="#000" stroke-width="2.5" />`,
    );
    const rtlAttrs = "";
    const displayText = String(text ?? "");
    elements.push(
      `<text x="${centerX}" y="${yTop + padY + scaledSize - 3}" font-size="${scaledSize}" font-weight="bold" text-anchor="middle" font-family="${FONT_FAMILY}" ${rtlAttrs}>${escapeXml(
        displayText,
      )}</text>`,
    );
    y += badgeH + Math.round(24 * SIZE_SCALE);
  };

  const addBox = (title, lines) => {
    const padding = Math.round(20 * SIZE_SCALE);
    const titleSize = Math.round(26 * SIZE_SCALE);
    const lineSize = Math.round(22 * SIZE_SCALE);
    const lineGap = Math.round(lineSize * 1.4);
    const boxX = MARGIN;
    const boxW = RECEIPT_WIDTH - MARGIN * 2;
    const boxRight = boxX + boxW - padding;
    const boxY = y;
    const linesCount = Math.max(1, lines.length);
    const boxH = padding * 2 + titleSize + lineGap * linesCount + Math.round(8 * SIZE_SCALE);

    elements.push(
      `<rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="8,4" />`,
    );
    const rtlAttrs = "";
    elements.push(
      `<text x="${boxRight}" y="${boxY + padding + titleSize - 2}" font-size="${titleSize}" font-weight="bold" text-anchor="end" font-family="${FONT_FAMILY}" ${rtlAttrs}>${escapeXml(
        title,
      )}</text>`,
    );

    const baseY = boxY + padding + titleSize + lineGap;
    lines.forEach((line, i) => {
      elements.push(
        `<text x="${boxRight}" y="${baseY + i * lineGap}" font-size="${lineSize}" text-anchor="end" font-family="${FONT_FAMILY}" ${rtlAttrs}>${escapeXml(
          line,
        )}</text>`,
      );
    });

    y = boxY + boxH + Math.round(24 * SIZE_SCALE);
  };

  // Only share one row when both sides can provably fit side by side (same width
  // estimate the title-fit logic above uses) - otherwise stack each side as its own
  // full-width wrapped block instead of squeezing two fixed 18-char budgets onto one row,
  // which is what let a long leftText (e.g. a long customer name) overlap the label.
  const addRow = (rightText, leftText, size = 22) => {
    const scaledSize = Math.round(size * SIZE_SCALE);
    const availWidth = rightX - leftX;
    const estWidth = (s) => String(s ?? "").length * 0.6 * scaledSize;
    const rightStr = String(rightText ?? "");
    const leftStr = String(leftText ?? "");

    if (estWidth(rightStr) + estWidth(leftStr) <= availWidth) {
      if (rightStr) {
        elements.push(
          `<text x="${rightX}" y="${y}" font-size="${scaledSize}" text-anchor="end" font-family="${FONT_FAMILY}">${escapeXml(rightStr)}</text>`,
        );
      }
      if (leftStr) {
        elements.push(
          `<text x="${leftX}" y="${y}" font-size="${scaledSize}" text-anchor="start" font-family="${FONT_FAMILY}">${escapeXml(leftStr)}</text>`,
        );
      }
      y += Math.round(scaledSize * 1.55);
      return;
    }

    const maxCharsFull = Math.max(4, Math.floor(availWidth / (0.6 * scaledSize)));
    if (rightStr) {
      wrapText(rightStr, maxCharsFull).forEach((line, idx) => {
        const lineRightX = idx === 0 ? rightX : rightX - 18;
        elements.push(
          `<text x="${lineRightX}" y="${y}" font-size="${scaledSize}" text-anchor="end" font-family="${FONT_FAMILY}">${escapeXml(line)}</text>`,
        );
        y += Math.round(scaledSize * 1.55);
      });
    }
    if (leftStr) {
      wrapText(leftStr, maxCharsFull).forEach((line) => {
        elements.push(
          `<text x="${leftX}" y="${y}" font-size="${scaledSize}" text-anchor="start" font-family="${FONT_FAMILY}">${escapeXml(line)}</text>`,
        );
        y += Math.round(scaledSize * 1.55);
      });
    }
  };

  const addItemRow = (nameText, qtyText, size = 24) => {
    const scaledSize = Math.round(size * SIZE_SCALE);
    // Item names are Hebrew, like the rest of the receipt - anchored at the right margin
    // (reading start for RTL) with quantity trailing to the left, matching every other
    // label/value row instead of the LTR-style name-on-the-left layout this used to have.
    const nameX = rightX;
    const nameLines = wrapText(nameText, 18);
    nameLines.forEach((line, idx) => {
      if (idx === 0) {
        elements.push(
          `<text x="${leftX}" y="${y}" font-size="${scaledSize}" text-anchor="start" font-family="${FONT_FAMILY}">${escapeXml(
            qtyText,
          )}</text>`,
        );
      }
      elements.push(
        `<text x="${nameX}" y="${y}" font-size="${scaledSize}" text-anchor="end" font-family="${FONT_FAMILY}">${escapeXml(
          line,
        )}</text>`,
      );
      y += Math.round(scaledSize * 1.55);
    });
  };

  const addSpacer = (amount) => {
    y += amount;
  };

  // qrSvg is a pre-rendered standalone `<svg>...</svg>` string (from QRCode.toString,
  // type "svg") at `size`x`size` px - nested SVGs are valid and render fine through
  // sharp/librsvg, so it's embedded as-is inside a positioning <g>, centered horizontally.
  const addQr = (qrSvg, size) => {
    if (!qrSvg) return;
    const x = centerX - size / 2;
    elements.push(`<g transform="translate(${x},${y})">${qrSvg}</g>`);
    y += size + Math.round(16 * SIZE_SCALE);
  };

  const render = () => {
    const height = Math.max(300, y + 100);
    const fontCss = getEmbeddedFontCss();
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${RECEIPT_WIDTH}" height="${height}" viewBox="0 0 ${RECEIPT_WIDTH} ${height}">
  <defs>
    <style type="text/css">
      ${fontCss}
      text {
        font-family: ${FONT_FAMILY};
      }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="#fff"/>
  ${elements.join("\n  ")}
</svg>`;
    return { svg, height };
  };

  return { addText, addDivider, addBadge, addBox, addRow, addItemRow, addSpacer, addQr, render };
};

const buildReceiptSvg = async (order, dailyNumber, restaurantName) => {
  const centerX = RECEIPT_WIDTH / 2;
  const rightX = RECEIPT_WIDTH - MARGIN;
  const leftX = MARGIN + LEFT_TEXT_OFFSET;
  const canvasGeometry = { centerX, rightX, leftX };
  // Every line in this section (delivery type, customer info, item vegetables/sauces/
  // doneness/comment) is Hebrew - "right" anchors it at the right margin, matching how
  // Hebrew is actually read, instead of the left-anchored default meant for LTR content.
  const bodyAlign = "right";
  const bodyRtl = false;

  // Delivery orders get a Waze deep-link QR code so the driver can scan straight into
  // navigation instead of retyping the address (see orderRoutes.js/deliveryQuote.js -
  // order.deliveryAddress.{lat,lng} is the server-resolved, validated point, not
  // whatever text the customer typed). Generated once up front since QR rendering is
  // async but the rest of this function pushes synchronously to each canvas's elements.
  let wazeQrSvg = "";
  const deliveryLat = order?.deliveryAddress?.lat;
  const deliveryLng = order?.deliveryAddress?.lng;
  if (order?.deliveryOption === "Delivery" && typeof deliveryLat === "number" && typeof deliveryLng === "number") {
    try {
      const wazeUrl = `https://waze.com/ul?ll=${deliveryLat},${deliveryLng}&navigate=yes`;
      wazeQrSvg = await QRCode.toString(wazeUrl, { type: "svg", margin: 1, width: 220 });
    } catch (err) {
      console.warn("Could not generate Waze QR code:", err.message);
    }
  }

  // --- Part 1: header through customer notes - its own print job, cut separately from the
  // items below so it can be handed to the customer / posted at pickup on its own.
  // Starts below the top edge with room for the title's ascenders (its font-size is ~86px
  // at the default SIZE_SCALE, and text y is the baseline, not the top) - too small a value
  // here clips the top of the restaurant name.
  const c1 = createCanvas(95, canvasGeometry);
  const titleText = restaurantName || DEFAULT_RESTAURANT_NAME;
  const titleBaseSize = 48;
  const titleMinSize = 20; // below this, text reads as unreadably small on an 80mm receipt
  const titleMaxWidth = RECEIPT_WIDTH - MARGIN * 2;
  // Bold sans-serif glyphs average ~0.6em wide - shrink (never enlarge) the title so a
  // long restaurant name fits the receipt's fixed width instead of overflowing off both
  // edges the way "Hungry Smoked Meat" did at the fixed size "HUNGRY" was tuned for.
  const titleFit = titleMaxWidth / (titleText.length * 0.6 * SIZE_SCALE);
  const titleSize = Math.max(titleMinSize, Math.min(titleBaseSize, Math.floor(titleFit)));
  if (titleFit >= titleMinSize) {
    c1.addText(titleText, { align: "center", size: titleSize, weight: "bold" });
  } else {
    // Even at the minimum readable size the name doesn't fit one line (e.g. a formal
    // "... בע״מ" business name) - wrap across lines at that size instead of clipping it
    // off both edges, which is what a flat single-line render used to do here.
    const maxCharsAtMinSize = Math.max(4, Math.floor(titleMaxWidth / (titleMinSize * 0.6 * SIZE_SCALE)));
    wrapText(titleText, maxCharsAtMinSize).forEach((line) => c1.addText(line, { align: "center", size: titleMinSize, weight: "bold" }));
  }
  c1.addText("הזמנה חדשה", { align: "center", size: 22 });
  c1.addSpacer(14);

  c1.addBadge(String(dailyNumber), 40);

  // Table QR orders (see frontEnd/src/components/cart/CartPage.jsx) carry a table number -
  // printed as its own badge, as prominent as the daily order number, since it's the one
  // piece of info staff need to route a dine-in order back to the right table.
  if (order?.tableNumber) c1.addBadge(label(`שולחן ${order.tableNumber}`, `Table ${order.tableNumber}`), 34, bodyRtl, 20);

  const paymentMethod = translatePaymentMethod(order?.paymentDetails?.method);
  if (paymentMethod) c1.addBadge(label(`תשלום ב${paymentMethod}`, `Payment: ${paymentMethod}`), 30, bodyRtl, 24);

  // Total price is shown once, at the bottom of the receipt (see the totals section further
  // down) - not repeated up here too.
  const totalLabel = formatPrice(order?.totalPrice ?? order?.total ?? "");

  c1.addDivider();

  const deliveryType = translateDeliveryOption(order?.deliveryOption);
  if (deliveryType) c1.addText(deliveryType, { align: bodyAlign, size: 35, weight: "bold", rtl: bodyRtl });

  // order.deliveryAddress is the {text,lat,lng,notes} object resolveDeliveryFields()
  // writes at checkout (see backend/utils/deliveryQuote.js), not a plain string - reading
  // it directly here used to stringify the whole object into the printed line
  // ("כתובת: [object Object]") on every single delivery order.
  const address =
    order?.deliveryAddress?.text || order?.address?.full || order?.address?.street || order?.shippingAddress?.address || "";
  if (address) {
    wrapText(label(`כתובת: ${address}`, `Address: ${address}`), 32).forEach((line) =>
      c1.addText(line, { align: bodyAlign, size: 22, rtl: bodyRtl }),
    );
  }

  if (wazeQrSvg) {
    c1.addSpacer(8);
    c1.addText(label("נווט לכתובת עם Waze", "Navigate with Waze"), { align: "center", size: 20, weight: "bold" });
    c1.addQr(wazeQrSvg, 220);
  }

  // Label + value as two separately-anchored cells (matching every other row on the
  // receipt - base price, item total, etc.) instead of one bidi-ambiguous concatenated
  // string, which is what made the label and value look flipped/out of order.
  const customerName = order?.user?.name || order?.customerName || "אורח";
  const customerPhone = order?.user?.phone || order?.phone || "";
  c1.addRow(label("שם לקוח", "Customer"), customerName, 22);
  if (customerPhone) c1.addRow(label("טלפון", "Phone"), customerPhone, 22);

  // Order status and "created at" are intentionally not printed on the kitchen ticket -
  // status is a live dashboard concept that's stale the moment it's printed, and the
  // receipt already has a print timestamp at the very bottom.

  c1.addDivider();

  const customerNotes = [];
  if (order?.comment) customerNotes.push(String(order.comment));
  c1.addBox(label("הערות לקוח", "Customer Notes"), customerNotes.length ? customerNotes : ["-"]);

  const part1 = c1.render();

  // --- Part 2: order items through the footer timestamp - its own print job/cut, so it
  // reads as the kitchen's ticket independent of the customer-facing part above.
  const c2 = createCanvas(60, canvasGeometry);

  c2.addText(label("פרטי הזמנה", "Order Items"), { align: bodyAlign, size: 28, weight: "bold", rtl: bodyRtl });
  // Repeated here (not just on part1) because this is the half that physically goes to
  // the kitchen - staff running food need the table number without hunting for part1.
  if (order?.tableNumber) {
    c2.addText(label(`שולחן ${order.tableNumber}`, `Table ${order.tableNumber}`), { align: bodyAlign, size: 26, weight: "bold", rtl: bodyRtl });
  }
  c2.addSpacer(8);

  (order?.items ?? []).forEach((it) => {
    const qtyLabel = getQtyLabel(it);
    const lineTotal = getLineTotal(it);
    c2.addItemRow(getItemName(it), `x ${qtyLabel}`, 24);

    if (shouldShowBasePrice(it)) {
      const basePrice = getItemBasePrice(it);
      c2.addRow(label("מחיר בסיס", "Base Price"), formatPrice(basePrice), 20);
    }

    if (Array.isArray(it.vegetables) && it.vegetables.length) {
      wrapText(label(`ירקות: ${it.vegetables.join(", ")}`, `Vegetables: ${it.vegetables.join(", ")}`), 32).forEach((line) =>
        c2.addText(line, { align: bodyAlign, size: 20, rtl: bodyRtl }),
      );
    }

    if (Array.isArray(it.sauces) && it.sauces.length) {
      wrapText(label(`רטבים: ${it.sauces.join(", ")}`, `Sauces: ${it.sauces.join(", ")}`), 32).forEach((line) =>
        c2.addText(line, { align: bodyAlign, size: 20, rtl: bodyRtl }),
      );
    }

    if (it?.doneness) {
      wrapText(label(`מידת עשייה: ${it.doneness}`, `Doneness: ${it.doneness}`), 32).forEach((line) =>
        c2.addText(line, { align: bodyAlign, size: 20, rtl: bodyRtl }),
      );
    }

    // Pizza Builder selections (only present for pizza-cuisine restaurants - see
    // backend/models/Order.js's items[].pizza) - shown as its own clearly-labeled block so
    // the kitchen doesn't have to hunt for size/crust/sauce/toppings among generic additions.
    if (it?.pizza) {
      const basics = [it.pizza.size?.label, it.pizza.crust?.label, it.pizza.sauce?.label, it.pizza.cheese?.label].filter(Boolean);
      if (basics.length) {
        wrapText(label(`פיצה: ${basics.join(", ")}`, `Pizza: ${basics.join(", ")}`), 32).forEach((line) =>
          c2.addText(line, { align: bodyAlign, size: 22, weight: "bold", rtl: bodyRtl }),
        );
      }
      if (Array.isArray(it.pizza.toppings) && it.pizza.toppings.length) {
        it.pizza.toppings.forEach((t) => {
          const marker = t.removed ? label("ללא", "No") : "+";
          c2.addRow(`${marker} ${t.label}`, t.removed ? "" : formatPrice(t.price), 20);
        });
      }
      if (it.pizza.halfAndHalf?.otherTitle) {
        wrapText(label(`חצי-חצי עם: ${it.pizza.halfAndHalf.otherTitle}`, `Half-and-half with: ${it.pizza.halfAndHalf.otherTitle}`), 32).forEach(
          (line) => c2.addText(line, { align: bodyAlign, size: 20, rtl: bodyRtl }),
        );
      }
    }

    // Each addition on its own line (plain wrapped text, not the addRow name+price split -
    // that split is what caused a long addition name to wrap onto its own 2 lines and then
    // print its price on a 3rd line). Price is only shown for additions that actually cost
    // something - a free selection just needs its name.
    if (Array.isArray(it.additions) && it.additions.length) {
      it.additions.forEach((a) => {
        // Some menu additions already have their price baked into the name itself (e.g.
        // "אילי חריף (+₪2)") - strip any trailing "(...)" that contains a digit before
        // appending our own formatted price, or paid additions would show the price twice.
        const rawAddName = a?.addition || a?.name || "תוספת";
        const addName = rawAddName.replace(/\s*\([^)]*\d[^)]*\)\s*$/, "").trim();
        const addPrice = a?.price != null ? num(a.price) : a?.grams && a?.pricePer100g ? (num(a.grams) / 100) * num(a.pricePer100g) : 0;
        const line = addPrice > 0 ? `+ ${addName} (${formatPrice(addPrice)})` : `+ ${addName}`;
        wrapText(line, 32).forEach((l) => c2.addText(l, { align: bodyAlign, size: 20, rtl: bodyRtl }));
      });
    }

    if (it?.comment)
      wrapText(label(`${it.comment} :הערה`, `${it.comment} :Note`), 32).forEach((line) =>
        c2.addText(line, { align: bodyAlign, size: 30, weight: "bold", rtl: bodyRtl }),
      );

    c2.addRow(label("סה״כ פריט", "Item Total"), formatPrice(lineTotal), 22);

    // Smaller gap between items than a full divider would need - just enough to separate
    // one item from the next without the large blank stretch this used to leave.
    c2.addSpacer(Math.round(10 * SIZE_SCALE));
  });

  c2.addDivider();

  if (order?.deliveryFee != null) c2.addRow(label("דמי משלוח", "Delivery Fee"), formatPrice(order.deliveryFee), 22);
  if (order?.discount != null) c2.addRow(label("הנחה", "Discount"), formatPrice(order.discount), 22);
  if (order?.subtotal != null) c2.addRow(label("סכום ביניים", "Subtotal"), formatPrice(order.subtotal), 22);
  if (totalLabel) {
    c2.addSpacer(6);
    c2.addRow(label("סה״כ", "Total"), totalLabel, 28);
  }

  c2.addSpacer(12);
  c2.addDivider();
  c2.addText(new Date().toLocaleString("he-IL"), { align: "center", size: 20 });

  const part2 = c2.render();
  return { part1, part2 };
};

app.get("/ping", (req, res) => res.json({ ok: true, mode: PRINTER_MODE, restaurantId: RESTAURANT_ID || null }));

app.post("/print", (req, res) => {
  const order = req.body?.order;
  const restaurantId = req.body?.restaurantId || order?.restaurantId || "";
  const restaurantName = req.body?.restaurantName;

  // Only enforced when this agent has been pinned to a restaurant (RESTAURANT_ID in
  // printer.env) - see the constant's comment above. Prevents a stale/misconfigured
  // printerUrl on another restaurant's dashboard from printing to this location.
  if (RESTAURANT_ID && String(restaurantId) !== String(RESTAURANT_ID)) {
    console.warn(`Rejected print job for restaurant "${restaurantId}" - this agent is pinned to "${RESTAURANT_ID}"`);
    return res.status(403).json({ success: false, error: "This printer agent belongs to a different restaurant." });
  }

  let device;
  try {
    device = createDevice();
  } catch (err) {
    console.error("Printer config error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }

  device.open(async (err) => {
    if (err) {
      console.error(`${PRINTER_MODE} printer open error:`, err);
      return res.status(500).json({ success: false, error: String(err) });
    }

    try {
      const printer = new Printer(device, { encoding: "CP862" });
      const dailyNumber = nextDailyOrderNumber();
      const { part1, part2 } = await buildReceiptSvg(order, dailyNumber, restaurantName);

      // Renders one part to PNG (saving both stages for debugging, like the original
      // single-part version did) and returns a loaded escpos Image ready to raster.
      const preparePart = async (part, name) => {
        try {
          fs.writeFileSync(path.join(__dirname, `last-receipt-${name}.svg`), part.svg);
        } catch (e) {
          console.log(`Could not save ${name} SVG:`, e.message);
        }

        const pngBuffer = await sharp(Buffer.from(part.svg))
          .resize({ width: PRINTER_DOTS, fit: "contain", background: "#ffffff" })
          .grayscale()
          .threshold(160)
          .png({
            compressionLevel: 0,
            quality: 100,
          })
          .toBuffer();

        try {
          fs.writeFileSync(path.join(__dirname, `last-receipt-${name}.png`), pngBuffer);
        } catch (e) {
          console.log(`Could not save ${name} PNG:`, e.message);
        }

        return Image.load(pngBuffer, "image/png");
      };

      // Printed and cut as two separate jobs - part 1 (header/customer info) can be handed
      // to the customer or posted at pickup, part 2 (order items) goes to the kitchen.
      const image1 = await preparePart(part1, "part1");
      printer.raster(image1);
      printer.feed(3).cut();

      const image2 = await preparePart(part2, "part2");
      printer.raster(image2);
      printer.feed(5).cut();

      await printer.flush();
      await printer.close();

      return res.json({ success: true });
    } catch (e) {
      console.error("Print error:", e);
      return res.status(500).json({ success: false, error: String(e) });
    }
  });
});

app.listen(SERVICE_PORT, () => {
  console.log(`Printer service running on http://localhost:${SERVICE_PORT}`);
  console.log(`  mode: ${PRINTER_MODE}${PRINTER_MODE === "network" ? ` (${NETWORK_HOST}:${NETWORK_PORT})` : ` (USB ${USB_VENDOR_ID.toString(16)}:${USB_PRODUCT_ID.toString(16)})`}`);
  console.log(`  restaurant: ${RESTAURANT_ID ? `pinned to ${RESTAURANT_ID}` : "accepting any (unpinned)"}`);
});
