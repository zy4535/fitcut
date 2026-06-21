# FitCut

A personal cut/bulk calorie, macro, and cardio tracker. It's a **PWA** (installable web app) with a **Supabase** backend, so it installs on your iPhone and your Windows 11 PC and stays in sync under one login. Multiple people can use it, each with their own private data and their own cut/bulk goal.

- Frontend: React + Vite
- Backend: Supabase (Postgres + Auth + Row-Level Security)
- Food data: Open Food Facts (free, no API key)
- Cardio math: ACSM treadmill metabolic equations
- Calorie math: Mifflin–St Jeor (BMR/TDEE) with cut/bulk guardrails

---

## What you need installed

- **Node.js 18 or newer** — https://nodejs.org (the LTS installer covers Windows fine)
- A free **Supabase** account — https://supabase.com
- A **GitHub** account (for deploying) — https://github.com

Check Node is ready:

```bash
node -v
```

---

## Step 1 — Get the project running locally

From this folder:

```bash
npm install
```

Don't run it yet — it needs Supabase keys first (Step 3).

---

## Step 2 — Create your Supabase project + database

1. Go to https://supabase.com → **New project**. Pick a name and a database password (save it somewhere). Wait ~2 minutes for it to provision.
2. In the project, open **SQL Editor → New query**. Open the `schema.sql` file from this project, paste the whole thing in, and click **Run**. This creates the four tables (`profiles`, `weigh_ins`, `food_log`, `cardio_log`) and turns on Row-Level Security so each user only sees their own rows.
3. Open **Authentication → Providers** and make sure **Email** is enabled (it is by default).
   - For easy testing, you can turn **off** "Confirm email" under Authentication → Providers → Email, so new accounts work instantly without an email round-trip. Turn it back on later if you want.

---

## Step 3 — Connect the app to Supabase

1. In Supabase, open **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
2. In this project, make a copy of `.env.example` named `.env`:

```bash
cp .env.example .env
```

3. Edit `.env` and paste your values:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

The anon key is safe to ship in a frontend — Row-Level Security is what protects the data, not key secrecy.

---

## Step 4 — Run it

```bash
npm run dev
```

Open the URL it prints (usually http://localhost:5173). Sign up with an email + password, then go to the **Goal** tab to set your stats. Log food, cardio, and weigh-ins. Everything saves to Supabase.

---

## Step 5 — Deploy so it's online (and installable on your phone)

A PWA needs an HTTPS URL to install. The easiest free path is Vercel:

1. Push this folder to a new GitHub repo:

```bash
git init
git add .
git commit -m "FitCut"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/fitcut.git
git push -u origin main
```

2. Go to https://vercel.com → **Add New → Project** → import the repo. Vercel auto-detects Vite (build command `npm run build`, output `dist`).
3. Before deploying, add the two environment variables in Vercel's **Environment Variables** section:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. You get a URL like `https://fitcut.vercel.app`.

(Cloudflare Pages and Netlify work the same way — build `npm run build`, output dir `dist`, same two env vars.)

---

## Step 6 — Install on your devices

- **iPhone:** open the URL in **Safari** → Share → **Add to Home Screen**.
- **Windows 11:** open the URL in **Edge** → the install icon in the address bar, or menu → **Apps → Install this site as an app**.

Sign in with the same account on both. Log something on your phone, switch to the PC, and it refreshes when the window regains focus — same data on both.

---

## How multiple users work

You don't do anything special. Each person who opens the URL signs up with their own email and gets their own `user_id`. Every row they create is stamped with it, and the Row-Level Security policies in `schema.sql` enforce that each user can only read/write their own rows. Your friend signs up, picks **Bulk** on the Goal tab, and gets surplus math; you stay on **Cut** — same app, same database, fully separate data.

---

## Project map

```
schema.sql                 SQL to run in Supabase (tables + RLS)
.env.example               template for your Supabase keys
vite.config.js             Vite + PWA (manifest, service worker)
index.html
public/                    app icons
src/
  main.jsx                 entry point
  App.jsx                  session gate: Auth screen vs. Tracker
  supabaseClient.js        Supabase connection
  Tracker.jsx              app shell: loads data, holds state, tabs
  components/
    Auth.jsx               sign in / sign up
    Today.jsx              calorie gauge + macros + pace
    Food.jsx               Open Food Facts search + day log
    Cardio.jsx             treadmill (ACSM) + other cardio
    Weight.jsx             weigh-in + trend chart
    Setup.jsx              goal: cut/bulk, stats, target date
    ui.jsx                 shared styled components + theme
  lib/
    calc.js                BMR/TDEE, targets, ACSM, MET
    foods.js               Open Food Facts search + seed fallback
    db.js                  all Supabase reads/writes
```

---

## Ideas for next

- Edit/delete past days and navigate to previous dates (the logs currently show today).
- Barcode scanning with the browser's BarcodeDetector API.
- A "my foods" / favorites table so staples are one tap.
- Live realtime sync (Supabase channels) instead of refresh-on-focus.
- Weekly trend charts and a data export.
