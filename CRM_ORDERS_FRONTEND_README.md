# CRM Orders Table Frontend Guide

This backend now returns single-order and multiorder rows through the existing paginated leads API. The frontend can render the table and the full detail view from one request.

## Endpoint

Use the existing lead list endpoint:

```http
GET /api/v1/admin/leads/?page=1&size=20
```

Supported existing filters still work:

```http
GET /api/v1/admin/leads/?search=ali&product_name=mufta&lead_source=miniapp&page=1&size=20
```

The response shape is still the project pagination wrapper:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "size": 20,
  "pages": 0
}
```

Each `items[]` row now includes both compact table fields and the full order item details.

## Row Fields

Use these fields for the table:

```ts
type OrderType = "single_order" | "multiorder";

type LeadOrderRow = {
  id: string;
  order_id: string;
  order_session_id: string | null;

  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  lead_source: "telegram_bot" | "miniapp" | string;

  store_id: string | null;
  store_name: string | null;

  order_type: OrderType;
  is_multiorder: boolean;
  items_count: number;
  total_quantity: number;
  products_preview: string[];
  total_amount: number | null;
  order_items: LeadOrderItem[];

  ai_summary: string | null;
  created_at: string;
};
```

## Order Item Fields

```ts
type LeadOrderItem = {
  index: number;
  product_name: string;
  family_id: string | null;
  variant_id: string | null;
  product_id: string | null;
  product_code: string | null;
  variant_code: string | null;
  catalog_code: string | null;
  size_label: string | null;
  quantity: number;
  unit: string | null;
  price: number | null;
  line_total: number | null;
  weight: string | null;
  brand: string | null;
  category: string | null;
  bot_main_category_slug: string | null;
  bot_item_type: string | null;
  image_url: string | null;
  raw: Record<string, unknown>;
};
```

`raw` contains the original stored snapshot. Use normalized fields first; use `raw` only for fields not yet represented in the normalized contract.

## Table Layout

Replace the old lead table columns with:

| Column | Source |
| --- | --- |
| Order ID | `order_id` |
| Telegram user | `first_name`, `last_name`, `username`, `telegram_id` |
| Phone | `phone` |
| Products | `products_preview`, `items_count` |
| Type | `order_type` |
| Items | `items_count` / `total_quantity` |
| Total | `total_amount` |
| Store | `store_name` |
| AI summary | `ai_summary` |
| Time | `created_at` |

Display type labels:

```ts
const orderTypeLabel = {
  single_order: "Single order",
  multiorder: "Multiorder",
};
```

Products cell suggestion:

```ts
function productsCell(row: LeadOrderRow) {
  const preview = row.products_preview.slice(0, 2).join(", ");
  const hidden = row.items_count - row.products_preview.slice(0, 2).length;
  return hidden > 0 ? `${preview} +${hidden}` : preview || "-";
}
```

## Detail View

No second request is required if the user opens a row from the table. Use `row.order_items` for the full detail modal/page.

Recommended detail sections:

1. Customer
   - Name: `first_name last_name` or `username`
   - Telegram ID: `telegram_id`
   - Phone: `phone`
   - Source: `lead_source`

2. Store
   - Store name: `store_name`

3. Order Summary
   - Type: `order_type`
   - Items count: `items_count`
   - Total quantity: `total_quantity`
   - Total amount: `total_amount`

4. Products Table
   - `index`
   - `product_name`
   - `catalog_code`
   - `size_label`
   - `quantity`
   - `unit`
   - `price`
   - `line_total`
   - `category`
   - `image_url`

5. AI Summary
   - `ai_summary`

## Backward Compatibility

Old fields are still present:

- `interested_products`
- `ai_summary`
- `store_name`
- `lead_source`

New UI should prefer:

- `order_items` instead of `interested_products`
- `products_preview` instead of manually parsing product names
- `order_type` instead of calculating single/multiorder in the frontend

Some legacy leads may have `items_count = 0` if they were created before product snapshots were stored. Render them as `Single order` with an empty product cell.

## Detail Endpoint

The old detail endpoint also includes normalized order data:

```http
GET /api/v1/admin/leads/{lead_id}
```

It returns the same core lead fields plus:

```ts
order: {
  order_id: string;
  order_session_id: string | null;
  order_type: "single_order" | "multiorder";
  is_multiorder: boolean;
  items_count: number;
  total_quantity: number;
  products_preview: string[];
  total_amount: number | null;
  order_items: LeadOrderItem[];
}
```

Use this only when opening a detail page directly by URL. For normal table clicks, the paginated list response already has the full `order_items`.

## Export

`GET /api/v1/admin/leads/export` now includes:

- `order_id`
- `order_type`
- `items_count`
- `total_quantity`
- `total_amount`
- `products_preview`
- `order_items`

`order_items` is JSON text in the CSV cell.

## New Filter Parameters

The list endpoint now accepts additional query params:

```http
GET /api/v1/admin/leads/?order_type=multiorder&store_id=<uuid>&page=1&size=20
```

| Param | Type | Values |
| --- | --- | --- |
| `order_type` | string | `single_order` \| `multiorder` |
| `store_id` | UUID | filter by assigned store |
| `product_name` | string | filter by product name (existing) |
| `lead_source` | string | `telegram_bot` \| `miniapp` (existing) |

## Update Lead (PATCH)

```http
PATCH /api/v1/admin/leads/{lead_id}
```

Request body (all fields optional):

```json
{
  "phone": "+998901112233",
  "store_id": "uuid-string",
  "ai_summary": "Updated summary text"
}
```

Returns the updated lead with the same shape as the GET detail response including the `order` block.

## Nearest Stores

```http
GET /api/v1/admin/stores/nearest?lat=<float>&lon=<float>&limit=3
```

Returns an array of stores with an extra `distance_km` field. Use this when the lead has a location to suggest the closest store in the edit form.

```ts
type NearestStore = StoreListItem & { distance_km: number }
```

## TypeScript Migration

Update `BackendLeadListItem` in `src/shared/api/backend.ts` to include order fields:

```ts
// Add this new interface
export interface BackendLeadOrderItem {
  index: number
  product_name: string
  family_id: string | null
  variant_id: string | null
  product_id: string | null
  product_code: string | null
  variant_code: string | null
  catalog_code: string | null
  size_label: string | null
  quantity: number
  unit: string | null
  price: number | null
  line_total: number | null
  weight: string | null
  brand: string | null
  category: string | null
  bot_main_category_slug: string | null
  bot_item_type: string | null
  image_url: string | null
  raw: Record<string, unknown>
}

// Extend BackendLeadListItem with new order fields
export interface BackendLeadListItem {
  id: string
  telegram_id: number
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  lead_source: string
  store_id?: string | null
  store_name?: string | null
  // legacy — keep for backward compat
  interested_products: string[]
  ai_summary: string
  created_at: string
  // new order fields
  order_id: string
  order_session_id: string | null
  order_type: 'single_order' | 'multiorder'
  is_multiorder: boolean
  items_count: number
  total_quantity: number
  products_preview: string[]
  total_amount: number | null
  order_items: BackendLeadOrderItem[]
}
```

Update `BackendLeadResponse` to include the top-level `order` block:

```ts
export interface BackendLeadResponse {
  // ... existing fields unchanged ...
  order: {
    order_id: string
    order_session_id: string | null
    order_type: 'single_order' | 'multiorder'
    is_multiorder: boolean
    items_count: number
    total_quantity: number
    products_preview: string[]
    total_amount: number | null
    order_items: BackendLeadOrderItem[]
  }
}
```

Update `Lead` in `src/shared/types/api.ts` to carry order data:

```ts
export type OrderType = 'single_order' | 'multiorder'

export interface LeadOrderItem {
  index: number
  productName: string
  productCode: string | null
  catalogCode: string | null
  sizeLabel: string | null
  quantity: number
  unit: string | null
  price: number | null
  lineTotal: number | null
  category: string | null
  imageUrl: string | null
}

export interface Lead {
  // ... existing fields ...
  orderId: string
  orderType: OrderType
  isMultiorder: boolean
  itemsCount: number
  totalQuantity: number
  productsPreview: string[]
  totalAmount: number | null
  orderItems: LeadOrderItem[]
}
```

Update `mapLeadListItem` in `backend.ts` to map the new fields:

```ts
export function mapLeadListItem(item: BackendLeadListItem | BackendDashboardLeadItem): Lead {
  // ... existing mapping ...
  return {
    // ... existing fields ...
    orderId: 'order_id' in item ? item.order_id : '',
    orderType: 'order_type' in item ? item.order_type : 'single_order',
    isMultiorder: 'is_multiorder' in item ? item.is_multiorder : false,
    itemsCount: 'items_count' in item ? item.items_count : 0,
    totalQuantity: 'total_quantity' in item ? item.total_quantity : 0,
    productsPreview: 'products_preview' in item ? item.products_preview : [],
    totalAmount: 'total_amount' in item ? item.total_amount : null,
    orderItems: 'order_items' in item
      ? item.order_items.map((oi) => ({
          index: oi.index,
          productName: oi.product_name,
          productCode: oi.product_code,
          catalogCode: oi.catalog_code,
          sizeLabel: oi.size_label,
          quantity: oi.quantity,
          unit: oi.unit,
          price: oi.price,
          lineTotal: oi.line_total,
          category: oi.category,
          imageUrl: oi.image_url,
        }))
      : [],
  }
}
```
