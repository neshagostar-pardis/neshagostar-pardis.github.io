/* /tenders/ filter: date-range presets, text search and a searchable day picker.
   Reads /tenders/data/index.json (one row per day with items) and loads /tenders/data/<yyyy-mm>.json
   only for the months a range touches, so the page stays light however long the archive gets.
   State lives in the URL hash (#range=30&q=...), shareable but never a separate crawlable URL.
   Cards are built with the same markup and classes as templates/_tender_list.html.j2. */
(function () {
  var box = document.getElementById('tf');
  var results = document.getElementById('tf-results');
  if (!box || !results || !window.fetch) return;

  var TZ = 'Asia/Tehran';
  var PAGE = 150; // cards rendered per "show more"
  var q = document.getElementById('tf-q');
  var dayInput = document.getElementById('tf-day');
  var dayList = document.getElementById('tf-day-list');
  var status = document.getElementById('tf-status');
  var buttons = box.querySelectorAll('[data-range]');
  var RANGE_LABEL = { today: 'امروز', yesterday: 'دیروز', '7': '۷ روز اخیر', '30': '۳۰ روز اخیر', '90': '۳ ماه اخیر', all: 'کل آرشیو' };

  var index = null, months = {}, state = { range: '7', q: '', day: '' }, serverHtml = results.innerHTML, shown = 0, matches = [];

  function fa(n) { return Number(n).toLocaleString('fa-IR'); }
  function today() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function addDay(s, n) {
    var p = s.split('-');
    return new Date(Date.UTC(+p[0], p[1] - 1, +p[2] + n)).toISOString().slice(0, 10);
  }
  // Persian/Arabic digits -> Latin, Arabic yeh/kaf -> Persian, drop ZWNJ and bidi marks, collapse spaces
  function norm(s) {
    return String(s || '')
      .replace(/[۰-۹]/g, function (c) { return c.charCodeAt(0) - 0x06F0; })
      .replace(/[٠-٩]/g, function (c) { return c.charCodeAt(0) - 0x0660; })
      .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
      .replace(/[‌‎‏]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function tokens(s) { return norm(s).split(' ').filter(Boolean); }
  function hasAll(hay, toks) { for (var i = 0; i < toks.length; i++) if (hay.indexOf(toks[i]) < 0) return false; return true; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- URL hash <-> state ----------
  function readHash() {
    var h = new URLSearchParams(location.hash.slice(1));
    state.range = RANGE_LABEL[h.get('range')] ? h.get('range') : '7';
    state.q = h.get('q') || '';
    state.day = /^\d{4}-\d{2}-\d{2}$/.test(h.get('day') || '') ? h.get('day') : '';
  }
  function writeHash() {
    var h = new URLSearchParams();
    if (state.day) h.set('day', state.day); else if (state.range !== '7') h.set('range', state.range);
    if (state.q) h.set('q', state.q);
    var s = h.toString();
    history.replaceState(null, '', s ? '#' + s : location.pathname);
  }

  // ---------- data ----------
  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function daysInRange() {
    var t = today();
    return index.days.filter(function (x) {
      if (state.day) return x.d === state.day;
      switch (state.range) {
        case 'today': return x.d === t;
        case 'yesterday': return x.d === addDay(t, -1);
        case 'all': return true;
        default: return x.d > addDay(t, -Number(state.range));
      }
    });
  }
  function loadMonths(keys) {
    return Promise.all(keys.filter(function (k) { return !months[k]; }).map(function (k) {
      return getJSON('/tenders/data/' + k + '.json').then(function (m) {
        m.items.forEach(function (it) {
          it._hay = norm([it.title, it.employer, it.province, it.summary, it.type, (it.tags || []).join(' ')].join(' '));
        });
        months[k] = m.items;
      });
    }));
  }

  // ---------- rendering ----------
  function card(t, now) {
    var expired = t.deadline && t.deadline < now;
    var li = el('li', 'tender' + (expired ? ' is-expired' : ''));
    li.id = 't-' + t.id;
    li.setAttribute('data-deadline', t.deadline || '');
    var h = el('h3', 't-title');
    var a = el('a', '', t.title); a.href = t.page + '#t-' + t.id; h.appendChild(a); li.appendChild(h);
    var b = el('p', 't-badges');
    if (t.match) {
      var mb = el('span', 'badge match m' + t.match, 'ارتباط ' + fa(t.match) + '/۵ · ' + (t.match_label || ''));
      mb.title = 'میزان ارتباط با محصولات نشاگستر پردیس';
      b.appendChild(mb); b.appendChild(document.createTextNode(' '));
    }
    b.appendChild(el('span', 'badge', t.type || 'مناقصه'));
    if (expired) { b.appendChild(document.createTextNode(' ')); b.appendChild(el('span', 'badge expired', 'منقضی')); }
    (t.tags || []).forEach(function (tag) { b.appendChild(document.createTextNode(' ')); b.appendChild(el('span', 'badge tag', tag)); });
    li.appendChild(b);
    var dl = el('dl', 't-facts');
    function fact(k, v) { if (!v) return; var d = el('div'); d.appendChild(el('dt', '', k)); d.appendChild(el('dd', '', v)); dl.appendChild(d); }
    fact('کارفرما', t.employer); fact('استان', t.province); fact('مهلت', t.deadline_fa || 'نامشخص'); fact('انتشار', t.publish_fa);
    li.appendChild(dl);
    if (t.summary) {
      var s = el('p', 't-sum', t.summary + ' ');
      s.appendChild(el('small', 'muted', '(خلاصه: نشاگستر پردیس)'));
      li.appendChild(s);
    }
    var src = el('p', 't-src', 'آگهی در: ');
    (t.sources || []).forEach(function (x, i) {
      if (i) src.appendChild(document.createTextNode('، '));
      var l = el('a', 'tender-src', x.label);
      l.href = x.url; l.rel = 'nofollow noopener'; l.target = '_blank';
      src.appendChild(l);
    });
    li.appendChild(src);
    return li;
  }

  function renderMore() {
    var now = today(), byDay = {}, label = {};
    index.days.forEach(function (x) { label[x.d] = x; });
    var chunk = matches.slice(shown, shown + PAGE);
    var lastSection = results.lastElementChild && results.lastElementChild.classList.contains('day') ? results.lastElementChild : null;
    chunk.forEach(function (t) {
      var sec = byDay[t.day] || (lastSection && lastSection.getAttribute('data-day') === t.day ? lastSection : null);
      if (!sec) {
        sec = el('section', 'day'); sec.setAttribute('data-day', t.day);
        var h2 = el('h2');
        var a = el('a', '', label[t.day] ? label[t.day].label : t.day); a.href = t.page;
        h2.appendChild(a);
        sec.appendChild(h2);
        sec.appendChild(el('ol', 'tenders'));
        results.appendChild(sec);
      }
      byDay[t.day] = sec; lastSection = sec;
      sec.querySelector('ol').appendChild(card(t, now));
    });
    shown += chunk.length;
    var old = document.getElementById('tf-more');
    if (old) old.remove();
    if (shown < matches.length) {
      var more = el('button', 'btn tf-more', 'نمایش ' + fa(Math.min(PAGE, matches.length - shown)) + ' مورد بیشتر');
      more.type = 'button'; more.id = 'tf-more';
      more.addEventListener('click', renderMore);
      results.appendChild(more);
    }
  }

  function apply() {
    buttons.forEach(function (bt) { bt.setAttribute('aria-pressed', String(!state.day && bt.getAttribute('data-range') === state.range)); });
    q.value = state.q;
    dayInput.value = state.day ? (index.days.filter(function (x) { return x.d === state.day; })[0] || {}).label || '' : '';
    writeHash();
    if (!state.day && state.range === '7' && !state.q) { // the server-rendered default
      results.innerHTML = serverHtml;
      var n = 0; index.days.forEach(function (x) { if (x.d > addDay(today(), -7)) n += x.n; });
      status.textContent = fa(n) + ' مورد در ۷ روز اخیر';
      return;
    }
    var days = daysInRange();
    var keys = []; days.forEach(function (x) { if (keys.indexOf(x.m) < 0) keys.push(x.m); });
    status.textContent = 'در حال بارگذاری…';
    loadMonths(keys).then(function () {
      var want = {}; days.forEach(function (x) { want[x.d] = true; });
      var toks = tokens(state.q);
      matches = [];
      keys.forEach(function (k) { months[k].forEach(function (it) { if (want[it.day] && hasAll(it._hay, toks)) matches.push(it); }); });
      matches.sort(function (a, b) { return a.day < b.day ? 1 : a.day > b.day ? -1 : 0; });
      var where = state.day ? dayInput.value : RANGE_LABEL[state.range];
      status.textContent = fa(matches.length) + ' مورد در ' + where + (state.q ? ' برای «' + state.q + '»' : '');
      results.textContent = ''; shown = 0;
      if (!matches.length) results.appendChild(el('p', 'empty muted', 'موردی پیدا نشد. بازه بزرگ‌تری را امتحان کنید.'));
      else renderMore();
    }).catch(function () { status.textContent = 'بارگذاری داده‌ها ناموفق بود؛ دوباره تلاش کنید.'; });
  }

  // ---------- searchable day picker (combobox) ----------
  var active = -1, options = [];
  function openList() {
    var toks = tokens(dayInput.value);
    options = index.days.filter(function (x) { return hasAll(x._hay, toks); }).slice(0, 40);
    dayList.textContent = '';
    options.forEach(function (x, i) {
      var li = el('li', '', x.label + ' (' + fa(x.n) + ' مورد)');
      li.id = 'tf-opt-' + i; li.setAttribute('role', 'option');
      li.addEventListener('mousedown', function (e) { e.preventDefault(); pick(x); });
      dayList.appendChild(li);
    });
    if (!options.length) dayList.appendChild(el('li', 'muted', 'روزی پیدا نشد'));
    active = -1; dayList.hidden = false; dayInput.setAttribute('aria-expanded', 'true');
  }
  function closeList() { dayList.hidden = true; dayInput.setAttribute('aria-expanded', 'false'); dayInput.removeAttribute('aria-activedescendant'); }
  function highlight(i) {
    var items = dayList.querySelectorAll('[role=option]');
    if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach(function (it, k) { it.setAttribute('aria-selected', String(k === active)); });
    dayInput.setAttribute('aria-activedescendant', items[active].id);
    items[active].scrollIntoView({ block: 'nearest' });
  }
  function pick(x) { state.day = x.d; closeList(); apply(); }

  dayInput.addEventListener('focus', openList);
  dayInput.addEventListener('input', function () { if (!dayInput.value && state.day) { state.day = ''; apply(); } openList(); });
  dayInput.addEventListener('blur', closeList);
  dayInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (dayList.hidden) openList(); highlight(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); var x = options[active >= 0 ? active : 0]; if (x) pick(x); }
    else if (e.key === 'Escape') closeList();
  });

  buttons.forEach(function (bt) {
    bt.addEventListener('click', function () { state.range = bt.getAttribute('data-range'); state.day = ''; apply(); });
  });
  var timer;
  q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { state.q = q.value.trim(); apply(); }, 250); });

  getJSON('/tenders/data/index.json').then(function (data) {
    index = data;
    index.days.forEach(function (x) { x._hay = norm(x.label + ' ' + x.d); });
    box.hidden = false;
    readHash();
    apply();
    window.addEventListener('hashchange', function () { readHash(); apply(); });
  }).catch(function () { /* filter stays hidden; the server-rendered list and month archive still work */ });
})();
