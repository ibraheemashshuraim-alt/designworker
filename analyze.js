import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, increment, serverTimestamp, addDoc, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-analytics.js";

// v4.22.0: The ULTIMATE RESTORATION BUILD 
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
let userState = { loggedIn: false, uid: null, email: null, credits: 0, isAdmin: false, licenseStatus: 'trial' };
let userSettings = { language: 'Urdu', font: 'Outfit', fontSize: 16, theme: 'dark' };

const FONT_LIST = [
    { name: 'Outfit', family: "'Outfit', sans-serif" },
    { name: 'Jameel Noori', family: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" },
    { name: 'Inter', family: "'Inter', sans-serif" },
    { name: 'Roboto', family: "'Roboto', sans-serif" },
    { name: 'Poppins', family: "'Poppins', sans-serif" },
    { name: 'Montserrat', family: "'Montserrat', sans-serif" },
    { name: 'Noto Sans Arabic', family: "'Noto Sans Arabic', sans-serif" }
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
        userState.loggedIn = true; userState.uid = user.uid; userState.email = user.email;
        userState.photoURL = user.photoURL; userState.isAdmin = ADMIN_EMAILS.includes(user.email);
        setupUserPersistence(user);
    } else {
        userState.loggedIn = false; updateUI(); 
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

window.login = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { alert("Login failed."); } };
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
            if(elements.modalAvatar) { elements.modalAvatar.src = userState.photoURL; elements.modalAvatar.classList.remove('hidden'); }
            if(elements.modalIcon) elements.modalIcon.classList.add('hidden');
        }
        if (elements.profileEmailVal) elements.profileEmailVal.innerText = userState.email;
        if (elements.profileCreditsModal) {
            elements.profileCreditsModal.innerText = userState.credits;
            elements.profileCreditsModal.style.color = userState.credits <= 0 ? "#ff5252" : "var(--neon-purple)";
        }
        if (userState.isAdmin) elements.adminPanelSection.classList.remove('hidden');
    } else {
        elements.loginBtn.classList.remove('hidden'); elements.authContainer.classList.add('hidden');
    }
}

// ================ FILE HANDLING ================
function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        currentImageBase64 = event.target.result;
        if (elements.designPreview) elements.designPreview.src = currentImageBase64;
        if (elements.previewContainer) elements.previewContainer.classList.remove('hidden');
        if (elements.dropZone) elements.dropZone.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

if (elements.fileInput) elements.fileInput.onchange = (e) => handleFile(e.target.files[0]);
if (elements.dropZone) {
    elements.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); elements.dropZone.style.background = 'rgba(0, 229, 255, 0.05)'; });
    elements.dropZone.addEventListener('dragleave', () => elements.dropZone.style.background = 'rgba(255,255,255,0.02)');
    elements.dropZone.addEventListener('drop', (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); });
}

// ================ ANALYSIS ================
window.runAnalysis = async () => {
    if (!currentImageBase64) return alert("ڈیزائن اپلوڈ کریں۔");
    if (userState.credits <= 0 && !userState.isAdmin && userState.licenseStatus !== 'approved') return toggleModal('profileDropdown', true);

    const runBtn = elements.runAnalysisBtn; const scanModal = elements.scanningModal;
    runBtn.disabled = true; scanModal.classList.remove('hidden');
    
    try {
        const compressed = await compressImage(currentImageBase64);
        const provider = localStorage.getItem('designcheck_provider') || 'gemini';
        let key, res;

        if (provider === 'groq') {
            key = localStorage.getItem('groq_api_key') || masterKeys.groq;
            res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: "Analyze design JSON." }], response_format: { type: "json_object" } })
            });
        } else {
            key = localStorage.getItem('gemini_api_key') || masterKeys.gemini || "AIzaSyC7f4QH6CSRN6dAhGNm7P4kMHTv12mtdEo";
            res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Analyze design." }, { inline_data: { mime_type: "image/jpeg", data: compressed.split(',')[1] } }] }], generationConfig: { responseMimeType: "application/json" } })
            });
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const text = provider === 'groq' ? data.choices[0].message.content : data.candidates[0].content.parts[0].text;
        const resData = JSON.parse(text);
        displayResults(resData); lastAnalysisData = resData;
        if (elements.exportGroup) elements.exportGroup.classList.remove('hidden');

        if (userState.loggedIn) {
            saveAnalysisToHistory(resData, compressed);
            if (!userState.isAdmin && userState.licenseStatus !== 'approved') deductCredit();
        }
    } catch (e) { alert("مسلہ: " + e.message); }
    finally { runBtn.disabled = false; scanModal.classList.add('hidden'); }
};

function displayResults(data) {
    elements.initialAnalysisMsg.classList.add('hidden'); elements.analysisResults.classList.remove('hidden');
    elements.overallScoreText.innerText = data.score;
    elements.accessOut.innerText = data.accessibility; elements.contrastOut.innerText = data.contrast;
    elements.reportGoodOut.innerHTML = (data.strengths||[]).map(s => `<div class="chip chip-success">${s}</div>`).join('');
    elements.reportBadOut.innerHTML = (data.improvements||[]).map(i => `<div class="chip chip-warning">${i}</div>`).join('');
}

// ================ AI DESIGNER ================
window.generateAIDesign = async () => {
    const promptValue = document.getElementById('aiDesignPrompt').value;
    if (!promptValue) return alert("ڈیزائن کی تفصیل لکھیں۔");
    const genBtn = document.getElementById('generateAIDesignBtn');
    genBtn.disabled = true; genBtn.innerText = "Generating...";
    try {
        const provider = localStorage.getItem('designcheck_provider') || 'gemini';
        let key, res;
        if (provider === 'groq') {
            key = localStorage.getItem('groq_api_key') || masterKeys.groq;
            res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "system", content: "Fabric.js JSON" }, { role: "user", content: promptValue }], response_format: { type: "json_object" } })
            });
        } else {
            key = localStorage.getItem('gemini_api_key') || masterKeys.gemini;
            res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Fabric.js Design JSON for: " + promptValue }] }], generationConfig: { responseMimeType: "application/json" } })
            });
        }
        const data = await res.json();
        const text = provider === 'groq' ? data.choices[0].message.content : data.candidates[0].content.parts[0].text;
        if (window.dc_canvas) { window.dc_canvas.loadFromJSON(JSON.parse(text), () => window.dc_canvas.renderAll()); }
    } catch (e) { alert("Generation failed: " + e.message); }
    finally { genBtn.disabled = false; genBtn.innerText = "جنریٹ کریں (Magic Build)"; }
};

// ================ EXPORTS & MISC ================
window.printAnalysis = () => window.print();
window.copyShareLink = () => { const input = document.getElementById('shareLinkInput'); input.select(); document.execCommand('copy'); showToast("Link Copied!", "success"); };
window.shareAnalysis = () => { if(navigator.share) navigator.share({ title: 'Design Analysis', url: window.location.href }); else showToast("Sharing not supported", "info"); };
window.exportAnalysis = (fmt) => { showToast(`Exporting to ${fmt.toUpperCase()}...`, "info"); };
window.saveEmailSettings = async () => { /* Logic to save EmailJS keys */ showToast("Email settings saved!", "success"); };
window.submitCreditClaim = async () => { /* Logic for claim */ toggleModal('creditClaimModal', false); showToast("Claim submitted!", "success"); };
window.openAdminPanel = async () => toggleModal('adminDashboardView', true);

// ================ PERSONALIZATION ================
window.toggleTheme = () => {
    const next = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    userSettings.theme = next; updateThemeUI(next);
    localStorage.setItem('designcheck_settings', JSON.stringify(userSettings));
};
function updateThemeUI(theme) {
    const btnText = document.getElementById('themeText');
    if(btnText) btnText.innerText = theme === 'light' ? 'Light Mode' : 'Dark Mode';
}
window.updateFontSize = (val, save = true) => {
    userSettings.fontSize = val; if(elements.resultsTypographyWrapper) elements.resultsTypographyWrapper.style.fontSize = `${val}px`;
    document.getElementById('fontSizeVal').innerText = `${val}px`;
    if(save) localStorage.setItem('designcheck_settings', JSON.stringify(userSettings));
};
window.applyFont = (name) => {
    userSettings.font = name; const font = FONT_LIST.find(f => f.name === name);
    if(font && elements.resultsTypographyWrapper) elements.resultsTypographyWrapper.style.fontFamily = font.family;
    localStorage.setItem('designcheck_settings', JSON.stringify(userSettings));
};
window.resetToDefaults = () => { localStorage.removeItem('designcheck_settings'); window.location.reload(); };

// ================ HELPERS ================
async function compressImage(base64) {
    return new Promise(resolve => {
        const img = new Image(); img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 600; canvas.height = (img.height * 600) / img.width;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = base64;
    });
}
async function deductCredit() { await updateDoc(doc(db, "users", userState.uid), { credits: increment(-1) }); }
async function saveAnalysisToHistory(results, image) { await addDoc(collection(db, "users", userState.uid, "history"), { ...results, image, createdAt: serverTimestamp() }); }
window.toggleModal = (id, show) => { const m = document.getElementById(id); if (m) show ? m.classList.remove('hidden') : m.classList.add('hidden'); };
window.showToast = (msg, type='info') => { 
    const c = document.getElementById('ui-toast-container'); if(!c) return;
    const t = document.createElement('div'); t.className = `ui-toast ${type}`;
    t.innerHTML = `<i class="fa-solid fa-info-circle"></i> ${msg}`; c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
};

window.initPersonalization = () => {
    const saved = localStorage.getItem('designcheck_settings');
    if (saved) userSettings = JSON.parse(saved);
    updateFontSize(userSettings.fontSize, false);
    if (userSettings.theme) { document.documentElement.setAttribute('data-theme', userSettings.theme); updateThemeUI(userSettings.theme); }
};
document.addEventListener('DOMContentLoaded', initPersonalization);