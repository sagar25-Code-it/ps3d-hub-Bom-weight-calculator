# PS3D Hub — Part & BOM Weight Calculator

Part weight calculator and Bill of Materials calculator for IS-standard
materials and structural shapes. 22 shapes, 151 material grades, BOM table
with up to 100 rows, print-ready reports.

No framework, no build step, no npm dependencies — just static HTML/CSS/JS
plus one small serverless function for contact details.

## Project structure

```
├── index.html        the entire app (calculator + BOM builder)
├── logo.png           PS3D Hub logo, used in the header
├── favicon.png
├── api/
│   └── contact.js     serverless function — serves contact details from env vars
├── .env.example       template showing which env vars are needed (safe to commit)
├── .env                real values for local dev (gitignored, NOT committed)
└── .gitignore
```

## How the contact info / .env setup actually works

This is a static site, so `index.html` itself cannot read a `.env` file —
browsers have no access to server environment variables. Instead:

1. Real contact details (name, phone, email, location) live only in
   environment variables — in `.env` locally, and in the Vercel dashboard
   in production. They are **never** written into `index.html` or committed
   to git.
2. `api/contact.js` is a tiny serverless function. Vercel runs it on the
   server, where it reads `process.env.CONTACT_*` and returns that as JSON.
3. On page load, `index.html` calls `fetch('/api/contact')` and fills in
   the header/footer with whatever comes back.
4. If that endpoint isn't available — for example if you just double-click
   `index.html` and open it directly in a browser (`file://`), where there's
   no server to run the function — the page quietly falls back to showing
   just the location text already in the HTML, instead of breaking.

This means the public GitHub repo never contains your phone number or email
in plain text anywhere, even though the live site displays them.

## Run locally

You need the [Vercel CLI](https://vercel.com/docs/cli) to run the serverless
function locally (a plain `file://` open will show the calculator fine, but
the header/footer contact info will show the fallback location text only,
since there's no server to answer `/api/contact`).

```bash
npm install -g vercel
vercel dev
```

This reads `.env` automatically and serves the site at `http://localhost:3000`
with the API working.

## Deploy — GitHub + Vercel

1. **Push to GitHub.**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
   `.env` will **not** be pushed — `.gitignore` excludes it. Only
   `.env.example` (with placeholder values) goes to GitHub, so the repo is
   safe to make public.

2. **Import into Vercel.**
   Go to [vercel.com/new](https://vercel.com/new), select your GitHub repo,
   and import it. Vercel auto-detects this as a static project with a
   serverless function — no build command or output directory needs to be
   set.

3. **Add environment variables in Vercel.**
   In the project on Vercel: **Settings → Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `CONTACT_NAME` | Sagar Patel |
   | `CONTACT_BRAND` | PS3D Hub |
   | `CONTACT_PHONE` | +91 8401489892 |
   | `CONTACT_EMAIL` | 84014sagar@gmail.com |
   | `CONTACT_LOCATION` | Bengaluru, India |

   Apply them to Production (and Preview/Development if you want them there
   too), then redeploy.

4. **Done.** Your site is live at `<project>.vercel.app`, or attach a custom
   domain under Settings → Domains.

## Making the repo public

Since real contact details only ever live in Vercel's environment variables
(not in git), it's safe to make the GitHub repository public — anyone
viewing the source will only see `.env.example` with placeholder text.

## Updating shape/material data

All shapes and materials live in two arrays near the top of the `<script>`
block in `index.html` — `SHAPES` and `MAT`. Both are plain JavaScript
objects with a formula function per shape and a density per material, so
adding a new entry is a matter of adding one more object to the array in
the same format as its neighbors.
