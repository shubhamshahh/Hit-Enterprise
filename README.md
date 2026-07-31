# Hit Enterprise — Website + Chemical Request Backend

A full-stack site for an industrial chemical supplier: marketing pages, a
product catalogue, and a "Request a Chemical" form that saves inquiries on
the server and shows them in a password-protected admin view.

## What's inside

```
hit-enterprise/
├── server/
│   ├── index.js       # Express app: serves the site + API routes
│   └── db.js           # Simple JSON-file storage for inquiries (no database setup needed)
├── public/
│   ├── index.html      # Main site
│   ├── admin.html       # Staff login + requests table
│   ├── styles.css
│   ├── script.js
│   └── admin.js
├── data/
│   └── inquiries.json  # Where submitted requests are stored
├── .env.example
└── package.json
```

No external database is required — inquiries are stored in `data/inquiries.json`
on the server. This is simple and reliable for a small-to-medium volume of
requests. If you outgrow it later, swap `server/db.js` for a real database
(e.g. Postgres) without touching the frontend.

## 1. Run it locally

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
cd hit-enterprise
npm install
cp .env.example .env      # then edit .env and set your own ADMIN_PASSWORD
npm start
```

Open **http://localhost:3000** for the site, and
**http://localhost:3000/admin.html** for the staff view (password = whatever
you set as `ADMIN_PASSWORD`).

## 2. Edit the content to match your business

Everything is plain HTML/CSS/JS, so it's easy to change without touching the
backend:

- **Company details, copy, phone/email/address:** edit `public/index.html`.
- **Product list:** duplicate a `.product-card` block in `index.html` for
  each chemical you stock.
- **Colors/fonts:** edit the `:root` variables at the top of `public/styles.css`.
- **Logo:** the current logo is a CSS-drawn mark (`.logo-mark`) — replace it
  with an `<img>` tag if you have a real logo file.

## 3. Put it online (choose one host)

Any Node-friendly host works. Two easy, free-tier-friendly options:

### Option A — Render.com
1. Push this folder to a GitHub repository.
2. On [render.com](https://render.com), create a **New Web Service**, connect
   the repo.
3. Build command: `npm install` — Start command: `npm start`.
4. Add an environment variable `ADMIN_PASSWORD` with your own password.
5. Deploy. Render gives you a free `https://your-app.onrender.com` URL immediately.

### Option B — Railway.app
1. Push to GitHub, then "New Project" → "Deploy from GitHub repo" on
   [railway.app](https://railway.app).
2. Railway auto-detects Node and runs `npm start`.
3. Add the `ADMIN_PASSWORD` environment variable in the Railway dashboard.
4. Deploy — you'll get a `https://your-app.up.railway.app` URL.

(Vercel/Netlify are built for static sites + serverless functions, so they'd
need the API routes restructured — Render/Railway run this Express app as-is
with no changes.)

## 4. Connect a `.com` domain

Buying and pointing a domain is two separate, unrelated steps:

1. **Buy the domain** from any registrar — e.g. GoDaddy, Namecheap, Google
   Domains successor Squarespace Domains, or Hostinger. This is a purchase I
   can't make on your behalf; it needs your own account and payment.
2. **Point it at your host:** once deployed (step 3), your host (Render/Railway)
   gives you a custom-domain option in its dashboard. You add your domain
   there, then add the CNAME/A record it gives you at your registrar's DNS
   settings. Propagation usually takes anywhere from a few minutes to a few
   hours.

After that, `https://hitenterprise.com` (or whatever you buy) will load this
site directly — no "Google upload" step needed; DNS is what makes a domain
point at your hosted app.

## 5. Get a WhatsApp notification for every new request

The server can ping your own WhatsApp the moment someone submits the
request form, using [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/)
(free, no business account or approval process needed):

1. Save **+34 644 59 71 45** as a contact on your phone.
2. Send that contact the WhatsApp message: `I allow callmebot to send me messages`
3. It replies with an API key (a short number) within a minute or two.
4. In your `.env` (or your host's environment variables), set:
   ```
   WHATSAPP_NOTIFY_ENABLED=true
   WHATSAPP_PHONE=919998887777      # your number, country code, no + or spaces
   WHATSAPP_APIKEY=123456           # the key CallMeBot sent you
   ```
5. Restart the server. Every new request now also lands in your WhatsApp,
   in addition to showing up in `/admin.html`.

This only notifies **you** (or whatever single number you configure) — it
doesn't message customers. If you later want to message customers on
WhatsApp (e.g. confirming their quote), that requires the official
[Meta WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp)
or a provider like [Twilio](https://www.twilio.com/whatsapp), both of which
need business verification and aren't free. The integration lives entirely
in `server/notify.js` — swap that one file's contents when you're ready to
move to either, nothing else needs to change.

## 6. Security notes before going live

- Change `ADMIN_PASSWORD` in your host's environment variables — don't leave
  the default.
- The admin password is sent over HTTPS once deployed on Render/Railway
  (both provide HTTPS automatically), so it isn't sent in plain text.
- Consider adding email notifications (e.g. via
  [Resend](https://resend.com) or [Nodemailer](https://nodemailer.com) with
  an SMTP account) if you want an email alert for every new request in
  addition to the admin view — happy to add this if useful.
