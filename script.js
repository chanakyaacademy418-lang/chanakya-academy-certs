// --- FIREBASE CONFIGURATION (Updated with your d6271 credentials) ---
const firebaseConfig = {
    apiKey: "AIzaSyDYgefl4iE5DMpSliinQcSL4Mb3xeApSWI",
    authDomain: "chanakya-certificates-d6271.firebaseapp.com",
    projectId: "chanakya-certificates-d6271",
    storageBucket: "chanakya-certificates-d6271.firebasestorage.app",
    messagingSenderId: "1007279855889",
    appId: "1:1007279855889:web:d40ff37629c48e22ea54b0"
};

// Initialize Firebase (Compatibility Mode)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
let records = [];

// --- FORMATTING HELPERS ---
const toTitleCase = (s) => s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const formatDate = (ds) => {
    const d = new Date(ds);
    const day = d.getDate();
    const m = d.toLocaleString('en-GB', { month: 'long' });
    const y = d.getFullYear();
    const sfx = (n) => { 
        if (n > 3 && n < 21) return 'th'; 
        switch (n % 10) { 
            case 1: return "st"; case 2: return "nd"; case 3: return "rd"; default: return "th"; 
        } 
    };
    return `${day}${sfx(day)} ${m} ${y}`;
};

// --- DATA HANDLING ---
async function addStudent() {
    const n = document.getElementById('name').value;
    const c = document.getElementById('code').value;
    const l = document.getElementById('level').value;
    const cr = document.getElementById('course').value;
    const d = document.getElementById('date').value;

    if (!n || !c || !l || !d) return alert("Please fill all fields!");

    const data = { 
        name: toTitleCase(n), 
        code: `CA${c.padStart(3, '0')}`, 
        level: l, 
        course: cr, 
        date: d, 
        certId: `CERT-2026-${c.padStart(3, '0')}`, 
        ts: Date.now() 
    };

    try {
        await db.collection("students").add(data);
        showPreview(data);
        loadData(); // Refresh history
        // Clear inputs
        document.getElementById('name').value = "";
        document.getElementById('code').value = "";
    } catch (error) {
        console.error("Error adding student: ", error);
        alert("Failed to save. Check your Firebase Rules!");
    }
}

async function loadData() {
    try {
        const snap = await db.collection("students").orderBy("ts", "desc").get();
        records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTable(records);
    } catch (error) {
        console.error("Error loading history: ", error);
    }
}

function renderTable(data) {
    const body = document.getElementById('historyBody');
    body.innerHTML = data.map(s => `
        <tr>
            <td>${s.code}</td>
            <td>${s.name}</td>
            <td><button onclick="viewRecord('${s.id}')">View</button></td>
        </tr>
    `).join('');
}

function viewRecord(id) { 
    const record = records.find(r => r.id === id);
    if (record) showPreview(record);
}

// --- SEARCH LOGIC ---
function searchRecords() {
    const term = document.getElementById('searchBox').value.toLowerCase();
    const filtered = records.filter(r => 
        r.name.toLowerCase().includes(term) || 
        r.code.toLowerCase().includes(term)
    );
    renderTable(filtered);
}

// --- CERTIFICATE PREVIEW ---
function showPreview(s) {
    document.getElementById('c-name').innerText = s.name;
    document.getElementById('c-level').innerText = `${s.level} in ${s.course}`;
    document.getElementById('c-date').innerText = formatDate(s.date);
    document.getElementById('c-id').innerText = s.certId;
    document.getElementById('c-sid').innerText = s.code;
    document.getElementById('certModal').style.display = 'block';
}

// --- EXPORT SYSTEM ---
async function exportCert(type) {
    const el = document.getElementById('certificate');
    // Scale 3 ensures high quality (3000px width)
    const canvas = await html2canvas(el, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const fileName = document.getElementById('c-name').innerText.replace(/\s+/g, '_');

    if (type === 'jpg') {
        const a = document.createElement('a'); 
        a.href = imgData; 
        a.download = `${fileName}_Certificate.jpg`; 
        a.click();
    } else {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4');
        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
        pdf.save(`${fileName}_Certificate.pdf`);
    }
}

// --- UI HELPERS ---
function closeModal() { 
    document.getElementById('certModal').style.display = 'none'; 
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('certModal');
    if (event.target == modal) {
        closeModal();
    }
}

window.onload = loadData;
