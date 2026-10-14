/* Hover/touch tooltip for the build-time SVG charts (svg.mchart[data-tip]).
   data-tip = {top, bottom, cols: [{x, m, v: [[label, value, cls], ...]}]} with x and top/bottom as
   fractions of the chart box, so it works at any rendered size. Shows a crosshair at the nearest
   month and every series' value for that month. */
(function () {
  document.querySelectorAll('svg.mchart[data-tip]').forEach(function (svg) {
    var tip;
    try { tip = JSON.parse(svg.getAttribute('data-tip')); } catch (e) { return; }
    if (!tip.cols || !tip.cols.length) return;
    var fig = svg.parentNode;
    fig.classList.add('has-tip');
    var NS = 'http://www.w3.org/2000/svg';
    var vb = svg.viewBox.baseVal;
    var line = document.createElementNS(NS, 'line');
    line.setAttribute('class', 'cross');
    line.setAttribute('y1', tip.top * vb.height);
    line.setAttribute('y2', tip.bottom * vb.height);
    line.style.display = 'none';
    svg.appendChild(line);
    var box = document.createElement('div');
    box.className = 'chart-tip';
    box.hidden = true;
    box.setAttribute('role', 'status');
    fig.appendChild(box);
    // native <title> tooltips would pop up on top of ours
    svg.querySelectorAll('circle title').forEach(function (t) { t.remove(); });

    function show(ev) {
      var r = svg.getBoundingClientRect();
      var fx = (ev.clientX - r.left) / r.width;
      var best = tip.cols[0];
      tip.cols.forEach(function (c) { if (Math.abs(c.x - fx) < Math.abs(best.x - fx)) best = c; });
      line.setAttribute('x1', best.x * vb.width);
      line.setAttribute('x2', best.x * vb.width);
      line.style.display = '';
      box.textContent = '';
      var h = document.createElement('strong');
      h.textContent = best.m;
      box.appendChild(h);
      best.v.forEach(function (s) {
        var row = document.createElement('div');
        var key = document.createElement('span');
        key.className = 'sw ' + s[2];
        row.appendChild(key);
        row.appendChild(document.createTextNode(s[0] + ': '));
        var b = document.createElement('b');
        b.textContent = s[1];
        row.appendChild(b);
        row.appendChild(document.createTextNode(' تومان'));
        box.appendChild(row);
      });
      box.hidden = false;
      var fr = fig.getBoundingClientRect();
      var px = r.left - fr.left + best.x * r.width;
      var w = box.offsetWidth;
      box.style.left = Math.min(Math.max(px - w / 2, 0), fr.width - w) + 'px';
      box.style.top = (r.top - fr.top + 4) + 'px';
    }
    function hide() { line.style.display = 'none'; box.hidden = true; }
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', hide);
  });
})();
