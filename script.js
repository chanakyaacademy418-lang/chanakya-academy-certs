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
    } else {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4');
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210);
        pdf.save(`${activeStudent.name}_Certificate.pdf`);
    }
}

function closeModal() { document.getElementById('previewModal').style.display = 'none'; }
window.onload = loadData;
      
