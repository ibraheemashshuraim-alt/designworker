import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, increment, serverTimestamp, addDoc, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-analytics.js";

// Firebase Configuration
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
    { name: 'Lato', family: "'Lato', sans-serif" },
    { name: 'Oswald', family: "'Oswald', sans-serif" },
    { name: 'Raleway', family: "'Raleway', sans-serif" },
    { name: 'Ubuntu', family: "'Ubuntu', sans-serif" },
    { name: 'Playfair Display', family: "'Playfair Display', serif" },
    { name: 'Merriweather', family: "'Merriweather', serif" },
    { name: 'Lora', family: "'Lora', serif" },
    { name: 'PT Serif', family: "'PT Serif', serif" },
    { name: 'EB Garamond', family: "'EB Garamond', serif" },
    { name: 'Roboto Slab', family: "'Roboto Slab', serif" },
    { name: 'Pacifico', family: "'Pacifico', cursive" },
    { name: 'Dancing Script', family: "'Dancing Script', cursive" },
    { name: 'Lobster', family: "'Lobster', cursive" },
    { name: 'Caveat', family: "'Caveat', cursive" },
    { name: 'Jameel Noori', family: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" },
    { name: 'Noto Sans Arabic', family: "'Noto Sans Arabic', sans-serif" },
    { name: 'Tajawal', family: "'Tajawal', sans-serif" },
    { name: 'Amiri', family: "'Amiri', serif" },
    { name: 'Cairo', family: "'Cairo', sans-serif" },
    { name: 'El Messiri', family: "'El Messiri', sans-serif" },
    { name: 'Lateef', family: "'Lateef', serif" },
    { name: 'Scheherazade', family: "'Scheherazade New', serif" },
    { name: 'Reem Kufi', family: "'Reem Kufi', sans-serif" },
    { name: 'Harmattan', family: "'Harmattan', sans-serif" }
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
        }

        if (elements.profileEmailVal) elements.profileEmailVal.innerText = userState.email;
        if (userState.photoURL && elements.modalAvatar) {
            elements.modalAvatar.src = userState.photoURL;
            elements.modalAvatar.classList.remove('hidden');
            if (elements.modalIcon) elements.modalIcon.classList.add('hidden');
        }

        if (elements.profileCreditsModal) {
            elements.profileCreditsModal.innerText = userState.credits;
            if (userState.credits <= 0) elements.profileCreditsModal.style.color = "#ff5252";
            else elements.profileCreditsModal.style.color = "var(--neon-purple)";
        }

        if (userState.isAdmin) elements.adminPanelSection.classList.remove('hidden');
    } else {
        elements.loginBtn.classList.remove('hidden');
        elements.authContainer.classList.add('hidden');
    }
}

// ================ PROVIDER MGMT ================
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

// ================ FILE HANDLING ================
elements.fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        currentImageBase64 = event.target.result;
        elements.designPreview.src = currentImageBase64;
        elements.previewContainer.classList.remove('hidden');
        elements.dropZone.classList.add('hidden');
    };
    reader.readAsDataURL(file);
};

// ================ ANALYSIS ================
window.runAnalysis = async () => {
    if (!currentImageBase64) return alert("ڈیزائن اپلوڈ کریں۔");
    const runBtn = elements.runAnalysisBtn;
    const scanModal = elements.scanningModal;
    runBtn.disabled = true;
    scanModal.classList.remove('hidden');
    
    try {
        const compressed = await compressImage(currentImageBase64);
        const provider = localStorage.getItem('designcheck_provider') || 'gemini';
        let key, res, payload;

        if (provider === 'groq') {
            key = localStorage.getItem('groq_api_key') || masterKeys.groq;
            const promptStr = `Analyze design. Language: ${userSettings.language}. Output JSON fixed schema.`;
            res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama3-70b-8192",
                    messages: [{ role: "user", content: promptStr }],
                    temperature: 0.1,
                    response_format: { type: "json_object" }
                })
            });
        } else {
            key = localStorage.getItem('gemini_api_key') || masterKeys.gemini || "AIzaSyC7f4QH6CSRN6dAhGNm7P4kMHTv12mtdEo";
            const prompt = `Analyze this design. Language: ${userSettings.language}. Output JSON: {score, category, strengths[], improvements[], accessibility, contrast, detailed_improvements[{text, priority}], pricing{current, improved}, client_impression{level, feedback, warning}, colors[], fonts[]}`;
            res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: compressed.split(',')[1] } }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });
        }

        const data = await res.json();
        
        // v4.21.2: Robust error handling for API responses
        if (data.error) {
            throw new Error(data.error.message || "API Error occurred.");
        }

        let text = "";
        try {
            if (provider === 'groq') {
                if (!data.choices || !data.choices[0]) throw new Error("Groq returned no choices.");
                text = data.choices[0].message.content;
            } else {
                if (!data.candidates || !data.candidates[0]) throw new Error("Gemini returned no candidates (Safety Block or Quota).");
                text = data.candidates[0].content.parts[0].text;
            }
        } catch (innerErr) {
            console.error("Parse Error:", data);
            throw new Error("AI response structure invalid. Check API keys/quota.");
        }

        const resData = JSON.parse(text);
        displayResults(resData);
        lastAnalysisData = resData;

        if (userState.loggedIn) {
            saveAnalysisToHistory(resData, compressed);
            if (!userState.isAdmin && userState.licenseStatus !== 'approved') deductCredit();
        }
    } catch (err) { 
        console.error("ANALYSIS ERROR:", err);
        alert("مسلہ: " + err.message); 
    }
    finally { if(runBtn) runBtn.disabled = false; if(scanModal) scanModal.classList.add('hidden'); }
};

function displayResults(data) {
    elements.initialAnalysisMsg.classList.add('hidden');
    elements.analysisResults.classList.remove('hidden');
    elements.overallScoreText.innerText = data.score;
    elements.accessOut.innerText = data.accessibility;
    elements.contrastOut.innerText = data.contrast;
    elements.reportGoodOut.innerHTML = data.strengths.map(s => `<div class="chip chip-success">${s}</div>`).join('');
    elements.reportBadOut.innerHTML = data.improvements.map(i => `<div class="chip chip-warning">${i}</div>`).join('');
    
    if (data.detailed_improvements) {
        elements.detailedImprovementsOut.innerHTML = data.detailed_improvements.map(i => `
            <div class="priority-item">
                <span>${i.text}</span>
                <span class="priority-tag ${i.priority}">${i.priority === 'mandatory' ? 'لازمی' : 'اختیاری'}</span>
            </div>
        `).join('');
    }
    
    if (data.pricing) {
        elements.pricingEstimationOut.innerHTML = `<div class="pricing-card">Cur: ${data.pricing.current}</div><div class="pricing-card">Imp: ${data.pricing.improved}</div>`;
    }
    
    if (data.client_impression) {
        elements.clientImpressionOut.innerHTML = `<div class="impression-container"><b>${data.client_impression.level}</b><p>${data.client_impression.feedback}</p></div>`;
    }

    if (data.colors) {
        elements.colorPaletteOut.innerHTML = data.colors.map(c => `<div class="color-swatch" style="background:${c}"></div>`).join('');
    }
}

async function deductCredit() {
    const userRef = doc(db, "users", userState.uid);
    await updateDoc(userRef, { credits: increment(-1), usedCredits: increment(1) });
}

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

// ================ HISTORY ================
async function saveAnalysisToHistory(results, image) {
    const historyRef = collection(db, "users", userState.uid, "history");
    await addDoc(historyRef, { ...results, image: image, createdAt: serverTimestamp() });
}

window.openHistory = async () => {
    toggleModal('historyModal', true);
    const q = query(collection(db, "users", userState.uid, "history"), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    elements.historyList.innerHTML = snap.docs.map(d => `<div class="history-card" onclick="restoreHistoryItem('${d.id}')"><img src="${d.data().image}" style="width:50px"><span>${d.data().score}</span></div>`).join('');
};

window.restoreHistoryItem = async (id) => {
    const snap = await getDoc(doc(db, "users", userState.uid, "history", id));
    if (snap.exists()) { displayResults(snap.data()); lastAnalysisData = snap.data(); toggleModal('historyModal', false); }
};

// ================ PERSONALIZATION ================
window.initPersonalization = () => {
    const saved = localStorage.getItem('designcheck_settings');
    if (saved) userSettings = JSON.parse(saved);
    updateFontSize(userSettings.fontSize, false);
    if (userSettings.theme) { document.documentElement.setAttribute('data-theme', userSettings.theme); updateThemeUI(userSettings.theme); }
    renderFontPicker();
    if (userSettings.font !== 'Outfit') applyFont(userSettings.font, false);
};

window.updateFontSize = (val, save = true) => {
    userSettings.fontSize = val;
    if (elements.resultsTypographyWrapper) elements.resultsTypographyWrapper.style.fontSize = `${val}px`;
    document.getElementById('fontSizeVal').innerText = `${val}px`;
    if (save) localStorage.setItem('designcheck_settings', JSON.stringify(userSettings));
};

window.toggleTheme = () => {
    const next = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    userSettings.theme = next;
    localStorage.setItem('designcheck_settings', JSON.stringify(userSettings));
    updateThemeUI(next);
};

function updateThemeUI(theme) {
    const text = document.getElementById('themeText');
    const icon = document.getElementById('themeIcon');
    if (text) text.innerText = theme === 'light' ? 'Light Mode' : 'Dark Mode';
    if (icon) icon.className = theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

window.renderFontPicker = () => {
    const grid = document.getElementById('fontPickerGrid');
    if (grid) grid.innerHTML = FONT_LIST.map(f => `<div class="font-card ${userSettings.font === f.name ? 'active-font' : ''}" style="font-family:${f.family}" onclick="applyFont('${f.name}')">${f.name}</div>`).join('');
};

window.applyFont = (name, save = true) => {
    userSettings.font = name;
    const font = FONT_LIST.find(f => f.name === name);
    if (font && elements.resultsTypographyWrapper) elements.resultsTypographyWrapper.style.fontFamily = font.family;
    renderFontPicker();
    if (save) localStorage.setItem('designcheck_settings', JSON.stringify(userSettings));
};

window.updateLanguageState = async () => {
    const target = document.getElementById('languageSelect').value;
    if (lastAnalysisData && userSettings.language !== target) {
        userSettings.language = target;
        await translateCurrentResults(target);
    }
    userSettings.language = target;
    localStorage.setItem('designcheck_settings', JSON.stringify(userSettings));
};

async function translateCurrentResults(target) {
    const status = document.getElementById('statusHeader');
    status.innerHTML = `<span class="status-indicator">Translating to ${target}...</span>`;
    try {
        const key = localStorage.getItem('gemini_api_key') || masterKeys.gemini || "AIzaSyC7f4QH6CSRN6dAhGNm7P4kMHTv12mtdEo";
        const prompt = `Translate this JSON to ${target}. Keys must stay same. JSON: ${JSON.stringify(lastAnalysisData)}`;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
        });
        const data = await res.json();
        const translated = JSON.parse(data.candidates[0].content.parts[0].text);
        displayResults(translated);
        lastAnalysisData = translated;
    } catch (e) { console.error("Translation fail"); }
    finally { status.innerHTML = ""; }
}

window.toggleModal = (id, show) => {
    const m = document.getElementById(id);
    if (m) show ? m.classList.remove('hidden') : m.classList.add('hidden');
};

window.showToast = (msg, type='info') => {
    const c = document.getElementById('ui-toast-container');
    const t = document.createElement('div');
    t.className = `ui-toast ${type}`;
    t.innerHTML = `<i class="fa-solid fa-info-circle"></i> ${msg}`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
};

document.addEventListener('DOMContentLoaded', initPersonalization);