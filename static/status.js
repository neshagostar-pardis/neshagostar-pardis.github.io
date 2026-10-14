/* Notification center: reads /status.json (written by every workflow run) and works out, in the
   visitor's browser, which days updated, which failed and which never started. Runs on every page
   for the header badge; fills the lists on /vaziat/. */
(function () {
  var TZ = 'Asia/Tehran';
  var LATE_HOUR = 13; // no successful run by this Tehran hour: today is flagged as late
  var DAYS = 30;
  var STEP = { rates: 'دریافت نرخ ارز', build: 'ساخت صفحات', seo: 'بررسی کیفیت صفحات', save: 'ذخیره داده‌ها', tenders: 'دریافت مناقصات' };
  var LLM = {
    billing_error: 'اعتبار LLM تمام شده است؛ اعتبار را شارژ یا کلید را عوض کنید.',
    authentication_failed: 'کلید LLM نامعتبر است یا تنظیم نشده است.'
  };
  var LABEL = { ok: 'انجام شد', partial: 'ناقص', failed: 'ناموفق', missed: 'اجرا نشد', late: 'هنوز انجام نشده', pending: 'در انتظار' };

  function ymd(d) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }
  function tehranHour() {
    return +new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date()) % 24;
  }
  function addDay(s, n) {
    var p = s.split('-');
    return new Date(Date.UTC(+p[0], p[1] - 1, +p[2] + n)).toISOString().slice(0, 10);
  }
  function at(day, hour) { return new Date(day + 'T' + (hour < 10 ? '0' : '') + hour + ':00:00+03:30').getTime(); }
  function dayFa(s) {
    var p = s.split('-');
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
      .format(new Date(Date.UTC(+p[0], p[1] - 1, +p[2], 12)));
  }
  function timeFa(iso) {
    return new Intl.DateTimeFormat('fa-IR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  }

  function describe(run) {
    var failed = Object.keys(STEP).filter(function (k) { return k !== 'tenders' && run.steps[k] !== 'success'; });
    var out = [];
    if (failed.length) out.push('سایت به‌روز نشد؛ مرحله ناموفق: ' + failed.map(function (k) { return STEP[k]; }).join('، ') + '.');
    if (run.llm_status !== 'ok') out.push(LLM[run.llm_status] || 'LLM پاسخ نداد؛ مناقصات بدون امتیازدهی هوشمند فیلتر شدند.');
    if (run.steps.tenders !== 'success') out.push('دریافت مناقصات ناموفق بود.');
    if (!failed.length) out.push('نرخ ارز و بقیه صفحات به‌روز شدند.');
    return 'اجرای ساعت ' + timeFa(run.at) + ': ' + out.join(' ');
  }

  function analyse(s) {
    var today = ymd(new Date());
    var cleared = s.cleared_at ? new Date(s.cleared_at).getTime() : 0;
    var start = s.since > addDay(today, 1 - DAYS) ? s.since : addDay(today, 1 - DAYS);
    var days = [], notes = [];
    for (var d = today; d >= start; d = addDay(d, -1)) {
      var runs = s.runs.filter(function (r) { return r.date === d; });
      var ok = runs.filter(function (r) { return r.result === 'ok'; });
      var last = runs[runs.length - 1], state, msg, ts = 0;
      if (ok.length) {
        state = 'ok'; msg = 'به‌روزرسانی کامل، ساعت ' + timeFa(ok[0].at) + '.';
      } else if (last) {
        state = last.result; msg = describe(last); ts = new Date(last.at).getTime();
      } else if (d < today) {
        state = 'missed'; msg = 'هیچ اجرایی شروع نشد؛ داده این روز ثبت نشده است.'; ts = at(addDay(d, 1), 0);
      } else if (tehranHour() >= LATE_HOUR) {
        state = 'late'; msg = 'تا ساعت ۱۳ تهران هیچ اجرایی شروع نشده است.'; ts = at(d, LATE_HOUR);
      } else {
        state = 'pending'; msg = 'اجرای امروز از ساعت ۸:۰۷ تهران شروع می‌شود.';
      }
      days.push({ day: d, state: state, msg: msg });
      if (state !== 'ok' && state !== 'pending' && ts > cleared) notes.push({ day: d, state: state, msg: msg });
    }
    return { days: days, notes: notes };
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function render(r) {
    var badge = document.getElementById('ntf');
    if (badge && r.notes.length) {
      badge.querySelector('b').textContent = r.notes.length.toLocaleString('fa-IR');
      badge.hidden = false;
    }
    var list = document.getElementById('ntf-list');
    if (list) {
      list.textContent = '';
      if (!r.notes.length) list.appendChild(el('p', 'muted', 'اعلان تازه‌ای نیست. همه چیز مرتب است.'));
      else {
        var ul = el('ul');
        r.notes.forEach(function (n) {
          var li = el('li', 'st-' + n.state);
          li.appendChild(el('strong', '', dayFa(n.day) + ' — ' + LABEL[n.state] + ': '));
          li.appendChild(document.createTextNode(n.msg));
          ul.appendChild(li);
        });
        list.appendChild(ul);
      }
    }
    var tbody = document.querySelector('#ntf-days tbody');
    if (tbody) {
      r.days.forEach(function (d) {
        var tr = el('tr');
        tr.appendChild(el('td', '', dayFa(d.day)));
        tr.appendChild(el('td', 'st st-' + d.state, LABEL[d.state]));
        tr.appendChild(el('td', '', d.msg));
        tbody.appendChild(tr);
      });
    }
  }

  fetch('/status.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
    .then(function (s) { render(analyse(s)); })
    .catch(function () {
      var list = document.getElementById('ntf-list');
      if (list) list.textContent = 'فایل وضعیت در دسترس نیست.';
    });
})();
