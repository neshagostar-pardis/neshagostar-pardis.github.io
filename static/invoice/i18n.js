/* Translation tables for the invoice preview (fa / en): labels, default terms, units, item descriptions.
   Wording follows the company's proforma and invoice templates. */
(function (root) {
  'use strict';

  var L = {
    fa: {
      title: { proforma: 'پیش‌فاکتور', offer: 'پیش‌فاکتور قیمت (موقت)', invoice: 'فاکتور' },
      no: { proforma: 'شماره پیش‌فاکتور', offer: 'شماره پیش‌فاکتور', invoice: 'شماره فاکتور' },
      date: 'تاریخ', validUntil: 'معتبر تا', basis: 'مبنای تحویل', hs: 'کد تعرفه (HS)', contract: 'شماره قرارداد',
      itemCode: 'کد کالا', project: 'پروژه', projectCode: 'کد پروژه',
      seller: 'فروشنده', buyer: 'کارفرما', phone: 'تلفن', mobile: 'همراه', fax: 'فکس', email: 'ایمیل', website: 'وب‌سایت',
      nid: 'شناسه ملی', ecode: 'کد اقتصادی', reg: 'شماره ثبت', buyerCode: 'شناسه ملی / کد اقتصادی', address: 'نشانی',
      cols: { no: 'ردیف', size: 'سایز', desc: 'شرح کالا', unit: 'واحد', qty: 'مقدار', price: 'قیمت واحد ({cur})',
              offerPrice: 'قیمت واحد درب کارخانه ({cur})', disc: 'تخفیف', amount: 'مبلغ ({cur})' },
      subtotal: 'جمع کل', discount: 'تخفیف', net: 'جمع پس از تخفیف', exw: 'قیمت درب کارخانه', transport: 'حمل (تخمینی)',
      delivered: 'جمع با حمل', vat: 'مالیات بر ارزش افزوده ({p}٪)', due: 'مبلغ قابل پرداخت', words: 'مبلغ به حروف',
      schedule: 'جدول پرداخت', advance: 'پیش‌پرداخت هنگام ثبت سفارش ({a}٪)', balance: 'مانده، پیش از تحویل {b}٪ آخر اقلام ({b}٪)',
      deliveryDetails: 'مشخصات تحویل', dPoint: 'محل تحویل', dThis: 'مقدار این محموله', dSoFar: 'مجموع تحویل‌شده',
      dTotal: 'مقدار کل قرارداد', commercial: 'مشخصات تجاری', origin: 'کشور مبدأ', originVal: 'ایران',
      standards: 'استاندارد', deliveryTerms: 'شرایط تحویل', pickup: 'محل بارگیری',
      pickupVal: 'کارخانه نشاگستر پردیس، شهرک صنعتی لیا، قزوین', currency: 'واحد پول',
      terms: 'شرایط و توضیحات', transportInfo: 'اطلاعات حمل', trItem: 'حمل (تخمینی)', trFrom: 'از قزوین، ایران تا {dest}',
      packing: 'خلاصه بسته‌بندی', pTotal: 'مقدار کل', banking: 'اطلاعات بانکی', holder: 'صاحب حساب', bank: 'نام بانک',
      account: 'شماره حساب', sheba: 'شماره شبا', onRequest: 'در صورت درخواست ارائه می‌شود',
      signSeller: 'امضا و مهر فروشنده', signBuyer: 'امضا و مهر کارفرما',
      footerNote: 'این پیش‌فاکتور صرفاً جهت اطلاع صادر شده است؛ مشخصات و شرایط نهایی پس از تأیید قطعی می‌شود.',
      empty: 'کالایی ثبت نشده است.'
    },
    en: {
      title: { proforma: 'Proforma Invoice', offer: 'Proforma – Provisional Price Offer', invoice: 'Invoice' },
      no: { proforma: 'Proforma No.', offer: 'Proforma No.', invoice: 'Invoice No.' },
      date: 'Date', validUntil: 'Valid Until', basis: 'Delivery Basis', hs: 'HS Code', contract: 'Contract No.',
      itemCode: 'Item Code', project: 'Project', projectCode: 'Project Code',
      seller: 'Seller', buyer: 'Buyer', phone: 'Phone', mobile: 'Mobile', fax: 'Fax', email: 'Email', website: 'Website',
      nid: 'National ID', ecode: 'Economic Code', reg: 'Reg. No.', buyerCode: 'National ID / Economic Code', address: 'Address',
      cols: { no: 'No', size: 'Size', desc: 'Description', unit: 'Unit', qty: 'Qty', price: 'Unit Price ({cur})',
              offerPrice: 'Unit Price EXW ({cur}/unit)', disc: 'Discount', amount: 'Amount ({cur})' },
      subtotal: 'Subtotal', discount: 'Discount', net: 'Net Amount', exw: 'EXW Price (Factory)', transport: 'Transport (Estimated)',
      delivered: 'TOTAL (Delivered)', vat: 'VAT ({p}%)', due: 'TOTAL AMOUNT DUE', words: 'Amount in words',
      schedule: 'Payment Schedule', advance: 'Advance on order ({a}%)', balance: 'Balance before delivery of the final {b}% of items ({b}%)',
      deliveryDetails: 'Delivery Details', dPoint: 'Delivery Point', dThis: 'Quantity This Delivery', dSoFar: 'Cumulative Delivered',
      dTotal: 'Contract Total Quantity', commercial: 'Commercial Terms', origin: 'Country of Origin', originVal: 'Iran',
      standards: 'Product Standard', deliveryTerms: 'Delivery Terms', pickup: 'Pickup Location',
      pickupVal: 'Factory in Lia Industrial City, Qazvin, Iran', currency: 'Currency',
      terms: 'Terms & Conditions', transportInfo: 'Transportation Information', trItem: 'TRANSPORTATION (Estimated)',
      trFrom: 'Qazvin, Iran to {dest}', packing: 'Packing Summary', pTotal: 'Total Quantity', banking: 'Banking Details',
      holder: 'Account Holder', bank: 'Bank Name', account: 'Account Number', sheba: 'Sheba Number',
      onRequest: 'To be provided upon request', signSeller: "Seller's Signature & Stamp", signBuyer: "Buyer's Signature & Stamp",
      footerNote: 'This proforma invoice is issued for informational purposes only. All specifications and terms are subject to final confirmation.',
      empty: 'No items yet.'
    }
  };

  var BASIS = {
    fa: { EXW: 'تحویل درب کارخانه (EXW)', DDP: 'DDP – {place}', border: 'تحویل در مرز {place}', place: 'تحویل در {place}' },
    en: { EXW: 'EXW – Ex-Works Factory', DDP: 'DDP – {place}', border: 'Delivered at border: {place}', place: 'Delivered at {place}' }
  };
  var CURRENCY = {
    fa: { USD: 'دلار آمریکا (USD)', IRT: 'تومان', IRR: 'ریال' },
    en: { USD: 'USD ($)', IRT: 'Toman (IRT)', IRR: 'Rial (IRR)' },
    short: { fa: { USD: 'دلار', IRT: 'تومان', IRR: 'ریال' }, en: { USD: 'USD', IRT: 'Toman', IRR: 'Rial' } }
  };
  var UNITS = {
    fa: { m: 'متر طول', kg: 'کیلوگرم', pcs: 'عدد', length: 'شاخه', unit: 'واحد', sheet: 'تخته', job: 'پروژه' },
    en: { m: 'm.l', kg: 'kg', pcs: 'pcs', length: 'length', unit: 'unit', sheet: 'sheet', job: 'job' }
  };
  var CATALOG_UNIT = { 'متر': 'm', 'عدد': 'pcs', 'کیلوگرم': 'kg', 'شاخه': 'length', 'واحد': 'unit', 'تخته': 'sheet', 'پروژه کارمزدی': 'job' };

  /* Numbered terms. Keys per document type; texts per language. Placeholders are filled when rendering. */
  var TERM_SETS = {
    proforma: ['validity', 'payment', 'late', 'delivery', 'vat', 'standards', 'dtime'],
    offer: ['validity', 'delivery', 'provisional'],
    invoice: ['payment', 'delivery', 'vat', 'standards', 'dtime']
  };
  var TERM_LABEL = { validity: 'اعتبار', payment: 'شرایط پرداخت', late: 'مهلت پرداخت مانده', delivery: 'مبنای تحویل',
                     vat: 'مالیات بر ارزش افزوده', standards: 'استاندارد و کیفیت', dtime: 'مدت تحویل', provisional: 'قیمت موقت' };
  var TERMS = {
    fa: {
      validity: 'اعتبار این پیش‌فاکتور تا تاریخ {valid_until} ({validity_days} روز از تاریخ صدور) است؛ پس از آن قیمت‌ها بر اساس نرخ روز مواد اولیه به‌روز می‌شود.',
      payment: 'شرایط پرداخت: {advance_pct}٪ مبلغ کل هنگام ثبت سفارش (پیش‌پرداخت) و {balance_pct}٪ باقی‌مانده پیش از تحویل آخرین {balance_pct}٪ اقلام سفارش پرداخت می‌شود.',
      late_ready: 'در صورتی که {balance_pct}٪ باقی‌مانده ظرف {balance_days} روز پس از اعلام آمادگی تحویل پرداخت نشود، نشاگستر پردیس تعهدی به تحویل {balance_pct}٪ باقی‌مانده با قیمت این پیش‌فاکتور ندارد و قیمت آن بر اساس نرخ روز به‌روزرسانی می‌شود.',
      late_advance: 'در صورتی که {balance_pct}٪ باقی‌مانده ظرف {balance_days} روز پس از دریافت پیش‌پرداخت پرداخت نشود، نشاگستر پردیس تعهدی به تحویل {balance_pct}٪ باقی‌مانده با قیمت این پیش‌فاکتور ندارد و قیمت آن بر اساس نرخ روز به‌روزرسانی می‌شود.',
      delivery_EXW: 'تحویل درب کارخانه (شهرک صنعتی لیا، قزوین)؛ هزینه حمل، بیمه و بارگیری به عهده خریدار است.',
      delivery_DDP: 'تحویل در مقصد ({place})؛ هزینه حمل تا مقصد در قیمت منظور شده است.',
      delivery_border: 'تحویل در مرز {place}؛ هزینه حمل تا مرز در قیمت منظور شده است و ترخیص و حمل پس از مرز به عهده خریدار است.',
      delivery_place: 'تحویل در {place}؛ هزینه حمل تا محل تحویل در قیمت منظور شده است.',
      vat: 'مالیات بر ارزش افزوده طبق قانون به مبلغ فاکتور اضافه می‌شود.',
      standards: 'کلیه لوله‌ها مطابق استاندارد ملی ایران ۹۱۱۶ تولید می‌شوند؛ گواهی کیفیت در صورت درخواست ارائه می‌شود.',
      dtime: 'مدت تحویل: {n} روز کاری پس از دریافت پیش‌پرداخت',
      provisional: 'این پیش‌فاکتور فقط قیمت واحد را اعلام می‌کند؛ پس از قطعی شدن مقادیر، پیش‌فاکتور قیمت‌دار با جمع کل صادر می‌شود.'
    },
    en: {
      validity: 'This proforma is valid until {valid_until} ({validity_days} days from issue); after that, prices will be updated to the current raw-material prices.',
      payment: 'Payment terms: {advance_pct}% of the total on order (advance payment); the remaining {balance_pct}% is payable before delivery of the final {balance_pct}% of the ordered items.',
      late_ready: 'If the remaining {balance_pct}% is not paid within {balance_days} days after notice of readiness for delivery, Neshagostar Pardis is not obliged to deliver the remaining {balance_pct}% at the price of this proforma, and its price will be updated to current rates.',
      late_advance: 'If the remaining {balance_pct}% is not paid within {balance_days} days after the advance payment, Neshagostar Pardis is not obliged to deliver the remaining {balance_pct}% at the price of this proforma, and its price will be updated to current rates.',
      delivery_EXW: 'Ex-Works factory (Lia Industrial City, Qazvin); transport, insurance and loading are at the buyer\'s expense.',
      delivery_DDP: 'Delivered Duty Paid to {place}; transport to the destination is included in the price.',
      delivery_border: 'Delivered at the {place} border; transport to the border is included in the price; clearance and onward transport are at the buyer\'s expense.',
      delivery_place: 'Delivered at {place}; transport to the delivery point is included in the price.',
      vat: 'VAT is added as required by law.',
      standards: 'All pipes are manufactured to Iranian National Standard INSO 9116; quality certificates are available upon request.',
      dtime: 'Delivery: {n} working days after receipt of the advance payment',
      provisional: 'This is a provisional proforma stating unit prices only; a priced proforma with totals will be issued once quantities per size are confirmed.'
    }
  };
  var TRANSPORT_NOTES = {
    fa: ['هزینه حمل {rate} برای هر {unit} تخمینی است و ممکن است تغییر کند.',
         'نشاگستر پردیس شرکت حمل‌ونقل نیست؛ حمل با رانندگان مستقل هماهنگ می‌شود و کرایه با شرایط بازار تغییر می‌کند.',
         'تلاش ما یافتن کرایه منصفانه و رقابتی برای مشتریان است.',
         'صرفه‌جویی در هزینه: سفارش چند سایز لوله امکان بارگیری تودرتو (لوله‌های کوچک‌تر داخل لوله‌های بزرگ‌تر) را فراهم می‌کند و هزینه حمل هر متر را به‌طور محسوسی کاهش می‌دهد.'],
    en: ['The transport cost of {rate} per {unit} is an estimate only and subject to change.',
         'We are not a transport company; we coordinate with independent drivers and prices may fluctuate based on market conditions.',
         'We strive to find fair and competitive rates for our customers.',
         'Cost Saving Tip: Ordering multiple pipe sizes allows for nested loading (smaller pipes inside larger ones), significantly increasing the weight capacity per truck and reducing transportation cost per meter.']
  };

  /* Item descriptions per family; other families fall back to the catalog name (fa) and a family label (en). */
  var PIPE = { corrugated: 1, spiral: 1, singlewall: 1 };
  var DESC = {
    corrugated: { en: 'Corrugated HDPE Pipe (double-wall) – Inner Diameter {d}mm{stiff}{coupling}',
                  fa: 'لوله پلی‌اتیلن کاروگیت (دوجداره) – قطر داخلی {d} میلی‌متر{stiff}{coupling}' },
    spiral: { en: 'Spiral Corrugated HDPE Pipe – Inner Diameter {d}mm{stiff}{coupling}',
              fa: 'لوله کاروگیت اسپیرال پلی‌اتیلن – قطر داخلی {d} میلی‌متر{stiff}{coupling}' },
    singlewall: { en: 'Single-wall HDPE Pipe – Diameter {d}mm', fa: 'لوله پلی‌اتیلن تک‌جداره – قطر {d} میلی‌متر' }
  };
  var FAMILY_EN = { manhole: 'HDPE Manhole / Accessory', tank: 'Polyethylene Tank', septic_tank: 'Polyethylene Septic Tank',
                    washer: 'Rubber Gasket / Seal', fitting: 'Fitting / Accessory', grease_trap: 'Polyethylene Grease Trap',
                    treatment_package: 'Wastewater Treatment Package' };

  function fill(t, v) { return String(t).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }

  function describe(it, lang) {
    var d = it.diameter_mm, s = it.stiffness, tpl = DESC[it.family];
    if (tpl && d) {
      return fill(tpl[lang], {
        d: lang === 'fa' ? String(d).replace(/\d/g, function (x) { return '۰۱۲۳۴۵۶۷۸۹'[x]; }) : d,
        stiff: s ? (lang === 'fa' ? '، کلاس سفتی ' + s : ', stiffness class ' + s) : '',
        coupling: it.coupling === 'with' ? (lang === 'fa' ? '، با کوپلینگ' : ', with coupling (socket & spigot)')
          : it.coupling === 'plain' ? (lang === 'fa' ? '، بدون کوپلینگ' : ', plain end') : ''
      });
    }
    if (lang === 'fa') return String(it.name).replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim();
    var base = FAMILY_EN[it.family] || 'Item';
    return base + (d ? ' – ' + d + 'mm' : '') + (s ? ', class ' + s : '') + ' (' + it.code + ')';
  }

  /* English number words for amounts */
  var EN1 = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
             'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var EN10 = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  var ENS = ['', 'thousand', 'million', 'billion', 'trillion'];
  function en3(n) {
    var h = Math.floor(n / 100), r = n % 100, p = [];
    if (h) p.push(EN1[h] + ' hundred');
    if (r) p.push(r < 20 ? EN1[r] : EN10[Math.floor(r / 10)] + (r % 10 ? '-' + EN1[r % 10] : ''));
    return p.join(' ');
  }
  function enWords(n) {
    n = Math.round(Math.abs(n));
    if (!n) return 'Zero';
    var p = [], i = 0;
    while (n > 0 && i < ENS.length) { var g = n % 1000; if (g) p.unshift(en3(g) + (ENS[i] ? ' ' + ENS[i] : '')); n = Math.floor(n / 1000); i++; }
    var s = p.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  root.NeshaI18n = { L: L, BASIS: BASIS, CURRENCY: CURRENCY, UNITS: UNITS, CATALOG_UNIT: CATALOG_UNIT, TERM_SETS: TERM_SETS,
                     TERM_LABEL: TERM_LABEL, TERMS: TERMS, TRANSPORT_NOTES: TRANSPORT_NOTES, PIPE: PIPE,
                     describe: describe, fill: fill, enWords: enWords };
})(this);
