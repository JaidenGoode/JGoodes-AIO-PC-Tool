import type { Express, Request, Response } from "express";
import { getUncachableStripeClient } from "./stripeClient";

const PRICE_CENTS = 600;
const PRODUCT_NAME = "JGoode's A.I.O PC Tool";

// This URL always resolves to the most recently published GitHub Release asset.
// When you publish a new release with the installer attached, this link
// automatically serves the newest version — no URL change ever needed.
const DIRECT_DOWNLOAD = "https://drive.google.com/uc?export=download&id=1jl7CrQo69b0Y3mJbCjr30BUCHEEplxRo";
const FALLBACK_PAGE = "https://drive.google.com/file/d/1jl7CrQo69b0Y3mJbCjr30BUCHEEplxRo/view?usp=drive_link";
const DOWNLOAD_URL = process.env.DOWNLOAD_URL || DIRECT_DOWNLOAD;

// ── HTML helpers ──────────────────────────────────────────────────────────────

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <meta name="description" content="100 Windows tweaks, system cleaner, DNS manager, live monitoring and more. One-time purchase, $6."/>
  <meta property="og:title" content="JGoode's A.I.O PC Tool — Ultimate Windows Optimizer"/>
  <meta property="og:description" content="100 PowerShell tweaks, advanced cleaner, live hardware monitoring and more. One-time $6."/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:       #09090b;
      --bg2:      #0f0f12;
      --card:     #111115;
      --border:   #1e1e26;
      --border2:  #2a2a35;
      --red:      #dc2626;
      --red-b:    #b91c1c;
      --red-l:    #ef4444;
      --red-glow: rgba(220,38,38,0.18);
      --red-soft: rgba(220,38,38,0.08);
      --text:     #fafafa;
      --muted:    #a1a1aa;
      --muted2:   #71717a;
      --green:    #22c55e;
    }
    html { scroll-behavior: smooth; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* ── NAV ── */
    nav {
      position: sticky; top: 0; z-index: 100;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 2rem; height: 60px;
      background: rgba(9,9,11,0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }
    .nav-logo {
      display: flex; align-items: center; gap: 0.6rem;
      font-size: 0.95rem; font-weight: 800; color: var(--text); text-decoration: none;
    }
    .logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--red); flex-shrink: 0; }
    .nav-buy {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.4rem 1rem; border-radius: 8px; font-size: 0.8rem; font-weight: 700;
      background: var(--red); color: #fff; text-decoration: none;
      border: 1px solid var(--red-b);
      transition: background 0.15s, box-shadow 0.15s;
    }
    .nav-buy:hover { background: var(--red-l); box-shadow: 0 0 16px var(--red-glow); }

    /* ── HERO ── */
    .hero {
      position: relative; overflow: hidden;
      padding: 6rem 2rem 5rem; text-align: center;
    }
    .hero-glow {
      position: absolute; top: -60px; left: 50%; transform: translateX(-50%);
      width: 700px; height: 400px; pointer-events: none;
      background: radial-gradient(ellipse 60% 60% at 50% 0%, rgba(220,38,38,0.22) 0%, transparent 70%);
    }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.3rem 0.8rem; border-radius: 999px; margin-bottom: 1.5rem;
      background: var(--red-soft); border: 1px solid rgba(220,38,38,0.25);
      font-size: 0.75rem; font-weight: 700; color: var(--red-l);
      letter-spacing: 0.04em; text-transform: uppercase;
    }
    h1 {
      font-size: clamp(2.2rem, 5vw, 3.8rem);
      font-weight: 900; line-height: 1.1; letter-spacing: -0.03em;
      max-width: 820px; margin: 0 auto 1.2rem;
    }
    h1 span { color: var(--red-l); }
    .hero-sub {
      font-size: clamp(1rem, 2vw, 1.2rem); color: var(--muted);
      max-width: 560px; margin: 0 auto 2.5rem;
    }
    .hero-cta {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.85rem 2.2rem; border-radius: 12px;
      background: var(--red); color: #fff; text-decoration: none;
      font-size: 1.05rem; font-weight: 800;
      border: 1px solid var(--red-b);
      box-shadow: 0 0 32px rgba(220,38,38,0.35), 0 4px 20px rgba(0,0,0,0.5);
      transition: all 0.15s;
    }
    .hero-cta:hover { background: var(--red-l); box-shadow: 0 0 48px rgba(220,38,38,0.45), 0 4px 20px rgba(0,0,0,0.5); transform: translateY(-1px); }
    .hero-note { margin-top: 0.85rem; font-size: 0.78rem; color: var(--muted2); }

    /* ── STATS BAR ── */
    .stats {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 0;
      border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
      background: var(--bg2);
    }
    .stat {
      flex: 1; min-width: 140px; padding: 1.4rem 2rem; text-align: center;
      border-right: 1px solid var(--border);
    }
    .stat:last-child { border-right: none; }
    .stat-num {
      font-size: 1.9rem; font-weight: 900; color: var(--red-l);
      font-variant-numeric: tabular-nums; line-height: 1;
    }
    .stat-label { font-size: 0.75rem; color: var(--muted); font-weight: 600; margin-top: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }

    /* ── SECTIONS ── */
    section { padding: 5rem 2rem; max-width: 1100px; margin: 0 auto; }
    .section-tag {
      display: inline-flex; align-items: center; gap: 0.35rem;
      padding: 0.25rem 0.7rem; border-radius: 6px; margin-bottom: 0.8rem;
      background: var(--red-soft); border: 1px solid rgba(220,38,38,0.2);
      font-size: 0.7rem; font-weight: 700; color: var(--red-l); text-transform: uppercase; letter-spacing: 0.05em;
    }
    h2 {
      font-size: clamp(1.6rem, 3vw, 2.4rem); font-weight: 900;
      letter-spacing: -0.025em; line-height: 1.2; margin-bottom: 0.6rem;
    }
    .section-sub { color: var(--muted); max-width: 520px; margin-bottom: 3rem; font-size: 0.95rem; }

    /* ── FEATURES GRID ── */
    .features-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.2rem;
    }
    .feat {
      padding: 1.6rem; border-radius: 16px;
      background: var(--card); border: 1px solid var(--border);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .feat:hover { border-color: rgba(220,38,38,0.3); box-shadow: 0 0 20px rgba(220,38,38,0.07); }
    .feat-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: var(--red-soft); border: 1px solid rgba(220,38,38,0.2);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 1rem;
    }
    .feat-icon svg { width: 20px; height: 20px; stroke: var(--red-l); fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .feat h3 { font-size: 1rem; font-weight: 800; margin-bottom: 0.4rem; }
    .feat p { font-size: 0.85rem; color: var(--muted); line-height: 1.55; }
    .feat-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.9rem; }
    .feat-tag {
      padding: 0.2rem 0.55rem; border-radius: 5px;
      font-size: 0.68rem; font-weight: 700;
      background: rgba(255,255,255,0.05); border: 1px solid var(--border2);
      color: var(--muted2);
    }

    /* ── STEPS ── */
    .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; }
    .step { padding: 2rem 1.5rem; border-radius: 16px; background: var(--card); border: 1px solid var(--border); text-align: center; position: relative; }
    .step-num {
      width: 44px; height: 44px; border-radius: 50%; margin: 0 auto 1rem;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem; font-weight: 900; color: var(--red-l);
      background: var(--red-soft); border: 2px solid rgba(220,38,38,0.3);
    }
    .step h3 { font-size: 1rem; font-weight: 800; margin-bottom: 0.35rem; }
    .step p { font-size: 0.83rem; color: var(--muted); }

    /* ── PRICING ── */
    .pricing-wrap { display: flex; justify-content: center; }
    .pricing-card {
      width: 100%; max-width: 460px;
      padding: 2.5rem; border-radius: 20px;
      background: var(--card); border: 1px solid rgba(220,38,38,0.3);
      box-shadow: 0 0 60px rgba(220,38,38,0.12), 0 20px 60px rgba(0,0,0,0.5);
      text-align: center;
    }
    .pricing-badge {
      display: inline-block; padding: 0.25rem 0.75rem; border-radius: 999px; margin-bottom: 1.2rem;
      background: var(--red-soft); border: 1px solid rgba(220,38,38,0.3);
      font-size: 0.72rem; font-weight: 800; color: var(--red-l); text-transform: uppercase; letter-spacing: 0.07em;
    }
    .price { font-size: 3.5rem; font-weight: 900; color: var(--text); line-height: 1; margin-bottom: 0.2rem; }
    .price sup { font-size: 1.5rem; vertical-align: super; margin-right: 0.1rem; }
    .price-note { font-size: 0.8rem; color: var(--muted2); margin-bottom: 1.8rem; }
    .feat-list { list-style: none; text-align: left; margin-bottom: 2rem; }
    .feat-list li {
      padding: 0.5rem 0; display: flex; align-items: flex-start; gap: 0.6rem;
      font-size: 0.88rem; color: var(--muted); border-bottom: 1px solid var(--border);
    }
    .feat-list li:last-child { border-bottom: none; }
    .feat-list li::before { content: '✓'; color: var(--green); font-weight: 900; font-size: 0.9rem; flex-shrink: 0; margin-top: 0.05rem; }
    .buy-btn {
      display: block; width: 100%; padding: 1rem; border-radius: 12px; border: none; cursor: pointer;
      background: var(--red); color: #fff; font-size: 1.05rem; font-weight: 800;
      box-shadow: 0 0 24px rgba(220,38,38,0.3); transition: all 0.15s;
      text-decoration: none;
    }
    .buy-btn:hover { background: var(--red-l); box-shadow: 0 0 40px rgba(220,38,38,0.4); transform: translateY(-1px); }
    .secure-note { margin-top: 1rem; font-size: 0.75rem; color: var(--muted2); }

    /* ── FOOTER ── */
    footer {
      border-top: 1px solid var(--border); padding: 2rem; text-align: center;
      font-size: 0.78rem; color: var(--muted2);
    }
    footer a { color: var(--red-l); text-decoration: none; }
    footer a:hover { text-decoration: underline; }

    /* ── SUCCESS / CANCEL pages ── */
    .center-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem;
    }
    .result-card {
      max-width: 480px; width: 100%;
      padding: 3rem 2.5rem; border-radius: 20px; text-align: center;
      background: var(--card); border: 1px solid var(--border);
    }
    .result-icon {
      width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 1.5rem;
      display: flex; align-items: center; justify-content: center;
      font-size: 2rem;
    }
    .result-icon.ok { background: rgba(34,197,94,0.1); border: 2px solid rgba(34,197,94,0.3); }
    .result-icon.fail { background: var(--red-soft); border: 2px solid rgba(220,38,38,0.3); }
    .result-card h2 { font-size: 1.5rem; margin-bottom: 0.6rem; }
    .result-card p { color: var(--muted); margin-bottom: 1.5rem; font-size: 0.9rem; }
    .dl-btn {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.85rem 2rem; border-radius: 10px;
      background: var(--green); color: #000; font-weight: 800; font-size: 0.95rem;
      text-decoration: none; box-shadow: 0 0 20px rgba(34,197,94,0.25);
      transition: opacity 0.15s, transform 0.15s;
    }
    .dl-btn:hover { opacity: 0.9; transform: translateY(-1px); }
    .back-link { display: block; margin-top: 1.2rem; font-size: 0.8rem; color: var(--muted2); text-decoration: none; }
    .back-link:hover { color: var(--text); }

    @media (max-width: 640px) {
      nav { padding: 0 1rem; }
      .hero { padding: 4rem 1rem 3rem; }
      section { padding: 3.5rem 1rem; }
      .stat { min-width: 110px; padding: 1rem; }
    }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function landingPage(): string {
  const features = [
    {
      icon: `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
      title: "100 Windows Tweaks",
      desc: "One-click PowerShell optimizations across Privacy, Performance, Gaming, Network, and Services. Every tweak auto-detects its current state and shows Optimized or not. All reversible.",
      tags: ["Privacy", "Performance", "Gaming", "Network", "Services"],
    },
    {
      icon: `<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>`,
      title: "Advanced System Cleaner",
      desc: "Scans and removes junk from 15+ locations — temp files, browser cache (Chrome, Edge, Opera GX), Discord, Spotify, Steam, Epic, shader cache, Windows Update, Delivery Optimization, Adobe, and more.",
      tags: ["15+ Categories", "Safe to Clean", "Size Preview"],
    },
    {
      icon: `<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>`,
      title: "Live Hardware Monitor",
      desc: "Real-time CPU, RAM, GPU, and disk monitoring with usage bars and temperature display. Always visible in the dashboard so you can see the impact of every tweak.",
      tags: ["CPU", "RAM", "GPU", "Disk", "Temps"],
    },
    {
      icon: `<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,
      title: "DNS Manager",
      desc: "Switch your DNS with one click — Cloudflare (1.1.1.1), Google, Quad9, OpenDNS, NextDNS, Comodo, and more. Instantly improves DNS lookup speed and privacy.",
      tags: ["Cloudflare", "Google", "Quad9", "OpenDNS"],
    },
    {
      icon: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
      title: "System Restore Points",
      desc: "Create Windows restore points before applying any changes, and restore instantly if anything goes wrong. Full undo protection for every optimization.",
      tags: ["Create Points", "One-Click Restore", "Safe"],
    },
    {
      icon: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
      title: "System Utilities",
      desc: "Run SFC and DISM repairs, flush DNS, reset the network stack, restart Explorer, toggle Fast Startup and Location Services, schedule Check Disk, and view full hardware specs.",
      tags: ["SFC", "DISM", "Network Reset", "More"],
    },
  ];

  const steps = [
    { n: "1", title: "Purchase", desc: "One-time $6 payment via Stripe. Secure checkout, no subscription, no hidden fees." },
    { n: "2", title: "Download", desc: "Get the installer immediately after payment. A single .exe file — no account needed." },
    { n: "3", title: "Optimize", desc: "Run as Administrator, detect your system state, apply tweaks and watch your PC fly." },
  ];

  const inclusions = [
    "100 Windows Tweaks (Privacy, Performance, Gaming, Network, Services)",
    "Advanced Cleaner with 15+ categories including Discord, Spotify, Steam & Epic cache",
    "Live CPU, RAM, GPU & disk hardware monitoring",
    "DNS Manager — one-click switch to Cloudflare, Google, Quad9 and more",
    "System Restore Points — create & restore before any changes",
    "System Utilities (SFC, DISM, Network Reset, Fast Startup, and more)",
    "14 accent color themes — Crimson, Plasma, Void, Flux and more",
    "Lifetime access — one-time purchase, no subscription ever",
    "All future updates included",
  ];

  return shell("JGoode's A.I.O PC Tool — Ultimate Windows Optimizer", `
<nav>
  <a class="nav-logo" href="/store">
    <span class="logo-dot"></span>
    JGoode's A.I.O PC Tool
  </a>
  <a class="nav-buy" href="#pricing">Buy — $6</a>
</nav>

<div class="hero">
  <div class="hero-glow"></div>
  <div class="hero-badge">Windows PC Optimizer</div>
  <h1>The <span>All-In-One</span> Windows<br/>Optimizer Built for Gamers</h1>
  <p class="hero-sub">100 one-click tweaks. Advanced cleaner. Live monitoring. DNS control. Everything your PC needs — in one sleek tool.</p>
  <a class="hero-cta" href="#pricing">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
    Get It for $6 — One Time
  </a>
  <p class="hero-note">No subscription &nbsp;·&nbsp; No account required &nbsp;·&nbsp; Instant download &nbsp;·&nbsp; Windows 10/11</p>
</div>

<div class="stats">
  <div class="stat"><div class="stat-num">100</div><div class="stat-label">Tweaks</div></div>
  <div class="stat"><div class="stat-num">15+</div><div class="stat-label">Clean Categories</div></div>
  <div class="stat"><div class="stat-num">4</div><div class="stat-label">Live Monitors</div></div>
  <div class="stat"><div class="stat-num">10+</div><div class="stat-label">DNS Providers</div></div>
  <div class="stat"><div class="stat-num">14</div><div class="stat-label">Color Themes</div></div>
</div>

<section>
  <div class="section-tag">Features</div>
  <h2>Everything your PC needs, nothing it doesn't</h2>
  <p class="section-sub">Built from scratch for Windows gamers and power users who want real performance gains without bloat or risk.</p>
  <div class="features-grid">
    ${features.map(f => `
    <div class="feat">
      <div class="feat-icon"><svg viewBox="0 0 24 24"><${f.icon.startsWith('<') ? '' : 'path d="'}${f.icon}${f.icon.startsWith('<') ? '' : '"/'}/svg></div>
      <h3>${f.title}</h3>
      <p>${f.desc}</p>
      <div class="feat-tags">${f.tags.map(t => `<span class="feat-tag">${t}</span>`).join('')}</div>
    </div>`).join('')}
  </div>
</section>

<div style="background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border);">
  <section>
    <div class="section-tag">How It Works</div>
    <h2>Up and running in minutes</h2>
    <p class="section-sub">No subscriptions, no accounts. Buy once, download instantly, optimize forever.</p>
    <div class="steps">
      ${steps.map(s => `
      <div class="step">
        <div class="step-num">${s.n}</div>
        <h3>${s.title}</h3>
        <p>${s.desc}</p>
      </div>`).join('')}
    </div>
  </section>
</div>

<section id="pricing">
  <div style="text-align:center;margin-bottom:2.5rem;">
    <div class="section-tag" style="display:inline-flex;">Pricing</div>
    <h2>One price. Everything included.</h2>
    <p class="section-sub" style="margin:0 auto;">No tiers, no subscription, no upsell. $6 gets you every feature, every future update.</p>
  </div>
  <div class="pricing-wrap">
    <div class="pricing-card">
      <div class="pricing-badge">One-Time Purchase</div>
      <div class="price"><sup>$</sup>5</div>
      <div class="price-note">Pay once &nbsp;·&nbsp; Yours forever &nbsp;·&nbsp; All updates included</div>
      <ul class="feat-list">
        ${inclusions.map(i => `<li>${i}</li>`).join('')}
      </ul>
      <form method="POST" action="/store/checkout">
        <button type="submit" class="buy-btn">
          Buy Now — $6
        </button>
      </form>
      <div class="secure-note">🔒 Secure checkout powered by Stripe &nbsp;·&nbsp; Card, Apple Pay, Google Pay</div>
    </div>
  </div>
</section>

<footer>
  <p>© 2025 JaidenGoode &nbsp;·&nbsp; <a href="https://github.com/JaidenGoode/JGoode-s-AIO-PC-Tool" target="_blank" rel="noopener">GitHub</a> &nbsp;·&nbsp; Windows 10 / 11 only &nbsp;·&nbsp; Run as Administrator</p>
</footer>
`);
}

function successPage(downloadUrl: string): string {
  return shell("Payment Successful — JGoode's A.I.O PC Tool", `
<div class="center-page">
  <div class="result-card">
    <div class="result-icon ok">✓</div>
    <h2>Payment Successful!</h2>
    <p>Thank you for your purchase. Your download is ready — click below to get the <strong>latest version</strong> of JGoode's A.I.O PC Tool.</p>
    <a class="dl-btn" href="${downloadUrl}" target="_blank" rel="noopener">
      ↓ Download Latest Installer (.exe)
    </a>
    <p style="margin-top:1.2rem;font-size:0.78rem;color:var(--muted2);">Run as <strong>Administrator</strong> for full functionality &nbsp;·&nbsp; Windows 10/11 x64 only.</p>
    <p style="margin-top:0.6rem;font-size:0.75rem;color:var(--muted2);">
      Download not starting? <a href="${FALLBACK_PAGE}" target="_blank" rel="noopener" style="color:var(--red-l);">Open releases page</a>
      and download <code style="background:rgba(255,255,255,0.07);padding:0.1rem 0.35rem;border-radius:4px;font-size:0.72rem;">JGoode's A.I.O PC Tool Setup.exe</code>
    </p>
    <a class="back-link" href="/store">← Back to store</a>
  </div>
</div>
`);
}

function cancelPage(): string {
  return shell("Purchase Cancelled — JGoode's A.I.O PC Tool", `
<div class="center-page">
  <div class="result-card">
    <div class="result-icon fail">✕</div>
    <h2>Purchase Cancelled</h2>
    <p>No charge was made. If you had any trouble with checkout, please try again.</p>
    <a class="dl-btn" href="/store" style="background:var(--red);color:#fff;box-shadow:0 0 20px rgba(220,38,38,0.25);">
      ← Back to Store
    </a>
  </div>
</div>
`);
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerStoreRoutes(app: Express): void {
  // Landing page
  app.get(["/", "/store"], (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html");
    res.send(landingPage());
  });

  // Create Stripe checkout session
  app.post("/store/checkout", async (_req: Request, res: Response) => {
    const stripe = await getUncachableStripeClient();
    if (!stripe) {
      return res.status(503).send(shell("Unavailable", `
        <div class="center-page"><div class="result-card">
          <div class="result-icon fail">!</div>
          <h2>Checkout Unavailable</h2>
          <p>Payment processing is not yet configured. Please check back soon.</p>
          <a class="back-link" href="/store">← Back to store</a>
        </div></div>`));
    }

    try {
      const host = _req.headers.host || "localhost:5000";
      const protocol = _req.headers["x-forwarded-proto"] || "http";
      const base = `${protocol}://${host}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: PRODUCT_NAME,
              description: "100 Windows tweaks, advanced cleaner, live monitoring, DNS manager and more. Windows 10/11.",
            },
            unit_amount: PRICE_CENTS,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${base}/store/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/store/cancel`,
      });

      res.redirect(303, session.url!);
    } catch (err: any) {
      console.error("[store] Stripe error:", err.message);
      res.status(500).send(shell("Checkout Error", `
        <div class="center-page"><div class="result-card">
          <div class="result-icon fail">!</div>
          <h2>Checkout Error</h2>
          <p>Something went wrong. Please try again.</p>
          <a class="back-link" href="/store">← Back to store</a>
        </div></div>`));
    }
  });

  // Success page — verify payment then show download
  app.get("/store/success", async (req: Request, res: Response) => {
    const sessionId = req.query.session_id as string;
    if (!sessionId) return res.send(successPage(DOWNLOAD_URL));

    try {
      const stripe = await getUncachableStripeClient();
      if (!stripe) return res.send(successPage(DOWNLOAD_URL));

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        return res.send(successPage(DOWNLOAD_URL));
      }
      res.redirect("/store/cancel");
    } catch {
      res.send(successPage(DOWNLOAD_URL));
    }
  });

  // Cancel page
  app.get("/store/cancel", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html");
    res.send(cancelPage());
  });

  // Stripe webhook for reliability
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    try {
      const event = req.body;
      if (event?.type === "checkout.session.completed") {
        const session = event.data.object;
        console.log(`[store] Payment complete: ${session.id} — ${session.customer_email || "no email"}`);
      }
      res.json({ received: true });
    } catch (err: any) {
      console.error("[store] Webhook error:", err.message);
      res.status(400).json({ error: err.message });
    }
  });
}
