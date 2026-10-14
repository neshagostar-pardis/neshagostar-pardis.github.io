/* Neshagostar proforma / invoice app: login, encrypted data bundle, bilingual live A4 preview, on-device storage.
   Everything sensitive (pricing model, settings, stamp) arrives encrypted in /invoice/data.bin; the master key is
   unwrapped with the user's password (PBKDF2-SHA256 + AES-GCM, Web Crypto only). Documents, customers and settings
   stay on this device, encrypted with a second key derived from the same password. */
(function () {
  'use strict';
  var subtle = window.crypto && window.crypto.subtle;
  var I = window.NeshaI18n;
  var $ = function (id) { return document.getElementById(id); };
  var enc = new TextEncoder(), dec = new TextDecoder();
  var BUNDLE_AAD = enc.encode('nesha-invoice-bundle-v1');
  var SESSION_KEY = 'nesha-inv-session';
  var REMEMBER_MS = 12 * 3600 * 1000;
  var RAW_LABEL = { pe100: 'PE100', pe80: 'PE80', mb: 'مستربچ مشکی', freight_in: 'حمل مواد تا کارخانه' };
  var FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

  var S = { uid: '', user: '', dataKey: null, bundle: null, state: null, inv: null };

  // ================================================================ utilities
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function b64(buf) { var s = '', a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function latinDigits(s) {
    return String(s == null ? '' : s).replace(/[۰-۹]/g, function (c) { return c.charCodeAt(0) - 0x06F0; })
      .replace(/[٠-٩]/g, function (c) { return c.charCodeAt(0) - 0x0660; });
  }
  function faDigits(s) { return String(s).replace(/\d/g, function (d) { return FA_DIGITS[d]; }); }
  function parseNum(s) {
    var t = latinDigits(s).replace(/[,٬\s]/g, '').replace('٫', '.');
    if (t === '') return null;
    var n = Number(t);
    return isFinite(n) ? n : null;
  }
  function fa(n, frac) { return Number(n).toLocaleString('fa-IR', { maximumFractionDigits: frac || 0 }); }
  function norm(s) {
    return latinDigits(s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‎‏]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function tokens(s) { return norm(s).split(' ').filter(Boolean); }
  function uuid() { var a = crypto.getRandomValues(new Uint8Array(12)); return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function todayISO() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function addDays(iso, n) { var p = iso.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10); }
  function ltr(text) { var b = el('bdi', 'ltr', text); b.dir = 'ltr'; return b; }
  function labelled(cls, label, value, isLtr) {
    var d = el('div', cls);
    if (label) d.appendChild(document.createTextNode(label + ': '));
    d.appendChild(isLtr ? ltr(value) : document.createTextNode(value));
    return d;
  }
  function getPath(o, path) { return path.split('.').reduce(function (a, k) { return a && a[k]; }, o); }
  function bi(v) { return v && typeof v === 'object' ? v : { fa: v || '', en: '' }; }

  // ================================================================ Jalali calendar (jalaali algorithm)
  var BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }
  function jalCal(jy, withoutLeap) {
    var gy = jy + 621, leapJ = -14, jp = BREAKS[0], jm, jump = 0, leap, leapG, march, n, i;
    if (jy < jp || jy >= BREAKS[BREAKS.length - 1]) throw new Error('jalali year out of range');
    for (i = 1; i < BREAKS.length; i += 1) {
      jm = BREAKS[i]; jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;
    if (withoutLeap) return { gy: gy, march: march };
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap: leap, gy: gy, march: march };
  }
  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  }
  function d2g(jdn) {
    var j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    var i = div(mod(j, 1461), 4) * 5 + 308, gd = div(mod(i, 153), 5) + 1, gm = mod(div(i, 153), 12) + 1;
    return { gy: div(j, 1461) - 100100 + div(8 - gm, 6), gm: gm, gd: gd };
  }
  function j2d(jy, jm, jd) { var r = jalCal(jy, true); return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1; }
  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy, false), k = jdn - g2d(gy, 3, r.march);
    if (k >= 0) {
      if (k <= 185) return { jy: jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
      k -= 186;
    } else { jy -= 1; k += 179; if (r.leap === 1) k += 1; }
    return { jy: jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
  }
  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
  function toJalali(iso) { var p = iso.split('-').map(Number); return d2j(g2d(p[0], p[1], p[2])); }
  function jalaliText(iso) { if (!iso) return ''; var j = toJalali(iso); return faDigits(j.jy + '/' + pad(j.jm) + '/' + pad(j.jd)); }
  function gregText(iso) {
    var p = iso.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }
  function dateText(iso, lang) { return lang === 'en' ? gregText(iso) : jalaliText(iso); }
  function parseJalali(s) {
    var m = latinDigits(s).trim().match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (!m) return null;
    var jy = +m[1], jm = +m[2], jd = +m[3];
    if (jm < 1 || jm > 12 || jd < 1 || jd > (jm <= 6 ? 31 : 30)) return null;
    try {
      var g = d2g(j2d(jy, jm, jd)), iso = g.gy + '-' + pad(g.gm) + '-' + pad(g.gd), back = toJalali(iso);
      return back.jd === jd && back.jm === jm ? iso : null;
    } catch (e) { return null; }
  }

  // ================================================================ amounts in words (Persian)
  var ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  var TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  var TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  var HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  var SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'هزار میلیارد'];
  function three(n) {
    var parts = [], h = div(n, 100), r = n % 100;
    if (h) parts.push(HUNDREDS[h]);
    if (r >= 10 && r < 20) parts.push(TEENS[r - 10]);
    else { if (div(r, 10)) parts.push(TENS[div(r, 10)]); if (r % 10) parts.push(ONES[r % 10]); }
    return parts.join(' و ');
  }
  function numWords(n) {
    n = Math.round(Math.abs(n));
    if (!n) return 'صفر';
    var parts = [], i = 0;
    while (n > 0 && i < SCALES.length) {
      var g = n % 1000;
      if (g) parts.unshift(three(g) + (SCALES[i] ? ' ' + SCALES[i] : ''));
      n = Math.floor(n / 1000); i += 1;
    }
    return parts.join(' و ');
  }

  // ================================================================ crypto
  async function derive(password, salt, iterations) {
    var base = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    var bits = new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iterations }, base, 512));
    return { kek: bits.slice(0, 32), data: bits.slice(32, 64) };
  }
  function aesKey(raw, usages) { return subtle.importKey('raw', raw, 'AES-GCM', true, usages); }
  async function sha256hex(s) {
    var h = new Uint8Array(await subtle.digest('SHA-256', enc.encode(s)));
    return Array.prototype.map.call(h, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  async function encryptJSON(key, obj, aad) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = await subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: enc.encode(aad) }, key, enc.encode(JSON.stringify(obj)));
    return b64(iv) + '.' + b64(ct);
  }
  async function decryptJSON(key, blob, aad) {
    var p = blob.split('.');
    var pt = await subtle.decrypt({ name: 'AES-GCM', iv: unb64(p[0]), additionalData: enc.encode(aad) }, key, unb64(p[1]));
    return JSON.parse(dec.decode(pt));
  }

  // ================================================================ storage (every access guarded)
  function lsGet(store, k) { try { return window[store].getItem(k); } catch (e) { return null; } }
  function lsSet(store, k, v) { try { window[store].setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(store, k) { try { window[store].removeItem(k); } catch (e) { /* ignore */ } }
  function stateKey() { return 'nesha-inv:' + S.uid.slice(0, 20); }
  function showWarn(msg) { var w = $('storage-warn'); w.textContent = msg; w.hidden = false; }

  async function loadState() {
    var raw = lsGet('localStorage', stateKey());
    if (!raw) return null;
    try { return await decryptJSON(S.dataKey, raw, 'state|' + S.uid); }
    catch (e) { showWarn('اطلاعات ذخیره‌شده این دستگاه باز نشد (شاید با رمز دیگری ذخیره شده است).'); return null; }
  }
  var saveState = debounce(async function () {
    if (!S.state) return;
    try {
      var ok = lsSet('localStorage', stateKey(), await encryptJSON(S.dataKey, S.state, 'state|' + S.uid));
      $('save-state').textContent = ok ? 'ذخیره خودکار انجام شد.' : 'ذخیره روی این دستگاه ممکن نیست.';
      if (!ok) showWarn('ذخیره روی این دستگاه ممکن نیست (حافظه مرورگر پر یا غیرفعال است)؛ برای نگه‌داشتن کار از «پشتیبان‌گیری» استفاده کنید.');
    } catch (e) { $('save-state').textContent = 'ذخیره ناموفق بود.'; }
  }, 600);

  // ================================================================ login / session
  async function login(user, pass, remember) {
    var uid = await sha256hex('nesha-invoice|' + user.trim().toLowerCase());
    var ring = await (await fetch('/invoice/keyring.json', { cache: 'no-cache' })).json();
    var entry = ring.users[uid];
    if (!entry) throw new Error('auth');
    var keys = await derive(pass, unb64(entry.salt), entry.iterations);
    var kek = await subtle.importKey('raw', keys.kek, 'AES-GCM', false, ['decrypt']);
    var w = unb64(entry.wrapped), masterRaw;
    try {
      masterRaw = await subtle.decrypt({ name: 'AES-GCM', iv: w.slice(0, 12), additionalData: enc.encode(uid) }, kek, w.slice(12));
    } catch (e) { throw new Error('auth'); }
    var sess = { uid: uid, user: user.trim(), mk: b64(masterRaw), dk: b64(keys.data) };
    if (remember) { sess.exp = Date.now() + REMEMBER_MS; lsSet('localStorage', SESSION_KEY, JSON.stringify(sess)); }
    else lsSet('sessionStorage', SESSION_KEY, JSON.stringify(sess));
    return start(sess);
  }
  function savedSession() {
    var s = lsGet('sessionStorage', SESSION_KEY) || lsGet('localStorage', SESSION_KEY);
    if (!s) return null;
    try {
      s = JSON.parse(s);
      if (s.exp && s.exp < Date.now()) { lsDel('localStorage', SESSION_KEY); return null; }
      return s;
    } catch (e) { return null; }
  }
  async function start(sess) {
    S.uid = sess.uid; S.user = sess.user;
    var master = await aesKey(unb64(sess.mk), ['decrypt']);
    S.dataKey = await aesKey(unb64(sess.dk), ['encrypt', 'decrypt']);
    var buf = new Uint8Array(await (await fetch('/invoice/data.bin', { cache: 'no-cache' })).arrayBuffer());
    var pt = await subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12), additionalData: BUNDLE_AAD }, master, buf.slice(12));
    S.bundle = JSON.parse(dec.decode(pt));
    if (!lsSet('localStorage', 'nesha-inv-probe', '1')) showWarn('حافظه این مرورگر در دسترس نیست؛ اسناد پس از بستن صفحه از بین می‌روند. از «پشتیبان‌گیری» استفاده کنید.');
    S.state = (await loadState()) || freshState();
    upgradeState(S.state);
    S.inv = S.state.draft && S.state.draft.v === 2 ? S.state.draft : newInvoice();
    S.state.draft = S.inv;
    openApp();
  }
  function logout() { lsDel('sessionStorage', SESSION_KEY); lsDel('localStorage', SESSION_KEY); location.reload(); }

  // ================================================================ state model
  function freshState() {
    var d = S.bundle.defaults;
    return {
      v: 2,
      settings: {
        seller: clone(S.bundle.seller),
        prefix: (S.user.replace(/[^A-Za-z]/g, '').slice(0, 2) || 'NP').toUpperCase(), seq: 1,
        vat: d.vat_pct, advancePct: d.advance_pct, balanceDays: d.balance_days, balanceTrigger: d.balance_trigger,
        standards: d.standards, termText: { fa: {}, en: {} }
      },
      customers: [], invoices: [], draft: null
    };
  }
  function upgradeState(st) {
    var f = freshState();
    if (st.v !== 2) { st.v = 2; st.settings = f.settings; st.invoices = []; st.draft = null; }
    Object.keys(f.settings).forEach(function (k) { if (st.settings[k] == null) st.settings[k] = f.settings[k]; });
    st.customers = st.customers || [];
    st.invoices = st.invoices || [];
  }
  function nextNumber() {
    var st = S.state.settings, jy = toJalali(todayISO()).jy;
    var n = (st.prefix ? st.prefix + '-' : '') + jy + '-' + pad(st.seq, 4);
    st.seq += 1;
    return n;
  }
  function newInvoice(lang) {
    var d = S.bundle.defaults, now = new Date().toISOString();
    lang = lang || 'fa';
    return {
      v: 2, id: uuid(), lang: lang, type: 'proforma', number: nextNumber(), date: todayISO(), validDays: d.validity_days || 14,
      currency: lang === 'fa' ? 'IRT' : 'USD', usdRate: null,
      delivery: { basis: 'EXW', place: { fa: '', en: '' }, days: null },
      hs: d.hs_code, contract: '', itemCode: '', project: { fa: '', en: '' }, projectCode: '',
      buyer: { name: { fa: '', en: '' }, code: '', phone: '', email: '', address: { fa: '', en: '' } },
      raw: {}, items: [], standards: null, vatOn: lang === 'fa', vatPct: S.state.settings.vat, disc: 0,
      transport: { on: false, rate: null, dest: { fa: '', en: '' } },
      deliverySum: { on: false, point: { fa: '', en: '' }, thisQty: null, soFar: null, total: null },
      packing: { on: false }, banking: { on: false, bank: '', account: '', sheba: '' }, stamp: false,
      terms: { off: {}, text: {} }, notes: { fa: '', en: '' },
      edited: {}, createdAt: now, updatedAt: now
    };
  }

  // ================================================================ money and pricing
  function model() { return S.bundle.model; }
  function itemByCode(code) {
    var items = model().items;
    for (var i = 0; i < items.length; i++) if (items[i].code === code) return items[i];
    return null;
  }
  function suggestionFor(k) { var s = S.bundle.suggestions[k] || {}; return s.model != null ? s.model : s.exchange; }
  function rawKeys() { return Object.keys(S.bundle.suggestions).filter(function (k) { return k !== 'usd_rate'; }); }
  function effRaw(inv) {
    var out = {};
    rawKeys().forEach(function (k) { out[k] = inv.raw[k] != null ? inv.raw[k] : suggestionFor(k); });
    return out;
  }
  function usdRate(inv) { var s = S.bundle.suggestions.usd_rate; return inv.usdRate || (s && s.site) || 0; }
  function decimals(cur) { return cur === 'USD' ? 2 : 0; }
  function roundCur(x, cur) { var f = Math.pow(10, decimals(cur)); return Math.round(x * f) / f; }
  function fromToman(t, inv) {
    if (inv.currency === 'USD') { var r = usdRate(inv); return r ? roundCur(t / r, 'USD') : 0; }
    return inv.currency === 'IRR' ? Math.round(t * 10) : Math.round(t);
  }
  function toToman(v, cur, inv) { return cur === 'USD' ? v * usdRate(inv) : cur === 'IRR' ? v / 10 : v; }
  /* amounts: USD always 2 decimals in Latin digits; toman/rial with separators, Persian digits in FA */
  function money(x, inv, lang) {
    if (inv.currency === 'USD') return Number(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return Number(Math.round(x)).toLocaleString(lang === 'en' ? 'en-US' : 'fa-IR');
  }
  function num(x, lang, frac) { return Number(x).toLocaleString(lang === 'en' ? 'en-US' : 'fa-IR', { maximumFractionDigits: frac == null ? 3 : frac }); }

  function orderKg(inv) {
    var kg = 0;
    inv.items.forEach(function (l) { var it = itemByCode(l.code); if (it && it.kg_per_unit) kg += (l.qty || 0) * it.kg_per_unit; });
    return kg;
  }
  function suggest(line, inv, okg) {
    if (!window.NeshaPricing || !itemByCode(line.code)) return null;
    try {
      var r = window.NeshaPricing.suggest(model(), line.code, { date: inv.date, rawPrices: effRaw(inv), qty: line.qty || 1, orderKg: okg });
      if (!r.priced || !(r.unit_price > 0)) return { manual: true, res: r };
      return { toman: r.unit_price, price: fromToman(r.unit_price, inv), res: r };
    } catch (e) { return null; }
  }
  function linePrice(line, inv, sug) {
    if (line.price && line.price.v != null) {
      return line.price.cur === inv.currency ? line.price.v : roundCur(fromToman(toToman(line.price.v, line.price.cur, inv), inv), inv.currency);
    }
    return sug && sug.price ? sug.price : 0;
  }
  function compute(inv) {
    var okg = orderKg(inv);
    var lines = inv.items.map(function (l) {
      var s = suggest(l, inv, okg), price = linePrice(l, inv, s);
      var gross = roundCur((l.qty || 0) * price, inv.currency), disc = roundCur(gross * (l.disc || 0) / 100, inv.currency);
      return { line: l, sug: s, price: price, gross: gross, disc: disc, net: gross - disc };
    });
    var gross = 0, ldisc = 0, qty = 0;
    lines.forEach(function (x) { gross += x.gross; ldisc += x.disc; qty += x.line.qty || 0; });
    var after = gross - ldisc, gdisc = roundCur(after * (inv.disc || 0) / 100, inv.currency), net = after - gdisc;
    var trQty = qty, trAmt = inv.transport.on && inv.transport.rate ? roundCur(trQty * inv.transport.rate, inv.currency) : 0;
    var taxable = net + trAmt, vat = inv.vatOn ? roundCur(taxable * (inv.vatPct || 0) / 100, inv.currency) : 0;
    var total = roundCur(taxable + vat, inv.currency), st = S.state.settings;
    var adv = roundCur(total * (st.advancePct || 0) / 100, inv.currency);
    return { lines: lines, kg: okg, gross: gross, discount: ldisc + gdisc, net: net, trQty: trQty, transport: trAmt,
             vat: vat, total: total, advance: adv, balance: roundCur(total - adv, inv.currency) };
  }

  // ================================================================ terms
  function termValues(inv, lang) {
    var st = S.state.settings, place = bi(inv.delivery.place);
    var n = function (x) { return lang === 'en' ? String(x) : faDigits(x); };
    return { valid_until: dateText(addDays(inv.date, inv.validDays || 14), lang), validity_days: n(inv.validDays || 14),
             balance_days: n(st.balanceDays), advance_pct: n(st.advancePct), balance_pct: n(100 - st.advancePct),
             place: place[lang] || place[lang === 'en' ? 'fa' : 'en'] || '…', n: n(inv.delivery.days || '') };
  }
  function termKey(key, inv) {
    if (key === 'late') return 'late_' + (S.state.settings.balanceTrigger || 'ready');
    if (key === 'delivery') return 'delivery_' + inv.delivery.basis;
    return key;
  }
  function defaultTerm(key, inv, lang) {
    var k = termKey(key, inv), custom = S.state.settings.termText[lang] || {};
    return custom[k] || I.TERMS[lang][k];
  }
  function activeTerms(inv) {
    return I.TERM_SETS[inv.type].filter(function (k) {
      if (k === 'vat') return inv.vatOn;
      if (k === 'dtime') return !!inv.delivery.days;
      return true;
    });
  }
  function termText(key, inv, lang) {
    var own = inv.terms.text[key] && inv.terms.text[key][lang];
    return I.fill(own || defaultTerm(key, inv, lang), termValues(inv, lang));
  }

  // ================================================================ form: generic bindings
  function lang() { return S.inv.lang; }
  function markAuto(input, key) { input.classList.toggle('auto', !S.inv.edited[key]); }
  function edited(key, input) { S.inv.edited[key] = true; if (input) input.classList.remove('auto'); }
  function refreshBi() {
    var lg = lang(), other = lg === 'fa' ? 'en' : 'fa';
    document.querySelectorAll('[data-bi]').forEach(function (inp) {
      var v = bi(getPath(S.inv, inp.dataset.bi));
      inp.value = v[lg] || '';
      inp.placeholder = v[other] ? '(' + (other === 'fa' ? 'فارسی' : 'English') + ') ' + v[other] : '';
      inp.dir = lg === 'en' ? 'ltr' : 'rtl';
    });
    document.querySelectorAll('.lang-tag').forEach(function (t) { t.textContent = lg === 'fa' ? 'فارسی' : 'EN'; });
  }
  function wireBi() {
    document.querySelectorAll('[data-bi]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var path = inp.dataset.bi.split('.'), obj = S.inv;
        for (var i = 0; i < path.length - 1; i++) obj = obj[path[i]];
        var last = path[path.length - 1];
        obj[last] = bi(obj[last]);
        obj[last][lang()] = inp.value;
        if (inp.id === 'b-name') fillCustomer(inp.value);
        changed();
      });
    });
  }
  function fillCustomer(name) {
    var c = S.state.customers.filter(function (x) { return bi(x.name)[lang()] === name; })[0];
    if (!c) return;
    var b = S.inv.buyer;
    ['code', 'phone', 'email'].forEach(function (k) { if (!b[k] && c[k]) { b[k] = c[k]; $('b-' + k).value = c[k]; } });
    var ad = bi(c.address);
    if (!b.address.fa && !b.address.en) { b.address = clone(ad); }
    b.name = clone(bi(c.name));
    refreshBi();
  }

  function fillForm() {
    var inv = S.inv;
    $('lang-fa').setAttribute('aria-pressed', String(inv.lang === 'fa'));
    $('lang-en').setAttribute('aria-pressed', String(inv.lang === 'en'));
    $('sheet').dir = inv.lang === 'en' ? 'ltr' : 'rtl';
    $('f-type').value = inv.type;
    $('f-currency').value = inv.currency;
    $('f-number').value = inv.number;
    $('f-date').value = jalaliText(inv.date);
    $('f-valid').value = faDigits(inv.validDays);
    $('f-basis').value = inv.delivery.basis;
    $('f-ddays').value = inv.delivery.days ? faDigits(inv.delivery.days) : '';
    $('f-hs').value = inv.hs || ''; $('f-contract').value = inv.contract || ''; $('f-itemcode').value = inv.itemCode || '';
    $('f-pcode').value = inv.projectCode || '';
    $('b-code').value = inv.buyer.code; $('b-phone').value = inv.buyer.phone; $('b-email').value = inv.buyer.email || '';
    $('f-standards').value = inv.standards != null ? inv.standards : '';
    $('f-standards').placeholder = S.state.settings.standards;
    $('t-vat-on').checked = !!inv.vatOn; $('t-vat').value = faDigits(inv.vatPct); $('t-disc').value = inv.disc ? faDigits(inv.disc) : '';
    $('o-transport').checked = inv.transport.on; $('tr-rate').value = inv.transport.rate != null ? inv.transport.rate : '';
    $('o-delivery').checked = inv.deliverySum.on;
    ['thisQty', 'soFar', 'total'].forEach(function (k, i) { $(['ds-this', 'ds-sofar', 'ds-total'][i]).value = inv.deliverySum[k] != null ? inv.deliverySum[k] : ''; });
    $('o-packing').checked = inv.packing.on; $('o-bank').checked = inv.banking.on;
    $('bk-bank').value = inv.banking.bank; $('bk-account').value = inv.banking.account; $('bk-sheba').value = inv.banking.sheba;
    $('o-stamp').checked = inv.stamp; $('o-stamp').disabled = !S.bundle.stamp;
    $('stamp-hint').textContent = S.bundle.stamp ? '' : 'تصویر مهر هنوز به بسته اطلاعات اضافه نشده است.';
    ['f-number', 'f-date', 'f-valid', 'f-currency', 'f-basis', 'f-hs', 't-vat-on', 'f-standards'].forEach(function (id) { markAuto($(id), $(id).dataset.auto); });
    $('f-standards').classList.remove('auto');
    refreshBi(); syncSections(); renderUsd(); renderRaw(); renderLines(); renderTerms(); renderCustomers(); refresh();
  }
  function syncSections() {
    var inv = S.inv;
    $('usd-box').hidden = inv.currency !== 'USD';
    $('place-box').hidden = inv.delivery.basis === 'EXW';
    $('transport-box').hidden = !inv.transport.on;
    $('delivery-box').hidden = !inv.deliverySum.on;
    $('bank-box').hidden = !inv.banking.on;
  }
  function setLang(lg) {
    var inv = S.inv;
    if (inv.lang === lg) return;
    inv.lang = lg;
    if (!inv.edited.currency) inv.currency = lg === 'fa' ? 'IRT' : 'USD';
    if (!inv.edited.vatOn) inv.vatOn = lg === 'fa';
    fillForm(); changed();
  }

  function wireForm() {
    $('lang-fa').addEventListener('click', function () { setLang('fa'); });
    $('lang-en').addEventListener('click', function () { setLang('en'); });
    $('f-type').addEventListener('change', function (e) { S.inv.type = e.target.value; renderTerms(); changed(); });
    $('f-currency').addEventListener('change', function (e) { S.inv.currency = e.target.value; edited('currency', e.target); syncSections(); renderUsd(); changed(); });
    $('f-number').addEventListener('input', function (e) { S.inv.number = e.target.value; edited('number', e.target); changed(); });
    $('f-date').addEventListener('input', function (e) {
      var iso = parseJalali(e.target.value);
      $('f-date-hint').textContent = iso ? dateHint() : 'تاریخ را به شکل ۱۴۰۵/۰۷/۲۲ وارد کنید.';
      if (iso) { S.inv.date = iso; edited('date', e.target); changed(); }
    });
    $('f-date').addEventListener('blur', function (e) { e.target.value = jalaliText(S.inv.date); $('f-date-hint').textContent = dateHint(); });
    $('f-valid').addEventListener('input', function (e) {
      S.inv.validDays = Math.max(1, Math.min(365, parseNum(e.target.value) || 14)); edited('validDays', e.target);
      $('f-date-hint').textContent = dateHint(); changed();
    });
    $('f-basis').addEventListener('change', function (e) { S.inv.delivery.basis = e.target.value; edited('basis', e.target); syncSections(); changed(); });
    $('f-ddays').addEventListener('input', function (e) { S.inv.delivery.days = parseNum(e.target.value); renderTerms(); changed(); });
    var plain = [['f-hs', 'hs'], ['f-contract', 'contract'], ['f-itemcode', 'itemCode'], ['f-pcode', 'projectCode']];
    plain.forEach(function (p) { $(p[0]).addEventListener('input', function (e) { S.inv[p[1]] = e.target.value; if (p[1] === 'hs') edited('hs', e.target); changed(); }); });
    [['b-code', 'code'], ['b-phone', 'phone'], ['b-email', 'email']].forEach(function (p) {
      $(p[0]).addEventListener('input', function (e) { S.inv.buyer[p[1]] = e.target.value; changed(); });
    });
    $('f-standards').addEventListener('input', function (e) { S.inv.standards = e.target.value || null; changed(); });
    $('t-vat-on').addEventListener('change', function (e) { S.inv.vatOn = e.target.checked; edited('vatOn', e.target); renderTerms(); changed(); });
    $('t-vat').addEventListener('input', function (e) { S.inv.vatPct = parseNum(e.target.value) || 0; changed(); });
    $('t-disc').addEventListener('input', function (e) { S.inv.disc = Math.min(100, Math.max(0, parseNum(e.target.value) || 0)); changed(); });
    $('f-usd').addEventListener('input', function (e) { S.inv.usdRate = parseNum(e.target.value); e.target.classList.toggle('edited', S.inv.usdRate != null); changed(); });
    $('o-transport').addEventListener('change', function (e) { S.inv.transport.on = e.target.checked; syncSections(); changed(); });
    $('tr-rate').addEventListener('input', function (e) { S.inv.transport.rate = parseNum(e.target.value); changed(); });
    $('o-delivery').addEventListener('change', function (e) { S.inv.deliverySum.on = e.target.checked; syncSections(); changed(); });
    [['ds-this', 'thisQty'], ['ds-sofar', 'soFar'], ['ds-total', 'total']].forEach(function (p) {
      $(p[0]).addEventListener('input', function (e) { S.inv.deliverySum[p[1]] = parseNum(e.target.value); changed(); });
    });
    $('o-packing').addEventListener('change', function (e) { S.inv.packing.on = e.target.checked; changed(); });
    $('o-bank').addEventListener('change', function (e) { S.inv.banking.on = e.target.checked; syncSections(); changed(); });
    [['bk-bank', 'bank'], ['bk-account', 'account'], ['bk-sheba', 'sheba']].forEach(function (p) {
      $(p[0]).addEventListener('input', function (e) { S.inv.banking[p[1]] = e.target.value; changed(); });
    });
    $('o-stamp').addEventListener('change', function (e) { S.inv.stamp = e.target.checked; changed(); });
    wireBi();
  }
  function dateHint() {
    var inv = S.inv;
    return 'میلادی: ' + gregText(inv.date) + ' · معتبر تا ' + jalaliText(addDays(inv.date, inv.validDays || 14)) +
      ' (' + gregText(addDays(inv.date, inv.validDays || 14)) + ')';
  }
  function renderCustomers() {
    var dl = $('customers'); dl.textContent = '';
    S.state.customers.forEach(function (c) { var v = bi(c.name)[lang()]; if (v) { var o = el('option'); o.value = v; dl.appendChild(o); } });
  }
  function renderUsd() {
    var s = S.bundle.suggestions.usd_rate, inp = $('f-usd');
    inp.placeholder = s ? fa(s.site) : '';
    inp.title = s ? 'نرخ دلار سایت در ' + jalaliText(s.date) : '';
    inp.value = S.inv.usdRate != null ? fa(S.inv.usdRate) : '';
    inp.classList.toggle('edited', S.inv.usdRate != null);
  }

  // ---------------------------------------------------------------- raw-material inputs
  function renderRaw() {
    var box = $('raw-inputs'), cal = (model().params.exchange_calibration || {}).ratio_purchase_over_exchange || {};
    box.textContent = '';
    rawKeys().forEach(function (k) {
      var s = S.bundle.suggestions[k], wrap = el('div', 'raw');
      var lab = el('label', '', RAW_LABEL[k] || k), inp = el('input', 'num');
      inp.inputMode = 'decimal'; inp.id = 'raw-' + k;
      inp.placeholder = suggestionFor(k) != null ? fa(suggestionFor(k)) : '';
      inp.value = S.inv.raw[k] != null ? fa(S.inv.raw[k]) : '';
      lab.appendChild(inp); wrap.appendChild(lab);
      var chips = el('div', 'chips');
      if (s.exchange != null) {
        var adj = cal[k] ? Math.round(s.exchange * cal[k] / 100) * 100 : s.exchange;
        var b = el('button', 'chip', 'بورس کالا ' + (s.exchange_grade || '') + ' ' + jalaliText(s.exchange_date) + ': ' + fa(s.exchange) +
          (cal[k] ? ' ← معادل خرید ' + fa(adj) : ''));
        b.type = 'button'; b.title = 'قیمت بورس، تبدیل‌شده به معادل قیمت خرید (نسبت مدل)';
        b.addEventListener('click', function () { S.inv.raw[k] = adj; inp.value = fa(adj); syncRaw(inp, k); changed(); });
        chips.appendChild(b);
      }
      var reset = el('button', 'chip reset', 'بازگشت به پیشنهاد'); reset.type = 'button';
      reset.addEventListener('click', function () { delete S.inv.raw[k]; inp.value = ''; syncRaw(inp, k); changed(); });
      chips.appendChild(reset);
      wrap.appendChild(chips);
      inp.addEventListener('input', function () {
        var v = parseNum(inp.value);
        if (v == null) delete S.inv.raw[k]; else S.inv.raw[k] = v;
        syncRaw(inp, k); changed();
      });
      box.appendChild(wrap);
      syncRaw(inp, k);
    });
  }
  function syncRaw(inp, k) {
    inp.classList.toggle('edited', S.inv.raw[k] != null);
    inp.closest('.raw').querySelector('.reset').hidden = S.inv.raw[k] == null;
  }

  // ---------------------------------------------------------------- item lines
  var lineRefs = [];
  function unitOptions(sel, current) {
    Object.keys(I.UNITS.fa).forEach(function (u) { var o = el('option', '', I.UNITS.fa[u]); o.value = u; sel.appendChild(o); });
    sel.value = current;
  }
  var lastRemoved = null;   // {item, index, inv} of the line just removed, for the undo bar
  function renderLines() {
    var box = $('lines'); box.textContent = ''; lineRefs = [];
    if (lastRemoved && lastRemoved.inv !== S.inv) lastRemoved = null;   // another invoice was opened
    if (lastRemoved) {
      var undo = el('div', 'undo-bar', 'ردیف «' + I.describe(itemByCode(lastRemoved.item.code) || {}, 'fa') + '» حذف شد. ');
      var back = el('button', 'ibtn sm', 'بازگرداندن'); back.type = 'button';
      back.addEventListener('click', function () {
        S.inv.items.splice(Math.min(lastRemoved.index, S.inv.items.length), 0, lastRemoved.item);
        lastRemoved = null; renderLines(); changed();
      });
      undo.appendChild(back); box.appendChild(undo);
    }
    S.inv.items.forEach(function (l, i) { box.appendChild(lineRow(l, i)); });
    if (!S.inv.items.length) box.appendChild(el('p', 'hint', 'هنوز کالایی اضافه نشده است.'));
  }
  function lineRow(l, i) {
    var it = itemByCode(l.code) || {}, row = el('div', 'line'), refs = {};
    var head = el('div', 'line-head');
    head.appendChild(el('span', 'line-no', fa(i + 1)));
    var name = el('div', 'line-name', I.describe(it, 'fa'));
    name.appendChild(el('small', 'muted', ' ' + l.code));
    if (it.confidence === 'low') name.appendChild(el('span', 'badge low', 'اطمینان کم'));
    if (it.coef && it.coef.method === 'not_priced') name.appendChild(el('span', 'badge', 'قیمت دستی'));
    head.appendChild(name);
    var rm = el('button', 'ibtn sm danger line-rm', '✕ حذف این ردیف'); rm.type = 'button'; rm.setAttribute('aria-label', 'حذف ردیف ' + fa(i + 1));
    rm.addEventListener('click', function () { lastRemoved = { item: S.inv.items.splice(i, 1)[0], index: i, inv: S.inv }; renderLines(); changed(); });
    head.appendChild(rm);
    row.appendChild(head);

    var dsc = el('input'); dsc.className = l.desc && l.desc[lang()] ? '' : 'auto';
    dsc.value = (l.desc && l.desc[lang()]) || I.describe(it, lang());
    dsc.dir = lang() === 'en' ? 'ltr' : 'rtl';
    var dl = el('label', 'line-desc', 'شرح (' + (lang() === 'fa' ? 'فارسی' : 'EN') + ')'); dl.appendChild(dsc); row.appendChild(dl);
    dsc.addEventListener('input', function () { l.desc = l.desc || {}; l.desc[lang()] = dsc.value; dsc.classList.remove('auto'); changed(); });

    var g = el('div', 'line-grid');
    function field(label, input) { var lb = el('label', '', label); lb.appendChild(input); g.appendChild(lb); return input; }
    var size = el('input'); size.dir = 'ltr'; size.value = l.size != null ? l.size : (it.diameter_mm ? it.diameter_mm + 'mm' : '');
    size.className = l.size != null ? '' : 'auto';
    field('سایز', size).addEventListener('input', function () { l.size = size.value; size.classList.remove('auto'); changed(); });
    var unit = el('select'); unitOptions(unit, l.unit);
    field('واحد', unit).addEventListener('change', function () { l.unit = unit.value; changed(); });
    var qty = el('input', 'num'); qty.inputMode = 'decimal'; qty.value = fa(l.qty, 3);
    field('مقدار', qty).addEventListener('input', function () { l.qty = parseNum(qty.value) || 0; changed(); });
    var price = el('input', 'num'); price.inputMode = 'decimal';
    price.value = l.price && l.price.v != null && l.price.cur === S.inv.currency ? l.price.v : '';
    field('قیمت واحد (' + I.CURRENCY.short.fa[S.inv.currency] + ')', price).addEventListener('input', function () {
      var v = parseNum(price.value); l.price = v == null ? null : { v: v, cur: S.inv.currency };
      price.classList.toggle('edited', v != null); refs.reset.hidden = v == null; changed();
    });
    price.classList.toggle('edited', !!(l.price && l.price.v != null));
    var disc = el('input', 'num'); disc.inputMode = 'decimal'; disc.value = l.disc ? fa(l.disc, 2) : '';
    field('تخفیف ٪', disc).addEventListener('input', function () { l.disc = Math.min(100, Math.max(0, parseNum(disc.value) || 0)); changed(); });
    var tot = el('output', 'line-total'); var tl = el('label', '', 'مبلغ'); tl.appendChild(tot); g.appendChild(tl);
    row.appendChild(g);

    var reset = el('button', 'chip reset', 'بازگشت به قیمت پیشنهادی'); reset.type = 'button'; reset.hidden = !(l.price && l.price.v != null);
    reset.addEventListener('click', function () { l.price = null; price.value = ''; price.classList.remove('edited'); reset.hidden = true; changed(); });
    var det = el('details', 'line-det'); det.appendChild(el('summary', '', 'جزئیات قیمت'));
    var body = el('div', 'det-body'); det.appendChild(body);
    var tail = el('div', 'line-tail'); tail.appendChild(reset); tail.appendChild(det);
    row.appendChild(tail);
    refs.price = price; refs.total = tot; refs.det = body; refs.reset = reset;
    lineRefs.push(refs);
    return row;
  }
  function updateLineOutputs(c) {
    var inv = S.inv;
    $('tier-info').textContent = c.kg ? 'وزن کل سفارش حدود ' + fa(c.kg) + ' کیلوگرم' +
      (c.lines[0] && c.lines[0].sug && c.lines[0].sug.res && c.lines[0].sug.res.tier ? ' · رده سفارش T' + fa(c.lines[0].sug.res.tier) : '') : '';
    c.lines.forEach(function (x, i) {
      var r = lineRefs[i];
      if (!r) return;
      var s = x.sug;
      r.price.placeholder = s && s.price ? money(s.price, inv, 'fa') : (s && s.manual ? 'قیمت دستی' : '');
      r.total.textContent = money(x.net, inv, 'fa');
      r.det.textContent = '';
      var res = s && s.res, b = res && res.breakdown;
      if (!b) { r.det.appendChild(el('p', 'hint', 'برای این کالا قیمت مدل وجود ندارد؛ قیمت را دستی وارد کنید (قیمت دستی).')); return; }
      var t = function (v) { return fa(v) + ' تومان'; };
      var tiers = model().params.tiers || {}, tier = res.tier;
      var rows = [['رده سفارش', 'T' + fa(tier) + ' (حاشیه کف ' + fa(((tiers.min_margin || {})[tier] || 0) * 100, 1) + '٪ · ذخیره ریسک ' +
                   fa(((tiers.buffer_pct_of_material || {})[tier] || 0) * 100, 2) + '٪ مواد)'],
                  ['وزن هر واحد', fa(res.kg_per_unit, 3) + ' کیلوگرم'], ['مواد اولیه هر کیلوگرم', t(res.raw_price_per_kg)],
                  ['مواد', t(b.material)], ['تولید', t(b.conversion)], ['سربار', t(b.overhead)], ['بهای تمام‌شده', t(b.full_cost)],
                  ['قیمت فهرست (با حاشیه استاندارد)', t(b.list_price)], ['تخفیف رده', t(b.volume_discount)],
                  ['تعدیل سقف / کف', t(b.cap_adjustment + b.floor_adjustment)], ['ذخیره ریسک ۱۴ روزه', t(b.risk_buffer)],
                  ['افزایش ' + fa((model().params.uplift || 0) * 100) + '٪', t(b.uplift)], ['گرد کردن', t(b.rounding)],
                  ['قیمت پیشنهادی', t(res.unit_price) + (inv.currency !== 'IRT' ? ' = ' + money(s.price, inv, 'fa') + ' ' + I.CURRENCY.short.fa[inv.currency] : '')],
                  ['بازه معمول', t(res.low_unit) + ' تا ' + t(res.high_unit)], ['اطمینان مدل', res.confidence === 'low' ? 'کم' : res.confidence === 'high' ? 'زیاد' : 'متوسط']];
      var dl = el('dl', 'det-grid');
      rows.forEach(function (p) { dl.appendChild(el('dt', '', p[0])); dl.appendChild(el('dd', '', p[1])); });
      r.det.appendChild(dl);
      if (res.indexed_option) {
        var io = res.indexed_option;
        r.det.appendChild(el('p', 'hint', 'گزینه قیمت شناور (رده T۴): ' + t(io.unit_price) + ' بدون ذخیره ریسک؛ سهم مواد (' +
          fa(io.material_share * 100, 1) + '٪) به قیمت CRP100N بورس کالا گره می‌خورد اگر بیش از ±' + fa(io.band_pct * 100, 1) + '٪ تغییر کند.'));
      }
    });
  }

  /* searchable item combobox */
  function wireCombo() {
    var input = $('item-search'), list = $('item-list'), active = -1, shown = [];
    var hay = model().items.map(function (it) {
      return { it: it, h: norm([it.code, it.name, I.describe(it, 'fa'), I.describe(it, 'en'), it.diameter_mm, it.stiffness].join(' ')) };
    });
    function open() {
      var toks = tokens(input.value);
      shown = hay.filter(function (x) { for (var i = 0; i < toks.length; i++) if (x.h.indexOf(toks[i]) < 0) return false; return true; })
        .slice(0, 50).map(function (x) { return x.it; });
      list.textContent = '';
      shown.forEach(function (it, i) {
        var li = el('li', '', I.describe(it, 'fa')); li.id = 'opt-' + i; li.setAttribute('role', 'option');
        li.appendChild(el('small', 'muted', ' ' + it.code + ' · ' + it.unit));
        if (it.coef && it.coef.method === 'not_priced') li.appendChild(el('span', 'badge', 'قیمت دستی'));
        if (it.confidence === 'low') li.appendChild(el('span', 'badge low', 'اطمینان کم'));
        li.addEventListener('mousedown', function (e) { e.preventDefault(); add(it); });
        list.appendChild(li);
      });
      if (!shown.length) list.appendChild(el('li', 'muted', 'کالایی پیدا نشد'));
      active = -1; list.hidden = false; input.setAttribute('aria-expanded', 'true');
    }
    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
    function highlight(i) {
      var items = list.querySelectorAll('[role=option]');
      if (!items.length) return;
      active = (i + items.length) % items.length;
      items.forEach(function (x, k) { x.setAttribute('aria-selected', String(k === active)); });
      input.setAttribute('aria-activedescendant', items[active].id);
      items[active].scrollIntoView({ block: 'nearest' });
    }
    function add(it) {
      S.inv.items.push({ code: it.code, unit: I.CATALOG_UNIT[it.unit] || 'pcs', qty: 1, price: null, disc: 0, desc: null, size: null });
      input.value = ''; close(); renderLines(); changed();
      var qs = $('lines').querySelectorAll('.line'), last = qs[qs.length - 1];
      var q = last && last.querySelectorAll('.line-grid input')[1];
      if (q) { q.focus(); q.select(); }
    }
    input.addEventListener('focus', open);
    input.addEventListener('input', open);
    input.addEventListener('blur', close);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) open(); highlight(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); var it = shown[active >= 0 ? active : 0]; if (it) add(it); }
      else if (e.key === 'Escape') close();
    });
  }

  // ---------------------------------------------------------------- terms editor
  function renderTerms() {
    var ol = $('terms'), inv = S.inv, lg = lang();
    ol.textContent = '';
    activeTerms(inv).forEach(function (key) {
      var li = el('li', 'term');
      var head = el('label', 'chk');
      var on = el('input'); on.type = 'checkbox'; on.checked = !inv.terms.off[key];
      on.addEventListener('change', function () { if (on.checked) delete inv.terms.off[key]; else inv.terms.off[key] = true; ta.disabled = !on.checked; changed(); });
      head.appendChild(on); head.appendChild(document.createTextNode(' ' + I.TERM_LABEL[key]));
      if (key === 'late') head.appendChild(el('small', 'muted', ' (مهلت ' + fa(S.state.settings.balanceDays) + ' روز؛ در تنظیمات)'));
      li.appendChild(head);
      var ta = el('textarea'); ta.rows = 2; ta.dir = lg === 'en' ? 'ltr' : 'rtl'; ta.disabled = !!inv.terms.off[key];
      var own = inv.terms.text[key] && inv.terms.text[key][lg];
      ta.placeholder = termText(key, inv, lg);
      ta.value = own || '';
      ta.setAttribute('aria-label', I.TERM_LABEL[key]);
      ta.addEventListener('input', function () {
        inv.terms.text[key] = inv.terms.text[key] || {};
        inv.terms.text[key][lg] = ta.value;
        if (!ta.value) delete inv.terms.text[key][lg];
        changed();
      });
      li.appendChild(ta);
      ol.appendChild(li);
    });
  }
  var refreshTermPlaceholders = function () {
    var keys = activeTerms(S.inv), tas = $('terms').querySelectorAll('textarea');
    tas.forEach(function (ta, i) { if (keys[i]) ta.placeholder = termText(keys[i], S.inv, lang()); });
  };

  // ================================================================ preview (A4, follows the language toggle)
  function renderPreview(c) {
    var inv = S.inv, lg = inv.lang, T = I.L[lg], st = S.state.settings, seller = st.seller, sh = $('sheet');
    var cur = I.CURRENCY.short[lg][inv.currency], offer = inv.type === 'offer';
    var n = function (x, frac) { return num(x, lg, frac); };
    var txt = function (v) { v = bi(v); return v[lg] || v[lg === 'en' ? 'fa' : 'en'] || ''; };
    var dig = function (s) { return lg === 'fa' ? faDigits(s) : s; };
    sh.textContent = '';
    sh.dir = lg === 'en' ? 'ltr' : 'rtl'; sh.lang = lg; sh.className = 'sheet ' + lg;

    var head = el('header', 'sh-head');
    var logo = el('img', 'sh-logo'); logo.src = '/static/invoice/logo.png'; logo.alt = T.seller; logo.width = 120; logo.height = 62;
    head.appendChild(logo);
    var ci = el('div', 'sh-company');
    var main = txt(seller.name), sec = bi(seller.name)[lg === 'fa' ? 'en' : 'fa'];
    ci.appendChild(el('div', 'sh-cname', main));
    if (sec) { var c2 = el('div', 'sh-cname2', sec); c2.dir = 'auto'; ci.appendChild(c2); }
    var cd = el('div', 'sh-cdetails');
    if (txt(seller.address)) cd.appendChild(el('div', '', txt(seller.address)));
    [[T.email, seller.email], [T.phone, seller.mobile], [T.website, seller.website]].forEach(function (r) {
      if (r[1]) cd.appendChild(labelled('', r[0], r[1], true));
    });
    ci.appendChild(cd); head.appendChild(ci);
    sh.appendChild(head);
    sh.appendChild(el('div', 'sh-title', T.title[inv.type]));

    var meta = el('div', 'sh-meta');
    var basis = I.fill(I.BASIS[lg][inv.delivery.basis], { place: txt(inv.delivery.place) || '…' });
    [[T.no[inv.type], inv.number, 1], [T.date, dateText(inv.date, lg)],
     [inv.type !== 'invoice' && T.validUntil, dateText(addDays(inv.date, inv.validDays || 14), lg)],
     [T.basis, basis], [T.hs, inv.hs, 1], [T.contract, inv.contract, 1], [T.itemCode, inv.itemCode, 1],
     [T.project, txt(inv.project)], [T.projectCode, inv.projectCode, 1]].forEach(function (p) {
      if (!p[0] || !p[1]) return;
      var m = el('div', 'sh-mi'), v = el('span', 'sh-mv');
      v.appendChild(p[2] ? ltr(p[1]) : document.createTextNode(p[1]));
      m.appendChild(el('span', 'sh-ml', p[0])); m.appendChild(v); meta.appendChild(m);
    });
    sh.appendChild(meta);

    var parties = el('section', 'sh-parties');
    function party(title, rows) {
      var box = el('div', 'sh-party'); box.appendChild(el('div', 'sh-ptitle', title));
      rows.forEach(function (r, i) {
        if (!r[1]) return;
        var p = el('div', i === 0 ? 'sh-pname' : '');
        if (r[0]) p.appendChild(el('b', '', r[0] + ': '));
        p.appendChild(r[2] ? ltr(r[1]) : document.createTextNode(r[1]));
        box.appendChild(p);
      });
      parties.appendChild(box);
    }
    party(T.seller, [['', txt(seller.name)], ['', txt(seller.address)], [T.phone, seller.phone, 1], [T.fax, seller.fax, 1],
                     [T.nid, seller.nid, 1], [T.ecode, seller.ecode, 1], [T.reg, seller.reg, 1], [T.website, seller.website, 1]]);
    party(T.buyer, [['', txt(inv.buyer.name) || '—'], ['', txt(inv.buyer.address)], [T.buyerCode, inv.buyer.code, 1],
                    [T.phone, inv.buyer.phone, 1], [T.email, inv.buyer.email, 1]]);
    sh.appendChild(parties);

    // items
    var anyDisc = c.lines.some(function (x) { return x.line.disc; });
    var cols = offer ? ['no', 'size', 'desc', 'unit', 'offerPrice'] : ['no', 'size', 'desc', 'unit', 'qty', 'price'].concat(anyDisc ? ['disc'] : [], ['amount']);
    var t = el('table', 'sh-items'), tr = el('tr'), thead = el('thead');
    cols.forEach(function (k) { tr.appendChild(el('th', 'c-' + k, I.fill(T.cols[k], { cur: cur }))); });
    thead.appendChild(tr); t.appendChild(thead);
    var tb = el('tbody'), std = inv.standards != null && inv.standards !== '' ? inv.standards : st.standards;
    c.lines.forEach(function (x, i) {
      var it = itemByCode(x.line.code) || {}, r = el('tr');
      var size = x.line.size != null ? x.line.size : (it.diameter_mm ? it.diameter_mm + 'mm' : '—');
      var cell = {
        no: n(i + 1), size: dig(size), unit: I.UNITS[lg][x.line.unit] || x.line.unit, qty: n(x.line.qty || 0),
        price: money(x.price, inv, lg), offerPrice: money(x.price, inv, lg), disc: x.line.disc ? n(x.line.disc, 2) + (lg === 'fa' ? '٪' : '%') : '—',
        amount: money(x.net, inv, lg)
      };
      cols.forEach(function (k) {
        var td = el('td', 'c-' + k);
        if (k === 'desc') {
          td.appendChild(el('strong', '', (x.line.desc && x.line.desc[lg]) || I.describe(it, lg)));
          if (I.PIPE[it.family] && std) td.appendChild(el('div', 'sh-sub', std));
        } else td.textContent = cell[k];
        r.appendChild(td);
      });
      tb.appendChild(r);
    });
    if (!c.lines.length) { var e = el('tr'), td0 = el('td', 'empty', T.empty); td0.colSpan = cols.length; e.appendChild(td0); tb.appendChild(e); }
    if (!offer && inv.transport.on && inv.transport.rate) {
      var trr = el('tr', 'sh-tr');
      cols.forEach(function (k) {
        var td = el('td', 'c-' + k);
        if (k === 'no') td.textContent = n(c.lines.length + 1);
        else if (k === 'desc') { td.appendChild(el('strong', '', T.trItem)); td.appendChild(el('div', 'sh-sub', I.fill(T.trFrom, { dest: txt(inv.transport.dest) || '…' }))); }
        else if (k === 'unit') td.textContent = I.UNITS[lg][(inv.items[0] || {}).unit || 'm'];
        else if (k === 'qty') td.textContent = n(c.trQty);
        else if (k === 'price') td.textContent = money(inv.transport.rate, inv, lg);
        else if (k === 'amount') td.textContent = money(c.transport, inv, lg);
        else td.textContent = '—';
        trr.appendChild(td);
      });
      tb.appendChild(trr);
    }
    t.appendChild(tb); sh.appendChild(t);

    if (!offer) {
      var tot = el('div', 'sh-totals'), rows = [];
      if (c.discount) rows.push([T.subtotal, c.gross], [T.discount, -c.discount]);
      if (inv.transport.on && inv.transport.rate) rows.push([T.exw, c.net], [T.transport, c.transport], [T.delivered, c.net + c.transport]);
      else rows.push([c.discount ? T.net : T.subtotal, c.net]);
      if (inv.vatOn) rows.push([I.fill(T.vat, { p: n(inv.vatPct, 2) }), c.vat]);
      rows.forEach(function (p) {
        var r = el('div', 'sh-trow'); r.appendChild(el('span', 'sh-tl', p[0]));
        r.appendChild(el('span', 'sh-tv', (p[1] < 0 ? '−' : '') + money(Math.abs(p[1]), inv, lg) + ' ' + cur)); tot.appendChild(r);
      });
      var g = el('div', 'sh-trow sh-grand'); g.appendChild(el('span', 'sh-tl', T.due)); g.appendChild(el('span', 'sh-tv', money(c.total, inv, lg) + ' ' + cur));
      tot.appendChild(g); sh.appendChild(tot);
      sh.appendChild(el('p', 'sh-words', T.words + ': ' + amountWords(c.total, inv, lg)));
      if (I.TERM_SETS[inv.type].indexOf('payment') >= 0 && !inv.terms.off.payment && c.total) {
        sh.appendChild(el('div', 'sh-section', T.schedule));
        var ps = el('table', 'sh-pay'), b2 = 100 - st.advancePct;
        [[I.fill(T.advance, { a: n(st.advancePct) }), c.advance], [I.fill(T.balance, { b: n(b2) }), c.balance]].forEach(function (p) {
          var r = el('tr'); r.appendChild(el('td', '', p[0])); r.appendChild(el('td', 'num', money(p[1], inv, lg) + ' ' + cur)); ps.appendChild(r);
        });
        sh.appendChild(ps);
      }
    }

    if (inv.deliverySum.on) {
      var ds = inv.deliverySum, u = I.UNITS[lg][(inv.items[0] || {}).unit || 'm'];
      sh.appendChild(el('div', 'sh-section', T.deliveryDetails));
      grid(sh, [[T.dPoint, txt(ds.point)], [T.dThis, ds.thisQty != null && n(ds.thisQty) + ' ' + u],
                [T.dSoFar, ds.soFar != null && n(ds.soFar) + ' ' + u], [T.dTotal, ds.total != null && n(ds.total) + ' ' + u]]);
    }

    sh.appendChild(el('div', 'sh-section', T.commercial));
    grid(sh, [[T.origin, T.originVal], [T.standards, std], [T.deliveryTerms, basis],
              [inv.delivery.basis === 'EXW' && T.pickup, T.pickupVal], [T.currency, I.CURRENCY[lg][inv.currency]]]);

    var terms = activeTerms(inv).filter(function (k) { return !inv.terms.off[k]; }).map(function (k) { return termText(k, inv, lg); });
    txt(inv.notes).split('\n').forEach(function (s) { if (s.trim()) terms.push(s.trim()); });
    if (terms.length) {
      sh.appendChild(el('div', 'sh-section', T.terms));
      var ol = el('ol', 'sh-terms');
      terms.forEach(function (s) { ol.appendChild(el('li', '', s)); });
      sh.appendChild(ol);
    }

    if (!offer && inv.transport.on && inv.transport.rate) {
      var tn = el('div', 'sh-notes'); tn.appendChild(el('div', 'sh-ntitle', T.transportInfo));
      var ul = el('ul');
      I.TRANSPORT_NOTES[lg].forEach(function (s) {
        ul.appendChild(el('li', '', I.fill(s, { rate: money(inv.transport.rate, inv, lg) + ' ' + cur, unit: I.UNITS[lg][(inv.items[0] || {}).unit || 'm'] })));
      });
      tn.appendChild(ul); sh.appendChild(tn);
    }

    if (inv.packing.on && c.lines.length) {
      sh.appendChild(el('div', 'sh-section', T.packing));
      var pk = el('table', 'sh-items sh-packing'), ph = el('tr');
      [T.cols.no, T.cols.desc, T.cols.size, T.pTotal].forEach(function (h) { ph.appendChild(el('th', '', h)); });
      var pth = el('thead'); pth.appendChild(ph); pk.appendChild(pth);
      var pb = el('tbody');
      c.lines.forEach(function (x, i) {
        var it = itemByCode(x.line.code) || {}, r = el('tr');
        [n(i + 1), (x.line.desc && x.line.desc[lg]) || I.describe(it, lg), dig(x.line.size != null ? x.line.size : (it.diameter_mm ? it.diameter_mm + 'mm' : '—')),
         n(x.line.qty || 0) + ' ' + (I.UNITS[lg][x.line.unit] || '')].forEach(function (v) { r.appendChild(el('td', '', v)); });
        pb.appendChild(r);
      });
      pk.appendChild(pb); sh.appendChild(pk);
    }

    if (inv.banking.on) {
      var bk = el('div', 'sh-bank'); bk.appendChild(el('div', 'sh-ntitle', T.banking));
      grid(bk, [[T.holder, txt(seller.name)], [T.bank, inv.banking.bank || T.onRequest], [T.account, inv.banking.account || T.onRequest],
                [T.sheba, inv.banking.sheba || T.onRequest]], true);
      sh.appendChild(bk);
    }

    var sign = el('footer', 'sh-sign');
    var sb = el('div', 'sh-sbox');
    if (inv.stamp && S.bundle.stamp) { var stp = el('img', 'sh-stamp'); stp.src = S.bundle.stamp; stp.alt = ''; sb.appendChild(stp); }
    sb.appendChild(el('div', 'sh-sline', T.signSeller)); sb.appendChild(el('div', 'sh-sname', txt(seller.name)));
    var bb = el('div', 'sh-sbox'); bb.appendChild(el('div', 'sh-sline', T.signBuyer)); bb.appendChild(el('div', 'sh-sname', txt(inv.buyer.name)));
    sign.appendChild(sb); sign.appendChild(bb); sh.appendChild(sign);

    var ft = el('div', 'sh-footer');
    if (inv.type !== 'invoice') ft.appendChild(el('div', '', T.footerNote));
    ft.appendChild(el('div', '', [txt(seller.name), txt(seller.address)].filter(Boolean).join(' | ')));
    var fl = el('div');
    [[T.phone, seller.phone], [T.fax, seller.fax], ['', seller.website]].filter(function (r) { return r[1]; }).forEach(function (r, i) {
      if (i) fl.appendChild(document.createTextNode(' | '));
      if (r[0]) fl.appendChild(document.createTextNode(r[0] + ': '));
      fl.appendChild(ltr(r[1]));
    });
    ft.appendChild(fl);
    sh.appendChild(ft);
    fitSheet();
  }
  function grid(parent, rows, mono) {
    var g = el('div', 'sh-grid');
    rows.forEach(function (r) {
      if (!r[0] || !r[1]) return;
      var it = el('div', 'sh-gi'); it.appendChild(el('div', 'sh-gl', r[0])); it.appendChild(el('div', 'sh-gv' + (mono ? ' mono' : ''), r[1])); g.appendChild(it);
    });
    parent.appendChild(g);
  }
  function amountWords(total, inv, lg) {
    var whole = Math.floor(total), cents = Math.round((total - whole) * 100);
    if (lg === 'fa') {
      if (inv.currency === 'USD') return numWords(whole) + ' دلار' + (cents ? ' و ' + numWords(cents) + ' سنت' : '');
      return numWords(total) + ' ' + I.CURRENCY.short.fa[inv.currency];
    }
    if (inv.currency === 'USD') return I.enWords(whole) + ' US dollars' + (cents ? ' and ' + cents + '/100' : '');
    return I.enWords(total) + (inv.currency === 'IRR' ? ' Rials' : ' Tomans');
  }
  function fitSheet() {
    var wrap = $('sheet-wrap'), sh = $('sheet');
    if (!wrap.offsetWidth) return;
    var s = Math.min(1, wrap.clientWidth / sh.offsetWidth);
    sh.style.transform = 'scale(' + s + ')';
    wrap.style.height = Math.ceil(sh.offsetHeight * s) + 'px';
  }
  function renderTotalsMini(c) {
    var m = $('totals-mini'), inv = S.inv, cur = I.CURRENCY.short.fa[inv.currency];
    m.textContent = '';
    var rows = [['جمع', c.net], ['حمل', c.transport], ['مالیات', c.vat], ['قابل پرداخت', c.total],
                ['پیش‌پرداخت ' + fa(S.state.settings.advancePct) + '٪', c.advance], ['مانده', c.balance]];
    rows.forEach(function (p) {
      if (p[0] === 'حمل' && !p[1]) return;
      var d = el('div'); d.appendChild(el('span', 'muted', p[0])); d.appendChild(el('b', '', money(p[1], inv, 'fa') + ' ' + cur)); m.appendChild(d);
    });
  }

  // ================================================================ change pipeline
  var refresh = debounce(function () {
    var c = compute(S.inv);
    updateLineOutputs(c); renderTotalsMini(c); renderPreview(c); refreshTermPlaceholders();
  }, 120);
  function changed() {
    S.inv.updatedAt = new Date().toISOString();
    S.state.draft = S.inv;
    refresh(); saveState();
  }

  // ================================================================ saving, list, backup
  function saveInvoice() {
    var copy = clone(S.inv), list = S.state.invoices, i = list.findIndex(function (x) { return x.id === copy.id; });
    copy.total = compute(S.inv).total;
    if (i >= 0) list[i] = copy; else list.unshift(copy);
    var b = S.inv.buyer, key = bi(b.name).fa || bi(b.name).en;
    if (key) {
      var ci = S.state.customers.findIndex(function (x) { var n = bi(x.name); return (n.fa || n.en) === key; });
      var rec = { name: clone(b.name), code: b.code, phone: b.phone, email: b.email, address: clone(b.address) };
      if (ci >= 0) S.state.customers[ci] = rec; else S.state.customers.push(rec);
      renderCustomers();
    }
    saveState();
    $('save-state').textContent = 'سند ' + faDigits(S.inv.number) + ' ذخیره شد.';
  }
  function loadInvoice(inv, asNew) {
    S.inv = clone(inv);
    if (asNew) {
      var now = new Date().toISOString();
      S.inv.id = uuid(); S.inv.number = nextNumber(); S.inv.date = todayISO(); S.inv.createdAt = now; S.inv.updatedAt = now;
      S.inv.edited = Object.assign({}, S.inv.edited, { number: false, date: false });
    }
    S.state.draft = S.inv; fillForm(); saveState();
  }
  function renderSaved() {
    var ul = $('saved-list'), toks = tokens($('saved-q').value);
    ul.textContent = '';
    var list = S.state.invoices.filter(function (inv) {
      var h = norm([inv.number, bi(inv.buyer.name).fa, bi(inv.buyer.name).en, jalaliText(inv.date)]
        .concat(inv.items.map(function (x) { var it = itemByCode(x.code); return it ? it.name : x.code; })).join(' '));
      for (var i = 0; i < toks.length; i++) if (h.indexOf(toks[i]) < 0) return false;
      return true;
    });
    if (!list.length) ul.appendChild(el('li', 'muted', S.state.invoices.length ? 'موردی پیدا نشد.' : 'هنوز سندی ذخیره نشده است.'));
    list.forEach(function (inv) {
      var li = el('li'), name = bi(inv.buyer.name);
      var info = el('div'); info.appendChild(el('b', '', faDigits(inv.number) + ' · ' + (name.fa || name.en || 'بدون نام')));
      info.appendChild(el('small', 'muted', ' ' + I.L.fa.title[inv.type] + ' · ' + jalaliText(inv.date) + ' · ' + money(inv.total || 0, inv, 'fa') + ' ' + I.CURRENCY.short.fa[inv.currency]));
      li.appendChild(info);
      var acts = el('div', 'acts');
      function btn(label, fn, cls) { var b = el('button', 'ibtn sm ' + (cls || ''), label); b.type = 'button'; b.addEventListener('click', fn); acts.appendChild(b); return b; }
      btn('باز کردن', function () { loadInvoice(inv, false); $('dlg-saved').close(); });
      btn('نسخه جدید', function () { loadInvoice(inv, true); $('dlg-saved').close(); });
      var del = btn('حذف', function () {
        if (del.dataset.armed) { S.state.invoices = S.state.invoices.filter(function (x) { return x.id !== inv.id; }); saveState(); renderSaved(); }
        else { del.dataset.armed = '1'; del.textContent = 'حذف شود؟'; setTimeout(function () { del.textContent = 'حذف'; delete del.dataset.armed; }, 3000); }
      }, 'danger');
      li.appendChild(acts); ul.appendChild(li);
    });
  }
  async function exportBackup() {
    var plain = $('b-export-plain').checked, data;
    if (plain) data = { format: 'nesha-invoice-backup', version: 2, encrypted: false, state: S.state };
    else data = { format: 'nesha-invoice-backup', version: 2, encrypted: true, payload: await encryptJSON(S.dataKey, S.state, 'backup|' + S.uid) };
    var a = el('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = 'nesha-invoices-' + todayISO() + '.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  }
  async function importBackup(file) {
    try {
      var data = JSON.parse(await file.text()), st;
      if (data.format !== 'nesha-invoice-backup') throw new Error('format');
      st = data.encrypted ? await decryptJSON(S.dataKey, data.payload, 'backup|' + S.uid) : data.state;
      var byId = {};
      S.state.invoices.forEach(function (x) { byId[x.id] = x; });
      (st.invoices || []).forEach(function (x) { if (x.v === 2 && (!byId[x.id] || byId[x.id].updatedAt < x.updatedAt)) byId[x.id] = x; });
      S.state.invoices = Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });
      (st.customers || []).forEach(function (c) {
        var k = bi(c.name).fa || bi(c.name).en;
        if (!S.state.customers.some(function (x) { return (bi(x.name).fa || bi(x.name).en) === k; })) S.state.customers.push(c);
      });
      saveState(); renderSaved(); renderCustomers();
      $('save-state').textContent = 'بازیابی انجام شد.';
    } catch (e) { $('save-state').textContent = 'فایل پشتیبان باز نشد (فایل دیگری است یا با رمز کاربر دیگری ساخته شده).'; }
  }

  // ================================================================ settings
  function wireSettings() {
    var st = S.state.settings, sel = st.seller;
    var flat = [['s-phone', 'phone'], ['s-mobile', 'mobile'], ['s-fax', 'fax'], ['s-email', 'email'], ['s-web', 'website'],
                ['s-nid', 'nid'], ['s-ecode', 'ecode'], ['s-reg', 'reg']];
    var bil = [['s-name-fa', 'name', 'fa'], ['s-name-en', 'name', 'en'], ['s-addr-fa', 'address', 'fa'], ['s-addr-en', 'address', 'en']];
    $('btn-settings').addEventListener('click', function () {
      flat.forEach(function (p) { $(p[0]).value = sel[p[1]] || ''; });
      bil.forEach(function (p) { $(p[0]).value = bi(sel[p[1]])[p[2]] || ''; });
      $('s-prefix').value = st.prefix; $('s-seq').value = st.seq; $('s-vat').value = st.vat; $('s-standards').value = st.standards;
      $('s-adv').value = st.advancePct; $('s-bdays').value = st.balanceDays; $('s-btrig').value = st.balanceTrigger;
      renderTermDefaults();
      var m = model();
      $('s-model').textContent = 'مدل قیمت: نسخه ' + m.model_version + (m.data_through ? ' · داده تا ' + jalaliText(m.data_through) : '') +
        ' · بسته داده: ' + jalaliText(S.bundle.built_at.slice(0, 10));
      $('dlg-settings').showModal();
    });
    flat.forEach(function (p) { $(p[0]).addEventListener('input', function (e) { sel[p[1]] = e.target.value; changed(); }); });
    bil.forEach(function (p) { $(p[0]).addEventListener('input', function (e) { sel[p[1]] = bi(sel[p[1]]); sel[p[1]][p[2]] = e.target.value; changed(); }); });
    $('s-prefix').addEventListener('input', function (e) { st.prefix = e.target.value.trim(); saveState(); });
    $('s-seq').addEventListener('input', function (e) { st.seq = Math.max(1, parseNum(e.target.value) || 1); saveState(); });
    $('s-vat').addEventListener('input', function (e) { st.vat = parseNum(e.target.value) || 0; saveState(); });
    $('s-standards').addEventListener('input', function (e) { st.standards = e.target.value; $('f-standards').placeholder = st.standards; changed(); });
    $('s-adv').addEventListener('input', function (e) { st.advancePct = Math.min(100, Math.max(0, parseNum(e.target.value) || 0)); changed(); });
    $('s-bdays').addEventListener('input', function (e) { st.balanceDays = Math.max(1, parseNum(e.target.value) || 30); renderTerms(); changed(); });
    $('s-btrig').addEventListener('change', function (e) { st.balanceTrigger = e.target.value; changed(); });
    $('s-terms-reset').addEventListener('click', function () { st.termText = { fa: {}, en: {} }; renderTermDefaults(); changed(); });
  }
  function renderTermDefaults() {
    var box = $('s-terms'), st = S.state.settings;
    box.textContent = '';
    Object.keys(I.TERMS.fa).forEach(function (k) {
      var f = el('fieldset', 'tdef'); f.appendChild(el('legend', '', k));
      ['fa', 'en'].forEach(function (lg) {
        var ta = el('textarea'); ta.rows = 2; ta.dir = lg === 'en' ? 'ltr' : 'rtl';
        ta.value = (st.termText[lg] || {})[k] || I.TERMS[lg][k];
        ta.setAttribute('aria-label', k + ' ' + lg);
        ta.addEventListener('input', function () {
          st.termText[lg] = st.termText[lg] || {};
          if (ta.value && ta.value !== I.TERMS[lg][k]) st.termText[lg][k] = ta.value; else delete st.termText[lg][k];
          changed();
        });
        f.appendChild(ta);
      });
      box.appendChild(f);
    });
  }

  // ================================================================ layout: mobile toggle
  var scrollPos = { form: 0, preview: 0 }, view = 'form';
  function setView(v) {
    if (v === view) return;
    scrollPos[view] = window.scrollY;
    view = v;
    document.body.classList.toggle('view-preview', v === 'preview');
    $('m-form').setAttribute('aria-pressed', String(v === 'form'));
    $('m-preview').setAttribute('aria-pressed', String(v === 'preview'));
    fitSheet();
    window.scrollTo(0, scrollPos[v] || 0);
  }

  // ================================================================ boot
  function openApp() {
    $('login').hidden = true; $('app').hidden = false; $('user-bar').hidden = false;
    $('user-name').textContent = S.user;
    wireForm(); wireCombo(); wireSettings();
    $('a-save').addEventListener('click', saveInvoice);
    $('a-new').addEventListener('click', function () { S.inv = newInvoice(S.inv.lang); S.state.draft = S.inv; fillForm(); saveState(); });
    $('a-dup').addEventListener('click', function () { loadInvoice(S.inv, true); });
    $('a-print').addEventListener('click', function () { window.print(); });
    $('btn-saved').addEventListener('click', function () { renderSaved(); $('dlg-saved').showModal(); });
    $('saved-q').addEventListener('input', renderSaved);
    $('b-export').addEventListener('click', exportBackup);
    $('b-import').addEventListener('change', function (e) { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ''; });
    $('btn-logout').addEventListener('click', logout);
    $('m-form').addEventListener('click', function () { setView('form'); });
    $('m-preview').addEventListener('click', function () { setView('preview'); });
    window.addEventListener('resize', debounce(fitSheet, 100));
    window.addEventListener('beforeprint', function () { $('sheet').style.transform = ''; });
    window.addEventListener('afterprint', fitSheet);
    fillForm();
    $('f-date-hint').textContent = dateHint();
  }

  // hooks for automated tests (no secrets exposed)
  window.NeshaInvoiceTest = {
    numWords: numWords, jalaliText: jalaliText, parseJalali: parseJalali, gregText: gregText,
    state: function () { return S; }, compute: function () { return compute(S.inv); }, setLang: setLang, setView: setView
  };

  if (!subtle) { var m = $('login-msg'); if (m) m.textContent = 'این مرورگر از رمزنگاری لازم پشتیبانی نمی‌کند؛ مرورگر به‌روز یا اتصال امن (https) لازم است.'; return; }
  var form = $('login-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('login-msg'), btn = $('login-btn');
      msg.textContent = 'در حال بررسی…'; btn.disabled = true;
      login($('login-user').value, $('login-pass').value, $('login-remember').checked)
        .then(function () { $('login-pass').value = ''; })
        .catch(function (err) {
          msg.textContent = err && err.message === 'auth' ? 'نام کاربری یا رمز عبور نادرست است.' : 'باز کردن اطلاعات ناموفق بود؛ دوباره تلاش کنید.';
        })
        .finally(function () { btn.disabled = false; });
    });
    var sess = savedSession();
    if (sess) start(sess).catch(function () { lsDel('sessionStorage', SESSION_KEY); lsDel('localStorage', SESSION_KEY); });
  }
})();
