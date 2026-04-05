/**
 * CHANAKYA ACADEMY — CERTIFICATE GENERATOR
 * script.js  |  Fixed version
 *
 * FIXES APPLIED:
 * 1. Button unresponsive → preview now renders INSTANTLY before Firebase call
 * 2. Excel upload → proper visible button + file dialog trigger
 * 3. Date timezone bug fixed (YYYY-MM-DD parsed as local, not UTC)
 * 4. Certificate scale calculation fixed for all screen sizes
 * 5. All async errors caught so UI never freezes
 */

'use strict';

/* ══════════════════════════════════════════
   FIREBASE INIT  (safe — won't crash if offline)
══════════════════════════════════════════ */
const firebaseConfig = {
  apiKey:            "AIzaSyBeB6h9G7YwMhDodIPpoZIHaNyDu6-IERs",
  authDomain:        "chanakya-certificates.firebaseapp.com",
  projectId:         "chanakya-certificates",
  storageBucket:     "chanakya-certificates.firebasestorage.app",
  messagingSenderId: "1020718754886",
  appId:             "1:1020718754886:web:8e02b20b25e526b6cdae47"
};

let db = null;
let fbOK = false;

try {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  db   = firebase.firestore();
  fbOK = true;
} catch (e) {
  console.warn('[Firebase init failed]', e.message);
}

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let allStudents   = [];
let excelStudents = [];
let localSerial   = 0;

/* ══════════════════════════════════════════
   PURE HELPERS
══════════════════════════════════════════ */

const toTitleCase = str =>
  (str || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const padNum = (n, d = 3) => String(Math.max(1, parseInt(n) || 1)).padStart(d, '0');

const buildCode = num => 'CA' + padNum(num);

const ordinal = n => {
  const v = parseInt(n);
  if ([11,12,13].includes(v % 100)) return v + 'th';
  return v + ['th','st','nd','rd','th','th','th','th','th','th'][v % 10];
};

/* Parse date string as LOCAL time (avoids UTC-shift bug on YYYY-MM-DD) */
const parseLocalDate = raw => {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw) ? null : raw;
  const s = String(raw).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2]-1, +m[3]);
  const d = new Date(s);
  return isNaN(d) ? null : d;
};

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

const formatDate = raw => {
  const d = parseLocalDate(raw);
  if (!d) return String(raw || '');
  return `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const makeCertId = serial =>
  `CERT-${new Date().getFullYear()}-${padNum(serial)}`;

const normalizeLevel = raw => {
  if (!raw) return 'Foundation Level';
  const s = String(raw).toLowerCase().trim();
  if (['0','level 0','foundation','foundation level'].includes(s)) return 'Foundation Level';
  const m = s.match(/level\s*(\d)/);
  if (m) return `Level ${m[1]}`;
  const d = s.match(/^(\d)$/);
  if (d) return `Level ${d[1]}`;
  return toTitleCase(String(raw).trim());
};

/* ══════════════════════════════════════════
   SPINNER  &  TOAST
══════════════════════════════════════════ */

function spinner(show, msg = 'Processing…') {
  let ov = document.getElementById('spinner-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id        = 'spinner-overlay';
    ov.className = 'spinner-overlay';
    ov.innerHTML = `<div class="spinner-box">
      <div class="spinner"></div>
      <div class="spinner-text" id="spinner-msg"></div>
    </div>`;
    document.body.appendChild(ov);
  }
  document.getElementById('spinner-msg').textContent = msg;
  ov.classList.toggle('show', show);
}

function toast(msg, ms = 4000) {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast'; el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

/* ══════════════════════════════════════════
   CERTIFICATE HTML
══════════════════════════════════════════ */

function buildCertHTML(s, id) {
  const name    = toTitleCase(s.name || '');
  const code    = s.code  || '';
  const level   = s.level || '';
  const course  = s.course || '';
  const marks   = s.marks ? `${s.marks}%` : '';
  const dateStr = formatDate(s.date);
  const certId  = s.certId || makeCertId(s.serial || Math.floor(Math.random()*900+100));
  const achieve = level + (course ? ` — ${course}` : '');
  const marksHtml = marks
    ? `with <strong style="color:#0d2b52">${marks} marks</strong>`
    : '';

  return `<div class="cert-outer" id="${id}">

  <!-- TOP-RIGHT WAVE -->
  <svg class="cert-wave-tr" viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <defs>
      <linearGradient id="gtr" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#0d2b52"/>
        <stop offset="100%" stop-color="#1a5098"/>
      </linearGradient>
    </defs>
    <path d="M260,0 L260,200 Q195,140 170,90 Q148,40 260,0Z"          fill="url(#gtr)" opacity=".97"/>
    <path d="M260,0 L260,200 Q200,148 175,98 Q155,50 255,5Z"          fill="none" stroke="#c5a021" stroke-width="5" opacity=".9"/>
    <path d="M260,0 Q228,22 210,58 Q194,94 215,148 L260,200Z"         fill="url(#gtr)" opacity=".55"/>
    <path d="M258,6 Q225,28 208,64 Q192,100 213,152 L256,196"         fill="none" stroke="#e8c84a" stroke-width="2.5" opacity=".7"/>
  </svg>

  <!-- BOTTOM-LEFT WAVE -->
  <svg class="cert-wave-bl" viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <defs>
      <linearGradient id="gbl" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#0d2b52"/>
        <stop offset="100%" stop-color="#1a5098"/>
      </linearGradient>
    </defs>
    <path d="M260,0 L260,200 Q195,140 170,90 Q148,40 260,0Z"          fill="url(#gbl)" opacity=".97"/>
    <path d="M260,0 L260,200 Q200,148 175,98 Q155,50 255,5Z"          fill="none" stroke="#c5a021" stroke-width="5" opacity=".9"/>
    <path d="M260,0 Q228,22 210,58 Q194,94 215,148 L260,200Z"         fill="url(#gbl)" opacity=".55"/>
    <path d="M258,6 Q225,28 208,64 Q192,100 213,152 L256,196"         fill="none" stroke="#e8c84a" stroke-width="2.5" opacity=".7"/>
  </svg>

  <div class="cert-inner">

    <!-- ORG HEADER -->
    <div class="cert-top-row">
      <div class="cert-logo-wrap">
        <img class="cert-logo-img" src="logo.png" alt="Logo"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
        <div class="cert-logo-fallback">CA</div>
        <div class="cert-logo-name">CHANAKYA<br>ACADEMY</div>
      </div>
      <div class="cert-org-block">
        <div class="cert-org-name">CHANAKYA ACADEMY</div>
        <div class="cert-org-sub">Abacus &amp; Vedic Maths Classes</div>
        <div class="cert-org-tagline">✦ "The Brain Gym!" ✦</div>
      </div>
    </div>

    <div class="cert-gold-line"></div>

    <!-- TITLE -->
    <div class="cert-title-block">
      <div class="cert-main-title">CERTIFICATE</div>
      <div class="cert-sub-title">of &nbsp; Participation</div>
    </div>
    <div class="cert-title-rule"><hr/><span>◆</span><hr/></div>

    <!-- BODY -->
    <div class="cert-body">
      <p class="cert-presented-to">This certificate is proudly presented to</p>
      <div class="cert-student-name">${name}</div>
      <p class="cert-detail-line" style="margin-top:10px">
        in appreciation of active participation and successful completion of<br>
        <strong>${achieve}</strong> ${marksHtml}
      </p>
      <p class="cert-detail-line" style="margin-top:6px">
        Student Code: <strong>${code}</strong>
        &nbsp;|&nbsp; Date: <strong>${dateStr}</strong>
      </p>
    </div>

    <div class="cert-gold-line" style="margin-top:auto;margin-bottom:12px"></div>

    <!-- SIGNATURES -->
    <div class="cert-footer-row">
      <div class="cert-sig-block">
        <span class="cert-sig-scrawl">Archana Kakde</span>
        <div class="cert-sig-line"></div>
        <div class="cert-sig-name">ARCHANA KAKDE</div>
        <div class="cert-sig-role">Director, Chanakya Academy</div>
      </div>
      <div style="flex:1"></div>
      <div class="cert-sig-block">
        <span class="cert-sig-scrawl" style="color:#8c6d05">Head of Training</span>
        <div class="cert-sig-line"></div>
        <div class="cert-sig-name">HEAD OF TRAINING</div>
        <div class="cert-sig-role">Chanakya Academy</div>
      </div>
    </div>

  </div><!-- /cert-inner -->

  <div class="cert-id-line">Certificate ID: ${certId}</div>
</div>`;
}

/* ══════════════════════════════════════════
   RENDER + SCALE
══════════════════════════════════════════ */

function renderCertInto(wrapEl, student, certId) {
  if (!wrapEl) return;
  wrapEl.innerHTML = buildCertHTML(student, certId);
  // two rAF frames so the DOM is painted before measuring
  requestAnimationFrame(() => requestAnimationFrame(() => scaleCert(wrapEl)));
}

function scaleCert(wrapEl) {
  if (!wrapEl) return;
  const certEl = wrapEl.querySelector('.cert-outer');
  if (!certEl) return;
  const certW = 1000, certH = 706;
  const avail = Math.max(100, wrapEl.getBoundingClientRect().width || wrapEl.offsetWidth);
  const scale = Math.min(1, avail / certW);
  certEl.style.transform       = `scale(${scale})`;
  certEl.style.transformOrigin = 'top left';
  wrapEl.style.height          = Math.round(certH * scale) + 'px';
  wrapEl.style.overflow        = 'hidden';
}

window.addEventListener('resize', () => {
  document.querySelectorAll('.cert-scale-wrap').forEach(scaleCert);
});

/* ══════════════════════════════════════════
   FIREBASE HELPERS
══════════════════════════════════════════ */

async function getNextSerial() {
  localSerial++;
  if (!fbOK) return localSerial;
  try {
    const ref  = db.collection('meta').doc('counter');
    const snap = await ref.get();
    const next = snap.exists ? (snap.data().count || 0) + 1 : localSerial;
    await ref.set({ count: next });
    return next;
  } catch (e) {
    console.warn('Counter error:', e.message);
    return localSerial;
  }
}

async function saveToFirestore(data) {
  const serial = await getNextSerial();
  const record = { ...data, serial, certId: makeCertId(serial), createdAt: Date.now() };
  if (fbOK) {
    try {
      const ref = await db.collection('students').add(record);
      return { id: ref.id, ...record };
    } catch (e) {
      console.warn('Firestore write error:', e.code, e.message);
      toast(`⚠️ Firebase: ${e.code || e.message}. Certificate still shown.`);
    }
  }
  return { id: 'local-' + Date.now(), ...record };
}

async function loadAllStudents() {
  if (!fbOK) return [];
  try {
    const snap = await db.collection('students').orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    toast('⚠️ Could not load from Firebase: ' + (e.code || e.message));
    return [];
  }
}

/* ══════════════════════════════════════════
   EXPORT (PDF / JPG)
══════════════════════════════════════════ */

async function exportEl(certEl, format, fname) {
  spinner(true, `Generating ${format.toUpperCase()}…`);
  const pool = document.getElementById('cert-render-pool');

  // Clone and place off-screen with no transform
  const clone = certEl.cloneNode(true);
  clone.style.cssText =
    'transform:none!important;transform-origin:top left;' +
    'position:absolute;left:0;top:0;width:1000px;height:706px;overflow:hidden;';
  pool.appendChild(clone);

  try {
    await new Promise(r => setTimeout(r, 180)); // font/image settle time

    const canvas = await html2canvas(clone, {
      scale:           3,
      useCORS:         true,
      allowTaint:      true,
      backgroundColor: '#fffdf5',
      width:           1000,
      height:          706,
      windowWidth:     1000,
      windowHeight:    706,
      logging:         false,
      imageTimeout:    12000
    });

    const safeName = (fname || 'certificate').replace(/\s+/g, '_');
    if (format === 'pdf') {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, 297, 210);
      pdf.save(`${safeName}.pdf`);
    } else {
      const a = document.createElement('a');
      a.download = `${safeName}.jpg`;
      a.href = canvas.toDataURL('image/jpeg', 0.97);
      a.click();
    }
    toast(`✅ Downloaded as ${format.toUpperCase()}`);
  } catch (e) {
    console.error('Export failed:', e);
    toast('❌ Export failed. Check browser console.');
  } finally {
    if (pool.contains(clone)) pool.removeChild(clone);
    spinner(false);
  }
}

function dlFromWrap(wrapId, format) {
  const wrap   = document.getElementById(wrapId);
  if (!wrap) { toast('Wrapper not found.'); return; }
  const certEl = wrap.querySelector('.cert-outer');
  if (!certEl) { toast('No certificate rendered yet. Please add a student first.'); return; }
  const nm  = (certEl.querySelector('.cert-student-name') || {}).textContent || 'cert';
  const cid = ((certEl.querySelector('.cert-id-line') || {}).textContent || '').replace('Certificate ID: ', '').trim();
  exportEl(certEl, format, `${nm.trim()}_${cid}`);
}

/* ══════════════════════════════════════════
   APP
══════════════════════════════════════════ */

const App = {

  /* TABS */
  switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === `tab-${name}`));
    if (name === 'history') App.loadHistory();
  },

  /* ─── TAB 1: MANUAL ─── */
  async manualAdd() {
    const nameRaw = (document.getElementById('m-name').value || '').trim();
    const codeNum = (document.getElementById('m-code-num').value || '').trim();
    const level   = document.getElementById('m-level').value;
    const course  = document.getElementById('m-course').value;
    const marks   = (document.getElementById('m-marks').value || '').trim();
    const date    = document.getElementById('m-date').value;

    if (!nameRaw) { toast('⚠️ Please enter the student name.');    return; }
    if (!codeNum) { toast('⚠️ Please enter the student code.');    return; }
    if (!level)   { toast('⚠️ Please select a level.');            return; }
    if (!date)    { toast('⚠️ Please select the issue date.');     return; }

    const data = {
      name: toTitleCase(nameRaw),
      code: buildCode(codeNum),
      level, course, marks, date
    };

    /* ★ SHOW PREVIEW IMMEDIATELY — don't wait for Firebase */
    localSerial++;
    const preview = { ...data, serial: localSerial, certId: makeCertId(localSerial) };
    App._showManualPreview(preview);

    /* Save in background */
    spinner(true, 'Saving to Firebase…');
    try {
      const saved = await saveToFirestore(data);
      App._showManualPreview(saved); // refresh with real certId
      toast('✅ Student saved successfully!');
    } catch (e) {
      toast('⚠️ Preview shown. Firebase save may have failed.');
    } finally {
      spinner(false);
    }

    /* Reset form */
    document.getElementById('m-name').value     = '';
    document.getElementById('m-code-num').value = '';
    document.getElementById('m-marks').value    = '';
    document.getElementById('m-level').selectedIndex = 0;
  },

  _showManualPreview(student) {
    document.getElementById('manual-placeholder').style.display = 'none';
    const wrap = document.getElementById('manual-cert-wrap');
    wrap.style.display = 'block';
    renderCertInto(wrap, student, 'manual-cert');
    document.getElementById('manual-dl-btns').style.display = 'flex';
    setTimeout(() => wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 250);
  },

  downloadManual(fmt) { dlFromWrap('manual-cert-wrap', fmt); },

  /* ─── TAB 2: EXCEL ─── */
  triggerFile() { document.getElementById('excel-file').click(); },

  parseExcel(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb    = XLSX.read(ev.target.result, { type: 'binary', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (rows.length < 2) { toast('⚠️ File has no data rows.'); return; }

        const hdrs = rows[0].map(h => String(h).toLowerCase().trim());
        const col  = names => {
          for (const n of names) {
            const i = hdrs.findIndex(h => h.includes(n));
            if (i !== -1) return i;
          }
          return -1;
        };
        const C = {
          name:   col(['name']),
          code:   col(['code','id']),
          level:  col(['level']),
          course: col(['course','subject']),
          marks:  col(['mark','grade','score','percent']),
          date:   col(['date'])
        };

        excelStudents = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const nm = String(r[C.name] || '').trim();
          if (!nm) continue;
          const rawDate = r[C.date];
          let dateISO   = todayISO();
          if (rawDate) {
            const d = rawDate instanceof Date ? rawDate : parseLocalDate(rawDate);
            if (d && !isNaN(d)) {
              dateISO = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            }
          }
          const digits = String(r[C.code] || '').replace(/\D/g,'');
          excelStudents.push({
            name:   toTitleCase(nm),
            code:   digits ? buildCode(digits) : buildCode(i),
            level:  normalizeLevel(r[C.level]),
            course: String(r[C.course] || 'Abacus').trim() || 'Abacus',
            marks:  String(r[C.marks]  || '').trim(),
            date:   dateISO
          });
        }

        if (!excelStudents.length) { toast('⚠️ No valid rows found.'); return; }
        App._renderExcelList();
        document.getElementById('excel-parsed-area').style.display = 'block';
        toast(`✅ Parsed ${excelStudents.length} student(s)`);
        setTimeout(() => document.getElementById('excel-parsed-area').scrollIntoView({ behavior: 'smooth' }), 100);
      } catch (err) {
        console.error(err);
        toast('❌ Could not read Excel file. Check format.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // allow re-upload of same file
  },

  _renderExcelList() {
    document.getElementById('excel-student-list').innerHTML =
      excelStudents.map((s, i) =>
        `<div class="excel-student-item" id="excel-item-${i}">
          <input type="checkbox" id="excel-chk-${i}"/>
          <div class="excel-item-info">
            <div class="excel-item-name">${s.name}</div>
            <div class="excel-item-meta">${s.code} | ${s.level} | ${s.course}${s.marks ? ' | ' + s.marks + '%' : ''} | ${formatDate(s.date)}</div>
          </div>
          <button class="excel-preview-btn" onclick="App.excelPreview(${i})">👁 Preview</button>
        </div>`
      ).join('');
  },

  excelPreview(idx) {
    const s    = excelStudents[idx];
    const area = document.getElementById('excel-preview-area');
    const wrap = document.getElementById('excel-cert-wrap');
    area.style.display = 'block';
    const tmp = { ...s, serial: idx+1, certId: makeCertId(idx+1) };
    renderCertInto(wrap, tmp, 'excel-cert');
    setTimeout(() => area.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  },

  toggleSelectAll() {
            
