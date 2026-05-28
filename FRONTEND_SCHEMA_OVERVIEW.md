# KAS Frontend Schema Overview — Product Catalog & Leads

> Generated: 2026-05-28  
> Purpose: Frontend adaptation guide for the updated product catalog schema, including new price fields (UZS/USD), order snapshots, and the leads admin API.

---

## Why This Document Exists

The backend introduced UZS price support. All price-bearing objects now carry **three** price fields instead of one. The Leads page was breaking because `item.price` was expected to be a `number` but arrived as a `string` in legacy snapshots. That is now fixed — all price fields are `number | null`.

---

## 1. Variant Object (`/api/v1/miniapp/products`, `/api/v1/miniapp/products/{code}`)

Returned inside `family.variants[]`.

```ts
interface Variant {
  id: string;                    // UUID
  family_id: string;             // UUID
  variant_code: string;          // e.g. "9402020"
  catalog_code: string;          // same as variant_code
  raw_name: string | null;
  size_label: string | null;     // e.g. "20 mm"
  size_raw: string | null;
  diameters_mm: number[] | null;
  threads_inch: string[] | null;
  length_cm: number | null;
  length_m: number | null;
  collector_ports: number | null;
  cartridge_size_mm: number | null;
  color: string | null;

  // ── Price fields (NEW) ────────────────────────────────────────────
  price: number | null;          // display price — UZS if available, else USD
  price_currency: "UZS" | "USD" | null;  // currency of `price`
  usd_price: number | null;      // always USD, raw backend price
  uzs_price: number | null;      // integer UZS price (null if not set)
  // ─────────────────────────────────────────────────────────────────

  weight: number | null;
  unit: string | null;           // e.g. "dona", "m."
  sales_status: string | null;   // "top" | "high" | "medium" | "low" | "very_low"
  image_urls: string[];
  is_active: boolean;
}
```

### Rendering price for a variant

```js
function formatVariantPrice(variant) {
  if (variant.price == null) return "Narx so'raladi";
  if (variant.price_currency === "UZS") {
    return `${Math.round(variant.price).toLocaleString("uz-UZ")} so'm`;
  }
  return `$${variant.price.toFixed(2)}`;
}
```

---

## 2. Family (Product Group) Object (`/api/v1/miniapp/products`)

```ts
interface Family {
  id: string;
  product_code: string;
  name: string;
  brand: string | null;
  brand_slug: string | null;
  category: string | null;
  category_slug: string | null;
  bot_main_category: string | null;
  bot_main_category_slug: string | null;
  bot_material_group: string | null;
  bot_product_group: string | null;
  bot_item_type: string | null;
  bot_item_type_slug: string | null;
  bot_menu_path: string[] | null;
  description: string | null;
  description_ru: string | null;
  usage_areas: string[] | null;
  material: string | null;
  available_sizes: string[] | null;
  available_colors: string[] | null;

  // ── Price range fields (NEW) ──────────────────────────────────────
  price_min: number | null;      // display min price (UZS if available, else USD)
  price_max: number | null;      // display max price
  price_currency: "UZS" | "USD" | null;
  usd_price_min: number | null;  // always USD
  usd_price_max: number | null;
  uzs_price_min: number | null;  // integer UZS, null if not set
  uzs_price_max: number | null;
  // ─────────────────────────────────────────────────────────────────

  weight_min: number | null;
  weight_max: number | null;
  sales_status: string | null;
  is_active: boolean;
  image_urls: string[];
  search_terms: string[] | null;
  variant_count: number;
  variants?: Variant[];          // only present when include_variants=true
}
```

### Rendering price range for a family

```js
function formatFamilyPrice(family) {
  if (family.price_min == null) return "Narx so'raladi";
  const isUZS = family.price_currency === "UZS";
  const fmt = (v) => isUZS
    ? `${Math.round(v).toLocaleString("uz-UZ")} so'm`
    : `$${v.toFixed(2)}`;
  if (family.price_min === family.price_max || family.price_max == null) {
    return fmt(family.price_min);
  }
  return `${fmt(family.price_min)} – ${fmt(family.price_max)}`;
}
```

---

## 3. Order Snapshot (`lead.interested_products[]`, `order_session.order_items[]`)

This is the raw snapshot stored when an order is placed via the Telegram bot or Mini App. It is stored as-is in the database and surfaced in the Leads admin page.

```ts
interface OrderSnapshot {
  kind: "product_family_variant";
  family_id: string;             // UUID
  product_code: string | null;
  product_name: string;
  variant_id: string;            // UUID
  variant_code: string | null;
  catalog_code: string | null;
  size_label: string | null;
  quantity: number;              // integer ≥ 1

  // ── Price fields (FIXED — were strings before, now numbers) ──────
  price: number | null;          // display price at order time (UZS or USD)
  price_currency: "UZS" | "USD" | null;
  usd_price: number | null;      // USD price at order time
  uzs_price: number | null;      // UZS price at order time (float)
  // ─────────────────────────────────────────────────────────────────

  weight: string | null;         // kept as string for display (e.g. "0.275")
  unit: string | null;
  brand: string | null;
  category: string | null;
  bot_main_category_slug: string | null;
  bot_item_type: string | null;
  image_url: string | null;      // single primary image URL
}
```

> **Breaking change note:** Before 2026-05-28, `price`, `usd_price`, and `uzs_price` were serialized as strings (e.g. `"125000.0"`). They are now `number | null`. Any code doing `parseFloat(item.price)` should be changed to just `item.price`.

---

## 4. Normalized Order Item — Admin Leads API (`/api/v1/admin/leads/`)

The backend normalizes `interested_products` snapshots into a consistent `LeadOrderItem` shape regardless of the raw snapshot format.

```ts
interface LeadOrderItem {
  index: number;                 // 1-based
  product_name: string;
  family_id: string | null;
  variant_id: string | null;
  product_id: string | null;     // legacy product ID
  product_code: string | null;
  variant_code: string | null;
  catalog_code: string | null;
  size_label: string | null;
  quantity: number;
  unit: string | null;
  price: number | null;          // always a number, never a string
  line_total: number | null;     // price * quantity
  weight: string | null;
  brand: string | null;
  category: string | null;
  bot_main_category_slug: string | null;
  bot_item_type: string | null;
  image_url: string | null;
  raw: Record<string, any>;      // full original snapshot for drilldown
}
```

---

## 5. Lead List Item — Admin Leads API

```ts
interface LeadListItem {
  id: string;                    // UUID
  telegram_id: number;
  username: string | null;       // Telegram @username
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  lead_source: "telegram_bot" | "miniapp";
  store_id: string | null;
  store_name: string | null;
  interested_products: OrderSnapshot[];  // raw snapshots

  // ── Computed order summary ────────────────────────────────────────
  order_id: string;
  order_session_id: string | null;
  order_type: "single_order" | "multiorder";
  is_multiorder: boolean;
  items_count: number;
  total_quantity: number;
  products_preview: string[];    // first 3 product names
  total_amount: number | null;   // sum of line_totals when prices available
  order_items: LeadOrderItem[];  // normalized, always safe to render
  // ─────────────────────────────────────────────────────────────────

  ai_summary: string | null;
  created_at: string;            // ISO datetime
}
```

---

## 6. Key Rules for Frontend Price Rendering

| Context | Field to use | Format |
|---|---|---|
| Variant detail page | `variant.price` + `variant.price_currency` | UZS: `toLocaleString` + " so'm"; USD: `$X.XX` |
| Product card / list | `family.price_min/max` + `family.price_currency` | Same logic |
| Cart / order summary | `snapshot.price` + `snapshot.price_currency` | Same logic |
| Leads admin table | `order_item.price` (always `number \| null`) | Safe — no parseFloat needed |
| Total amount | `lead.total_amount` (`number \| null`) | Check null before rendering |

### Safe price formatter (copy-paste ready)

```js
function formatPrice(value, currency) {
  if (value == null || currency == null) return "—";
  if (currency === "UZS") {
    return `${Math.round(value).toLocaleString("uz-UZ")} so'm`;
  }
  return `$${Number(value).toFixed(2)}`;
}
```

---

## 7. Miniapp Products Endpoint Change

`GET /api/v1/miniapp/products?category=...&limit=300` — previously rejected `limit > 200` with **422**. Limit is now **500**.

---

## 8. What Changed on 2026-05-28

| Schema location | Field | Before | After |
|---|---|---|---|
| `order_snapshot.price` | type | `string` (e.g. `"125000.0"`) | `number \| null` |
| `order_snapshot.usd_price` | type | `string` | `number \| null` |
| `order_snapshot.uzs_price` | type | `string` | `number \| null` |
| `variant` / `family` | `price_currency` | missing | `"UZS" \| "USD" \| null` |
| `variant` / `family` | `usd_price` / `usd_price_min/max` | missing | `number \| null` |
| `variant` / `family` | `uzs_price` / `uzs_price_min/max` | missing | `number \| null` (integer for UZS) |
| miniapp products `limit` | max allowed | 200 | 500 |
