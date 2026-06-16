/* =====================================================================
 * cert-engine.js — المحرّك الموحَّد لتوليد شهادات أجيال
 * Version: 0.1.0
 * Created: 25 مايو 2026
 * ----------------------------------------------------------------------
 * هذا الملف هو المصدر الوحيد لتوليد HTML الشهادة في كل المنصة:
 *   - منصة-الشهادات.html  (إدارة)
 *   - register.html        (تسجيل ذاتي)
 *   - portal.html          (بحث المتدرّب — لاحقاً)
 *
 * يُحلّ مشاكل "drift" نهائياً: كل التغييرات البصرية في مكان واحد،
 * تنعكس على كل المسارات تلقائياً.
 * ===================================================================== */

(function(global){
  'use strict';

  var VERSION = '0.1.0';

  // ===================================================================
  // ثوابت: شعار أجيال الافتراضي
  // ===================================================================
  var AJYAL_LOGO_SVG = '<svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg">'
    + '<g transform="translate(100 80) rotate(45)">'
      + '<rect x="-40" y="-80" width="80" height="80" fill="#F0BB23"/>'
      + '<rect x="-80" y="-40" width="80" height="80" fill="#E94B3B"/>'
      + '<rect x="0" y="-40" width="80" height="80" fill="#6FB52A"/>'
      + '<rect x="-22" y="-22" width="44" height="44" fill="#F58220" opacity="0.92"/>'
    + '</g>'
    + '<g transform="translate(100 130) rotate(45)">'
      + '<rect x="-18" y="-18" width="36" height="36" fill="#2B3990"/>'
    + '</g>'
    + '<text x="100" y="183" text-anchor="middle" font-family="Tajawal,Cairo,sans-serif" font-weight="800" font-size="22" fill="#5A5A5A">جمعية رعاية الأجيال</text>'
  + '</svg>';

  // ===================================================================
  // قوالب الشهادات الافتراضية (يجب أن تطابق منصة-الشهادات.html)
  // ===================================================================
  var DEFAULT_TEMPLATES = {
    'شهادة اجتياز':  { titleColor: '#E63946', nameColor: '#4A90E2', intro: 'تتقدم {الجهة} بمنح هذه الشهادة لـ', body: 'وذلك لاجتيازه متطلبات برنامج {البرنامج}، الذي أقيم بتاريخ {التاريخ_الهجري}، واستكماله الملف التطبيقي للمنهجية، وإثبات قدرته على تطبيق ما تعلّمه بشكل منهجي، سائلين الله له التوفيق والسداد.' },
    'شهادة حضور':   { titleColor: '#1e3a8a', nameColor: '#1e40af', intro: 'تتقدم {الجهة} بمنح هذه الشهادة لـ', body: 'وذلك نظير حضوره برنامج {البرنامج}، الذي أقيم بتاريخ {التاريخ_الهجري} الموافق {التاريخ_الميلادي}، شاكرين له اهتمامه ومتمنين له المزيد من التوفيق.' },
    'شهادة مشاركة': { titleColor: '#5CB85C', nameColor: '#1e40af', intro: 'تتقدم {الجهة} بمنح هذه الشهادة لـ', body: 'وذلك نظير مشاركته الفعّالة في {البرنامج} المنعقد بتاريخ {التاريخ_الهجري}، شاكرين له تفاعله ومساهمته القيّمة.' },
    'شهادة شكر وتقدير': { titleColor: '#D4A017', nameColor: '#4A4A4A', intro: 'تتقدم {الجهة} بخالص الشكر والتقدير لـ', body: 'اعترافاً بـ {البرنامج}، سائلين المولى أن يجعل ذلك في موازين حسناته، وأن يجزيه عنا خير الجزاء.' },
    'شهادة تكريم':  { titleColor: '#8B0000', nameColor: '#D4A017', intro: 'تتشرف {الجهة} بتكريم', body: 'تقديراً لـ {البرنامج}، وعرفاناً بجهوده المتميزة وعطائه المستمر، سائلين الله له دوام التوفيق.' },
    'شهادة تخرّج':  { titleColor: '#1e3a8a', nameColor: '#4A90E2', intro: 'تتقدم {الجهة} بمنح هذه الشهادة لـ', body: 'لإكماله بنجاح متطلبات برنامج {البرنامج}، ويُعدّ متخرجاً منه بتاريخ {التاريخ_الهجري} الموافق {التاريخ_الميلادي}.' },
    'شهادة تطوع':   { titleColor: '#047857', nameColor: '#1e40af', intro: 'تتقدم {الجهة} بالشكر للمتطوع', body: 'وذلك نظير ما قدّمه من جهد تطوّعي مميز في {البرنامج}، شاكرين له عطاءه ومتمنين له دوام التوفيق.' },
    'شهادة خبرة':   { titleColor: '#1e40af', nameColor: '#0f172a', intro: 'تشهد {الجهة} بأن', body: 'قد عمل/ت في برنامج {البرنامج}، شاكرين له/ها هذا العطاء المهني المتميز.' }
  };

  function getCertDefaults(type) {
    return DEFAULT_TEMPLATES[type] || DEFAULT_TEMPLATES['شهادة مشاركة'];
  }

  // ===================================================================
  // دوال مساعدة (HTML escaping, digit normalization, token replacement)
  // ===================================================================
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  // تحويل الأرقام العربية-الهندية ٠١٢٣٤٥٦٧٨٩ إلى لاتينية 0123456789
  // ضروري لـhtml2canvas — قد لا يحوي glyph للأرقام العربية-الهندية
  function normalizeDigits(s) {
    if (!s) return '';
    return String(s).replace(/[٠-٩]/g, function(d) {
      return '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString();
    });
  }

  function applyTokens(text, cert, issuerName) {
    if (!text) return '';
    return String(text)
      .replace(/\{الاسم\}/g, cert.name || '')
      .replace(/\{الجهة\}/g, issuerName || 'جمعية رعاية الأجيال')
      .replace(/\{البرنامج\}/g, cert.program || '')
      .replace(/\{التاريخ_الهجري\}/g, normalizeDigits(cert.dateHijri || ''))
      .replace(/\{التاريخ_الميلادي\}/g, normalizeDigits(cert.dateGreg || ''))
      .replace(/\{النوع\}/g, cert.type || '')
      .replace(/\{الرقم\}/g, cert.number || '');
  }

  // ===================================================================
  // الزخارف الزاوية (Decorative corner SVGs)
  // ===================================================================
  function buildDecoSvgs(decoColors, decoCorners) {
    var c = decoColors || {};
    var red    = c.red    || '#E63946';
    var yellow = c.yellow || '#F4B41A';
    var green  = c.green  || '#5CB85C';
    var blue   = c.blue   || '#4A90E2';
    var corners = decoCorners || { tl: true, tr: true, bl: true, br: true };
    var out = '';

    if (corners.tr !== false) out += '<svg class="deco-svg" style="top:0; left:1414px; width:340px; height:160px;" viewBox="0 0 340 160" xmlns="http://www.w3.org/2000/svg">'
      + '<polygon points="340,0 340,160 200,0" fill="' + green + '"/>'
      + '<polygon points="340,0 240,0 340,100" fill="' + yellow + '"/>'
      + '<polygon points="340,0 290,0 340,50" fill="' + red + '"/>'
    + '</svg>';

    if (corners.tl !== false) out += '<svg class="deco-svg" style="top:0; left:0; width:240px; height:240px;" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">'
      + '<polygon points="0,0 0,170 130,0" fill="' + blue + '"/>'
      + '<polygon points="0,0 0,100 85,0" fill="' + red + '"/>'
      + '<polygon points="0,100 0,170 60,100" fill="' + yellow + '"/>'
    + '</svg>';

    if (corners.bl !== false) out += '<svg class="deco-svg" style="top:600px; left:0; width:320px; height:640px;" viewBox="0 0 320 640" xmlns="http://www.w3.org/2000/svg">'
      + '<polygon points="0,640 0,220 320,640" fill="' + blue + '"/>'
      + '<polygon points="0,640 110,640 0,520" fill="' + red + '"/>'
      + '<polygon points="0,470 0,320 135,470" fill="' + yellow + '"/>'
      + '<polygon points="0,320 0,220 85,320" fill="' + green + '"/>'
      + '<polygon points="145,640 320,640 320,565 220,640" fill="' + green + '"/>'
      + '<polygon points="220,640 320,640 320,520" fill="' + yellow + '"/>'
      + '<polygon points="0,220 0,170 50,220" fill="' + red + '"/>'
    + '</svg>';

    if (corners.br !== false) out += '<svg class="deco-svg" style="top:780px; left:1454px; width:300px; height:460px;" viewBox="0 0 300 460" xmlns="http://www.w3.org/2000/svg">'
      + '<polygon points="300,460 300,150 0,460" fill="' + blue + '"/>'
      + '<polygon points="300,460 160,460 300,330" fill="' + green + '"/>'
      + '<polygon points="300,330 300,230 210,330" fill="' + yellow + '"/>'
      + '<polygon points="300,230 300,150 235,230" fill="' + red + '"/>'
    + '</svg>';

    return out;
  }

  // ===================================================================
  // الزخارف الإضافية (ornaments SVGs)
  // ===================================================================
  var AJYAL_ORNAMENT_SVG = '<svg width="120" height="36" viewBox="0 0 120 36" xmlns="http://www.w3.org/2000/svg"><g transform="translate(60 18)"><rect x="-22" y="-9" width="14" height="14" transform="rotate(45)" fill="#E94B3B"/><rect x="-6" y="-15" width="14" height="14" transform="rotate(45)" fill="#F0BB23"/><rect x="10" y="-9" width="14" height="14" transform="rotate(45)" fill="#6FB52A"/><rect x="-4" y="6" width="8" height="8" transform="rotate(45)" fill="#2B3990"/></g></svg>';
  var AJYAL_DIVIDER_SVG  = '<svg width="200" height="20" viewBox="0 0 200 20" xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="10" x2="80" y2="10" stroke="#5A5A5A" stroke-width="0.8" opacity="0.4"/><g transform="translate(100 10)"><rect x="-12" y="-5" width="7" height="7" transform="rotate(45)" fill="#E94B3B"/><rect x="-3.5" y="-8" width="7" height="7" transform="rotate(45)" fill="#F0BB23"/><rect x="5" y="-5" width="7" height="7" transform="rotate(45)" fill="#6FB52A"/></g><line x1="120" y1="10" x2="200" y2="10" stroke="#5A5A5A" stroke-width="0.8" opacity="0.4"/></svg>';

  // ===================================================================
  // 🎯 الدالة الجوهرية: buildCertHTML
  //
  // المدخلات:
  //   cert    = {
  //     number, name, type, program, org,
  //     dateHijri, dateGreg, email?, phone?
  //   }
  //   options = {
  //     snapshot    : { design, signatures, logos, intro, body, template },
  //     issuerName  : 'جمعية رعاية الأجيال',  // default
  //     qrPlaceholder: true,  // يضع <img id="certQRImg"> فارغة (يُملأ خارجياً)
  //   }
  //
  // المخرَج: HTML string جاهز للحقن في DOM
  // ===================================================================
  function buildCertHTML(cert, options) {
    var opts = options || {};
    var snap = opts.snapshot || {};
    var issuerName = opts.issuerName || 'جمعية رعاية الأجيال';

    var design     = snap.design     || {};
    var signatures = snap.signatures || {};
    var logos      = snap.logos      || {};

    // الألوان الافتراضية حسب نوع الشهادة
    var defaults    = getCertDefaults(cert.type);
    var titleColor  = design.titleColor || defaults.titleColor;
    var nameColor   = design.nameColor  || defaults.nameColor;
    var sigColors   = design.sigColors  || {};
    var sigPosColor    = sigColors.position || '#4A4A4A';
    var sigNameColor   = sigColors.name     || '#4A90E2';
    var sigScriptColor = sigColors.script   || '#4A90E2';

    // أحجام الخطوط (إن وُجدت)
    var fs = design.fontSizes || {};

    // Classes الديناميكية
    var classes = ['cert-render'];
    if (design.background && design.background !== 'white') classes.push('bg-' + design.background);
    if (design.frame && design.frame !== 'none') classes.push('frame-' + design.frame);
    var ornaments = design.ornaments || {};
    if (ornaments.centerOrnament) classes.push('show-center-ornament');
    if (ornaments.nameDivider)    classes.push('show-name-divider');
    if (ornaments.ajyalOrnament)  classes.push('show-ajyal-ornament');
    if (ornaments.ajyalDivider)   classes.push('show-ajyal-divider');

    // متغيرات CSS
    var styleParts = [
      '--c-title:' + titleColor,
      '--c-name:' + nameColor,
      '--sig-position-color:' + sigPosColor,
      '--sig-name-color:' + sigNameColor,
      '--sig-script-color:' + sigScriptColor
    ];

    // النصوص (intro, body) مع استبدال placeholders
    var introTxt = applyTokens(snap.intro || defaults.intro, cert, issuerName);
    var bodyTplRaw = snap.body || defaults.body;
    var bodyHtml = escapeHtml(bodyTplRaw)
      .replace(/\{الاسم\}/g, escapeHtml(cert.name || ''))
      .replace(/\{الجهة\}/g, escapeHtml(issuerName))
      .replace(/\{البرنامج\}/g, '<span class="highlight">' + escapeHtml(cert.program || '') + '</span>')
      .replace(/\{التاريخ_الهجري\}/g, '<span class="highlight">' + escapeHtml(normalizeDigits(cert.dateHijri || '')) + '</span>')
      .replace(/\{التاريخ_الميلادي\}/g, escapeHtml(normalizeDigits(cert.dateGreg || '')))
      .replace(/\{النوع\}/g, escapeHtml(cert.type || ''))
      .replace(/\{الرقم\}/g, escapeHtml(cert.number || ''));

    // التوقيعات
    var sig1Position = (signatures.sig1Position || (signatures.sig1 && signatures.sig1.position)) || 'إدارة البرامج والمشاريع';
    var sig1Name     = (signatures.sig1Name     || (signatures.sig1 && signatures.sig1.name))     || '';
    var sig1Img      = logos.signature  || (signatures.sig1 && signatures.sig1.imgData) || '';
    var sig2Position = (signatures.sig2Position || (signatures.sig2 && signatures.sig2.position)) || '';
    var sig2Name     = (signatures.sig2Name     || (signatures.sig2 && signatures.sig2.name))     || '';
    var sig2Img      = logos.signature2 || (signatures.sig2 && signatures.sig2.imgData) || '';
    var hasSig2 = sig2Position || sig2Name || sig2Img;

    var sig1Html = '<div class="sig-block">'
      + '<div class="sig-position">' + escapeHtml(sig1Position) + '</div>'
      + '<div class="sig-img-box">' + (sig1Img ? '<img src="' + sig1Img + '" alt="توقيع"/>' : '<span class="sig-script">~ توقيع ~</span>') + '</div>'
      + (sig1Name ? '<div class="sig-name">' + escapeHtml(sig1Name) + '</div>' : '')
    + '</div>';

    var sig2Html = hasSig2 ? ('<div class="sig-block">'
      + '<div class="sig-position">' + escapeHtml(sig2Position) + '</div>'
      + '<div class="sig-img-box">' + (sig2Img ? '<img src="' + sig2Img + '" alt="توقيع"/>' : '<span class="sig-script">~ توقيع ~</span>') + '</div>'
      + (sig2Name ? '<div class="sig-name">' + escapeHtml(sig2Name) + '</div>' : '')
    + '</div>') : '';

    // الأختام (حتى 3)
    var stampsHtml = '';
    if (logos.stamp || logos.stamp2 || logos.stamp3) {
      if (logos.stamp)  stampsHtml += '<div class="stamp-block"><img src="' + logos.stamp + '" alt="ختم"/></div>';
      if (logos.stamp2) stampsHtml += '<div class="stamp-block"><img src="' + logos.stamp2 + '" alt="ختم"/></div>';
      if (logos.stamp3) stampsHtml += '<div class="stamp-block"><img src="' + logos.stamp3 + '" alt="ختم"/></div>';
    } else {
      stampsHtml = '<div class="stamp-block default">أجيال<br/><small>جمعية رعاية الأجيال</small></div>';
    }

    // الشعارات (حتى 6 خانات: orgLogo + slot2..slot6)
    var logosHtml = '';
    var orgLogo = logos.orgLogo
      ? '<img src="' + logos.orgLogo + '" alt="شعار" />'
      : AJYAL_LOGO_SVG;
    logosHtml += '<div class="logo-slot">' + orgLogo + '</div>';
    ['slot2','slot3','slot4','slot5','slot6'].forEach(function(k){
      if (logos[k]) logosHtml += '<div class="logo-slot"><img src="' + logos[k] + '" alt="شعار"/></div>';
    });

    // أحجام خطوط مخصّصة
    var titleStyle = fs.szTitle ? ' style="font-size:' + fs.szTitle + 'px"' : '';
    var nameStyle  = fs.szName  ? ' style="font-size:' + fs.szName  + 'px"' : '';
    var introStyle = fs.szIntro ? ' style="font-size:' + fs.szIntro + 'px"' : '';
    var bodyStyle  = fs.szBody  ? ' style="font-size:' + fs.szBody  + 'px"' : '';

    return ''
      + '<div class="' + classes.join(' ') + '" style="' + styleParts.join('; ') + '">'
        + buildDecoSvgs(design.decoColors, design.decoCorners)
        + '<div class="cert-content">'
          + '<div class="logos-row">' + logosHtml + '</div>'
          + '<div class="cert-title"' + titleStyle + '>' + escapeHtml(cert.type) + '</div>'
          + '<div class="center-ornament">۞</div>'
          + '<div class="ajyal-ornament">' + AJYAL_ORNAMENT_SVG + '</div>'
          + '<div class="cert-intro"' + introStyle + '>' + escapeHtml(introTxt) + '</div>'
          + '<div class="recipient-name"' + nameStyle + '>' + escapeHtml(cert.name) + '</div>'
          + '<div class="name-divider">◆ ◆ ◆</div>'
          + '<div class="ajyal-divider">' + AJYAL_DIVIDER_SVG + '</div>'
          + '<div class="cert-body"' + bodyStyle + '>' + bodyHtml + '</div>'
          + '<div class="cert-footer">'
            + sig1Html
            + sig2Html
            + '<div class="stamps-group">' + stampsHtml + '</div>'
            + '<div class="qr-block-inline">'
              + '<div class="qr-frame"><img id="certQRImg" alt="QR" /></div>'
              + '<div class="cert-num-below">' + escapeHtml(cert.number) + '</div>'
            + '</div>'
          + '</div>'
          + '<div class="cert-date-line">'
            + 'حررت الشهادة بتاريخ <strong>' + escapeHtml(normalizeDigits(cert.dateHijri || '')) + '</strong>، الموافق <strong>' + escapeHtml(normalizeDigits(cert.dateGreg || '')) + '</strong>'
          + '</div>'
        + '</div>'
      + '</div>';
  }

  // ===================================================================
  // buildCertElement — يُرجع HTMLElement مباشرة (راحة استخدام)
  // ===================================================================
  function buildCertElement(cert, options) {
    var html = buildCertHTML(cert, options);
    var wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    return wrapper.firstElementChild;
  }

  // ===================================================================
  // renderToPDF — يحوّل عنصر الشهادة إلى PDF عبر html2canvas + jsPDF
  // ===================================================================
  async function renderToPDF(certElement, options) {
    var opts = options || {};
    var filename = opts.filename || 'certificate.pdf';
    var save = (opts.save !== false);
    var returnBase64 = !!opts.returnBase64;

    if (!global.html2canvas) throw new Error('cert-engine: html2canvas غير محمَّل');
    var jsPDFCtor = (global.jspdf && global.jspdf.jsPDF) || global.jsPDF;
    if (!jsPDFCtor) throw new Error('cert-engine: jsPDF غير محمَّل');

    // انتظار تحميل الخطوط (يمنع رسم خطوط احتياطية)
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch(e) {}
    }

    var canvas = await global.html2canvas(certElement, {
      scale: 1.5,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      width: 1754,
      height: 1240
    });

    var pdf = new jsPDFCtor({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    var imgData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);

    if (save) pdf.save(filename);
    if (returnBase64) return pdf.output('datauristring').split(',')[1];
    return pdf;
  }

  // ===================================================================
  // Export to global
  // ===================================================================
  global.CertEngine = {
    VERSION: VERSION,
    buildCertHTML: buildCertHTML,
    buildCertElement: buildCertElement,
    renderToPDF: renderToPDF,
    // Helpers exposed for external use
    escapeHtml: escapeHtml,
    normalizeDigits: normalizeDigits,
    applyTokens: applyTokens,
    getCertDefaults: getCertDefaults,
    DEFAULT_TEMPLATES: DEFAULT_TEMPLATES,
    AJYAL_LOGO_SVG: AJYAL_LOGO_SVG
  };

})(typeof window !== 'undefined' ? window : globalThis);
