import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, increment, serverTimestamp, addDoc, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-analytics.js";

// v4.21.5: Final Stable Reconstruction (Restoring All Functions)
const firebaseConfig = {
    apiKey: "AIzaSyC7f4QH6CSRN6dAhGNm7P4kMHTv12mtdEo",
    authDomain: "designcheck-8be9f.firebaseapp.com",
    projectId: "designcheck-8be9f",
    storageBucket: "designcheck-8be9f.firebasestorage.app",
    messagingSenderId: "766391064183",
    appId: "1:766391064183:web:36c6d4368196e3db2bd872",
    measurementId: "G-R8PZGRMJKS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

isSupported().then(yes => { if (yes) getAnalytics(app); });

// Global State
let currentImageBase64 = null;
let lastAnalysisData = null;
let userState = {
    loggedIn: false,
    uid: null,
    email: null,
    credits: 0,
    isAdmin: false,
    licenseStatus: 'trial'
};

let userSettings = {
    language: 'Urdu',
    font: 'Outfit',
    fontSize: 16,
    theme: 'dark'
};

const FONT_LIST = [
    { name: 'Outfit', family: "'Outfit', sans-serif" },
    { name: 'Inter', family: "'Inter', sans-serif" },
    { name: 'Roboto', family: "'Roboto', sans-serif" },
    { name: 'Poppins', family: "'Poppins', sans-serif" },
    { name: 'Montserrat', family: "'Montserrat', sans-serif" },
    { name: 'Open Sans', family: "'Open Sans', sans-serif" },
    { name: 'Jameel Noori', family: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" },
    { name: 'Noto Sans Arabic', family: "'Noto Sans Arabic', sans-serif" },
    { name: 'Amiri', family: "'Amiri', serif" }
];

let masterKeys = { gemini: null, groq: null };
const ADMIN_EMAILS = ["ibraheemashshuraim@gmail.com", "ibraheemashshuraim.alt@gmail.com"];

const elements = {
    loginBtn: document.getElementById('loginBtn'),
    authContainer: document.getElementById('authContainer'),
    fileInput: document.getElementById('fileInput'),
    designPreview: document.getElementById('designPreview'),
    dropZone: document.getElementById('dropZone'),
    previewContainer: document.getElementById('previewContainer'),
    resultsPanel: document.getElementById('resultsPanel'),
    initialAnalysisMsg: document.getElementById('initialAnalysisMsg'),
    runAnalysisBtn: document.getElementById('runAnalysisBtn'),
    buyCreditsBtn: document.getElementById('buyCreditsBtn'),
    scanningModal: document.getElementById('scanningModal'),
    overallScoreText: document.getElementById('overallScoreText'),
    accessOut: document.getElementById('accessOut'),
    contrastOut: document.getElementById('contrastOut'),
    reportGoodOut: document.getElementById('reportGoodOut'),
    reportBadOut: document.getElementById('reportBadOut'),
    analysisResults: document.getElementById('analysisResults'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    groqKeyInput: document.getElementById('groqKeyInput'),
    profileEmail: document.getElementById('profileEmail'),
    profileEmailVal: document.getElementById('profileEmailVal'),
    profileCreditsModal: document.getElementById('profileCreditsModal'),
    saveStatusMsg: document.getElementById('saveStatusMsg'),
    profileAvatar: document.getElementById('profileAvatar'),
    profileIcon: document.getElementById('profileIcon'),
    modalAvatar: document.getElementById('modalAvatar'),
    modalIcon: document.getElementById('modalIcon'),
    adminPanelSection: document.getElementById('adminPanelSection'),
    profileDropdown: document.getElementById('profileDropdown'),
    personalizationModal: document.getElementById('personalizationModal'),
    adminUsersList: document.getElementById('adminUsersList'),
    colorPaletteOut: document.getElementById('colorPaletteOut'),
    fontsUsedOut: document.getElementById('fontsUsedOut'),
    detailedImprovementsOut: document.getElementById('detailedImprovementsOut'),
    pricingEstimationOut: document.getElementById('pricingEstimationOut'),
    clientImpressionOut: document.getElementById('clientImpressionOut'),
    historyList: document.getElementById('historyList'),
    resultsCard: document.querySelector('.results-card'),
    statusHeader: document.getElementById('statusHeader'),
    exportGroup: document.getElementById('exportGroup'),
    resultsTypographyWrapper: document.getElementById('results-typography-wrapper'),
};

setPersistence(auth, browserLocalPersistence);

// ================ AUTH FLOW ================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userState.loggedIn = true;
        userState.uid = user.uid;
        userState.email = user.email;
        userState.photoURL = user.photoURL;
        userState.isAdmin = ADMIN_EMAILS.includes(user.email);
        setupUserPersistence(user);
    } else {
        userState.loggedIn = false;
        updateUI();
    }
});

async function setupUserPersistence(user) {
    const userRef = doc(db, "users", user.uid);
    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            userState.credits = Number(data.credits || 0);
            userState.licenseStatus = data.licenseStatus || 'trial';
            window.userState = userState;
            updateUI();
        } else {
            setDoc(userRef, { email: user.email, credits: 10, licenseStatus: 'trial', joinDate: serverTimestamp() });
        }
    });
}

window.login = async () => {
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); } catch (e) { alert("Login failed."); }
};

window.logout = async () => { await signOut(auth); window.location.reload(); };

function updateUI() {
    if (userState.loggedIn) {
        elements.loginBtn.classList.add('hidden');
        elements.authContainer.classList.remove('hidden');
        elements.profileEmail.innerText = userState.email.split('@')[0];
        if (userState.photoURL) {
            elements.profileAvatar.src = userState.photoURL;
            elements.profileAvatar.classList.remove('hidden');
            elements.profileIcon.classList.add('hidden');
            if(elements.modalAvatar) {
                elements.modalAvatar.src = userState.photoURL;
                elements.modalAvatar.classList.remove('hidden');
            }
            if(elements.modalIcon) elements.modalIcon.classList.add('hidden');
        }
        if (elements.profileEmailVal) elements.profileEmailVal.innerText = userState.email;
        if (elements.profileCreditsModal) {
            elements.profileCreditsModal.innerText = userState.credits;
            elements.profileCreditsModal.style.color = userState.credits <= 0 ? "#ff5252" : "var(--neon-purple)";
        }
        if (userState.isAdmin) elements.adminPanelSection.classList.remove('hidden');
    } else {
        elements.loginBtn.classList.remove('hidden');
        elements.authContainer.classList.add('hidden');
    }
}

// ================ PROVIDER & KEYS ================
window.setProvider = (provider) => {
    localStorage.setItem('designcheck_provider', provider);
    document.querySelectorAll('.provider-tab').forEach(t => {
        t.style.border = '1px solid rgba(255,255,255,0.1)';
        t.style.background = 'rgba(255,255,255,0.03)';
        t.style.color = 'var(--text-muted)';
    });
    const activeBtn = document.getElementById(`tab-${provider}`);
    if (activeBtn) {
        activeBtn.style.border = '1px solid var(--neon-cyan)';
        activeBtn.style.background = 'rgba(0,229,255,0.1)';
        activeBtn.style.color = 'var(--neon-cyan)';
    }
    showToast(`AI Provider: ${provider.toUpperCase()}`, 'info');
};

window.saveApiKey = async () => {
    const key = elements.apiKeyInput.value;
    localStorage.setItem('gemini_api_key', key);
    if(userState.isAdmin) await setDoc(doc(db, "config", "gemini"), { key });
    showToast("Gemini Key محفوظ!", "success");
};

window.saveGroqApiKey = async () => {
    const key = elements.groqKeyInput.value;
    localStorage.setItem('groq_api_key', key);
    if(userState.isAdmin) await setDoc(doc(db, "config", "groq"), { key });
    showToast("Groq Key محفوظ!", "success");
};

// ================ ANALYSIS ================
window.runAnalysis = async () => {
    if (!currentImageBase64) return alert("ڈیزائن اپلوڈ کریں۔");
    if (userState.credits <= 0 && !userState.isAdmin && userState.licenseStatus !== 'approved') return toggleModal('profileDropdown', true);

    const runBtn = elements.runAnalysisBtn;
    const scanModal = elements.scanningModal;
    runBtn.disabled = true;
    scanModal.classList.remove('hidden');
    
    try {
        const compressed = await compressImage(currentImageBase64);
        const provider = localStorage.getItem('designcheck_provider') || 'gemini';
        let key, res;

        if (provider === 'groq') {
            key = localStorage.getItem('groq_api_key') || masterKeys.groq;
            const promptStr = `Analyze design. Language: ${userSettings.language}. Output JSON.`;
            res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: promptStr }],
                    temperature: 0.1,
                    response_format: { type: "json_object" }
                })
            });
        } else {
            key = localStorage.getItem('gemini_api_key') || masterKeys.gemini || "AIzaSyC7f4QH6CSRN6dAhGNm7P4kMHTv12mtdEo";
            const prompt = `Analyze this design. Language: ${userSettings.language}. Output JSON structure: {score, category, strengths[], improvements[], accessibility, contrast, detailed_improvements[{text, priority}], pricing{current, improved}, client_impression{level, feedback, warning}, colors[], fonts[]}`;
            // v4.21.5: Reliable Gemini Path
            res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: compressed.split(',')[1] } }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        let text = provider === 'groq' ? data.choices[0].message.content : data.candidates[0].content.parts[0].text;
        const resData = JSON.parse(text);
        displayResults(resData);
        lastAnalysisData = resData;

        if (userState.loggedIn) {
            saveAnalysisToHistory(resData, compressed);
            if (!userState.isAdmin && userState.licenseStatus !== 'approved') deductCredit();
        }
    } catch (e) { alert("مسلہ: " + e.message); }
    finally { runBtn.disabled = false; scanModal.classList.add('hidden'); }
};

function displayResults(data) {
    elements.initialAnalysisMsg.classList.add('hidden');
    elements.analysisResults.classList.remove('hidden');
    elements.overallScoreText.innerText = data.score;
    elements.accessOut.innerText = data.accessibility;
    elements.contrastOut.innerText = data.contrast;
    elements.reportGoodOut.innerHTML = (data.strengths||[]).map(s => `<div class="chip chip-success">${s}</div>`).join('');
    elements.reportBadOut.innerHTML = (data.improvements||[]).map(i => `<div class="chip chip-warning">${i}</div>`).join('');
    
    if (data.detailed_improvements) {
        elements.detailedImprovementsOut.innerHTML = data.detailed_improvements.map(i => `
            <div class="priority-item"><span>${i.text}</span><span class="priority-tag ${i.priority}">${i.priority === 'mandatory' ? 'لازمی' : 'اختیاری'}</span></div>
        `).join('');
    }
}

// ================ AI DESIGNER (MAGIC BUILD) ================
window.generateAIDesign = async () => {
    const promptValue = document.getElementById('aiDesignPrompt').value;
    if (!promptValue) return alert("ڈیزائن کی تفصیل لکھیں۔");

    const genBtn = document.getElementById('generateAIDesignBtn');
    genBtn.disabled = true;
    genBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جنریٹ ہو رہا ہے...';

    try {
        const provider = localStorage.getItem('designcheck_provider') || 'gemini';
        let key, res;
        const systemPrompt = "Create a Fabric.js canvas design. Return ONLY valid JSON: { objects: [], backgroundColor: '#fff', width: 800, height: 600 }. Objects: { type: 'i-text'|'rect'|'circle', left, top, fill, text, fontSize, fontFamily, width, height }.";

        if (provider === 'groq') {
            key = localStorage.getItem('groq_api_key') || masterKeys.groq;
            res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: promptValue }],
                    response_format: { type: "json_object" }
                })
            });
        } else {
            key = localStorage.getItem('gemini_api_key') || masterKeys.gemini;
            res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt + "\n\nPrompt: " + promptValue }] }], generationConfig: { responseMimeType: "application/json" } })
            });
        }

        const data = await res.json();
        const text = provider === 'groq' ? data.choices[0].message.content : data.candidates[0].content.parts[0].text;
        const designJson = JSON.parse(text);
        
        if (window.dc_canvas) {
            window.dc_canvas.loadFromJSON(designJson, () => {
                window.dc_canvas.renderAll();
                showToast("AI ڈیزائن تیار ہے!", "success");
            });
        }
    } catch (e) { alert("ڈیزائن جنریشن میں مسئلہ: " + e.message); }
    finally {
        genBtn.disabled = false;
        genBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> ڈیزائن جنریٹ کریں (Magic Build)';
    }
};

// ================ ADMIN & CLAIMS ================
window.saveEmailSettings = async () => {
    const pub = document.getElementById('emailPublicInput').value;
    const serv = document.getElementById('emailServiceInput').value;
    const temp = document.getElementById('emailTemplateInput').value;
    await setDoc(doc(db, "config", "emailjs"), { public: pub, service: serv, template: temp });
    showToast("ای میل سیٹنگز محفوظ کر لی گئیں!", "success");
};

window.submitCreditClaim = async () => {
    const name = document.getElementById('creditNameInput').value;
    const tid = document.getElementById('creditTidInput').value;
    if(!name || !tid) return alert("تمام خانے پُر کریں۔");
    await addDoc(collection(db, "claims"), { name, tid, uid: userState.uid, email: userState.email, status: 'pending', createdAt: serverTimestamp() });
    document.getElementById('claimStatus').style.display = 'block';
    toggleModal('creditClaimModal', false);
};

window.openAdminPanel = async () => {
    toggleModal('adminDashboardView', true);
    const snap = await getDocs(collection(db, "users"));
    elements.adminUsersList.innerHTML = snap.docs.map(u => {
        const d = u.data();
        return `<div class="admin-user-card">
            <span>${d.email}</span>
            <span>Credits: ${d.credits}</span>
            <button onclick="approveUser('${u.id}')" class="btn approve">Approve</button>
        </div>`;
    }).join("");
};

// ================ HELPERS ================
async function compressImage(base64) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 600; canvas.height = (img.height * 600) / img.width;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = base64;
    });
}

async function deductCredit() {
    await updateDoc(doc(db, "users", userState.uid), { credits: increment(-1), usedCredits: increment(1) });
}

async function saveAnalysisToHistory(results, image) {
    await addDoc(collection(db, "users", userState.uid, "history"), { ...results, image, createdAt: serverTimestamp() });
}

window.toggleModal = (id, show) => {
    const m = document.getElementById(id);
    if (m) show ? m.classList.remove('hidden') : m.classList.add('hidden');
};

window.showToast = (msg, type='info') => {
    const c = document.getElementById('ui-toast-container');
    if(!c) return;
    const t = document.createElement('div');
    t.className = `ui-toast ${type}`;
    t.innerHTML = `<i class="fa-solid fa-info-circle"></i> ${msg}`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
};

window.initPersonalization = () => {
    const saved = localStorage.getItem('designcheck_settings');
    if (saved) userSettings = JSON.parse(saved);
    if (userSettings.theme) { document.documentElement.setAttribute('data-theme', userSettings.theme); }
};

document.addEventListener('DOMContentLoaded', initPersonalization);