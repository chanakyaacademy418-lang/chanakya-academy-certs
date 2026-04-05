// 1. Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBeB6h9G7YwMhDodIPpoZIHaNyDu6-IERs",
    authDomain: "chanakya-certificates.firebaseapp.com",
    projectId: "chanakya-certificates",
    storageBucket: "chanakya-certificates.firebasestorage.app",
    messagingSenderId: "1020718754886",
    appId: "1:1020718754886:web:8e02b20b25e526b6cdae47"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. Asset Preparation (Make sure these files exist in your folder)
const bgImg = new Image(); bgImg.src = 'border_asset.jpg'; 
const sealImg = new Image(); sealImg.src = 'seal_asset.png';

let allStudents = [];
let activeStudent = null;

// 3. Form Helpers
const toTitleCase = (str) => str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'long' });
    const year = d.getFullYear();
    const suffix = ["th", "st", "nd", "rd"][(day % 10 > 3 || Math.floor(day % 100 / 10) == 1) ? 0 : day % 10];
    return `${day}${suffix} ${month} ${year}`;
};

// 4. Core Functions
async function addStudent() {
    const name = document.getElementById('name').value;
    const rawCode = document.getElementById('code').value;
    const level = document.getElementById('level').value;
    const date = document.getElementById('date').value;
    
    if(!name || !rawCode || !level || !date) return alert("Please fill all required fields!");

    const studentData = {
        name: toTitleCase(name),
        code: `CA${rawCode.padStart(3, '0')}`,
        level: level,
        course: document.getElementById('course').value,
        date: date,
        certId: `CERT-${new Date().getFullYear()}-${rawCode.padStart(3, '0')}`,
        createdAt: Date.now()
    };

    await db.collection("records").add(studentData);
    alert("Record Saved Successfully!");
    loadData();
    previewCert(studentData);
}

async function loadData() {
    const snap = await db.collection("records").orderBy("createdAt", "desc").get();
    allStudents = snap.docs.map(doc => doc.data());
    renderList(allStudents);
}

function renderList(data) {
    const list = document.getElementById('list');
    list.innerHTML = data.map(s => `
        <div class="student-item" onclick='previewCert(${JSON.stringify(s)})'>
            <strong>${s.name}</strong><br>
            <small>${s.code} | ${s.level} | ${s.date}</small>
        </div>
    `).join('');
}

// 5. Canvas Generation Logic
async function previewCert(s) {
    activeStudent = s;
    const canvas = document.getElementById('certCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 2000; canvas.height = 1414; // High Res A4

    // Layer 1: Background Asset
    ctx.drawImage(bgImg, 0, 0, 2000, 1414);

    // Layer 2: Text Styling
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0d2b52';
    
    ctx.font = 'bold 110px Cinzel';
    ctx.fillText('CERTIFICATE', 1000, 350);
    
    ctx.font = '50px Poppins';
    ctx.letterSpacing = "10px";
    ctx.fillText('OF ACHIEVEMENT', 1000, 430);

    ctx.letterSpacing = "0px";
    ctx.font = '40px Poppins';
    ctx.fillStyle = '#555';
    ctx.fillText('This is to certify that', 1000, 580);

    ctx.font = 'italic 160px "Great Vibes"';
    ctx.fillStyle = '#0d2b52';
    ctx.fillText(s.name, 1000, 780);

    ctx.font = '40px Poppins';
    ctx.fillStyle = '#555';
    ctx.fillText('has successfully completed', 1000, 880);

    ctx.font = 'bold 65px Poppins';
    ctx.fillStyle = '#0d2b52';
    ctx.fillText(`${s.level} in ${s.course}`, 1000, 980);

    ctx.font = '35px Poppins';
    ctx.fillText(`Dated on: ${formatDate(s.date)}`, 1000, 1080);

    // Layer 3: Seal Asset
    ctx.drawImage(sealImg, 1500, 500, 280, 280);

    // Layer 4: Signature
    ctx.font = 'bold 35px Poppins';
    ctx.fillText('Archana Kakde', 1600, 1250);
    ctx.font = '30px Poppins';
    ctx.fillText('Director', 1600, 1300);

    // Show Preview
    const container = document.getElementById('preview-container');
    container.innerHTML = '';
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = canvas.width; previewCanvas.height = canvas.height;
    previewCanvas.getContext('2d').drawImage(canvas, 0, 0);
    container.appendChild(previewCanvas);
    
    document.getElementById('previewModal').style.display = 'block';
}

function download(type) {
    const canvas = document.getElementById('certCanvas');
    if(type === 'jpg') {
        const link = document.createElement('a');
        link.download = `${activeStudent.name}_Certificate.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
/**
 * CHANAKYA ACADEMY — CERTIFICATE GENERATOR
 * script.js  |  Firebase v8 compat + html2canvas + jsPDF + SheetJS
 */

'use strict';

/* ─── FIREBASE CONFIG ─── */
const firebaseConfig = {
  apiKey:            "AIzaSyBeB6h9G7YwMhDodIPpoZIHaNyDu6-IERs",
  authDomain:        "chanakya-certificates.firebaseapp.com",
  projectId:         "chanakya-certificates",
  storageBucket:     "chanakya-certificates.firebasestorage.app",
  messagingSenderId: "1020718754886",
  appId:             "1:1020718754886:web:8e02b20b25e526b6cdae47"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ─── STATE ─── */
let allStudents   = [];   // loaded from Firestore
let excelStudents = [];   // parsed from xlsx
let certCounter   = 0;    // for CERT-YYYY-XXX sequential id within session

/* ═══════════════════════════════════════════════════════════════
   UTILITY HELPERS
═══════════════════════════════════════════════════════════════ */

/** Convert any string to Title Case */
function toTitleCase(str) {
  return (str || '')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Pad number to N digits */
function padNum(n, digits = 3) {
  return String(parseInt(n) || 0).padStart(digits, '0');
}

/** Build student code from raw number input */
function buildCode(numStr) {
  return 'CA' + padNum(numStr);
}

/** Ordinal suffix: 1→1st, 2→2nd, 3→3rd, 4→4th … */
function ordinal(n) {
  const v = parseInt(n);
  if ([11, 12, 13].includes(v % 100)) return v + 'th';
  switch (v % 10) {
    case 1: return v + 'st';
    case 2: return v + 'nd';
    case 3: return v + 'rd';
    default: return v + 'th';
  }
}

/** Format date string (any parseable) → "10th April 2026" */
function formatDate(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${ordinal(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** ISO date string for today: YYYY-MM-DD */
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/** Generate CERT-YYYY-XXX from a student record (uses Firestore counter doc in real use; here we use timestamp-based) */
function makeCertId(student) {
  // Use last 3 digits of timestamp-based serial stored in student
  const serial = student.serial || Math.floor(Math.random() * 900 + 100);
  const year   = new Date().getFullYear();
  return `CERT-${year}-${padNum(serial)}`;
}

/** Normalize level from Excel values */
function normalizeLevel(raw) {
  if (!raw) return '';
  const s = String(raw).toLowerCase().trim();
  if (s === '0' || s === 'level 0' || s === 'foundation' || s === 'foundation level') return 'Foundation Level';
  const m = s.match(/level\s*(\d)/);
  if (m) return `Level ${m[1]}`;
  // bare digit
  const d = s.match(/^(\d)$/);
  if (d) return `Level ${d[1]}`;
  return toTitleCase(raw.trim());
}

/** Show/hide full-screen spinner */
function spinner(show, msg = 'Processing…') {
  let ov = document.getElementById('spinner-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'spinner-overlay';
    ov.className = 'spinner-overlay';
    ov.innerHTML = `<div class="spinner-box"><div class="spinner"></div><div class="spinner-text" id="spinner-msg"></div></div>`;
    document.body.appendChild(ov);
  }
  document.getElementById('spinner-msg').textContent = msg;
  ov.classList.toggle('show', show);
}

/** Show a toast message */
function toast(msg, duration = 3000) {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), duration);
}

/* ═══════════════════════════════════════════════════════════════
   CERTIFICATE HTML BUILDER
═══════════════════════════════════════════════════════════════ */

/**
 * Build the full certificate DOM string for a student record.
 * @param {Object} s  – student data object
 * @param {string} id – unique id to assign to the root element
 */
function buildCertHTML(s, id) {
  const name    = toTitleCase(s.name || '');
  const code    = s.code || '';
  const level   = s.level || '';
  const course  = s.course || '';
  const marks   = s.marks ? `${s.marks}%` : '';
  const dateStr = formatDate(s.date);
  const certId  = s.certId || makeCertId(s);

  // Body copy
  const achieveLine = [level, course ? `(${course})` : ''].filter(Boolean).join(' ');
  const marksLine   = marks ? `with <strong>${marks} marks</strong>` : '';

  return `
<div class="cert-outer" id="${id}">

  <!-- Wave SVG — Top Right -->
  <svg class="cert-wave-tr" viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <defs>
      <linearGradient id="wg1-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0d2b52"/>
        <stop offset="100%" stop-color="#1a5098"/>
      </linearGradient>
    </defs>
    <!-- Navy wave layer -->
    <path d="M260,0 L260,200 Q200,150 180,100 Q160,50 260,0 Z"
          fill="url(#wg1-${id})" opacity="0.95"/>
    <!-- Gold stripe over wave -->
    <path d="M260,0 L260,200 Q205,158 185,108 Q168,65 255,8 Z"
          fill="none" stroke="#c5a021" stroke-width="4" opacity="0.9"/>
    <!-- Second navy wave -->
    <path d="M260,0 Q230,20 215,55 Q200,90 220,140 L260,200 Z"
          fill="url(#wg1-${id})" opacity="0.6"/>
    <!-- Second gold stripe -->
    <path d="M260,10 Q226,28 212,65 Q198,100 218,148 L255,192"
          fill="none" stroke="#e8c84a" stroke-width="2.5" opacity="0.7"/>
  </svg>

  <!-- Wave SVG — Bottom Left (same, rotated 180deg via CSS) -->
  <svg class="cert-wave-bl" viewBox="0 0 260 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <defs>
      <linearGradient id="wg2-${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0d2b52"/>
        <stop offset="100%" stop-color="#1a5098"/>
      </linearGradient>
    </defs>
    <path d="M260,0 L260,200 Q200,150 180,100 Q160,50 260,0 Z"
          fill="url(#wg2-${id})" opacity="0.95"/>
    <path d="M260,0 L260,200 Q205,158 185,108 Q168,65 255,8 Z"
          fill="none" stroke="#c5a021" stroke-width="4" opacity="0.9"/>
    <path d="M260,0 Q230,20 215,55 Q200,90 220,140 L260,200 Z"
          fill="url(#wg2-${id})" opacity="0.6"/>
    <path d="M260,10 Q226,28 212,65 Q198,100 218,148 L255,192"
          fill="none" stroke="#e8c84a" stroke-width="2.5" opacity="0.7"/>
  </svg>

  <!-- INNER CONTENT -->
  <div class="cert-inner">

    <!-- Top Row: Logo + Org Name -->
    <div class="cert-top-row">
      <div class="cert-logo-wrap">
        <img class="cert-logo-img" src="logo.png"
             alt="Chanakya Academy"
             onerror="this.style.display='none';this.nextSibling.style.display='flex'" />
        <div style="display:none;width:72px;height:72px;border-radius:50%;border:2px solid #c5a021;
                    background:linear-gradient(135deg,#0d2b52,#1a5098);align-items:center;
                    justify-content:center;color:#e8c84a;font-size:22px;font-weight:900;font-family:'Cinzel',serif;">CA</div>
        <div class="cert-logo-name">CHANAKYA<br>ACADEMY</div>
      </div>

      <div class="cert-org-block">
        <div class="cert-org-name">CHANAKYA ACADEMY</div>
        <div class="cert-org-sub">Abacus &amp; Vedic Maths Classes</div>
        <div class="cert-org-tagline">✦ "The Brain Gym!" ✦</div>
      </div>
    </div>

    <!-- Gold Divider -->
    <div class="cert-gold-line"></div>

    <!-- Title -->
    <div class="cert-title-block">
      <div class="cert-main-title">CERTIFICATE</div>
      <div class="cert-sub-title">of &nbsp; Participation</div>
    </div>

    <!-- Decorative title rule -->
    <div class="cert-title-rule">
      <hr/><span>◆</span><hr/>
    </div>

    <!-- Body -->
    <div class="cert-body">
      <p class="cert-presented-to">This certificate is proudly presented to</p>

      <div class="cert-student-name">${name}</div>

      <p class="cert-detail-line" style="margin-top:8px;">
        in appreciation of their active participation and successful completion of
        <strong>${achieveLine}</strong>
        ${marksLine}
      </p>
      <p class="cert-detail-line" style="margin-top:4px;">
        Student Code: <strong>${code}</strong>
        &nbsp;|&nbsp; Dated: <strong>${dateStr}</strong>
      </p>
    </div>

    <!-- Thin gold line above signatures -->
    <div class="cert-gold-line" style="margin-top:auto;margin-bottom:10px;"></div>

    <!-- Footer: Signatures -->
    <div class="cert-footer-row">

      <!-- Left signature: Director -->
      <div class="cert-sig-block">
        <span class="cert-sig-scrawl">Archana Kakde</span>
        <div class="cert-sig-line"></div>
        <div class="cert-sig-name">ARCHANA KAKDE</div>
        <div class="cert-sig-role">Director</div>
      </div>

      <!-- Center: blank (intentional spacing) -->
      <div class="cert-center-block"></div>

      <!-- Right signature: Head of Training -->
      <div class="cert-sig-block">
        <span class="cert-sig-scrawl" style="color:#8c6d05;">Chanakya Academy</span>
        <div class="cert-sig-line"></div>
        <div class="cert-sig-name">HEAD OF TRAINING</div>
        <div class="cert-sig-role">Chanakya Academy</div>
      </div>

    </div>

  </div><!-- /cert-inner -->

  <!-- Certificate ID — subtle grey, bottom right -->
  <div class="cert-id-line">Certificate ID: ${certId}</div>

</div><!-- /cert-outer -->
  `.trim();
}

/* ═══════════════════════════════════════════════════════════════
   RENDER + SCALE HELPERS
═══════════════════════════════════════════════════════════════ */

/** Inject cert HTML into a wrapper and apply responsive scaling */
function renderCertInto(wrapEl, student, certId) {
  wrapEl.innerHTML = buildCertHTML(student, certId);
  scaleCert(wrapEl);
}

function scaleCert(wrapEl) {
  const certEl = wrapEl.querySelector('.cert-outer');
  if (!certEl) return;
  const certW = 1000;
  const avail = wrapEl.getBoundingClientRect().width || wrapEl.offsetWidth || 600;
  const scale = Math.min(1, avail / certW);
  certEl.style.transform      = `scale(${scale})`;
  certEl.style.transformOrigin = 'top left';
  wrapEl.style.height          = Math.round(706 * scale) + 'px';
  wrapEl.style.overflow        = 'hidden';
  wrapEl.style.width           = '100%';
}

window.addEventListener('resize', () => {
  document.querySelectorAll('.cert-scale-wrap').forEach(scaleCert);
});

/* ═══════════════════════════════════════════════════════════════
   FIREBASE HELPERS
═══════════════════════════════════════════════════════════════ */

async function saveToFirestore(studentData) {
  // Get current count to assign serial for CERT ID
  const snap = await db.collection('meta').doc('counter').get();
  let serial = 1;
  if (snap.exists) {
    serial = (snap.data().count || 0) + 1;
  }
  await db.collection('meta').doc('counter').set({ count: serial });

  const record = {
    ...studentData,
    serial,
    certId:    `CERT-${new Date().getFullYear()}-${padNum(serial)}`,
    createdAt: Date.now()
  };
  const ref = await db.collection('students').add(record);
  return { id: ref.id, ...record };
}

async function loadAllStudents() {
  const snap = await db.collection('students').orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ═══════════════════════════════════════════════════════════════
   DOWNLOAD HELPERS
═══════════════════════════════════════════════════════════════ */

/**
 * Download certificate element as PDF or JPG.
 * @param {string} certWrapperId – id of the .cert-scale-wrap container
 * @param {string} format        – 'pdf' | 'jpg'
 */
async function downloadCertById(certWrapperId, format) {
  const wrapEl = document.getElementById(certWrapperId);
  if (!wrapEl) { toast('Certificate not found.'); return; }
  const certEl = wrapEl.querySelector('.cert-outer');
  if (!certEl) { toast('Certificate not rendered.'); return; }
  await exportCertEl(certEl, format);
}

async function exportCertEl(certEl, format) {
  spinner(true, 'Generating ' + format.toUpperCase() + '…');

  // Clone to render pool for clean capture (no scaling transform)
  const pool = document.getElementById('cert-render-pool');
  const clone = certEl.cloneNode(true);
  clone.style.transform      = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.position        = 'absolute';
  clone.style.left            = '0';
  clone.style.top             = '0';
  clone.style.width           = '1000px';
  clone.style.height          = '706px';
  pool.appendChild(clone);

  try {
    await new Promise(r => setTimeout(r, 120)); // allow fonts/images to settle

    const canvas = await html2canvas(clone, {
      scale:             3,
      useCORS:           true,
      allowTaint:        false,
      backgroundColor:   '#fffdf5',
      width:             1000,
      height:            706,
      windowWidth:       1000,
      windowHeight:      706,
      logging:           false,
      imageTimeout:      8000,
    });

    const nameEl = clone.querySelector('.cert-student-name');
    const name   = nameEl ? nameEl.textContent.replace(/\s+/g,'_') : 'certificate';
    const certId = (clone.querySelector('.cert-id-line')?.textContent || 'cert').replace('Certificate ID: ','').trim();
    const fname  = `${name}_${certId}`;

    if (format === 'pdf') {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      pdf.save(`${fname}.pdf`);
    } else {
      // JPG
      const link = document.createElement('a');
      link.download = `${fname}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.97);
      link.click();
    }
    toast(`✅ Downloaded as ${format.toUpperCase()}`);
  } catch (err) {
    console.error(err);
    toast('❌ Download failed. Check console.');
  } finally {
    pool.removeChild(clone);
    spinner(false);
  }
}

/* ═══════════════════════════════════════════════════════════════
   APP NAMESPACE
═══════════════════════════════════════════════════════════════ */

const App = {

  /* ── TABS ── */
  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === `tab-${tabName}`));
    if (tabName === 'history') App.loadHistory();
  },

  /* ══════════════════════════════════════════
     TAB 1: MANUAL ENTRY
  ══════════════════════════════════════════ */
  async manualAdd() {
    const nameRaw  = document.getElementById('m-name').value.trim();
    const codeNum  = document.getElementById('m-code-num').value.trim();
    const level    = document.getElementById('m-level').value;
    const course   = document.getElementById('m-course').value;
    const marksRaw = document.getElementById('m-marks').value.trim();
    const dateRaw  = document.getElementById('m-date').value;

    if (!nameRaw)  { toast('⚠️ Please enter a student name.'); return; }
    if (!codeNum)  { toast('⚠️ Please enter a student code number.'); return; }
    if (!level)    { toast('⚠️ Please select a level.'); return; }
    if (!dateRaw)  { toast('⚠️ Please select a date.'); return; }

    const studentData = {
      name:   toTitleCase(nameRaw),
      code:   buildCode(codeNum),
      level,
      course,
      marks:  marksRaw || '',
      date:   dateRaw,
    };

    spinner(true, 'Saving to Firebase…');
    try {
      const saved = await saveToFirestore(studentData);
      toast('✅ Student saved successfully!');
      App._renderManualPreview(saved);

      // Reset form (keep date)
      document.getElementById('m-name').value     = '';
      document.getElementById('m-code-num').value = '';
      document.getElementById('m-marks').value    = '';
      document.getElementById('m-level').value    = '';
    } catch (err) {
      console.error(err);
      toast('❌ Error saving to Firebase.');
    } finally {
      spinner(false);
    }
  },

  _renderManualPreview(student) {
    document.getElementById('manual-placeholder').style.display = 'none';
    const wrap = document.getElementById('manual-cert-wrap');
    wrap.style.display = 'block';
    renderCertInto(wrap, student, 'manual-cert');
    document.getElementById('manual-dl-btns').style.display = 'flex';
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  downloadCert(wrapId, format) {
    downloadCertById(wrapId, format);
  },

  /* ══════════════════════════════════════════
     TAB 2: EXCEL UPLOAD
  ══════════════════════════════════════════ */
  parseExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb    = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rows.length < 2) { toast('⚠️ Excel file appears empty.'); return; }

        // Detect header row (row 0)
        const headers = rows[0].map(h => String(h).toLowerCase().trim());
        const col = (names) => {
          for (const n of names) {
            const i = headers.findIndex(h => h.includes(n));
            if (i !== -1) return i;
          }
          return -1;
        };

        const nameCol   = col(['name']);
        const codeCol   = col(['code','id']);
        const levelCol  = col(['level']);
        const courseCol = col(['course','subject']);
        const marksCol  = col(['mark','grade','score','percent']);
        const dateCol   = col(['date']);

        excelStudents = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rawName = String(row[nameCol] || '').trim();
          if (!rawName) continue;

          const rawCode  = String(row[codeCol]  || '').trim();
          const rawLevel = String(row[levelCol]  || '').trim();
          const rawCourse= String(row[courseCol] || '').trim();
          const rawMarks = String(row[marksCol]  || '').trim();
          const rawDate  = row[dateCol];

          // Date handling
          let dateISO = todayISO();
          if (rawDate) {
            if (rawDate instanceof Date) {
              dateISO = rawDate.toISOString().split('T')[0];
            } else {
              const d = new Date(rawDate);
              if (!isNaN(d)) dateISO = d.toISOString().split('T')[0];
            }
          }

          // Code: strip any non-digit prefix, pad to 3
          const codeDigits = rawCode.replace(/\D/g,'');
          const code = codeDigits ? buildCode(codeDigits) : buildCode(i);

          excelStudents.push({
            name:   toTitleCase(rawName),
            code,
            level:  normalizeLevel(rawLevel) || 'Foundation Level',
            course: rawCourse || 'Abacus',
            marks:  rawMarks,
            date:   dateISO,
          });
        }

        if (!excelStudents.length) { toast('⚠️ No valid student rows found.'); return; }

        App._renderExcelList();
        document.getElementById('excel-parsed-area').style.display = 'block';
        toast(`✅ Parsed ${excelStudents.length} student(s)`);
      } catch (err) {
        console.error(err);
        toast('❌ Failed to parse Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  },

  _renderExcelList() {
    const listEl = document.getElementById('excel-student-list');
    listEl.innerHTML = excelStudents.map((s, i) => 
