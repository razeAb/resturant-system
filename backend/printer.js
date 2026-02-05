const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const { Printer, Image } = require("@node-escpos/core");
const UsbAdapterPkg = require("@node-escpos/usb-adapter");
const USB = UsbAdapterPkg.default || UsbAdapterPkg;
const sharp = require("sharp");

const app = express();
app.use(cors());
app.use(express.json());

const RECEIPT_WIDTH = 576; // 80mm printers (SVG canvas)
const PRINTER_DOTS = 512; // try 512 first; if clipped, try 576
const USE_ENGLISH = false;
const MARGIN = 30;
const LEFT_TEXT_OFFSET = 120; // push LTR text further right
const SIZE_SCALE = 1.8; // increase text sizes globally
const FONT_PATH = "C:\\Windows\\Fonts\\DAVID.TTF";
const FONT_FAMILY = "DavidEmbedded, David, Arial, sans-serif";

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
  return `₪${val.toFixed(2)}`;
};

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(new Date(timestamp).toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "רגע עכשיו";
  if (diffMinutes < 60) return `${diffMinutes} דקות`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} שעות`;
  return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
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

const buildReceiptSvg = (order, dailyNumber) => {
  const centerX = RECEIPT_WIDTH / 2;
  const rightX = RECEIPT_WIDTH - MARGIN;
  const leftX = MARGIN + LEFT_TEXT_OFFSET;
  const elements = [];
  let y = 60;
  const bodyAlign = "left";
  const bodyRtl = false;

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
    y += 28;
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

  const addRow = (rightText, leftText, size = 22) => {
    const scaledSize = Math.round(size * SIZE_SCALE);
    const maxChars = 18;
    const lines = wrapText(rightText, maxChars);
    lines.forEach((line, idx) => {
      const lineRightX = idx === 0 ? rightX : rightX - 18;
      elements.push(
        `<text x="${lineRightX}" y="${y}" font-size="${scaledSize}" text-anchor="end" font-family="${FONT_FAMILY}">${escapeXml(
          line,
        )}</text>`,
      );
      if (idx === 0 && lines.length === 1) {
        elements.push(
          `<text x="${leftX}" y="${y}" font-size="${scaledSize}" text-anchor="start" font-family="${FONT_FAMILY}">${escapeXml(
            leftText,
          )}</text>`,
        );
      }
      y += Math.round(scaledSize * 1.55);
    });
    if (lines.length > 1) {
      elements.push(
        `<text x="${leftX}" y="${y}" font-size="${scaledSize}" text-anchor="start" font-family="${FONT_FAMILY}">${escapeXml(
          leftText,
        )}</text>`,
      );
      y += Math.round(scaledSize * 1.55);
    }
  };

  // Build receipt content
  addText("HUNGRY", { align: "center", size: 48, weight: "bold" });
  addText("ACTIVE ORDER", { align: "center", size: 22 });
  y += 14;

  addBadge(String(dailyNumber), 40);

  const paymentMethod = translatePaymentMethod(order?.paymentDetails?.method);
  if (paymentMethod) addBadge(label(`תשלום ב${paymentMethod}`, `Payment: ${paymentMethod}`), 30, bodyRtl, 24);

  const totalLabel = formatPrice(order?.totalPrice ?? order?.total ?? "");
  if (totalLabel) addText(totalLabel, { align: "center", size: 36, weight: "bold" });

  addDivider();

  const deliveryType = translateDeliveryOption(order?.deliveryOption);
  if (deliveryType) addText(deliveryType, { align: bodyAlign, size: 26, weight: "bold", rtl: bodyRtl });

  const address = order?.address?.full || order?.address?.street || order?.deliveryAddress || order?.shippingAddress?.address || "";
  if (address) {
    wrapText(label(`כתובת: ${address}`, `Address: ${address}`), 32).forEach((line) =>
      addText(line, { align: bodyAlign, size: 22, rtl: bodyRtl }),
    );
  }

  const customerName = order?.user?.name || order?.customerName || "אורח";
  const customerPhone = order?.user?.phone || order?.phone || "";
  addText(label(`שם לקוח: ${customerName}`, `Customer: ${customerName}`), { align: bodyAlign, size: 22, rtl: bodyRtl });
  if (customerPhone) addText(label(`טלפון: ${customerPhone}`, `Phone: ${customerPhone}`), { align: bodyAlign, size: 22, rtl: bodyRtl });

  const eta = order?.estimatedTime ? label(`${order.estimatedTime} דקות`, `${order.estimatedTime} min`) : "ASAP";
  addText(label(`אספקה: ${eta}`, `ETA: ${eta}`), { align: bodyAlign, size: 22, rtl: bodyRtl });

  const statusLabel = USE_ENGLISH
    ? order?.status === "PREPARING"
      ? "Preparing"
      : order?.status === "DELIVERING"
        ? "Delivering"
        : order?.status === "DONE"
          ? "Done"
          : "Pending"
    : order?.status === "PREPARING"
      ? "בהכנה"
      : order?.status === "DELIVERING"
        ? "במשלוח"
        : order?.status === "DONE"
          ? "הושלם"
          : "ממתין";
  addText(label(`סטטוס: ${statusLabel}`, `Status: ${statusLabel}`), { align: bodyAlign, size: 22, rtl: bodyRtl });

  if (order?.createdAt)
    addText(label(`נוצר: ${formatTime(order.createdAt)}`, `Created: ${formatTime(order.createdAt)}`), {
      align: bodyAlign,
      size: 22,
      rtl: bodyRtl,
    });

  addDivider();

  const customerNotes = [];
  if (order?.comment) customerNotes.push(String(order.comment));
  (order?.items ?? []).forEach((it) => {
    if (it?.comment) customerNotes.push(`${getItemName(it)}: ${it.comment}`);
  });
  addBox(label("הערות לקוח", "Customer Notes"), customerNotes.length ? customerNotes : ["-"]);

  addText(label("פרטי הזמנה", "Order Items"), { align: bodyAlign, size: 28, weight: "bold", rtl: bodyRtl });
  y += 8;

  (order?.items ?? []).forEach((it) => {
    const qtyLabel = getQtyLabel(it);
    const lineTotal = getLineTotal(it);
    addRow(`${qtyLabel} x ${getItemName(it)}`, "", 24);

    const basePrice = getItemBasePrice(it);
    addRow(label("מחיר בסיס", "Base Price"), formatPrice(basePrice), 20);

    if (Array.isArray(it.vegetables) && it.vegetables.length) {
      wrapText(label(`ירקות: ${it.vegetables.join(", ")}`, `Vegetables: ${it.vegetables.join(", ")}`), 32).forEach((line) =>
        addText(line, { align: bodyAlign, size: 20, rtl: bodyRtl }),
      );
    }

    if (Array.isArray(it.additions) && it.additions.length) {
      it.additions.forEach((a) => {
        const addName = a?.addition || a?.name || "תוספת";
        const addPrice = a?.price != null ? num(a.price) : a?.grams && a?.pricePer100g ? (num(a.grams) / 100) * num(a.pricePer100g) : 0;
        addRow(`+ ${addName}`, formatPrice(addPrice), 20);
      });
      addRow(label("סה״כ תוספות", "Add-ons Total"), formatPrice(getAdditionsTotal(it)), 20);
    }

    if (it?.comment)
      wrapText(label(`הערה: ${it.comment}`, `Note: ${it.comment}`), 32).forEach((line) =>
        addText(line, { align: bodyAlign, size: 20, rtl: bodyRtl }),
      );

    addRow(label("סה״כ פריט", "Item Total"), formatPrice(lineTotal), 22);

    y += Math.round(28 * SIZE_SCALE);
  });

  addDivider();

  if (order?.deliveryFee != null) addRow(label("דמי משלוח", "Delivery Fee"), formatPrice(order.deliveryFee), 22);
  if (order?.discount != null) addRow(label("הנחה", "Discount"), formatPrice(order.discount), 22);
  if (order?.subtotal != null) addRow(label("סכום ביניים", "Subtotal"), formatPrice(order.subtotal), 22);
  if (totalLabel) {
    y += 6;
    addRow(label("סה״כ", "Total"), totalLabel, 28);
  }

  y += 12;
  addDivider();
  addText(new Date().toLocaleString("he-IL"), { align: "center", size: 20 });

  const height = Math.max(600, y + 100);

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

app.get("/ping", (req, res) => res.json({ ok: true }));

app.post("/print", (req, res) => {
  const order = req.body?.order;

  const device = new USB(0x1504, 0x011c);

  device.open(async (err) => {
    if (err) {
      console.error("USB open error:", err);
      return res.status(500).json({ success: false, error: String(err) });
    }

    try {
      const printer = new Printer(device, { encoding: "CP862" });
      const dailyNumber = nextDailyOrderNumber();
      const { svg } = buildReceiptSvg(order, dailyNumber);

      // Save SVG for debugging
      try {
        fs.writeFileSync(path.join(__dirname, "last-receipt.svg"), svg);
        console.log("Saved SVG to last-receipt.svg for inspection");
      } catch (e) {
        console.log("Could not save SVG:", e.message);
      }

      // Convert SVG to PNG with optimal settings
      const pngBuffer = await sharp(Buffer.from(svg))
        .resize({ width: PRINTER_DOTS, fit: "contain", background: "#ffffff" })
        .grayscale()
        .threshold(160)
        .png({
          compressionLevel: 0,
          quality: 100,
        })
        .toBuffer();

      // Save PNG for debugging
      try {
        fs.writeFileSync(path.join(__dirname, "last-receipt.png"), pngBuffer);
        console.log("Saved PNG to last-receipt.png for inspection");
      } catch (e) {
        console.log("Could not save PNG:", e.message);
      }

      const image = await Image.load(pngBuffer, "image/png");

      // Raster mode is more reliable on some Epson models
      printer.raster(image);
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

app.listen(9100, () => console.log("Printer service running on http://localhost:9100"));
