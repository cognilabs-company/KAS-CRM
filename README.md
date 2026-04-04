# KAS CRM — Admin Panel

KAS kompaniyasi uchun AI Telegram Bot + CRM + Admin Panel tizimining frontend qismi.
**Cognilabs** tomonidan ishlab chiqilgan.

---

## 🛠 Texnologiya steki

| Stack          | Versiya  |
|----------------|----------|
| React          | 18       |
| TypeScript     | 5        |
| Vite           | 5        |
| Tailwind CSS   | 3        |
| TanStack Query | v5       |
| Zustand        | 4        |
| MSW            | v2       |
| React Router   | v6       |
| Recharts       | 2        |
| React Leaflet  | 4        |

---

## 🚀 Ishga tushirish

### 1. Dependencylarni o'rnatish

```bash
npm install
```

### 2. MSW Service Worker'ni sozlash

```bash
npx msw init public/ --save
```

> Bu buyruq `public/mockServiceWorker.js` faylini yaratadi — MSW uchun zarur.

### 3. Dev serverni ishga tushirish

```bash
npm run dev
```

Brauzerda: **http://localhost:5173**

---

## 🔐 Demo akkauntlar

| Rol         | Email                  | Parol     |
|-------------|------------------------|-----------|
| Super Admin | superadmin@kas.uz      | admin123  |
| KAS Admin   | admin@kas.uz           | admin123  |

---

## 📁 FSD Arxitektura

```
src/
├── app/           # Providers, Router, Global styles
├── pages/         # Route-level sahifalar
├── widgets/       # Sidebar, Header, Chat Window
├── features/      # Auth, lead-management, ai-config...
├── entities/      # Lead, Product, Store, User, Chat types
└── shared/
    ├── ui/        # DataTable, MetricCard, StatusBadge...
    ├── api/       # Axios instance + MSW handlers
    ├── lib/       # Zustand store, utils
    └── types/     # API types (api.ts)
```

---

## 📄 Sahifalar

| Sahifa            | URL             | Tavsif                          |
|-------------------|-----------------|---------------------------------|
| Dashboard         | `/`             | Metrikalar, chartlar, so'nggi leadlar |
| Leadlar           | `/leads`        | Jadval + Detail Drawer          |
| Chatlar           | `/chats`        | Telegram-style 2-panel chat     |
| Mahsulotlar       | `/products`     | Grid/Table ko'rinish + CRUD     |
| Magazinlar        | `/stores`       | Jadval + Leaflet xarita         |
| Foydalanuvchilar  | `/users`        | Bot foydalanuvchilari           |
| AI Loglar         | `/ai-logs`      | Bot so'rovlari statistikasi     |
| AI Sozlamalar     | `/ai-settings`  | Prompt, Logika, Blacklist (SA)  |

---

## 🎨 Design Tokens

```css
--background:   #0A0A0F   /* Asosiy fon */
--surface:      #13131A   /* Karta fon */
--surface-2:    #1C1C26   /* Input fon */
--border:       #2A2A3A   /* Chegara */
--primary:      #4F6EF7   /* KAS brand ko'k */
--success:      #22C55E
--warning:      #F59E0B
--danger:       #EF4444
```

---

## ⚡ Qoidalar (TZ bo'yicha)

- TypeScript — barcha komponentlar
- `interface` (type emas) — props uchun
- Zustand — faqat global UI state (sidebar, theme)
- React Query — barcha server state
- Zod + React Hook Form — forma validatsiya
- Loading state — har doim skeleton
- Error state — har doim toast + error boundary

---

## 📦 Build

```bash
npm run build
```

Output: `dist/` papkasida.
