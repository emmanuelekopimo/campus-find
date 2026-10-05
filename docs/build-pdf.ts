/**
 * Rebuilds docs/CampusFind-Documentation.pdf.
 *   npm run build && npm run test:e2e && npm run docs:pdf
 * Uses the test database reseeded with CAMPUSFIND_TODAY=2026-10-05 so screenshots are repeatable.
 */
import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Page } from "@playwright/test";
import { createPool, makeDb } from "../src/db";
import { resetDb, seed } from "../src/db/seed-data";
import { resolveNow } from "../src/lib/today";
import { baseCss, capture, figure, fontFace, printPdf, type Shot } from "./pdf-engine";

const require = createRequire(import.meta.url);
const TODAY = "2026-10-05";
const PORT = 3320;
const BASE = `http://localhost:${PORT}`;
const DB_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/campusfind_test";
const ACCENT = "#ff5a36";

async function reseed() {
  const pool = createPool(DB_URL);
  const d = makeDb(pool);
  await migrate(d, { migrationsFolder: "drizzle" });
  await resetDb(d);
  const r = await seed(d, resolveNow(TODAY));
  await pool.end();
  return r;
}

async function waitHealthy() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("server did not start");
}

function testCounts() {
  execSync("npx vitest run --reporter=json --outputFile=test-results/vitest.json", { stdio: "ignore" });
  const v = JSON.parse(readFileSync("test-results/vitest.json", "utf8"));
  const files = v.testResults as { name: string; assertionResults: { status: string }[] }[];
  const count = (dir: string) => files.filter((f) => f.name.includes(`/tests/${dir}/`)).reduce((s, f) => s + f.assertionResults.filter((a) => a.status === "passed").length, 0);
  let e2e = { passed: 0, total: 0, mobile: 0 };
  if (existsSync("test-results/e2e.json")) {
    const p = JSON.parse(readFileSync("test-results/e2e.json", "utf8"));
    e2e = { passed: p.stats.expected, total: p.stats.expected + p.stats.unexpected + p.stats.flaky, mobile: 0 };
    const walk = (s: { specs?: { tests: { projectName: string }[] }[]; suites?: unknown[] }): void => {
      for (const sp of s.specs ?? []) for (const t of sp.tests) if (t.projectName === "mobile") e2e.mobile++;
      for (const c of (s.suites ?? []) as (typeof s)[]) walk(c);
    };
    for (const s of p.suites) walk(s);
  }
  return { unit: count("unit"), integration: count("integration"), vitestFailed: v.numFailedTests as number, e2e };
}

const login = async (page: Page, as: string) => {
  await page.goto(`${BASE}/login`);
  if (as !== "demo") await page.fill("#email", as);
  await page.getByTestId("sign-in").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
};

const openItem = (title: string) => async (page: Page) => {
  await page.goto(`${BASE}/?q=${encodeURIComponent(title)}&status=`);
  await page.getByTestId("item-card").filter({ hasText: title }).first().click();
  await page.waitForURL(/\/items\/\d+/);
  await page.getByTestId("item-title").waitFor();
};

async function main() {
  // Run the test suites first: integration tests reuse and change the test database.
  const counts = testCounts();
  const seeded = await reseed();
  const server = spawn("node_modules/.bin/next", ["start", "-p", String(PORT)], {
    detached: true,
    env: { ...process.env, DATABASE_URL: DB_URL, CAMPUSFIND_TODAY: TODAY, SESSION_SECRET: "docs-secret-campusfind-0123456789", NODE_ENV: "production" },
    stdio: "ignore",
  });
  try {
    await waitHealthy();
    const shots: Shot[] = [
      { key: "login", path: "/login", callouts: [
        { selector: ".login-art .over", text: "Brand panel with a real campus photo (Creative Commons), shown in greyscale to fit the black theme." },
        { selector: "#email", text: "Email and password are prefilled with the demo student, Ini Ekpo." },
        { selector: "[data-testid=sign-in]", text: "Continue posts to a Server Action, checks the bcrypt hash and sets a signed JWT in an HTTP-only cookie." },
        { selector: ".demo", text: "Every seeded student uses the same password, which makes it easy to sign in as the other side of a claim." },
      ] },
      { key: "feed", path: "/", as: "demo", callouts: [
        { selector: ".side nav", text: "Sidebar: Feed, Post item, My posts and My claims. The white badge counts new claims waiting on your posts." },
        { selector: ".prompt input", text: "One search box for titles, details and places." },
        { selector: ".prompt .seg", text: "All, Lost or Found toggle." },
        { selector: ".stats", text: "Live totals: open lost, open found and items returned in the last 30 days." },
        { selector: ".cats", text: "Category filters. Filters live in the URL." },
      ] },
      { key: "grid", path: "/", as: "demo", scrollTo: ".feed-head", callouts: [
        { selector: "[data-testid=type-tag]", text: "LOST or FOUND tag with a red or green dot." },
        { selector: ".feed-head .seg", text: "Active posts or items already returned to their owners." },
        { selector: "[data-testid=item-card] .foot", text: "Category, how long ago, and how many people have responded." },
        { selector: ".card .placeholder", text: "Posts without a photo get a category icon instead." },
      ] },
      { key: "post", path: "/post", as: "demo", height: 1040, prepare: async (p) => { await p.getByTestId("submit-item").click(); await p.getByText("Choose lost or found").waitFor(); }, callouts: [
        { selector: ".form-error", text: "Summary when something is missing." },
        { selector: ".type-toggle", text: "Lost or Found choice. Zod reports 'Choose lost or found' inline when it is skipped." },
        { selector: ".field[data-invalid=true] .error", nth: 1, text: "Each field shows its own error right under the input." },
        { selector: "#happenedOn", text: "Date defaults to today. Future dates and dates older than 6 months are rejected." },
        { selector: ".drop", text: "Photo picker with a live preview. Uploads are checked for type and size and stored in Postgres." },
      ] },
      { key: "posted", path: "/post", as: "demo", height: 1250, prepare: async (p) => {
          await p.locator(".type-toggle label", { hasText: "Found something" }).click();
          await p.fill("#title", "Black scientific calculator");
          await p.selectOption("#category", "Electronics");
          await p.fill("#location", "Faculty of Science");
          await p.fill("#description", "Found a black Casio calculator under a seat in Lecture Theatre 2 after the test.");
          await p.getByTestId("photo-input").setInputFiles(path.join(process.cwd(), "public/demo/found-calculator.jpg"));
          await p.getByTestId("submit-item").click();
          await p.waitForURL(/posted=1/);
          await p.waitForLoadState("networkidle");
        }, callouts: [
        { selector: "[data-testid=posted-notice]", text: "Straight after posting, the page says how many possible matches were found." },
        { selector: ".photo", text: "The uploaded photo, served from /api/images/[id]." },
        { selector: "[data-testid=match]", text: "Top match: the lost Casio fx-991ES. Same category, shared words, same place, lost the day before." },
        { selector: "[data-testid=match-score]", text: "Score out of 100 with a label (Strong, Likely or Possible)." },
        { selector: "[data-testid=match] .reasons", nth: 1, text: "Reasons are listed so students can see why a post was suggested." },
      ] },
      { key: "claim", path: "/", as: "demo", height: 1000, prepare: openItem("Earbuds charging case found in library reading room"), callouts: [
        { selector: "[data-testid=contact]", text: "Contact the poster by email, phone or WhatsApp (link built from the Nigerian number)." },
        { selector: "#message", text: "Claim message: the owner describes something only they would know." },
        { selector: "[data-testid=send-claim]", text: "Sends the claim. A student can claim an item once; their own posts cannot be claimed." },
        { selector: "[data-testid=match]", text: "The demo student's own lost earbuds show up as a strong match." },
      ] },
      { key: "owner", path: "/", as: "demo", height: 1000, prepare: openItem("Brown leather wallet with ATM card"), callouts: [
        { selector: "[data-testid=owner-panel] h3", text: "Only the poster sees the messages on a post." },
        { selector: "[data-testid=claim]", text: "A detailed claim: bank name and amount. Accept or Decline." },
        { selector: "[data-testid=claim]", nth: 1, text: "A vague claim that the poster can decline." },
        { selector: "[data-testid=resolve]", text: "Mark as returned closes the post and moves it to the Returned tab." },
        { selector: "[data-testid=match]", text: "The matching lost wallet, posted by the student who sent the detailed claim." },
      ] },
      { key: "mine", path: "/mine", as: "demo", callouts: [
        { selector: "[data-testid=my-item]", text: "Your own posts only. New claims are highlighted." },
        { selector: ".page-head .btn", text: "Shortcut to post another item." },
      ] },
      { key: "mfeed", path: "/", as: "demo", mobile: true, callouts: [
        { selector: ".mtop", text: "On phones the sidebar becomes a top bar." },
        { selector: ".prompt", text: "Search and the Lost or Found toggle stay together." },
        { selector: ".mtabs", text: "Bottom tab bar for the four main screens." },
      ] },
      { key: "mitem", path: "/", as: "demo", mobile: true, scrollTo: "[data-testid=owner-panel]", prepare: openItem("Brown leather wallet with ATM card"), callouts: [
        { selector: "[data-testid=owner-panel] h3", text: "Messages on your post, under the photo and details." },
        { selector: "[data-testid=accept-claim]", text: "Accept and Decline buttons sized for thumbs." },
        { selector: "[data-testid=resolve]", text: "Mark as returned, full width." },
      ] },
    ];
    const caps = await capture(BASE, shots, login, ".side,.mtop{position:static!important}.mtabs{position:absolute!important;top:776px!important;bottom:auto!important}");
    const f = (p: string) => require.resolve(p);
    const fonts = fontFace("Geist", f("@fontsource-variable/geist/files/geist-latin-wght-normal.woff2")) + fontFace("GeistMono", f("@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2"));
    const css = baseCss({ bg: "#ffffff", ink: "#0a0a0a", muted: "#6b6b6b", line: "#e3e3e3", accent: "#0a0a0a", head: '"Geist", sans-serif', body: '"Geist", sans-serif', mono: '"GeistMono", monospace' });
    const fig = (k: string, cap: string) => figure(caps[k], cap, ACCENT);
    const e2eLine = counts.e2e.total ? `${counts.e2e.passed} of ${counts.e2e.total} passed (${counts.e2e.total - counts.e2e.mobile} desktop, ${counts.e2e.mobile} mobile)` : "run npm run test:e2e first";
    const logo = readFileSync("public/logo.svg", "utf8");

    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}${css}
.cover{background:#000;color:#f4f4f4;margin:-16mm -15mm 0;padding:24mm 18mm;height:297mm}
.cover .muted{color:#9a9a9a} .cover .kpi{border-color:#2c2c2c} .cover h1{font-size:44pt;letter-spacing:-0.03em;margin-top:26mm}
.cover .logo svg{width:70px;height:70px} .eyebrow{font-family:"GeistMono";font-size:9pt;letter-spacing:0.14em;text-transform:uppercase;color:#888}
h2{letter-spacing:-0.02em} .tagdot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}
</style></head><body>
<section class="cover">
  <div class="logo">${logo}</div>
  <p class="eyebrow" style="margin-top:20mm">University of Uyo · 300 level project</p>
  <h1>campusfind</h1>
  <p style="font-size:15pt" class="muted">Lost and found for the whole campus, with automatic match suggestions.</p>
  <div class="kpis" style="margin-top:14mm">
    <div class="kpi"><b>${seeded.items}</b>seeded posts</div>
    <div class="kpi"><b>${seeded.users}</b>students</div>
    <div class="kpi"><b>${seeded.claims}</b>claims</div>
  </div>
  <h3 style="margin-top:12mm">Contents</h3>
  <ol class="toc muted"><li>Overview</li><li>How the core logic works</li><li>Architecture and data model</li><li>Screen walkthrough</li><li>Mobile view</li><li>Running locally</li><li>Testing</li><li>Deployment</li><li>Five minute presentation script</li></ol>
  <p class="muted" style="margin-top:16mm">Demo login: student@uniuyo.edu.ng / student123 (Ini Ekpo). Screens captured with the clock frozen at ${TODAY}.</p>
</section>

<section class="section"><h2>1. Overview</h2>
<p>Lost items on campus are usually announced in a few WhatsApp groups and then forgotten. Finders do not know who to give things to, and owners do not know where to look. campusfind gives every lost or found item one post with a photo, a category, a place and a date, and then suggests posts that look like the same item.</p>
<table><tr><th>Feature</th><th>Details</th></tr>
<tr><td>Post an item</td><td>Lost or found, title, category, place (with suggestions), date, details and an optional photo.</td></tr>
<tr><td>Search and filter</td><td>Free text search, Lost/Found toggle, 10 categories, Active or Returned.</td></tr>
<tr><td>Possible matches</td><td>Every post lists open posts of the opposite type that are probably the same item, with a score and reasons.</td></tr>
<tr><td>Contact the poster</td><td>Email, phone and WhatsApp links on every post.</td></tr>
<tr><td>Claims</td><td>Send a claim with a message only the owner could write. The poster accepts or declines.</td></tr>
<tr><td>Mark as claimed and resolved</td><td>Accepting a claim marks the item Claimed and declines the others. Marking it returned closes the post.</td></tr>
<tr><td>Privacy</td><td>Claims are only visible to the poster. My posts and My claims only show the signed-in student's own rows.</td></tr></table>
<h3>Design</h3><p>The interface follows the visual style of Grok: a black canvas, white text, thin grey borders, rounded pill controls, a large prompt-style search box and monospace labels. It is a normal web app, not a chatbot.</p>
</section>

<section class="section"><h2>2. How the core logic works</h2>
<p>The rules are pure functions in <code>src/lib/matching.ts</code> and <code>src/lib/items.ts</code>. They take "today" as an argument. Set <code>CAMPUSFIND_TODAY=YYYY-MM-DD</code> to freeze the clock for demos and tests.</p>
<h3>Possible match score (0 to 100)</h3>
<table><tr><th>Signal</th><th>Points</th><th>Notes</th></tr>
<tr><td>Hard filters</td><td>score 0</td><td>Same type (two lost posts), same poster, a resolved post, or found more than 1 day before it was lost or more than 45 days after.</td></tr>
<tr><td>Same category</td><td>+35</td><td>Different categories only match if they share at least 2 words.</td></tr>
<tr><td>Shared words</td><td>up to +40</td><td>Word overlap of title and details (Jaccard x 100) plus 8 per shared title word.</td></tr>
<tr><td>Same place</td><td>+15 (or +7 nearby)</td><td>Nearby means a shared place word, ignoring generic words like Main, Campus or Faculty.</td></tr>
<tr><td>Time gap</td><td>+10 within 3 days, +5 within 14</td><td>Measured from the lost date to the found date.</td></tr></table>
<p>Only scores of 45 or more are shown, best first, top 5. Labels: 80+ Strong, 62+ Likely, otherwise Possible.</p>
<h3>Words</h3>
<p><code>tokenize</code> lowercases the text, drops punctuation, numbers and common words (my, lost, near, the), removes plural endings (keys to key, batteries to battery) and maps brands and synonyms to one word: iPhone, Tecno and Samsung become phone; AirPods and Oraimo become earbud; backpack and handbag become bag; specs and spectacles become glass. So "Black Oraimo earbuds" matches "earbuds charging case".</p>
<h3>Claim rules</h3>
<pre>claimBlocker(item, user, alreadyClaimed)
  own post        -> "This is your own post"
  resolved        -> "This item has been returned to its owner"
  claimed         -> "The poster has already accepted a claim"
  already sent    -> "You have already sent a message about this item"
  otherwise       -> allowed</pre>
<p><code>decideClaim</code> runs in a transaction and locks the item row. Accepting one claim sets it to accepted, declines the other pending claims and sets the item to <b>claimed</b>. Only the poster can accept, decline or mark the item <b>resolved</b>. A unique constraint on (item_id, claimant_id) stops duplicate claims.</p>
<h3>Other rules</h3>
<p>Dates cannot be in the future or older than 6 months. Open posts older than 30 days get an "Old post" flag. Phone numbers like 0803 123 4567 become WhatsApp links with the +234 prefix.</p>
</section>

<section class="section"><h2>3. Architecture and data model</h2>
<div class="diagram">
<div class="node"><b>Browser</b>Server-rendered pages. Client components only for the post form (photo preview), claim form and live refresh.</div>
<div class="node"><b>Next.js 16 App Router</b>Server Components read, Server Actions write. proxy.ts redirects visitors without a session. /api/health pings Postgres.</div>
<div class="node"><b>PostgreSQL</b>Drizzle ORM schema and SQL migrations from drizzle-kit. Uploaded photos are stored as bytea.</div></div>
<table><tr><th>Table</th><th>Columns</th><th>Rules</th></tr>
<tr><td>users</td><td>id, name, email, phone, password_hash, role, department, created_at</td><td>email unique</td></tr>
<tr><td>items</td><td>id, type (lost, found), title, description, category, location, happened_on, image_url, status (open, claimed, resolved), posted_by, created_at, resolved_at</td><td>indexes on type+status, category, posted_by</td></tr>
<tr><td>claims</td><td>id, item_id, claimant_id, message, contact, status (pending, accepted, declined), created_at</td><td>unique (item_id, claimant_id), message at least 10 characters, cascades</td></tr>
<tr><td>uploads</td><td>id (uuid), mime, data (bytea), uploaded_by, created_at</td><td>served by /api/images/[id]</td></tr></table>
<table><tr><th>Route</th><th>Purpose</th></tr>
<tr><td>/login</td><td>Sign in (demo prefilled)</td></tr><tr><td>/</td><td>Feed with search and filters</td></tr>
<tr><td>/post</td><td>Post a lost or found item</td></tr><tr><td>/items/[id]</td><td>Item, contact, claim form or owner panel, possible matches</td></tr>
<tr><td>/mine, /claims</td><td>The signed-in student's posts and claims</td></tr><tr><td>/api/health, /api/images/[id]</td><td>Health check, uploaded photos</td></tr></table>
</section>

<section class="section"><h2>4. Screen walkthrough</h2><h3>Sign in</h3>${fig("login", "Sign-in page.")}</section>
<section class="section"><h3>Feed</h3>${fig("feed", "Top of the feed.")}</section>
<section class="section"><h3>Item cards</h3>${fig("grid", "Latest posts.")}</section>
<section class="section"><h3>Post form with errors</h3>${fig("post", "Submitting the post form empty.")}</section>
<section class="section"><h3>After posting: possible matches</h3>${fig("posted", "A found calculator posted with a photo. The matching lost calculator is first.")}</section>
<section class="section"><h3>Claiming a found item</h3>${fig("claim", "The demo student looking at earbuds someone found.")}</section>
<section class="section"><h3>Owner view</h3>${fig("owner", "The demo student's own found wallet with two claims.")}</section>
<section class="section"><h3>My posts</h3>${fig("mine", "Posts by the signed-in student.")}</section>

<section class="section"><h2>5. Mobile view</h2><p>Grids use <code>minmax(0, 1fr)</code> so nothing pushes the page sideways. The mobile e2e test runs on a Pixel 7 profile and fails on horizontal scroll.</p>${fig("mfeed", "Feed on a phone.")}</section>
<section class="section">${fig("mitem", "Claims on the wallet post, on a phone.")}</section>

<section class="section"><h2>6. Running locally</h2>
<pre>service postgresql start
sudo -u postgres createdb campusfind
sudo -u postgres createdb campusfind_test
cp .env.example .env      # DATABASE_URL, SESSION_SECRET
npm install
npm run db:migrate
npm run db:seed           # resets and seeds posts dated relative to today
npm run dev               # http://localhost:3000</pre>
<table><tr><th>Script</th><th>What it does</th></tr>
<tr><td>dev / build / start</td><td>Development server, production build, production server</td></tr>
<tr><td>start:prod</td><td>Migrate, seed only when empty, next start -H 0.0.0.0 (Railway)</td></tr>
<tr><td>db:generate, db:migrate, db:seed</td><td>New migration, apply migrations, reset and seed</td></tr>
<tr><td>test:unit, test:integration, test:e2e</td><td>Test suites</td></tr>
<tr><td>docs:pdf</td><td>Rebuild this PDF</td></tr></table>
<p>For the live demo, a sample photo is included at <code>public/demo/found-calculator.jpg</code>.</p>
</section>

<section class="section"><h2>7. Testing</h2>
<div class="kpis"><div class="kpi"><b>${counts.unit}</b>unit tests passed</div><div class="kpi"><b>${counts.integration}</b>integration tests passed</div><div class="kpi"><b>${counts.e2e.passed}</b>e2e tests passed</div></div>
<table><tr><th>Suite</th><th>Covers</th></tr>
<tr><td>Unit (Vitest)</td><td>Tokenizer, stemming and synonyms, match score and its hard filters, symmetry, ranking, claim and resolve rules, date labels and validation, WhatsApp links, Zod schemas, photo checks, JWT sessions.</td></tr>
<tr><td>Integration (Vitest + Postgres)</td><td>Seed volume and states, matches for a newly posted calculator, claim once, no claims on own post, claims hidden from non-owners, accept declines others then resolve, unique constraint, scoping of My posts, search and filters.</td></tr>
<tr><td>End to end (Playwright)</td><td>Login redirect and prefill, search with type filter, inline errors, posting a found item with a photo and seeing the match, a full claim then accept then resolve between two browser sessions, and a mobile run with no sideways scroll.</td></tr></table>
<p>Latest run: unit ${counts.unit}, integration ${counts.integration}, ${counts.vitestFailed} failed; e2e ${e2eLine}.</p>
</section>

<section class="section"><h2>8. Deployment</h2>
<p>campusfind runs on Railway in the <b>school-projects</b> project as the <b>campus-find</b> service, with its own <b>campus-find-postgres</b> database. The GitHub repository is connected, so each push to main deploys.</p>
<table><tr><th>Setting</th><th>Value</th></tr>
<tr><td>Build</td><td>npm run build</td></tr><tr><td>Start</td><td>npm run start:prod</td></tr>
<tr><td>Health check</td><td>/api/health (503 if Postgres is unreachable)</td></tr>
<tr><td>DATABASE_URL</td><td>\${{campus-find-postgres.DATABASE_URL}}</td></tr>
<tr><td>SESSION_SECRET</td><td>random value</td></tr><tr><td>NODE_ENV</td><td>production</td></tr></table>
</section>

<section class="section"><h2>9. Five minute presentation script</h2>
<table class="script"><tr><th>Time</th><th>What to do and say</th></tr>
<tr><td>0:00</td><td>Problem: lost items are announced in WhatsApp groups and forgotten. campusfind keeps every lost and found item in one searchable place and suggests matches.</td></tr>
<tr><td>0:30</td><td>Sign in with the prefilled demo account. Show the search box, the Lost/Found toggle, the totals and category chips. Search "keys".</td></tr>
<tr><td>1:10</td><td>Click Post item. Submit it empty to show the inline errors. Then choose Found, title "Black scientific calculator", Electronics, Faculty of Science, a short description, and attach public/demo/found-calculator.jpg.</td></tr>
<tr><td>2:00</td><td>Post. The page says it found possible matches. The lost Casio fx-991ES is first with a high score. Read out the reasons: same category, shared words, same place, lost the day before. This is the wow moment.</td></tr>
<tr><td>2:45</td><td>Open "Earbuds charging case found in library reading room". Show the email, phone and WhatsApp buttons. Write a claim describing the scratch and send it.</td></tr>
<tr><td>3:30</td><td>Open My posts, then the brown leather wallet. Show the two claims: one specific, one vague. Accept the specific one: the item becomes Claimed and the other claim is declined.</td></tr>
<tr><td>4:05</td><td>Click Mark as returned. Show it under the Returned tab on the feed.</td></tr>
<tr><td>4:25</td><td>Architecture: Next.js Server Components and Server Actions, Drizzle with Postgres, pure matching functions, tests (quote the counts), Railway with a health check.</td></tr>
<tr><td>4:50</td><td>Next steps: email alerts when a match appears, and a Security desk account for items handed in. Questions.</td></tr></table>
</section>
<section style="page-break-before:always"><h3>Image credits</h3><p class="muted">Item and campus photos are Creative Commons images found through Openverse, resized and stored in public/images. Authors, licences and links are in public/images/items/credits.json and public/images/scenes/credits.json.</p></section>
</body></html>`;
    await printPdf(html, "docs/CampusFind-Documentation.pdf", "campusfind documentation");
    console.log("wrote docs/CampusFind-Documentation.pdf");
  } finally {
    // Stop the whole process group so no Next.js server is left holding the port.
    if (server.pid) process.kill(-server.pid, "SIGTERM");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
