/* v5.6.0: Global Bypass & Stable History */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, increment, serverTimestamp, addDoc, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-analytics.js";
// import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai"; // Removed unused
window.addEventListener('error', (e) => {
    console.error("GLOBAL SCRIPT ERROR (v4.9.7):", e);
});
console.log("Analyze script loading started...");
// alert("DesignCheck Script v3.9 Loaded! (Please confirm)"); // Removed

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Analytics (Optional but requested)
isSupported().then(yes => {
    if (yes) getAnalytics(app);
});

// Global State
let currentImageBase64 = null;
let lastAnalysisData = null; // v4.22.2: Persisted for re-translation
let userState = {
    loggedIn: false,
    uid: null,
    email: null,
    credits: 0,
    usedCredits: 0,
    isAdmin: false,
    licenseStatus: 'none',
    paymentStatus: 'none',
    packageType: 'Free'
};
let currentSelectedPackage = null; // v5.1.0: Stores intended purchase context

// v4.20.0: Personalization Settings
let userSettings = {
    language: 'Urdu',
    font: 'Outfit',
    fontSize: 16
};

// v5.6.0: Global Bypass State (Admin Controlled)
window.globalConfig = {
    allFeaturesEnabled: false
};

// ================ UI REGISTRY (v5.6.0 SAFETY) ================
// These MUST be declared at the top before any listeners use them to prevent ReferenceError.
const elements = {
    loginBtn: document.getElementById('loginBtn'),
    authContainer: document.getElementById('authContainer'),
    fileInput: document.getElementById('fileInput'),
    designPreview: document.getElementById('designPreview'),
    dropZone: document.getElementById('dropZone'),
    previewContainer: document.getElementById('previewContainer'),
    workspaceActions: document.getElementById('workspaceActions'),
    resultsPanel: document.getElementById('resultsPanel'),
    initialAnalysisMsg: document.getElementById('initialAnalysisMsg'),
    runAnalysisBtn: document.getElementById('runAnalysisBtn'),
    buyCreditsBtn: document.getElementById('buyCreditsBtn'),
    scanningModal: document.getElementById('scanningModal'),
    buyCreditsSection: document.getElementById('buyCreditsSection'),
    overallScoreText: document.getElementById('overallScoreText'),
    accessOut: document.getElementById('accessOut'),
    contrastOut: document.getElementById('contrastOut'),
    reportGoodOut: document.getElementById('reportGoodOut'),
    reportBadOut: document.getElementById('reportBadOut'),
    analysisResults: document.getElementById('analysisResults'),
    apiSettingsModal: document.getElementById('apiSettingsModal'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    profileEmail: document.getElementById('profileEmail'),
    profileEmailVal: document.getElementById('profileEmailVal'),
    profileCredits: document.getElementById('profileCredits'),
    profileCreditsModal: document.getElementById('profileCreditsModal'),
    saveStatusMsg: document.getElementById('saveStatusMsg'),
    profileAvatar: document.getElementById('profileAvatar'),
    profileIcon: document.getElementById('profileIcon'),
    modalAvatar: document.getElementById('modalAvatar'),
    modalIcon: document.getElementById('modalIcon'),
    adminPanelSection: document.getElementById('adminPanelSection'),
    profileDropdown: document.getElementById('profileDropdown'),
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
    loginGate: document.getElementById('loginGate'),
    loginLoading: document.getElementById('loginLoading'),
    loginMain: document.getElementById('loginMain')
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
    { name: 'Harmattan', family: "'Harmattan', sans-serif" },
    { name: 'Work Sans', family: "'Work Sans', sans-serif" },
    { name: 'Kanit', family: "'Kanit', sans-serif" },
    { name: 'Quicksand', family: "'Quicksand', sans-serif" },
    { name: 'Heebo', family: "'Heebo', sans-serif" },
    { name: 'Josefin Sans', family: "'Josefin Sans', sans-serif" },
    { name: 'Archivo', family: "'Archivo', sans-serif" },
    { name: 'Fira Sans', family: "'Fira Sans', sans-serif" },
    { name: 'Source Sans Pro', family: "'Source Sans Pro', sans-serif" },
    { name: 'Inconsolata', family: "'Inconsolata', monospace" },
    { name: 'Zilla Slab', family: "'Zilla Slab', serif" },
    { name: 'Bitter', family: "'Bitter', serif" },
    { name: 'Arvo', family: "'Arvo', serif" },
    { name: 'Crimson Text', family: "'Crimson Text', serif" },
    { name: 'Righteous', family: "'Righteous', cursive" },
    { name: 'Comfortaa', family: "'Comfortaa', cursive" },
    { name: 'Fredoka One', family: "'Fredoka One', cursive" },
    { name: 'Indie Flower', family: "'Indie Flower', cursive" },
    { name: 'Permanent Marker', family: "'Permanent Marker', cursive" },
    { name: 'Abril Fatface', family: "'Abril Fatface', serif" },
    { name: 'Libre Baskerville', family: "'Libre Baskerville', serif" }
];

const ADMIN_EMAILS = ["ibraheemashshuraim@gmail.com", "ibraheemashshuraim.alt@gmail.com", "ibraheemashshuraim-alt@gmail.com"];

// v4.18.17: Master API Keys (Cloud Fallback)
let masterKeys = { gemini: null, groq: null };

// v5.6.4: Refined Master Key Fetch with Auto-Retry for Guests
async function fetchMasterKeys(retryCount = 0) {
    try {
        const snap = await getDoc(doc(db, "config", "api_keys"));
        if (snap.exists()) {
            const data = snap.data();
            masterKeys = {
                gemini: data.gemini || data.gemini_master || null,
                groq: data.groq || data.groq_master || null
            };
            console.log("System: Master Keys loaded from config/api_keys (v5.6.5).");
        } else {
            console.warn("System Warning: Master Keys document is missing in config/api_keys.");
            if (retryCount < 3) {
                console.log(`Retrying fetchMasterKeys (${retryCount + 1})...`);
                setTimeout(() => fetchMasterKeys(retryCount + 1), 3000);
            }
        }
    } catch (e) { 
        console.error("Master Keys access restricted (Check Firestore Rules):", e); 
        if (retryCount < 2) {
            setTimeout(() => fetchMasterKeys(retryCount + 1), 3000);
        }
    }
}
fetchMasterKeys();

// v5.6.0: Global Bypass Monitor (Safe now because 'elements' is ready)
onSnapshot(doc(db, "config", "global_features"), (snap) => {
    try {
        if (snap.exists()) {
            window.globalConfig = snap.data();
            console.log("System: Global Features updated ->", window.globalConfig);
            if (typeof updateUI === 'function') updateUI();
            if (typeof window.checkPremiumAccess === 'function') window.checkPremiumAccess();
        }
    } catch (e) { console.warn("Snapshot processing error:", e); }
}, (err) => {
    console.warn("Global Features access restricted (normal for guests)");
});

// Ensure session persistence
setPersistence(auth, browserLocalPersistence);

// Manual Event Binding for Module Compatibility
if (elements.loginBtn) {
    elements.loginBtn.onclick = () => window.login();
}

// ================ AUTH FLOW ================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userState.loggedIn = true;
        userState.uid = user.uid;
        userState.email = user.email;
        userState.photoURL = user.photoURL;
        userState.isAdmin = ADMIN_EMAILS.includes(user.email);
        
        setupUserPersistence(user);
        updateUI();
    } else {
        userState.loggedIn = false;
        userState.uid = null;
        userState.photoURL = null;
        updateUI();
    }
});

// v4.19.1: Toast System
window.showToast = (message, type = 'info') => {
    const container = document.getElementById('ui-toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `ui-toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
};

// v4.19.0: 'Best Designs' & Email Notifications Logic
let emailSettings = { public: '', service: '', template: '' };

window.saveEmailSettings = async () => {
    const pub = document.getElementById('emailPublicInput').value.trim();
    const ser = document.getElementById('emailServiceInput').value.trim();
    const tem = document.getElementById('emailTemplateInput').value.trim();
    
    if (!userState.isAdmin) return;
    try {
        const configRef = doc(db, "config", "email_settings");
        await setDoc(configRef, { public: pub, service: ser, template: tem });
        emailSettings = { public: pub, service: ser, template: tem };
        if (typeof emailjs !== 'undefined' && pub) emailjs.init(pub);
        
        const status = document.getElementById('emailSaveStatus');
        status.style.display = 'block';
        setTimeout(() => status.style.display = 'none', 3000);
        showToast("ای میل سیٹنگز محفوظ کر لی گئیں", "success");
    } catch (e) { console.error(e); showToast("سیٹنگز سیو کرنے میں مسئلہ"); }
};

async function checkAndSaveBestDesign(results, image64) {
    if (!results || results.score < 80) return;
    
    // v5.6.1: Global Bypass or Individual Email Toggle Check
    const isGlobalBypass = window.globalConfig?.allFeaturesEnabled === true;
    const individualEmail = window.userState?.featuresEnabled?.email === true;
    
    // Manual Override bypass (Admin/Paid/Email Toggle/Global Bypass)
    const isSpecialCase = window.userState?.isAdmin || paidTiers.includes(userTier) || individualEmail || isGlobalBypass;
    
    if (!isSpecialCase) {
        console.log("v5.6.1: Best Design feature locked (Free tier + All Bypasses OFF).");
        return; 
    }

    try {
        const bestDesignsRef = collection(db, "best_designs");
        await addDoc(bestDesignsRef, {
            score: results.score,
            category: results.category || "General",
            strengths: results.strengths,
            imageUrl: image64, 
            userName: userState.email.split('@')[0],
            userEmail: userState.email,
            timestamp: serverTimestamp()
        });
        showToast("مبارک ہو! ڈیزائن 'Best Designs' میں شامل کر لیا گیا", "success");
        sendSuccessEmail(userState.email, results.category, results.score);
    } catch (e) { console.error("Best Design Save Error:", e); }
}

async function sendSuccessEmail(email, category, score) {
    if (typeof emailjs === 'undefined' || !emailSettings.service || !emailSettings.template) {
        console.warn("Email offset: EmailJS Settings missing.");
        return;
    }
    const params = {
        to_email: email,
        category: category,
        score: score,
        message: "مبارک ہو! آپ کا ڈیزائن 'Premium Example' کے طور پر منتخب ہو گیا ہے۔"
    };
    emailjs.send(emailSettings.service, emailSettings.template, params)
        .then(() => showToast("کامیابی کی ای میل بھیج دی گئی", "success"))
        .catch(err => console.error("EmailJS Error:", err));
}

async function handleExpertSuggestion(results) {
    if (!results) return;
    
    const section = document.getElementById('expertSuggestionSection');
    const img = document.getElementById('expertExampleImg');
    const strengths = document.getElementById('expertExampleStrengths');
    
    if (section) section.classList.add('hidden'); // Reset

    // v5.6.0: Global Bypass Check
    const isGlobalBypass = window.globalConfig?.allFeaturesEnabled === true;
    
    // v5.0.0: Package-Based Permission
    // Pro, Premium, Business, and Admin can see suggestions if score < 80
    const hasPackage = ['Pro', 'Premium', 'Business'].includes(userState.packageType) || userState.isAdmin || isGlobalBypass;
    const isPremium = userState.credits > 0 || userState.licenseStatus === 'approved' || hasPackage;
    
    if (!isPremium || results.score >= 80) return; // Only suggest for < 80 scores

    try {
        const category = results.category || "General";
        const bestDesignsRef = collection(db, "best_designs");
        
        // --- STEP 1: Try Categorized Query ---
        let q = query(bestDesignsRef, where("category", "==", category), orderBy("score", "desc"), limit(1));
        let snap = await getDocs(q).catch(() => null); // Catch potential index errors
        
        // --- STEP 2: Fallback to Overall Top Designs ---
        if (!snap || snap.empty) {
            console.log("No category suggestion found, pulling top designs...");
            q = query(bestDesignsRef, orderBy("score", "desc"), limit(1));
            snap = await getDocs(q);
        }
        
        if (!snap.empty) {
            const best = snap.docs[0].data();
            if (section && img && strengths) {
                img.src = best.imageUrl;
                strengths.innerText = "اس بہترین ڈیزائن کی خوبیاں: " + (best.strengths ? best.strengths.join(", ") : "بہترین کمپوزیشن اور کلر تھیم۔");
                section.classList.remove('hidden');
                console.log("Expert Suggestion displayed.");
            }
        }
    } catch (e) { 
        console.warn("Suggestion system error:", e); 
    }
}

async function setupUserPersistence(user) {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    
    // Listen for real-time updates
    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Firestore Data Received:", data);
            
            // Critical merge
            let credits = Number(data.credits !== undefined ? data.credits : 0);
            
            // HEAL: If credits are negative, reset to 0 in Firestore (auto-fix)
            if (credits < 0) {
                credits = 0;
                updateDoc(userRef, { credits: 0 }).catch(e => console.error("Heal failed:", e));
            }

            userState.credits = credits;
            userState.usedCredits = data.usedCredits || 0;
            userState.licenseStatus = data.licenseStatus || 'none';
            userState.paymentStatus = data.paymentStatus || 'none';
            userState.loggedIn = true;
            userState.email = user.email;
            userState.uid = user.uid;
            userState.photoURL = user.photoURL;
            userState.isAdmin = ADMIN_EMAILS.includes(user.email);
            userState.packageType = data.packageType || 'Free';
            userState.requestedPackage = data.requestedPackage || null;
            userState.featuresEnabled = data.featuresEnabled || {}; // v5.6.2: Sync Manual Bypasses

            // v4.19.2: Globally Load Email Settings (for everyone to use admin keys)
            getDoc(doc(db, "config", "email_settings")).then(snap => {
                if (snap.exists()) {
                    const dat = snap.data();
                    emailSettings = dat;
                    if (userState.isAdmin) {
                        document.getElementById('emailPublicInput').value = dat.public || '';
                        document.getElementById('emailServiceInput').value = dat.service || '';
                        document.getElementById('emailTemplateInput').value = dat.template || '';
                    }
                    if (typeof emailjs !== 'undefined' && dat.public) emailjs.init(dat.public);
                }
            });
            
            // v4.10.0: Reactive Sync to Global window (CRITICAL)
            window.userState = userState; 
            if (typeof window.checkPremiumAccess === 'function') {
                window.checkPremiumAccess();
            }
            updateUI();
        } else {
            // New User: Initialize with 10 credits
            const newUser = {
                email: user.email,
                credits: 10,
                usedCredits: 0,
                joinDate: serverTimestamp(),
                lastActive: serverTimestamp(),
                status: 'active',
                licenseStatus: 'none',
                paymentStatus: 'none',
                packageType: 'Free'
            };
            setDoc(userRef, newUser).catch(err => console.error("User init error:", err));
        }
    }, (error) => {
        console.error("Snapshot Error:", error);
    });
}

window.login = async () => {
    const provider = new GoogleAuthProvider();
    // Force account selection so user can switch accounts
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
        await signInWithPopup(auth, provider);
    } catch (e) {
        console.error("Login Error:", e);
        alert("لاگ ان میں مسئلہ پیش آیا۔");
    }
};

window.logout = async () => {
    try {
        await signOut(auth);
        window.location.reload(); 
    } catch (e) {
        console.error("Logout Error:", e);
    }
};

// ================ HISTORY LOGIC (v4.7.0) ================
async function saveAnalysisToHistory(results, image) {
    if (!userState.uid) return;
    try {
        const historyRef = collection(db, "users", userState.uid, "history");
        await addDoc(historyRef, {
            ...results,
            image: image,
            createdAt: serverTimestamp()
        });
        console.log("Analysis saved to history.");
    } catch (e) {
        console.error("Error saving history:", e);
    }
}

window.openHistory = async () => {
    toggleModal('historyModal', true);
    elements.historyList.innerHTML = "<div class='spinner' style='margin: 30px auto;'></div>";
    
    // v5.6.1: Ensure we have a valid UID for the active user (Admin or Regular)
    // v5.6.2: Added retry-logic for fresh refreshes
    let activeUid = userState.uid || auth.currentUser?.uid;

    if (!activeUid) {
        // Fallback: wait 1s and try again if auth is still initializing
        setTimeout(() => {
            activeUid = userState.uid || auth.currentUser?.uid;
            if (activeUid) window.openHistory();
        }, 1000);
        elements.historyList.innerHTML = "<p style='text-align:center; padding: 20px;'>لوڈنگ ہو رہی ہے، انتظار کریں...</p>";
        return;
    }

    try {
        // v5.4.6: Client-side sort to avoid Firestore index issues
        const historyRef = collection(db, "users", activeUid, "history");
        const snapshot = await getDocs(historyRef);
        
        if (snapshot.empty) {
            elements.historyList.innerHTML = "<p style='text-align:center; padding: 20px; opacity:0.5;'>کوئی ریکارڈ دستیاب نہیں ہے۔</p>";
            return;
        }

        // Sort client-side by createdAt descending (v5.6.1: robust sort)
        const docs = [];
        snapshot.forEach(docSnap => docs.push({ id: docSnap.id, ...docSnap.data() }));
        docs.sort((a, b) => {
            const timeA = a.createdAt?.seconds || (Date.now() / 1000);
            const timeB = b.createdAt?.seconds || (Date.now() / 1000);
            return timeB - timeA;
        });

        let html = "";
        docs.forEach(data => {
            const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : "زیر التوا";
            const score = data.score || '--';
            const scoreColor = score >= 80 ? 'var(--success-green)' : score >= 50 ? '#ffd700' : '#ff5252';
            html += `
                <div class="history-card">
                    <img src="${data.image || ''}" loading="lazy" class="history-thumb" alt="Preview" onerror="this.style.display='none'">
                    <div class="history-meta">
                        <span style="font-size:0.75rem; color: var(--text-muted);">${date}</span>
                        <span style="font-size:1rem; font-weight:800; color:${scoreColor};">${score}</span>
                    </div>
                    <div class="history-actions">
                        <button class="history-btn view-hist-btn" onclick="restoreHistoryItem('${data.id}')"><i class="fa-solid fa-eye"></i> View</button>
                        <button class="history-btn del-hist-btn" onclick="deleteHistoryItem('${data.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        });
        
        elements.historyList.innerHTML = html || "<p style='text-align:center; padding: 20px; opacity:0.5;'>آئٹمز ڈسپلے کرنے میں مسئلہ ہوا۔</p>";
    } catch (e) {
        console.error("History fetch error:", e);
        elements.historyList.innerHTML = "<p style='color:red; text-align:center;'>تاریخ لوڈ کرنے میں مسئلہ ہوا۔</p>";
    }
};

window.restoreHistoryItem = async (docId) => {
    try {
        const docRef = doc(db, "users", userState.uid, "history", docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            currentImageBase64 = data.image;
            elements.designPreview.src = currentImageBase64;
            elements.previewContainer.classList.remove('hidden');
            elements.dropZone.classList.add('hidden');
            
            displayResults(data);
            toggleModal('historyModal', false);
            toggleModal('profileDropdown', false);
            window.scrollTo({ top: elements.resultsPanel.offsetTop - 100, behavior: 'smooth' });
        }
    } catch (e) {
        alert("ڈیٹا بحال کرنے میں مسئلہ ہوا۔");
    }
};

window.deleteHistoryItem = async (docId) => {
    if (!confirm("کیا آپ اس ریکارڈ کو مستقل طور پر حذف کرنا چاہتے ہیں؟")) return;
    try {
        const docRef = doc(db, "users", userState.uid, "history", docId);
        await deleteDoc(docRef);
        openHistory(); // Refresh list
    } catch (e) {
        alert("ڈیٹا حذف کرنے میں مسئلہ ہوا۔");
    }
};

// --- VERSION TAG ---
window.DESIGN_VERSION = "5.6.4";
console.log("DesignCheck Engine: v5.6.4 (Master Fix) Loaded");

// v4.18.12: Gemini API Diagnostic Manager
window.showAiDiagnosticModal = (message, errorRaw) => {
    const modal = document.getElementById('diagnosticModal');
    const title = document.getElementById('diagTitle');
    const body = document.getElementById('diagBody');
    const fixBtn = document.getElementById('diagFixBtn');
    
    if (!modal) return;

    // Detect technical details
    let projectID = "YOUR_PROJECT_ID";
    const projectMatch = errorRaw?.match(/project ([0-9]+)/i);
    if (projectMatch) projectID = projectMatch[1];
    
    const isBlocked = errorRaw?.toLowerCase().includes("blocked");
    const isQuota = errorRaw?.includes("429") || errorRaw?.toLowerCase().includes("quota");
    const fixLink = isQuota ? "https://aistudio.google.com/app/apikey" : `https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=${projectID}`;
    
    title.innerText = isQuota ? "Gemini Quota ختم ہو گیا ہے" : (isBlocked ? "API رسائی بلاک ہے" : "Gemini API ایکٹیویشن ضروری ہے");
    body.innerHTML = `
        <p style="margin-bottom:10px;"><b>وجہ:</b> ${isQuota ? "آپ کا فری ٹائر کوٹہ ختم ہو گیا ہے۔" : (isBlocked ? "آپ کی API Key یا پراجیکٹ سے ریکوئسٹس بلاک ہو رہی ہیں۔" : "گوگل پراجیکٹ میں ابھی Gemini API فعال نہیں کی گئی ہے۔")}</p>
        <p><b>حل:</b> ${isQuota ? "اپنی ذاتی Google AI Studio API Key استعمال کریں یا تھوڑی دیر انتظار کریں۔" : "نیچے دیے گئے بٹن پر کلک کریں اور API کو 'Enable' کریں یا سیٹنگز چیک کریں۔"}</p>
        <div class="diag-error-box">ERROR: ${message}</div>
    `;
    
    fixBtn.href = fixLink;
    fixBtn.innerHTML = isQuota ? "<i class='fa-solid fa-key'></i> Get Personal API Key" : "<i class='fa-solid fa-bolt'></i> Enable API Now (Fix)";
    
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

// v4.9.6: Export Local Module State to Global Window (CRITICAL FIX)
window.userState = userState;

// ================ REFERENCE IMAGE UPLOAD ================
let aiReferenceImageBase64 = null;

const refInput = document.getElementById('aiRefInput');
if (refInput) {
    refInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const rawBase64 = event.target.result;
            aiReferenceImageBase64 = await compressImage(rawBase64, 400, 400); // Compress small for AI
            
            document.getElementById('aiRefPreviewBox').classList.remove('hidden');
            document.getElementById('aiRefThumb').src = aiReferenceImageBase64;
            const browseBtn = document.querySelector('.ai-ref-container-small .browse-btn');
            if (browseBtn) browseBtn.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    };
}

window.clearAiRefImage = () => {
    aiReferenceImageBase64 = null;
    document.getElementById('aiRefInput').value = '';
    document.getElementById('aiRefPreviewBox').classList.add('hidden');
    const browseBtn = document.querySelector('.ai-ref-container-small .browse-btn');
    if (browseBtn) browseBtn.classList.remove('hidden');
};

// ================ PREMIUM AI DESIGNER ================
window.generateAIDesign = async () => {
    const promptArea = document.getElementById('aiDesignPrompt');
    if (!promptArea) return;
    const prompt = promptArea.value.trim();
    if (!prompt) return alert("براہ کرم بتائیں کہ آپ کیا بنانا چاہتے ہیں۔");

    // v4.18.3: Robust Auth Check
    if (!window.userState || !window.userState.uid) {
        alert("براہ کرم پہلے لاگ ان کریں۔");
        return;
    }

    const canAccess = window.userState.isAdmin || window.userState.licenseStatus === 'approved' || (Number(window.userState.credits || 0) >= 5);
    if (!canAccess) {
        alert("اس فیچر کے لیے کم از کم 5 کریڈٹس کی ضرورت ہے۔ براہ کرم پریمیم لائسنس خریدیں یا کریڈٹس لوڈ کریں۔");
        return toggleModal('profileDropdown', true);
    }

    const genBtn = document.getElementById('generateAIDesignBtn');
    const codeInput = document.getElementById('aiDesignCodeInput');
    
    if (genBtn) {
        genBtn.disabled = true;
        genBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> جنریٹ ہو رہا ہے...";
    }
    if (codeInput) codeInput.value = "AI ڈیزائن کر رہا ہے انتظار کریں...";

    const scanModal = document.getElementById('scanningModal');
    if (scanModal) {
        scanModal.classList.remove('hidden');
        scanModal.querySelector('p').innerText = "AI ڈیزائن تیار کر رہا ہے...";
    }

    try {
        const selectedProvider = window.getSelectedProvider?.() || 'gemini';
        
        // ===== GROQ (Free) PATH =====
        if (selectedProvider === 'groq') {
            const groqKey = getGroqApiKey();
            if (!groqKey) {
                if (scanModal) scanModal.classList.add('hidden');
                if (genBtn) { genBtn.disabled = false; genBtn.innerHTML = "<i class='fa-solid fa-wand-magic-sparkles'></i> ڈیزائن جنریٹ کریں"; }
                return alert("براہ کرم پہلے سیٹنگز میں Groq API Key سیو کریں۔");
            }

            const groqPrompt = `You are a World-Class Creative Director. Architect a premium graphic design for: "${prompt}"

Return ONLY valid JSON: { "objects": [...] } — NO markdown, NO extra text.
Each object must be a valid Fabric.js object with these properties:
- Rectangles: { "type": "rect", "left": N, "top": N, "width": N, "height": N, "fill": "#color", "rx": 20, "ry": 20 }
- Circles: { "type": "circle", "left": N, "top": N, "radius": N, "fill": "#color" }
- Text: { "type": "textbox", "text": "...", "left": N, "top": N, "fontSize": N, "fill": "#color", "fontFamily": "Outfit", "fontWeight": "bold" }
Canvas is 800x600. Use originX: "center", originY: "center" for positioning.`;

            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: groqPrompt }],
                    temperature: 0.7,
                    response_format: { type: 'json_object' }
                })
            });

            const groqData = await groqRes.json();
            if (!groqRes.ok || groqData.error) {
                const errMsg = groqData.error?.message || groqData.message || JSON.stringify(groqData.error || groqData);
                throw new Error(`Groq API خطا: ${errMsg}`);
            }
            const groqText = groqData.choices?.[0]?.message?.content;
            if (!groqText) throw new Error('Groq نے کوئی جواب نہیں دیا۔');
            
            const cleanGroq = groqText.replace(/```json|```/g, '').trim();
            if (codeInput) codeInput.value = cleanGroq;
            if (scanModal) scanModal.classList.add('hidden');
            setTimeout(() => { if (window.loadDesignFromCode) window.loadDesignFromCode(cleanGroq); }, 50);

            if (!window.userState.isAdmin && window.userState.licenseStatus !== 'approved') {
                const userRef = doc(db, "users", window.userState.uid);
                await updateDoc(userRef, { credits: increment(-5), usedCredits: increment(5) });
            }
            return; 
        }

        // ===== GEMINI PATH =====
        const keyToUse = getApiKey() || (masterKeys && masterKeys.gemini);
        
        if (!keyToUse) {
            if (scanModal) scanModal.classList.add('hidden');
            if (genBtn) { genBtn.disabled = false; genBtn.innerHTML = "<i class='fa-solid fa-wand-magic-sparkles'></i> ڈیزائن جنریٹ کریں"; }
            return alert("سسٹم ابھی دستیاب نہیں ہے (Gemini Key Missing)۔ ٹیم کو ٹیکسٹ کریں یا اپنی API Key سیٹ کریں۔");
        }
        
        let modelCandidates = ["gemini-1.5-flash", "gemini-1.5-flash-latest"];
        try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToUse}`);
            const listData = await listRes.json();
            if (listData.models && listData.models.length > 0) {
                const fetchedModels = listData.models
                    .filter(m => m.supportedGenerationMethods.includes("generateContent") && m.name.includes("flash"))
                    .map(m => m.name.split('/').pop());
                
                if (fetchedModels.length > 0) {
                    modelCandidates = [
                        ...fetchedModels.filter(m => m.includes("1.5-flash")),
                        ...fetchedModels.filter(m => m.includes("2.0-flash")),
                        ...fetchedModels.filter(m => !m.includes("1.5-flash") && !m.includes("2.0-flash"))
                    ];
                }
            }
        } catch (e) { console.warn("ListModels failed", e); }

        let lastError = null;
        let success = false;

        for (const modelCandidate of modelCandidates) {
            try {
                console.log(`AI Designer: Trying ${modelCandidate}...`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${keyToUse}`;
                
                // v4.18.0: THE GEMINI ARCHITECT PROMPT (AWARD-WINNING DESIGNER)
                let aiPrompt = `
                    You are a World-Class Creative Director at a top Design Studio (Expert in Modern Branding & UI/UX).
                    Objective: Architect a premium, breathtaking graphic for: "${prompt}"

                    ### ARTISTIC CORE PRINCIPLES:
                    1. VISUAL PHYSICS: Use "Depth & Glow". Backgrounds must feel deep, and Hero elements must "pop" with soft, large shadows.
                    2. COLOR HARMONY: Prefer Gradients. Avoid flat ugly colors. 
                       - LUXURY: Dark Navy -> Deep Slate. Gold -> Soft Yellow.
                       - VIBRANT: Indigo -> Purple. Cyan -> Azure.
                    3. SPATIAL IQ (800x600): Everything centered with exact coordinates (originX: center, originY: center).
                    4. COMPOSITION TEMPLATES:
                       - THE SPLIT: Image Left (250, 300), Content Right (600, 300).
                       - THE CENTERPIECE: Massive Image (400, 300) with Text Overlaid elegantly or below.

                    ### ADVANCED JSON CAPABILITIES:
                    - FILL WITH GRADIENTS: You CAN use gradient objects for "fill". 
                      Example: { "type": "linear", "coords": { "x1": 0, "y1": 0, "x2": 0, "y2": 1 }, "colorStops": [{ "offset": 0, "color": "#121d33" }, { "offset": 1, "color": "#010409" }] }
                    - SHADOWS: Must use blur (30-60) and offsetY (10-30).
                    - IMAGES: Keywords: "high resolution [object] minimalist aesthetic isolated studio lighting".
                    - PROPERTIES: Use "rx": 40, "ry": 40 for rectangles.

                    ### OUTPUT FORMAT (NO TEXT BEFORE/AFTER):
                    - Return ONLY valid JSON: { "objects": [...] }.
                    - Do NOT use markdown code blocks (\`\`\`).
                `;

                const partsArray = [{ text: aiPrompt }];
                
                if (aiReferenceImageBase64) {
                    const mimeType = aiReferenceImageBase64.split(';')[0].split(':')[1];
                    const baseData = aiReferenceImageBase64.split(',')[1];
                    partsArray.push({
                        inline_data: { mime_type: mimeType, data: baseData }
                    });
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        contents: [{ parts: partsArray }],
                        generationConfig: { response_mime_type: "application/json" }
                    })
                });

                const data = await response.json();
                if (data.error) {
                    lastError = `${data.error.message} (${modelCandidate})`;
                    continue; 
                }

                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    const cleanText = text.replace(/```json|```/g, '').trim();
                    if (codeInput) codeInput.value = cleanText;
                    success = true;
                    
                    if (scanModal) scanModal.classList.add('hidden');
                    
                    // v4.18.8: INSTANT AUTO-LOAD (MAGIC)
                    setTimeout(() => {
                        if (window.loadDesignFromCode) {
                            window.loadDesignFromCode(cleanText);
                        }
                    }, 50); 
                    
                    // v4.9.0: Credit Deduction for non-premium users
                    if (!window.userState.isAdmin && window.userState.licenseStatus !== 'approved') {
                        const userRef = doc(db, "users", window.userState.uid);
                        await updateDoc(userRef, { 
                            credits: increment(-5),
                            usedCredits: increment(5)
                        });
                        console.log("5 Credits deducted for AI design.");
                    }
                    
                    break;
                }
            } catch (innerE) {
                lastError = innerE.message;
            }
        }

        if (!success) {
            throw new Error(lastError || "تمام دستیاب ماڈلز کوٹہ ختم کر چکے ہیں۔");
        }
    } catch (e) {
        console.error("AI Designer Error:", e);
        if (scanModal) scanModal.classList.add('hidden');

        // v4.18.12: Diagnostic Handling (Broadened Detection)
        const errLower = e.message.toLowerCase();
        if (errLower.includes("blocked") || errLower.includes("not been used") || errLower.includes("disabled") || errLower.includes("generativeservice")) {
            window.showAiDiagnosticModal(e.message, e.message);
            return;
        }

        let msg = "ڈیزائن بنانے میں مسئلہ ہوا۔: " + e.message;
        if (e.message.includes("403")) {
            msg = "آپ کی API Key درست نہیں ہے یا Gemini API ڈس ایبل ہے۔ براہ کرم سیٹنگز میں اپنی ذاتی API Key استعمال کریں۔";
        } else if (e.message.includes("429")) {
            msg = "فری ٹائر کا کوٹہ ختم ہو گیا ہے۔ تھوڑی دیر بعد دوبارہ کوشش کریں یا اپنی API Key تبدیل کریں۔";
        }
        
        alert(msg);
        codeInput.value = "";
    } finally {
        if (genBtn) {
            genBtn.disabled = false;
            genBtn.innerHTML = "<i class='fa-solid fa-wand-magic-sparkles'></i> ڈیزائن جنریٹ کریں";
        }
        if (scanModal) scanModal.classList.add('hidden');
    }
};

// Global Modal Toggle
window.toggleModal = (id, show) => {
    const modal = document.getElementById(id);
    if (modal) {
        if (show) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
    }
};

// v4.22.3: Open Personalization Popup
window.openPersonalization = function() {
    toggleModal('profileDropdown', false); // close the profile dropdown first
    renderFontPicker(); // populate font grid
    // Sync slider and language to current settings
    const slider = document.getElementById('fontSizeSlider');
    if (slider) slider.value = userSettings.fontSize;
    const sizeVal = document.getElementById('fontSizeVal');
    if (sizeVal) sizeVal.innerText = `${userSettings.fontSize}px`;
    const lang = document.getElementById('languageSelect');
    if (lang) lang.value = userSettings.language;
    toggleModal('personalizationModal', true);
};

// ================ UI UPDATES ================
function updateUI() {
    const hasLocalKey = !!getApiKey();
    if (userState.loggedIn) {
        elements.loginBtn.classList.add('hidden');
        elements.authContainer.classList.remove('hidden');

        // Hide login gate if logged in
        if (elements.loginGate) {
            elements.loginGate.style.opacity = '0';
            elements.loginGate.style.pointerEvents = 'none';
            setTimeout(() => {
                if (userState.loggedIn) elements.loginGate.style.display = 'none';
            }, 500); // match transition time
        }
        
        const emailDisplay = userState.email.split('@')[0];
        elements.profileEmail.innerText = emailDisplay;
        elements.profileEmailVal.innerText = userState.email;

        // Avatar Handling
        if (userState.photoURL) {
            elements.profileAvatar.src = userState.photoURL;
            elements.profileAvatar.classList.remove('hidden');
            elements.profileIcon.classList.add('hidden');
            elements.modalAvatar.src = userState.photoURL;
            elements.modalAvatar.classList.remove('hidden');
            elements.modalIcon.classList.add('hidden');
        }

        // --- CREDIT DISPLAY LOGIC ---
        const credits = Number(userState.credits || 0);
        let displayStr = `Credits: ${credits}`;
        
        if (userState.isAdmin) {
            displayStr = "Admin";
        } else if (userState.licenseStatus === 'approved') {
            displayStr = "Unlimited";
        }

        // Navbar Mini-Badge
        const chip = document.getElementById('profileCreditsChip');
        if (chip) {
            chip.innerText = displayStr;
            chip.style.display = 'flex';
        }

        if (elements.profileCredits) elements.profileCredits.innerText = displayStr;
        if (elements.profileCreditsModal) elements.profileCreditsModal.innerText = displayStr;

        // Upgrade Prompt Visibility (v3.5 Unified)
        // If credits <= 0, we show BUY button even if they have a local key or are admin (for testing)
        const isOutOfCredits = (credits <= 0 && userState.licenseStatus !== 'approved' && !userState.isAdmin);
        console.log("v3.5 Logic - Credits:", credits, "OutOfCredits:", isOutOfCredits);
        
        const rBtn = document.getElementById('runAnalysisBtn');
        const bBtn = document.getElementById('buyCreditsBtn');
        const resultsGate = document.getElementById('resultsPremiumGate');

        if (isOutOfCredits) {
            if (elements.buyCreditsSection) elements.buyCreditsSection.classList.remove('hidden');
            if (rBtn) {
                rBtn.style.display = 'none';
                rBtn.classList.add('hidden');
            }
            if (bBtn) {
                bBtn.style.display = 'block';
                bBtn.classList.remove('hidden');
            }
        } else {
            if (elements.buyCreditsSection) elements.buyCreditsSection.classList.add('hidden');
            if (rBtn) {
                rBtn.style.display = 'block';
                rBtn.classList.remove('hidden');
            }
            if (bBtn) {
                bBtn.style.display = 'none';
                bBtn.classList.add('hidden');
            }
        }

        // v5.3.8: Tier-based Section Locking (Analysis is open, specific features locked)
        const pricingLock = document.getElementById('pricingLockOverlay');
        const impressionLock = document.getElementById('impressionLockOverlay');
        const expertLock = document.getElementById('expertSuggestionLockOverlay');
        const expertFootnote = document.getElementById('expertLockFootnote');
        const editGate = document.getElementById('editorPremiumGate');

        // v5.4.6: Check featuresEnabled from Firestore to actually unlock features for Free users
        const featEnabled = userState.featuresEnabled || {};
        const isFreeLockedUser = userState.packageType === 'Free' && userState.licenseStatus !== 'approved' && !userState.isAdmin;
        
        // v5.6.0: New Bypass - If Admin enabled "All Features" globally, everyone gets access
        const isGlobalBypass = window.globalConfig?.allFeaturesEnabled === true;

        // Logic for Analyzer Sections (Pricing, Impression, Expert Suggestion)
        // Unlocked if: NOT free user, OR admin granted featuresEnabled.pricing OR Global Bypass
        const pricingUnlocked = !isFreeLockedUser || featEnabled.pricing === true || isGlobalBypass;
        if (pricingLock) pricingLock.classList.toggle('hidden', pricingUnlocked);
        if (impressionLock) impressionLock.classList.toggle('hidden', pricingUnlocked);
        if (expertLock) expertLock.classList.toggle('hidden', pricingUnlocked);
        if (expertFootnote) expertFootnote.classList.toggle('hidden', !pricingUnlocked);

        // Logic for AI Editor
        // Unlocked if: Premium/Business/Admin, OR admin granted featuresEnabled.editor OR Global Bypass
        const isEditorUnlocked = ['Premium', 'Business'].includes(userState.packageType) || userState.isAdmin || featEnabled.editor === true || isGlobalBypass;
        if (editGate) {
            editGate.classList.toggle('hidden', isEditorUnlocked);
        }

        // Management Visibility
        if (userState.isAdmin) {
            elements.adminPanelSection.classList.remove('hidden');
            document.querySelectorAll('.admin-only-config').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('.admin-only-config-inverse').forEach(el => el.classList.add('hidden'));
            
            // Hide purchase options for admin
            document.querySelectorAll('.admin-hidden').forEach(el => el.classList.add('hidden'));
        } else {
            elements.adminPanelSection.classList.add('hidden');
            document.querySelectorAll('.admin-only-config').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.admin-only-config-inverse').forEach(el => el.classList.remove('hidden'));
            
            // Show purchase options for users
            document.querySelectorAll('.admin-hidden').forEach(el => el.classList.remove('hidden'));
        }

    } else {
        elements.loginBtn.classList.remove('hidden');
        elements.authContainer.classList.add('hidden');
        elements.loginBtn.innerHTML = "<i class='fa-brands fa-google'></i> Google سے سائن ان کریں";
        
        // Show login gate if logged out
        if (elements.loginGate) {
            elements.loginGate.style.display = 'flex';
            elements.loginGate.style.opacity = '1';
            elements.loginGate.style.pointerEvents = 'auto';

            // Reveal main login UI if Firebase has finished checking
            if (elements.loginLoading) elements.loginLoading.classList.add('hidden');
            if (elements.loginMain) elements.loginMain.classList.remove('hidden');
        }
    }
}

// Admin Dashboard Logic (v5.6.0 Global Toggle)
window.openAdminPanel = async () => {
    const adminView = document.getElementById('adminDashboardView');
    adminView.classList.remove('hidden');
    
    // VIP data loading message
    elements.adminUsersList.innerHTML = "<div class='loading-spinner-container' style='grid-column: 1/-1; text-align: center; padding: 50px;'><div class='spinner' style='margin: 0 auto;'></div><p style='margin-top:15px;'>VIP ڈیٹا لوڈ ہو رہا ہے...</p></div>";

    // v5.6.0: Global Bypass Controls
    const globalSettingsEl = document.getElementById('adminGlobalSettings');
    if (globalSettingsEl) {
        globalSettingsEl.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px; background:rgba(0,229,255,0.05); padding:10px 15px; border-radius:10px; border:1px solid rgba(0,229,255,0.2);">
                <span style="font-size:0.8rem; color:var(--neon-cyan); font-weight:700;">GLOBAL BYPASS (Unlock All Features):</span>
                <label class="switch" style="transform: scale(0.8);">
                    <input type="checkbox" id="globalFeaturesToggle" onchange="handleGlobalFeaturesToggle(this.checked)">
                    <span class="slider round"></span>
                </label>
            </div>
        `;
    }

    // Set initial toggle state
    try {
        const toggle = document.getElementById('globalFeaturesToggle');
        if (toggle) {
            toggle.checked = window.globalConfig?.allFeaturesEnabled === true;
        }
    } catch (e) {}

    try {
        const querySnapshot = await getDocs(collection(db, "users"));

        const allUsers = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (!ADMIN_EMAILS.includes(data.email)) {
                allUsers.push({id: doc.id, ...data});
            }
        });

        const pending = allUsers.filter(u => u.paymentStatus === 'pending');
        const active = allUsers.filter(u => u.paymentStatus !== 'pending')
                             .sort((a,b) => (b.lastActive?.seconds || 0) - (a.lastActive?.seconds || 0));

        elements.adminUsersList.innerHTML = `
            <div class="tabs-nav" style="justify-content: flex-start; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px; border-radius: 0; background: transparent; padding-bottom: 0;">
                <button class="tab-btn active" id="adminTabClaims" style="flex: none; min-width: 150px;"><i class="fa-solid fa-clock-rotate-left"></i> Pending (${pending.length})</button>
                <button class="tab-btn" id="adminTabActive" style="flex: none; min-width: 150px;"><i class="fa-solid fa-users"></i> Active (${active.length})</button>
            </div>
            <div id="adminContentClaims"></div>
            <div id="adminContentActive" class="hidden"></div>
        `;

        const contentClaims = document.getElementById('adminContentClaims');
        const contentActive = document.getElementById('adminContentActive');

        // Tab switching logic
        document.getElementById('adminTabClaims').onclick = (e) => {
            e.target.classList.add('active');
            document.getElementById('adminTabActive').classList.remove('active');
            contentClaims.classList.remove('hidden');
            contentActive.classList.add('hidden');
        };
        document.getElementById('adminTabActive').onclick = (e) => {
            e.target.classList.add('active');
            document.getElementById('adminTabClaims').classList.remove('active');
            contentActive.classList.remove('hidden');
            contentClaims.classList.add('hidden');
        };

        // Pending Claims content
        const pSection = document.createElement('div');
        pSection.className = "pending-claims-section";
        if (pending.length > 0) {
            pending.forEach(u => pSection.appendChild(createAdminUserCard(u, true)));
        } else {
            pSection.innerHTML = `<p style="text-align:center; color: var(--text-muted); font-size: 0.8rem; padding: 20px;">کوئی نئی درخواست نہیں ہے۔</p>`;
        }
        contentClaims.appendChild(pSection);

        // Active Users content
        const aSection = document.createElement('div');
        aSection.className = "active-users-section";
        active.forEach(u => aSection.appendChild(createAdminUserCard(u, false)));
        contentActive.appendChild(aSection);
    } catch (e) {
        console.error("Admin Error:", e);
        elements.adminUsersList.innerHTML = "<p style='color:#ff5252; padding:50px;'>ڈیٹا لوڈ کرنے میں مسئلہ ہوا۔</p>";
    }
}

function createAdminUserCard(data, isPendingView) {
    const joinedDate = data.joinDate ? new Date(data.joinDate.seconds * 1000).toLocaleDateString() : 'New';
    const isPending = data.paymentStatus === 'pending';
    const pType = data.packageType || 'Free';
    const reqPlan = data.requestedPackage || 'N/A';
    const features = data.featuresEnabled || { editor: false, email: false, pricing: false };

    let statusBadge = `<span class="status-badge badge-trial">${pType} User</span>`;
    if (isPending) statusBadge = `<span class="status-badge badge-pending">Payment Pending</span>`;
    else if (pType === 'Pro') statusBadge = `<span class="status-badge badge-pro">Pro Plan</span>`;
    else if (pType === 'Premium') statusBadge = `<span class="status-badge badge-premium">Premium Plan</span>`;
    else if (pType === 'Business') statusBadge = `<span class="status-badge badge-business">Business Plan</span>`;
    else if (pType === 'Agency License') statusBadge = `<span class="status-badge badge-business" style="border-color:#ffd700; color:#ffd700;">Agency License</span>`;

    const card = document.createElement('div');
    card.className = `admin-user-card ${isPending ? 'pending-highlight' : ''}`;
    card.innerHTML = `
        <div class="user-card-header">
            <div class="user-info-main">
                <span class="user-email-chip" style="font-size:0.75rem;">${data.email}</span>
                <div style="margin-top:8px;">${statusBadge}</div>
            </div>
            <div style="text-align: right;">
                <div class="stat-label" style="font-size:0.6rem;">Last Active</div>
                <div style="font-size:0.7rem; color:#fff;">${data.lastActive ? new Date(data.lastActive.seconds*1000).toLocaleDateString() : 'N/A'}</div>
            </div>
        </div>
        ${isPending ? `
        <div class="claim-details-box" style="background: rgba(0,229,255,0.03); padding: 15px; border-radius: 12px; border: 1px solid rgba(0,229,255,0.2); margin: 15px 0;">
            <div style="margin-bottom:12px;">
                <span class="stat-label" style="color: var(--neon-cyan); font-size:0.65rem;">REQUESTED PACKAGE:</span>
                <div style="font-size:1.1rem; color:#fff; font-weight:800; letter-spacing:1px;">${reqPlan}</div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px;">
                <div><span class="stat-label" style="font-size:0.6rem;">CLAIMANT NAME</span><div style="font-size:0.8rem; color:#fff;">${data.claimName || 'N/A'}</div></div>
                <div><span class="stat-label" style="font-size:0.6rem;">TID</span><div style="font-size:0.8rem; color:var(--neon-cyan);">${data.claimTid || 'N/A'}</div></div>
            </div>
            <div class="approval-actions">
                ${generateApproveBtn(data.id, reqPlan)}
                <button class="package-action-btn" style="color: #ff5252; border-color: #ff5252; width:100%;" onclick="rejectClaim('${data.id}')">Reject Claim</button>
            </div>
        </div>
        ` : ''}
        <div class="user-stats-row">
            <div class="stat-item"><div class="stat-label">Total Credits</div><div class="stat-value" style="color: var(--neon-cyan);">${data.credits || 0}</div></div>
            <div class="stat-item"><div class="stat-label">Designs Used</div><div class="stat-value">${data.usedCredits || 0}</div></div>
            <div class="stat-item"><div class="stat-label">Member Since</div><div class="stat-value" style="font-size: 0.7rem;">${joinedDate}</div></div>
        </div>
        <!-- v5.4.2: Tool Settings Integration -->
        <div style="margin-top: 15px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 15px;">
            <button class="package-action-btn" style="width: 100%; border-color: #ffd700; color: #ffd700; margin-bottom: 10px;" onclick="openToolSettings('${data.id}', '${data.email}', ${features.editor}, ${features.email}, ${features.pricing})">
                <i class="fa-solid fa-sliders"></i> Tool Settings
            </button>
            <div style="display:flex; gap:5px;">
                <button class="package-action-btn" style="flex:1; border-color:#ff5252; color:#ff5252;" onclick="window.deleteUser('${data.id}')">Delete</button>
                <button class="package-action-btn" style="flex:1;" onclick="window.resetUserCredits('${data.id}')">Reset Account</button>
            </div>
        </div>
    `;
    return card;
}

function generateApproveBtn(uid, plan) {
    const planUpper = plan ? plan.toUpperCase().trim() : '';
    if (planUpper.includes('PRO')) return `<button class="package-action-btn active" style="width:100%; margin-bottom:8px;" onclick="grantPackage('${uid}', 'Pro', 100, true)">Approve Pro (100 Credit)</button>`;
    if (planUpper.includes('PREMIUM')) return `<button class="package-action-btn active" style="width:100%; margin-bottom:8px; border-color: var(--neon-purple); color: var(--neon-purple);" onclick="grantPackage('${uid}', 'Premium', 1000, true)">Approve Premium (1,000 Credit)</button>`;
    if (planUpper.includes('BUSINESS')) return `<button class="package-action-btn active" style="width:100%; margin-bottom:8px; border-color: #ffd700; color: #ffd700;" onclick="grantPackage('${uid}', 'Business', 10000, true)">Approve Business (10,000 Credit)</button>`;
    if (planUpper.includes('AGENCY')) return `<button class="package-action-btn active" style="width:100%; margin-bottom:8px; border-color: #fff; color: #fff;" onclick="grantPackage('${uid}', 'Agency License', 99999, true)">Approve Agency License</button>`;
    return `<button class="package-action-btn active" style="width:100%; margin-bottom:8px;" onclick="grantPackage('${uid}', 'Pro', 100, true)">Approve (Default Pro)</button>`;
}

window.toggleUserFeature = async (uid, feature, status) => {
    try {
        const userRef = doc(db, "users", uid);
        const updateData = {};
        updateData[`featuresEnabled.${feature}`] = status;
        await updateDoc(userRef, updateData);
        showToast("Feature Updated!", "success");
        openAdminPanel();
    } catch (e) {
        console.error(e);
        showToast("Update Failed");
    }
}

// v5.4.2 logic for Tool Settings Modal
window.openToolSettings = (uid, email, editor, emailF, pricing) => {
    document.getElementById('tsUid').value = uid;
    document.getElementById('tsUserEmail').innerText = `Managing tools for: ${email}`;
    
    document.getElementById('tsEditor').checked = !!editor;
    document.getElementById('tsEmail').checked = !!emailF;
    document.getElementById('tsPricing').checked = !!pricing;
    
    // Add real-time update listeners directly to the switches
    document.getElementById('tsEditor').onchange = (e) => toggleUserFeature(uid, 'editor', e.target.checked);
    document.getElementById('tsEmail').onchange = (e) => toggleUserFeature(uid, 'email', e.target.checked);
    document.getElementById('tsPricing').onchange = (e) => toggleUserFeature(uid, 'pricing', e.target.checked);
    
    toggleModal('toolSettingsModal', true);
}

window.enableAllUserTools = async () => {
    const uid = document.getElementById('tsUid').value;
    if (!uid) return;
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            featuresEnabled: { editor: true, email: true, pricing: true }
        });
        document.getElementById('tsEditor').checked = true;
        document.getElementById('tsEmail').checked = true;
        document.getElementById('tsPricing').checked = true;
        showToast("All User Tools Enabled!", "success");
        openAdminPanel(); // Refresh UI in background
    } catch (e) {
        console.error(e);
        showToast("Update Failed");
    }
}

window.adminEnableAllFeatures = async () => {
    if (!confirm("کیا آپ تمام رجسٹرڈ یوزرز کے لیے تمام فیچرز بائی پاس کرنا چاہتے ہیں؟")) return;
    try {
        showToast("Updating all users...", "info");
        const querySnapshot = await getDocs(collection(db, "users"));
        const batchPromise = [];
        querySnapshot.forEach(userDoc => {
            if (!ADMIN_EMAILS.includes(userDoc.data().email)) {
                batchPromise.push(updateDoc(doc(db, "users", userDoc.id), {
                    featuresEnabled: { editor: true, email: true, pricing: true }
                }));
            }
        });
        await Promise.all(batchPromise);
        showToast("All Users Activated!", "success");
        openAdminPanel();
    } catch (e) {
        console.error("Batch update failed:", e);
        showToast("Batch update failed");
    }
};

// v5.5.0: Refined Global toggle handler (Bypass model - MUCH faster and handles new users)
window.handleGlobalFeaturesToggle = async (isEnabled) => {
    const label = isEnabled ? 'تمام یوزرز کے لیے یہ 3 فیچرز آن کر دیں؟ (Bypass Mode)' : 'کیا آپ تمام یوزرز سے یہ فیچرز ہٹانا چاہتے ہیں؟';
    if (!confirm(label)) {
        const toggle = document.getElementById('globalFeaturesToggle');
        if (toggle) toggle.checked = !isEnabled;
        return;
    }
    try {
        showToast(isEnabled ? "سسٹم آن ہو رہا ہے..." : "سسٹم آف ہو رہا ہے...", "info");
        
        // v5.5.0: Instantly update the one central document
        // All clients listen to this and will update their UI immediately
        await setDoc(doc(db, "config", "global_features"), { 
            allFeaturesEnabled: isEnabled,
            updatedBy: userState.email,
            updatedAt: serverTimestamp()
        }, { merge: true });
        
        showToast(isEnabled ? "All Users: Features Enabled!" : "Features Disabled!", "success");
    } catch (e) {
        console.error("Global toggle failed:", e);
        showToast("Update failed");
    }
};

window.grantPackage = async (uid, type, credits, isApproval = false) => {
    const userRef = doc(db, "users", uid);
    
    // v5.3.5: Auto-Credit Resolution based on Plan Name
    let finalCredits = credits;
    if (isApproval) {
        if (type === 'Pro') finalCredits = 100;
        else if (type === 'Premium') finalCredits = 1000;
        else if (type === 'Business') finalCredits = 10000;
        else if (type === 'Agency License') finalCredits = 99999;
    }

    try {
        const updates = { 
            packageType: type,
            credits: finalCredits,
            lastActive: serverTimestamp()
        };
        if (isApproval) {
            updates.paymentStatus = 'approved';
            updates.claimApprovedAt = serverTimestamp();
        }
        await updateDoc(userRef, updates);
        alert(`کامیابی! ممبر کو ${type} پلان (${finalCredits} کریڈٹس) دے دیا گیا ہے۔`);
        openAdminPanel(); // Refresh list
    } catch (e) {
        console.error("Grant Package Error:", e);
        alert("پلان اپ ڈیٹ کرنے میں مسئلہ ہوا۔");
    }
};

window.resetUserCredits = async (uid) => {
    if (!confirm("Are you sure you want to reset this user's credits to 0?")) return;
    const userRef = doc(db, "users", uid);
    try {
        await updateDoc(userRef, { credits: 0, usedCredits: 0, packageType: 'Free' }); // Reset both
        alert("Credits reset successfully (Package set to Free).");
        openAdminPanel();
    } catch (e) {
        alert("Error resetting credits.");
    }
};

window.grantCredits = async (uid, amount, isApproval = false) => {
    const userRef = doc(db, "users", uid);
    try {
        const updates = { 
            credits: increment(amount),
            lastActive: serverTimestamp()
        };
        if (isApproval) {
            updates.paymentStatus = 'approved';
            updates.claimApprovedAt = serverTimestamp();
        }

        await updateDoc(userRef, updates);
        alert(`کامیابی! ممبر کو ${amount} کریڈٹس دے دیے گئے ہیں۔`);
        openAdminPanel(); // Refresh list
    } catch (e) {
        console.error("Grant Credits Error:", e);
        alert("کریڈٹ اپ ڈیٹ کرنے میں مسئلہ ہوا۔");
    }
};


window.deleteUser = async (uid) => {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    // Note: Firestore delete is usually via deleteDoc, but let's assume I shouldn't delete docs often.
    // However, the user asked for a better admin panel, so let's add delete.
    const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js");
    try {
        await deleteDoc(doc(db, "users", uid));
        alert("User deleted.");
        openAdminPanel();
    } catch (e) {
        alert("Error deleting user.");
    }
};

window.rejectClaim = async (uid) => {
    if (!confirm("Are you sure you want to REJECT this claim? This will remove the 5 temporary credits and clear claim data.")) return;
    const userRef = doc(db, "users", uid);
    try {
        // Subtract 5 credits (the temp ones) and clear status
        const querySnapshot = await getDocs(collection(db, "users"));
        const userDoc = querySnapshot.docs.find(d => d.id === uid);
        const data = userDoc.data();
        
        await updateDoc(userRef, {
            credits: Math.max(0, (data.credits || 0) - 5),
            paymentStatus: 'rejected',
            licenseStatus: 'rejected',
            claimName: null,
            claimTid: null
        });
        
        alert("Claim Rejected. Temporary credits removed.");
        openAdminPanel();
    } catch (e) {
        alert("Error rejecting claim.");
    }
};

window.handleGlobalFeaturesToggle = async (isEnabled) => {
    try {
        const configRef = doc(db, "config", "global_features");
        await setDoc(configRef, { 
            allFeaturesEnabled: isEnabled,
            lastUpdated: serverTimestamp(),
            updatedBy: userState.email
        }, { merge: true });
        
        showToast(`Global Bypass: ${isEnabled ? 'ENABLED' : 'DISABLED'}`, isEnabled ? 'success' : 'warning');
    } catch (e) {
        console.error("Global toggle failed:", e);
        showToast("Error updating global bypass.");
    }
};

window.closeAdminPanel = () => {
    document.getElementById('adminDashboardView').classList.add('hidden');
};

// ================ NEW PAYMENT & SHARE FEATURES ================
// v5.1.0: Refined Purchase Trigger
window.triggerPackagePurchase = (planName) => {
    currentSelectedPackage = planName;
    toggleModal('packagesModal', false);
    toggleModal('licenseModal', false);
    toggleModal('creditClaimModal', true);
};

window.submitCreditClaim = async () => {
    const name = document.getElementById('creditNameInput').value.trim();
    const tid = document.getElementById('creditTidInput').value.trim();

    if (!name || !tid) return alert("براہ کرم اپنا نام اور TID درج کریں۔");
    if (!userState.loggedIn) return alert("پہلے لاگ ان کریں!");
    
    const userRef = doc(db, "users", userState.uid);
    try {
        // v5.3.0: Now saves the requested package name AND adds 5 bonus credits instantly
        await updateDoc(userRef, {
            paymentStatus: 'pending',
            claimName: name,
            claimTid: tid,
            requestedPackage: currentSelectedPackage || 'Custom/Manual',
            credits: increment(5), // Bonus credits
            lastClaimAt: serverTimestamp()
        });
        
        toggleModal('creditClaimModal', false);
        alert(`شکریہ! آپ کو درخواست بھیجنے پر 5 بونس کریڈٹس مل گئے ہیں۔ ایڈمن جلد آپ کی پیمنٹ چیک کر کے ${currentSelectedPackage || 'مکمل پلان'} ایکٹیو کر دے گا۔`);
        currentSelectedPackage = null; // Reset
    } catch (e) {
        console.error("Claim Error:", e);
        alert("درخواست بھیجنے میں مسئلہ ہوا۔");
    }
};


window.copyShareLink = () => {
    const copyText = document.getElementById("shareLinkInput");
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value);
    alert("ٹول کا لنک کاپی کر لیا گیا ہے!");
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

// ================ API KEY MANAGEMENT ================
window.saveApiKey = () => {
    const key = elements.apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        
        // v4.18.17: Sync to Master if Admin
        if (userState.isAdmin) {
            const configRef = doc(db, "config", "api_keys");
            setDoc(configRef, { gemini: key }, { merge: true }).then(() => {
                console.log("Master Gemini Key updated in Cloud.");
                masterKeys.gemini = key;
            }).catch(e => console.error("Cloud Master Sync Error:", e));
        }

        elements.saveStatusMsg.style.display = 'block';
        updateUI();
        setTimeout(() => {
            elements.saveStatusMsg.style.display = 'none';
        }, 3000);
        
        // v4.18.13: Instant verification upon saving
        verifyApiKey();
    }
};

window.verifyApiKey = async () => {
    const key = elements.apiKeyInput?.value.trim() || getApiKey();
    const statusEl = document.getElementById('apiVerifyStatus');
    if (!statusEl) return;
    
    if (!key) {
        statusEl.innerHTML = "<span style='color:var(--warning-orange);'>براہ کرم پہلے API Key درج کریں۔</span>";
        statusEl.style.display = 'block';
        return;
    }

    statusEl.innerHTML = "<span style='color:var(--warning-orange);'><i class='fa-solid fa-spinner fa-spin'></i> کنکشن ٹیسٹ ہو رہا ہے...</span>";
    statusEl.style.display = 'block';

    try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const res = await fetch(listUrl);
        const data = await res.json();

        if (res.ok && data.models && data.models.length > 0) {
            statusEl.innerHTML = "<span style='color:var(--success-green);'><i class='fa-solid fa-check-circle'></i> کنکشن کامیاب! API ایکٹیو ہے۔</span>";
        } else {
            throw new Error(data.error?.message || "Unknown Error");
        }
    } catch (e) {
        console.error("API Verifier Error:", e);
        const errLower = e.message.toLowerCase();
        
        if (errLower.includes("blocked") || errLower.includes("api restrict")) {
            statusEl.innerHTML = "<span style='color:#ff5252;'><i class='fa-solid fa-ban'></i> <strong style='color:#fff;'>BLOCKED:</strong> آپ کی API Key پر پابندی (Restrictions) لگی ہے۔ گوگل کنسول دیکھیں۔</span>";
            window.showAiDiagnosticModal(e.message, e.message); // Show the guided modal immediately
        } else if (errLower.includes("403") || errLower.includes("key not valid")) {
            statusEl.innerHTML = "<span style='color:#ff5252;'><i class='fa-solid fa-xmark'></i> <strong style='color:#fff;'>INVALID:</strong> یہ API Key غلط ہے۔</span>";
        } else if (errLower.includes("429") || errLower.includes("quota")) {
            statusEl.innerHTML = "<span style='color:#ff5252;'><i class='fa-solid fa-battery-empty'></i> <strong style='color:#fff;'>QUOTA EXCEEDED:</strong> آپ کی فری لمیٹ ختم ہو چکی ہے۔</span>";
        } else {
            statusEl.innerHTML = `<span style='color:#ff5252;'><i class='fa-solid fa-triangle-exclamation'></i> مسلہ: API کام نہیں کر رہی۔</span>`;
            window.showAiDiagnosticModal(e.message, e.message);
        }
    }
};

function getApiKey() {
    return localStorage.getItem('gemini_api_key');
}

// ================ GROQ (Free) API MANAGEMENT ================
function getGroqApiKey() {
    return localStorage.getItem('groq_api_key');
}

window.saveGroqApiKey = () => {
    const key = document.getElementById('groqKeyInput')?.value.trim();
    if (!key) return;
    localStorage.setItem('groq_api_key', key);
    
    // v4.18.17: Sync to Master if Admin
    if (userState.isAdmin) {
        const configRef = doc(db, "config", "api_keys");
        setDoc(configRef, { groq: key }, { merge: true }).then(() => {
            console.log("Master Groq Key updated in Cloud.");
            masterKeys.groq = key;
        }).catch(e => console.error("Cloud Master Sync Error:", e));
    }

    const msg = document.getElementById('groqSaveStatusMsg');
    if (msg) { msg.style.display = 'block'; setTimeout(() => msg.style.display = 'none', 3000); }
    verifyGroqApiKey();
};

window.verifyGroqApiKey = async () => {
    const key = document.getElementById('groqKeyInput')?.value.trim() || getGroqApiKey();
    const statusEl = document.getElementById('groqVerifyStatus');
    if (!statusEl) return;

    if (!key) {
        statusEl.innerHTML = "<span style='color:var(--warning-orange);'>براہ کرم Groq API Key درج کریں۔</span>";
        statusEl.style.display = 'block';
        return;
    }

    statusEl.innerHTML = "<span style='color:var(--warning-orange);'><i class='fa-solid fa-spinner fa-spin'></i> Groq کنکشن ٹیسٹ ہو رہا ہے...</span>";
    statusEl.style.display = 'block';

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}` 
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 1
            })
        });
        if (res.ok) {
            statusEl.innerHTML = "<span style='color:var(--success-green);'><i class='fa-solid fa-check-circle'></i> Groq کنکشن کامیاب! Key بالکل صحیح ہے۔</span>";
        } else {
            const data = await res.json();
            statusEl.innerHTML = `<span style='color:#ff5252;'><i class='fa-solid fa-ban'></i> ${data.error?.message || 'Key غلط ہے۔'}</span>`;
        }
    } catch (e) {
        statusEl.innerHTML = `<span style='color:#ff5252;'><i class='fa-solid fa-xmark'></i> نیٹ ورک مسئلہ: ${e.message}</span>`;
    }
};

window.getSelectedProvider = () => {
    return localStorage.getItem('ai_provider') || 'gemini';
};

function updateProviderBadge(p) {
    const badge = document.getElementById('activeProviderBadge');
    const label = document.getElementById('activeProviderLabel');
    if (!label) return;

    if (p === 'groq') {
        label.innerHTML = "<i class='fa-solid fa-bolt'></i> Groq (Free)";
        label.style.color = 'var(--neon-cyan)';
        if (badge) {
            badge.style.background = 'rgba(0,255,157,0.08)';
            badge.style.borderColor = 'rgba(0,255,157,0.3)';
        }
    } else {
        label.innerHTML = "<i class='fa-solid fa-gem'></i> Gemini";
        label.style.color = 'var(--neon-cyan)';
        if (badge) {
            badge.style.background = 'rgba(0,229,255,0.08)';
            badge.style.borderColor = 'rgba(0,229,255,0.2)';
        }
    }
}

window.setProvider = (p) => {
    localStorage.setItem('ai_provider', p);
    document.querySelectorAll('.provider-tab').forEach(t => t.classList.remove('active-tab'));
    const tab = document.getElementById(`tab-${p}`);
    if (tab) tab.classList.add('active-tab');
    updateProviderBadge(p);
    console.log('AI Provider set to:', p);
};

// Restore badge on page load
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('ai_provider') || 'gemini';
    updateProviderBadge(saved);
    const tab = document.getElementById(`tab-${saved}`);
    if (tab) {
        document.querySelectorAll('.provider-tab').forEach(t => t.classList.remove('active-tab'));
        tab.classList.add('active-tab');
    }
});

// IMAGE COMPRESSION (v4.2.0 Optimized)
async function compressImage(base64Str, maxWidth = 500, maxHeight = 500) {
    return new Promise((resolve) => {
        const img = new Image();
        const timeout = setTimeout(() => {
            console.warn("v4.0 Compression Timeout - Falling back to original");
            resolve(base64Str);
        }, 3000); // 3s safety timeout

        img.onload = () => {
            clearTimeout(timeout);
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => {
            clearTimeout(timeout);
            resolve(base64Str);
        };
        img.src = base64Str;
    });
}

// ================ AI ANALYSIS (v5.6.5 - Master Key Fixed) ================
window.runAnalysis = async () => {
    console.time("AnalysisPhase");
    console.log("v5.6.5: Analysis started...");

    if (!currentImageBase64) {
        alert("پہلے ڈیزائن اپلوڈ کریں۔");
        return;
    }

    const canRunAnalysis = userState.isAdmin || userState.licenseStatus === 'approved' || (Number(userState.credits || 0) > 0);
    if (!canRunAnalysis) {
        toggleModal('packagesModal', true);
        showToast("تجزیہ شروع کرنے کے لیے کریڈٹس یا پریمیم پلان کی ضرورت ہے", "info");
        return;
    }

    const runBtn = elements.runAnalysisBtn;
    if (runBtn) runBtn.disabled = true;

    const scanModal = elements.scanningModal;
    const scanStatusText = scanModal ? scanModal.querySelector('p') : null;
    if (scanModal) scanModal.classList.remove('hidden');
    if (scanStatusText) scanStatusText.innerText = "اے آئی آپ کے ڈیزائن کا جائزہ لے رہا ہے انتظار کریں";
    
    if (elements.initialAnalysisMsg) elements.initialAnalysisMsg.classList.add('hidden');
    if (elements.analysisResults) elements.analysisResults.classList.add('hidden');

    const killSwitch = setTimeout(() => {
        if (scanModal) scanModal.classList.add('hidden');
        if (runBtn) runBtn.disabled = false;
        alert("تجزیہ بہت دیر لے رہا ہے۔ براہ کرم انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔");
    }, 45000);

    try {

        // v5.6.5: Robust Master Key Retrieval (Crucial for Mobile/Guest users)
        let selectedProvider = window.getSelectedProvider?.() || 'gemini';
        if (window.forceGroqFailover) {
            selectedProvider = 'groq';
            window.forceGroqFailover = false; // Reset
        }

        const typedKey = elements.apiKeyInput ? elements.apiKeyInput.value.trim() : "";
        let keyToUse = typedKey || getApiKey();
        
        // v5.6.5: Fallback to Master Key if no personal key is found
        if (!keyToUse) {
            if (!masterKeys || !masterKeys.gemini) {
                console.log("Master key missing in memory, attempting fresh fetch...");
                await fetchMasterKeys();
            }
            keyToUse = masterKeys && masterKeys.gemini;
        }
        
        if (!keyToUse && selectedProvider === 'gemini') {
            if (scanModal) scanModal.classList.add('hidden');
            if (runBtn) runBtn.disabled = false;
            clearTimeout(killSwitch);
            return alert("سسٹم ابھی دستیاب نہیں ہے (Gemini Key Missing)۔\nبراہ کرم پروفائل سیٹنگز میں اپنی API Key درج کریں۔");
        }

        console.log("v4.18.15: Processing (Key: " + (typedKey ? "Typed" : "Stored/Master") + ")");

        const compressedBase64 = await compressImage(currentImageBase64);
        const mimeType = "image/jpeg";
        const base64Data = compressedBase64.split(',')[1];

        const prompt = `
            You are a World-Class Creative Director and Senior UI/Graphic Designer from a top Design Agency.
            Objective: Analyze the provided design with surgical precision and artistic depth.

            ### STEP 1: CONTEXT & MEDIUM IDENTIFICATION
            - Identify the **Sector**: (e.g., Religious, Educational, Commercial, Medical, Corporate).
            - Identify the **Medium**: (e.g., Print: Flex/Banner/Poster/Card OR Digital: Social Media Ad/Web Banner/UI).

            ### STEP 2: ANALYSIS RULES
            1. **Cultural & Religious Sensitivity**: 
               - If the design is for a Religious or Traditional institution (e.g., Madrasa, Masjid, Islamic Event), do NOT suggest using human or animal imagery. This is intentional. Instead, focus on improving Typography, Calligraphy, Color Harmony, and Geometric Patterns.
            2. **Medium-Specific Feedback**:
               - If the Medium is **Print**: Do NOT mention "clickable links" or "website navigation buttons". Instead, focus on the readability of Phone Numbers, Physical Addresses, and QR codes.
               - If the Medium is **Digital**: Focus on CTA (Call to Action) clarity and user experience.
            3. **Visual Hierarchy & Typography**: Standard professional audit of layout balance and font pairing.

            ### STEP 3: OUTPUT SPECIFICATIONS
            - **Logical Consistency**: Ensure the 'score' (0-100) logically matches the feedback. If the score is >70, do NOT give critical contradictory errors like "Content is illegible" unless it is very specific. 
            - Language: ${userSettings.language} (Strictly).
            - Format: Valid JSON only.

            {
                "score": Number (0-100),
                "category": "Identify Sectors and Medium (e.g. Islamic School Print Flex)",
                "accessibility": "ایکسیسبلٹی اور پڑھائی (اردو تفصیل)",
                "contrast": "کلر تضاد اور توازن (اردو تفصیل)",
                "strengths": ["خوبی 1 (تفصیلی)", "خوبی 2", "خوبی 3", "خوبی 4", "خوبی 5"],
                "improvements": ["بہتری 1 (تفصیلی)", "بہتری 2", "بہتری 3", "بہتری 4", "بہتری 5"],
                "detailed_improvements": [
                    { "text": "ایک لازمی بہتری کا نکتہ (تفصیلی)", "priority": "mandatory" },
                    { "text": "ڈیزائن کو بہتر بنانے کا ایک اور مشورہ", "priority": "optional" }
                ],
                "pricing": {
                    "current": "موجودہ مارکیٹ ریٹ (PKR/USD)",
                    "improved": "بہتری کے بعد ممکنہ ریٹ (PKR/USD)"
                },
                "client_impression": {
                    "level": "پروفیشنل / مارکیٹ لیول",
                    "feedback": "کلائنٹ پر ڈیزائن کا گہرا نفسیاتی اثر (اردو)",
                    "warning": "اگر کوئی سنگین غلطی ہے تو یہاں لکھیں"
                },
                "colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
                "fonts": ["FontName1", "FontName2", "FontName3"]
            }
        `;

        if (selectedProvider === 'groq') {
            const groqKey = getGroqApiKey() || (masterKeys && masterKeys.groq);
            if (!groqKey) {
                if (scanModal) scanModal.classList.add('hidden');
                if (runBtn) runBtn.disabled = false;
                clearTimeout(killSwitch);
                return alert("آپ نے Groq provider select کیا ہے لیکن Groq API Key سیو نہیں کی ہے۔\nبراہ کرم پروفائل > Groq Key درج کر کے سیو کریں۔");
            }

            console.log("v4.18.15: Using Groq AI for analysis...");
            if (scanStatusText) scanStatusText.innerText = "AI ڈیزائن کا جائزہ لے رہا ہے...";

            let groqVisionModel = 'llama-3.2-11b-vision-preview';
            try {
                const listRes = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: { 'Authorization': `Bearer ${groqKey}` }
                });
                if (listRes.ok) {
                    const listData = await listRes.json();
                    const models = listData.data.map(m => m.id);
                    const best = models.find(m => m.includes('llama-4-scout')) || 
                                 models.find(m => m.includes('llama-4-maverick')) || 
                                 models.find(m => m.includes('vision') && !m.includes('preview')) ||
                                 models.find(m => m.includes('vision')) ||
                                 models[0];
                    if (best) groqVisionModel = best;
                }
            } catch (e) {
                groqVisionModel = 'meta-llama/llama-4-scout-17b-16e-instruct';
            }

            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqKey}`
                },
                body: JSON.stringify({
                    model: groqVisionModel,
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'image_url', image_url: { url: compressedBase64 } },
                            { type: 'text', text: prompt }
                        ]
                    }],
                    response_format: { type: 'json_object' },
                    temperature: 0.1
                })
            });

            const groqData = await groqRes.json();
            if (!groqRes.ok || groqData.error) {
                throw new Error(`Groq API خطا (${groqRes.status}): ${groqData.error?.message || groqData.message || "Error"}`);
            }
            const groqText = groqData.choices?.[0]?.message?.content;
            if (!groqText) throw new Error("Groq نے کوئی جواب نہیں دیا۔");
            
            const resultData = JSON.parse(groqText.replace(/\`\`\`json|\`\`\`/g, '').trim());
            if (scanStatusText) scanStatusText.innerText = "نتائج دکھائے جا رہے ہیں...";
            displayResults(resultData);
            
            if (userState.loggedIn) {
                saveAnalysisToHistory(resultData, compressedBase64);
                checkAndSaveBestDesign(resultData, compressedBase64);
                handleExpertSuggestion(resultData);
            }
            if (userState.loggedIn && !userState.isAdmin && userState.licenseStatus !== 'approved') {
                deductCredit().catch(e => console.log("Credit deduction failed."));
            }
            console.log("v4.18.15: Groq Analysis SUCCESS.");
            return;
        }

        const safetySettings = [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ];

        let lastErrorMsg = null;
        let quotaHit = false;
        let response = null;
        let dataJson = null;
        let modelToUse = "gemini-1.5-flash";

        try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToUse}`);
            const listData = await listRes.json();
            if (listData.models && listData.models.length > 0) {
                const bestModel = listData.models.find(m => m.supportedGenerationMethods.includes("generateContent") && m.name.includes("flash") && !m.name.includes("exp")) || listData.models.find(m => m.supportedGenerationMethods.includes("generateContent"));
                if (bestModel) modelToUse = bestModel.name.split('/').pop();
            }
        } catch (e) {
            console.warn("Model detection failed.");
        }

        const controller = new AbortController();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${keyToUse}`;
        
        try {
            const fetchSignal = AbortSignal.timeout ? AbortSignal.timeout(45000) : controller.signal;
            if (!AbortSignal.timeout) setTimeout(() => controller.abort(), 45000);

            const payload = {
                contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
                generationConfig: { response_mime_type: "application/json" },
                safetySettings: safetySettings
            };

            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: fetchSignal
            });
            
            dataJson = await response.json();
            if (response.ok) {
                console.log(`v4.5.0 SUCCESS: ${modelToUse}`);
            } else {
                lastErrorMsg = dataJson.error?.message || response.statusText;
                if (response.status === 429) quotaHit = true;
                if ((lastErrorMsg && (lastErrorMsg.toLowerCase().includes("block") || response.status === 403)) && masterKeys.groq) {
                    showToast("Gemini Blocked: Switching to Backup AI...", "warning");
                    window.forceGroqFailover = true;
                    setTimeout(() => window.runAnalysis(), 100); 
                    return;
                }
            }
        } catch (err) {
            lastErrorMsg = err.message;
        }

        if (!response?.ok) {
            const errLower = (lastErrorMsg || "").toLowerCase();
            if (errLower.includes("blocked") || errLower.includes("generativeservice")) {
                if (scanModal) scanModal.classList.add('hidden');
                if (runBtn) runBtn.disabled = false;
                clearTimeout(killSwitch);
                window.showAiDiagnosticModal(lastErrorMsg, lastErrorMsg);
                return;
            }
            throw new Error(`تجزیہ میں ایرر: ${lastErrorMsg || "رابطہ سست ہے"}`);
        }

        if (scanStatusText) scanStatusText.innerText = "نتائج دکھائے جا رہے ہیں...";
        const text = dataJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("AI نے کوئی جواب نہیں دیا۔");
        
        const parsedResults = JSON.parse(text);
        lastAnalysisData = parsedResults;
        displayResults(parsedResults);

        if (userState.loggedIn) {
            saveAnalysisToHistory(parsedResults, compressedBase64);
            checkAndSaveBestDesign(parsedResults, compressedBase64);
            handleExpertSuggestion(parsedResults);
        }

        if (userState.loggedIn && !userState.isAdmin && userState.licenseStatus !== 'approved') {
            deductCredit().catch(e => console.log("Credit deduction failed."));
        }
        console.log("v4.5.1: Success - Credit deduction active.");

    } catch (err) {
        console.error("ANALYSIS ERROR:", err);
        const errLower = (err.message || "").toLowerCase();
        if (errLower.includes("blocked") || errLower.includes("generativeservice")) {
            window.showAiDiagnosticModal(err.message, err.message);
        } else {
            alert("مسلہ: " + err.message);
        }
    } finally {
        clearTimeout(killSwitch);
        if (scanModal) scanModal.classList.add('hidden');
        if (runBtn) runBtn.disabled = false;
        console.timeEnd("AnalysisPhase");
    }
};


async function deductCredit() {
    if (userState.isAdmin) return; 
    if (userState.licenseStatus === 'approved') return; 
    
    // Safety check to prevent negative credits
    if (Number(userState.credits || 0) <= 0) {
        console.warn("Deduction skipped: Credits already at 0.");
        return;
    }

    if (!userState.uid) return;

    const userRef = doc(db, "users", userState.uid);
    try {
        await updateDoc(userRef, {
            credits: increment(-1),
            usedCredits: increment(1),
            lastActive: serverTimestamp()
        });
        console.log("Usage recorded successfully.");
    } catch (err) {
        console.error("Credit Error:", err);
        throw err; 
    }
}

function displayResults(data) {
    elements.initialAnalysisMsg.classList.add('hidden');
    elements.analysisResults.classList.remove('hidden');
    elements.statusHeader.classList.add('hidden');
    elements.exportGroup.classList.remove('hidden');
    
    const expertBadge = document.getElementById('expertBadge');
    if (expertBadge) {
        if (data.score >= 80) expertBadge.classList.remove('hidden');
        else expertBadge.classList.add('hidden');
    }
    elements.overallScoreText.innerText = data.score;
    elements.accessOut.innerText = data.accessibility;
    elements.contrastOut.innerText = data.contrast;
    
    elements.reportGoodOut.innerHTML = (data.strengths || []).map(s => `<div class="chip chip-success">${s}</div>`).join('');
    elements.reportBadOut.innerHTML = (data.improvements || []).map(i => `<div class="chip chip-warning">${i}</div>`).join('');

    // NEW: Detailed Improvements with priorities
    if (data.detailed_improvements && data.detailed_improvements.length > 0) {
        elements.detailedImprovementsOut.innerHTML = data.detailed_improvements.map(item => `
            <div class="priority-item">
                <span class="priority-text">${item.text}</span>
                <span class="priority-tag ${item.priority === 'mandatory' ? 'tag-mandatory' : 'tag-optional'}">
                    ${item.priority === 'mandatory' ? 'لازمی' : 'اختیاری'}
                </span>
            </div>
        `).join('');
    }

    // NEW: Pricing Estimation
    if (data.pricing) {
        elements.pricingEstimationOut.innerHTML = `
            <div class="pricing-card">
                <div class="pricing-label">موجودہ معیار کے مطابق ریٹ</div>
                <div class="price-value">${data.pricing.current}</div>
            </div>
            <div class="pricing-card" style="border-color: var(--success-green); background: rgba(0, 255, 157, 0.03);">
                <div class="pricing-label">بہتری کے بعد ممکنہ ریٹ</div>
                <div class="price-value" style="color: var(--success-green);">${data.pricing.improved}</div>
            </div>
        `;
    }

    // NEW: Client Impression
    if (data.client_impression) {
        let warningHtml = data.client_impression.warning ? `
            <div class="warning-alert">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>${data.client_impression.warning}</span>
            </div>
        ` : '';

        elements.clientImpressionOut.innerHTML = `
            <div class="impression-container">
                <div class="skill-header">
                    <span style="font-size: 0.85rem; color: var(--text-muted);">آپ کا اسکیل لیول:</span>
                    <span class="skill-level-badge">${data.client_impression.level}</span>
                </div>
                <p class="impression-feedback">${data.client_impression.feedback}</p>
                ${warningHtml}
            </div>
        `;
    }


    // Render Color Palette
    if (data.colors && Array.isArray(data.colors) && data.colors.length > 0) {
        elements.colorPaletteOut.innerHTML = data.colors.map(hex => `
            <div class="color-swatch-wrapper">
                <div class="color-swatch" style="background: ${hex};" onclick="copyToClipboard('${hex}', 'Color Code copied!')"></div>
                <span class="color-code">${hex}</span>
            </div>
        `).join('');
    }

    // Render Fonts
    if (data.fonts && data.fonts.length > 0) {
        elements.fontsUsedOut.innerHTML = data.fonts.map(font => `
            <div class="font-item" onclick="copyToClipboard('${font}', 'Font Name copied!')">
                <span class="font-name">${font}</span>
                <span class="copy-hint">Click to Copy</span>
            </div>
        `).join('');
    }
}

// ================ EXPORT & UTILS ================
window.copyToClipboard = (text, msg) => {
    navigator.clipboard.writeText(text);
    alert(msg);
};

window.printAnalysis = () => {
    window.print();
};

window.shareAnalysis = () => {
    const text = `DesignCheck Analysis Result\nOverall Score: ${document.getElementById('overallScoreText').innerText}/100\nCheck it out here: ${window.location.href}`;
    if (navigator.share) {
        navigator.share({
            title: 'DesignCheck Analysis',
            text: text,
            url: window.location.href
        }).catch(err => console.error("Share failed:", err));
    } else {
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    }
};

window.exportAnalysis = async (format) => {
    const element = elements.resultsCard;
    if (!element) return;

    // Use a white background for PDF to fix "white-white" issue
    const options = {
        backgroundColor: format === 'pdf' ? "#ffffff" : "#02060c",
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
            const card = clonedDoc.querySelector('.results-card');
            if (format === 'pdf' && card) {
                card.style.background = "#fff";
                card.style.color = "#000";
                card.style.position = "static";
                card.style.width = "800px"; // Standard width for capture
                
                clonedDoc.querySelectorAll('.result-label, .color-code, .copy-hint, #overallScoreText, .font-name, .status-indicator').forEach(el => {
                    el.style.color = "#000";
                });
                clonedDoc.querySelectorAll('.chip-success').forEach(el => {
                    el.style.background = "#28a745";
                    el.style.color = "#fff";
                });
                clonedDoc.querySelectorAll('.chip-warning').forEach(el => {
                    el.style.background = "#ffc107";
                    el.style.color = "#000";
                });
                clonedDoc.querySelectorAll('.score-orb').forEach(el => {
                    el.style.background = "#02060c";
                    el.style.color = "#fff";
                });
                clonedDoc.querySelectorAll('.export-group, .primary-btn, .close-btn, .status-indicator').forEach(el => el.style.display = "none");
            }
        }
    };

    try {
        const canvas = await html2canvas(element, options);

        if (format === 'png') {
            const link = document.createElement('a');
            link.download = `DesignCheck-Analysis-${Date.now()}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`DesignCheck-Analysis-${Date.now()}.pdf`);
        }
    } catch (err) {
        console.error("Export Error:", err);
        alert("ایکسپورٹ کے دوران مسئلہ پیش آیا۔");
    }
};

// Close dropdown if clicked outside
window.onclick = function(event) {
    if (!event.target.closest('.profile-chip') && !event.target.closest('.dropdown-menu')) {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) dropdown.classList.add('hidden');
    }
};

// Initial setup
const savedKey = getApiKey();
if (savedKey) elements.apiKeyInput.value = savedKey;

const savedGroq = getGroqApiKey();
if (savedGroq) {
    const groqInput = document.getElementById('groqKeyInput');
    if (groqInput) groqInput.value = savedGroq;
}

// v4.20.0: Personalization Core Logic
window.initPersonalization = function() {
    const saved = localStorage.getItem('designcheck_settings');
    if (saved) {
        try {
            userSettings = JSON.parse(saved);
        } catch(e) {}
    }
    
    // Apply Font Size
    updateFontSize(userSettings.fontSize, false);
    
    // Apply Language
    const langEl = document.getElementById('languageSelect');
    if (langEl) langEl.value = userSettings.language;
    
    // Render Font Picker
    renderFontPicker();
    
    // Load Selected Font
    if (userSettings.font !== 'Outfit') {
        applyFont(userSettings.font, false);
    }
}

function renderFontPicker() {
    const picker = document.getElementById('fontPickerGrid');
    if (!picker) return;
    
    picker.innerHTML = FONT_LIST.map(f => `
        <div class="font-card" 
             style="font-family: '${f.family}'"
             onmouseover="previewFont('${f.name}')"
             onmouseout="revertFont()"
             onclick="applyFont('${f.name}')">
            ${f.name}
        </div>
    `).join('');
}

window.updateLanguageState = function() {
    const sel = document.getElementById('languageSelect');
    if (sel) userSettings.language = sel.value;
    saveSettings();
    showToast(`✅ زبان سیٹ ہو گئی: ${userSettings.language} — اگلے تجزیہ میں اسی زبان میں نتائج آئیں گے`, 'success');
};


window.updateFontSize = function(val, save = true) {
    const size = parseInt(val);
    userSettings.fontSize = size;

    // v4.22.4: Apply via CSS root variable so it works everywhere, even before analysis
    document.documentElement.style.setProperty('--user-font-size', `${size}px`);

    // Also directly set on results panel for immediate effect
    const wrapper = document.getElementById('results-typography-wrapper');
    if (wrapper) wrapper.style.fontSize = `${size}px`;

    // All result text elements
    const resultsPanel = document.getElementById('resultsPanel');
    if (resultsPanel) resultsPanel.style.fontSize = `${size}px`;

    // Update the display badge
    const valDisplay = document.getElementById('fontSizeVal');
    if (valDisplay) valDisplay.innerText = `${size}px`;

    // Sync slider position
    const slider = document.getElementById('fontSizeSlider');
    if (slider) slider.value = size;

    // Live preview in the personalization modal
    const preview = document.getElementById('fontSizePreview');
    if (preview) preview.style.fontSize = `${size}px`;

    if (save) saveSettings();
};

window.previewFont = function(name) {
    const font = FONT_LIST.find(f => f.name === name);
    if (!font) return;
    
    loadGoogleFont(font.name);
    
    const wrapper = document.getElementById('results-typography-wrapper');
    if (wrapper) wrapper.style.fontFamily = font.family;
};

window.revertFont = function() {
    const font = FONT_LIST.find(f => f.name === userSettings.font);
    const wrapper = document.getElementById('results-typography-wrapper');
    if (wrapper && font) wrapper.style.fontFamily = font.family;
};

window.applyFont = function(name, save = true) {
    userSettings.font = name;
    const font = FONT_LIST.find(f => f.name === name);
    if (font) {
        loadGoogleFont(font.name);
        const wrapper = document.getElementById('results-typography-wrapper');
        if (wrapper) wrapper.style.fontFamily = font.family;
    }
    
    renderFontPicker();
    if (save) {
        saveSettings();
        showToast(`Font: ${name} Applied`, 'success');
    }
};

function loadGoogleFont(name) {
    if (!name || name === 'Outfit' || name === 'Jameel Noori') return;
    const linkId = `font-link-${name.replace(/ /g, '-')}`;
    if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}:wght@400;700&display=swap`;
        document.head.appendChild(link);
    }
}

window.resetToDefaults = function() {
    userSettings = { language: 'Urdu', font: 'Outfit', fontSize: 16 };
    localStorage.removeItem('designcheck_settings');
    updateFontSize(16, false);
    const langEl = document.getElementById('languageSelect');
    if (langEl) langEl.value = 'Urdu';
    const wrapper = document.getElementById('results-typography-wrapper');
    if (wrapper) wrapper.style.fontFamily = "'Outfit', 'Noto Nastaliq Urdu', sans-serif";
    renderFontPicker();
    showToast("Settings Reset!", "warning");
};

function saveSettings() {
    localStorage.setItem('designcheck_settings', JSON.stringify(userSettings));
}

document.addEventListener('DOMContentLoaded', initPersonalization);
setTimeout(initPersonalization, 1500);

