// Neshagostar pricing — dependency-free consumer of model.json (mirror of the Python reference).
//
//   suggest(model, itemCode, {date, rawPrices, qty, orderKg, kgPerUnit, segment})
//     schema 1.x: ratio model (v1). schema 2.x: cost-plus EXW with tiers, floor, buffer, rounding (see model.formula).
//     date      'YYYY-MM-DD' quote date (valid_until = date + params.validity_days)
//     rawPrices {pe80, pe100, mb, freight_in}  Toman/kg ex-freight ex-VAT; missing -> model defaults
//     qty       quantity in the item's unit (default 1)
//
//   raw_price_per_kg = sum(mix[g] * rawPrices[g]) + freight_in
//   extrapolated     = (a + b * kg_per_unit * raw_price_per_kg) * time_factor * segment_factor
//   unit_price       = extrapolated * (1 + uplift)
(function (root) {
  "use strict";
  var SUPPORTED_SCHEMA_MAJORS = [1, 2, 3];

  function checkSchema(model) {
    var major = parseInt(String(model.schema_version || "0").split(".")[0], 10);
    if (SUPPORTED_SCHEMA_MAJORS.indexOf(major) < 0) {
      throw new Error("unsupported schema_version " + model.schema_version + " (need 1.x, 2.x or 3.x)");
    }
    return major;
  }

  function roundClean(x, rules) {
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.below === null || x < r.below) return Math.floor(x / r.step + 0.5) * r.step;
    }
    return x;
  }

  function tierOf(orderKg, bounds) {
    var t = 1;
    for (var i = 0; i < bounds.length; i++) if (orderKg > bounds[i]) t += 1;
    return t;
  }

  function daysBetween(a, b) {
    var x = a.split("-").map(Number), y = b.split("-").map(Number);
    return Math.round((Date.UTC(y[0], y[1] - 1, y[2]) - Date.UTC(x[0], x[1] - 1, x[2])) / 86400000);
  }

  function projMonths(pp, date, monthDays) {
    var h = daysBetween(pp.anchor, date) / monthDays;
    return h > 0 ? h : 0.0;
  }

  function projLogGrowth(pp, h) {
    var phi = pp.phi;
    var damp = Math.abs(1 - phi) < 1e-12 ? h : phi * (1 - Math.pow(phi, h)) / (1 - phi);
    return pp.trend * damp;
  }

  function projectedInputs(p, date, rawPrices) {
    rawPrices = rawPrices || {};
    var pj = p.projection, md = pj.month_days, total = 0, sig = 0, res = {};
    Object.keys(p.mix).sort().forEach(function (g) {
      var v;
      if (has(rawPrices[g])) v = rawPrices[g];
      else {
        var gp = pj.grades[g], h = projMonths(gp, date, md);
        v = Math.exp(gp.level + projLogGrowth(gp, h));
        sig += p.mix[g] * gp.sigma1 * Math.sqrt(h > 1 ? h : 1.0);
      }
      res[g] = v;
      total += p.mix[g] * v;
    });
    var raw = total + (has(rawPrices.freight_in) ? rawPrices.freight_in : p.freight_in);
    var c = pj.conversion, o = pj.overhead;
    var conv = c.base_per_kg * Math.exp(projLogGrowth(c, projMonths(c, date, md)));
    var ovh = o.base_per_kg * Math.exp(projLogGrowth(o, projMonths(o, date, md)));
    return { resin: res, raw: raw, conversion: conv, overhead: ovh, sigma: sig };
  }

  function suggestV2(model, itemCode, opts, major) {
    var p = model.params, it = findItem(model, itemCode), c = it.coef;
    var qty = has(opts.qty) ? opts.qty : 1;
    var out = { model_version: model.model_version, item_code: it.code, unit: it.unit, qty: qty,
                terms: model.terms, date: opts.date, valid_until: addDays(opts.date, p.validity_days),
                confidence: it.confidence, priced: c.method !== "not_priced" };
    if (!out.priced) return out;
    var kg = has(opts.kgPerUnit) ? opts.kgPerUnit : (it.kg_per_unit || 0);
    var ok = has(opts.orderKg) ? opts.orderKg : qty * kg;
    var tiers = p.tiers, tier = tierOf(ok, tiers.bounds_kg), ts = String(tier);
    var raw, convKg, ovhKg, sig;
    if (major >= 3) {
      var pin = projectedInputs(p, opts.date, opts.rawPrices);
      raw = pin.raw; convKg = pin.conversion; ovhKg = pin.overhead; sig = pin.sigma;
      out.resin_prices = pin.resin;
    } else {
      raw = rawPricePerKg(p, opts.rawPrices);
      convKg = p.cost_per_kg.conversion; ovhKg = p.cost_per_kg.overhead; sig = 0.0;
    }
    var pre, up, unit;
    if (c.method === "purchase_markup") {
      pre = c.a; up = pre * p.uplift; unit = roundClean(pre + up, p.rounding);
      out.tier = tier; out.kg_per_unit = kg; out.raw_price_per_kg = raw;
      out.breakdown = { material: 0, conversion: 0, overhead: 0, full_cost: 0, margin: 0, list_price: pre,
                        volume_discount: 0, cap_adjustment: 0, floor_adjustment: 0, risk_buffer: 0, uplift: up,
                        rounding: unit - (pre + up) };
      out.unit_price = unit; out.total = unit * qty;
      out.low_unit = pre * c.band_low; out.high_unit = pre * c.band_high; out.indexed_option = null;
      return out;
    }
    var material = kg * raw * (1 + p.scrap_pct);
    var conversion = kg * convKg;
    var overhead = kg * ovhKg;
    var full = material + conversion + overhead;
    var lst = full * c.b;
    var disc = lst * tiers.discount_factor[ts];
    var capped = disc;
    if (has(c.cap_ratio)) {
      var cap = full * c.cap_ratio * (1 + p.cap_tolerance);
      if (cap < capped) capped = cap;
    }
    var floor = full * (1 + tiers.min_margin[ts]);
    var base = capped > floor ? capped : floor;
    var bpct = tiers.buffer_pct_of_material[ts];
    if (major >= 3 && tier > 1) {
      var later = projectedInputs(p, addDays(opts.date, p.validity_days), opts.rawPrices).raw;
      var rise = later / raw - 1;
      if (rise > bpct) bpct = rise;
    }
    var buffer = material * bpct;
    pre = base + buffer; up = pre * p.uplift; unit = roundClean(pre + up, p.rounding);
    out.tier = tier; out.kg_per_unit = kg; out.raw_price_per_kg = raw;
    out.breakdown = { material: material, conversion: conversion, overhead: overhead, full_cost: full,
                      margin: lst - full, list_price: lst, volume_discount: disc - lst,
                      cap_adjustment: capped - disc, floor_adjustment: base - capped,
                      risk_buffer: buffer, uplift: up, rounding: unit - (pre + up) };
    out.unit_price = unit; out.total = unit * qty;
    out.low_unit = base * c.band_low * Math.exp(-1.2816 * sig * material / base);
    out.high_unit = base * c.band_high * Math.exp(1.2816 * sig * material / base);
    out.indexed_option = null;
    var cl = p.clause;
    if (cl && cl.tiers.indexOf(tier) >= 0) {
      var iu = roundClean(base * (1 + p.uplift), p.rounding);
      out.indexed_option = { unit_price: iu, total: iu * qty, index: cl.index, band_pct: cl.band_pct,
                             material_share: material / base, text: cl.text };
    }
    return out;
  }

  function pad2(n) { n = String(n); return n.length < 2 ? "0" + n : n; }

  function addDays(dateStr, days) {
    var p = dateStr.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]) + days * 86400000);
    return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate());
  }

  function has(v) { return v !== undefined && v !== null; }

  function rawPricePerKg(params, rawPrices) {
    rawPrices = rawPrices || {};
    var total = 0;
    Object.keys(params.mix).sort().forEach(function (g) {
      total += params.mix[g] * (has(rawPrices[g]) ? rawPrices[g] : params.default_raw_prices[g]);
    });
    return total + (has(rawPrices.freight_in) ? rawPrices.freight_in : params.freight_in);
  }

  function findItem(model, code) {
    for (var i = 0; i < model.items.length; i++) if (model.items[i].code === code) return model.items[i];
    throw new Error("unknown item " + code);
  }

  function suggest(model, itemCode, opts) {
    opts = opts || {};
    var major = checkSchema(model);
    if (major >= 2) return suggestV2(model, itemCode, opts, major);
    var p = model.params, it = findItem(model, itemCode), c = it.coef;
    var qty = has(opts.qty) ? opts.qty : 1;
    var out = { model_version: model.model_version, item_code: it.code, unit: it.unit, qty: qty,
                date: opts.date, valid_until: addDays(opts.date, p.validity_days), confidence: it.confidence,
                priced: c.method !== "not_priced" };
    if (!out.priced) return out;
    var kg = has(opts.kgPerUnit) ? opts.kgPerUnit : (it.kg_per_unit || 0);
    var raw = rawPricePerKg(p, opts.rawPrices);
    var seg = p.segment_factors[opts.segment || "all"];
    if (!has(seg)) seg = 1.0;
    var extrap = (c.a + c.b * kg * raw) * c.time_factor * seg;
    var upliftAmt = extrap * p.uplift;
    var unitPrice = extrap + upliftAmt;
    var rr = c.method === "resin_ratio";
    var resin = rr ? kg * raw * (1 + p.scrap_pct) : 0;
    var conv = rr ? kg * p.cost_per_kg.conversion : 0;
    var ovh = rr ? kg * p.cost_per_kg.overhead : 0;
    var full = resin + conv + ovh;
    out.raw_price_per_kg = raw;
    out.kg_per_unit = kg;
    out.breakdown = { resin_cost: resin, conversion_cost: conv, overhead_cost: ovh, full_cost: full,
                      margin: full ? extrap - full : null, extrapolated: extrap, uplift: upliftAmt };
    out.unit_price = unitPrice;
    out.total = unitPrice * qty;
    out.low_unit = extrap * c.band_low;
    out.high_unit = extrap * c.band_high;
    return out;
  }

  // Public weekly estimate: low / mid / high per unit for a small (tier-1) order on `date`; no costs or margins.
  function weeklyTable(model, date) {
    var p = model.params, out = [], up = 1 + p.uplift;
    model.items.forEach(function (it) {
      if (it.coef.method === "not_priced") return;
      var kg = it.kg_per_unit || 0;
      var r = suggest(model, it.code, { date: date, qty: 1, orderKg: Math.min(kg, p.tiers.bounds_kg[0]) });
      out.push({ code: it.code, name: it.name, unit: it.unit, family: it.family, diameter_mm: it.diameter_mm,
                 stiffness: it.stiffness, low: roundClean(r.low_unit * up, p.rounding), mid: r.unit_price,
                 high: roundClean(r.high_unit * up, p.rounding) });
    });
    return out;
  }

  var api = { suggest: suggest, weeklyTable: weeklyTable, rawPricePerKg: rawPricePerKg, addDays: addDays, roundClean: roundClean, SUPPORTED_SCHEMA_MAJORS: SUPPORTED_SCHEMA_MAJORS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NeshaPricing = api;

  // test CLI: node price.js model.json '[{"code":..,"opts":{..}}, ...]'
  if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
    var fs = require("fs");
    var model = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    var arg = JSON.parse(process.argv[3] || "[]");
    if (arg && arg.weekly) process.stdout.write(JSON.stringify(weeklyTable(model, arg.weekly)));
    else process.stdout.write(JSON.stringify(arg.map(function (k) { return suggest(model, k.code, k.opts); })));
  }
})(this);
