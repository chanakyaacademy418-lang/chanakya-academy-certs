const firebaseConfig = {
    apiKey: "AIzaSyBeB6h9G7YwMhDodIPpoZIHaNyDu6-IERs",
    authDomain: "chanakya-certificates.firebaseapp.com",
    projectId: "chanakya-certificates",
    storageBucket: "chanakya-certificates.appspot.com",
    messagingSenderId: "1020718754886",
    appId: "1:1020718754886:web:8e02b20b25e526b6cdae47"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let records = [];

const toTitleCase = (s) => s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const formatDate = (ds) => {
    const d = new Date(ds), day = d.getDate();
    const m = d.toLocaleString('en-GB', { month: 'long' }), y = d.getFullYear();
    const sfx = (day) => { if (day > 3 && day < 21) return 'th'; switch (day % 10) { case 1: return "st"; case 2: return "nd"; case 3: return "rd"; default: return "th"; } };
    return `${day}${sfx(day)} ${m} ${y}`;
};

async function addStudent() {
    const n = document.getElementById('name').value, c = document.getElementById('code').value;
    const l = document.getElementById('level').value, cr = document.getElementById('course').value, d = document.getElementById('date').value;
    if (!n || !c || !l || !d) return alert("Fill all fields");
    const data = { name: toTitleCase(n), code: `CA${c.padStart(3, '0')}`, level: l, course: cr, date: d, certId: `CERT-2026-${c.padStart(3, '0')}`, ts: Date.now() };
    await db.collection("students").add(data);
    showPreview(data);
    loadData();
}

async function loadData() {
    const snap = await db.collection("students").orderBy("ts", "desc").get();
    records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTable(records);
}

function renderTable(data) {
    document.getElementById('historyBody').innerHTML = data.map(s => `<tr><td>${s.code}</td><td>${s.name}</td><td><button onclick="viewRecord('${s.id}')">View</button></td></tr>`).join('');
}

function viewRecord(id) { showPreview(records.find(r => r.id === id)); }

function showPreview(s) {
    document.getElementById('c-name').innerText = s.name;
    document.getElementById('c-level').innerText = `${s.level} in ${s.course}`;
    document.getElementById('c-date').innerText = formatDate(s.date);
    document.getElementById('c-id').innerText = s.certId;
    document.getElementById('c-sid').innerText = s.code;
    document.getElementById('certModal').style.display = 'block';
}

async function exportCert(type) {
    const el = document.getElementById('certificate');
    const canvas = await html2canvas(el, { scale: 3 });
    const img = canvas.toDataURL('image/jpeg', 1.0);
    if (type === 'jpg') {
        const a = document.createElement('a'); a.href = img; a.download = 'Cert.jpg'; a.click();
    } else {
        const pdf = new jspdf.jsPDF('l', 'mm', 'a4');
        pdf.addImage(img, 'JPEG', 0, 0, 297, 210);
        pdf.save('Cert.pdf');
    }
}

function closeModal() { document.getElementById('certModal').style.display = 'none'; }
window.onload = loadData;
