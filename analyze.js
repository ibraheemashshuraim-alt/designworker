import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, increment, serverTimestamp, addDoc, orderBy 
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
let userState = {
    loggedIn: false,
    uid: null,
    email: null,
    credits: 0,
    isAdmin: false
};

const ADMIN_EMAILS = ["ibraheemashshuraim@gmail.com", "ibraheemashshuraim.alt@gmail.com"];

// DOM Elements
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
    profileCreditsModal: document.getElementById('profileCreditsModal'),
    saveStatusMsg: document.getElementById('saveStatusMsg'),
    profileAvatar: document.getElementById('profileAvatar'),
    profileIcon: document.getElementById('profileIcon'),
    modalAvatar: document.getElementById('modalAvatar'),
    modalIcon: document.getElementById('modalIcon'),
    adminPanelSection: document.getElementById('adminPanelSection'),
    buyCreditsSection: document.getElementById('buyCreditsSection'),
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
    exportGroup: document.getElementById('exportGroup')
};

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
                paymentStatus: 'none'
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
    
    if (!userState.uid) {
        elements.historyList.innerHTML = "<p style='text-align:center; padding: 20px;'>براہ کرم پہلے لاگ ان کریں۔</p>";
        return;
    }

    try {
        const historyRef = collection(db, "users", userState.uid, "history");
        const q = query(historyRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            elements.historyList.innerHTML = "<p style='text-align:center; padding: 20px; opacity:0.5;'>کوئی ریکارڈ دستیاب نہیں ہے۔</p>";
            return;
        }

        let html = "";
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : "Pending";
            html += `
                <div class="history-card">
                    <img src="${data.image}" class="history-thumb" alt="Preview">
                    <div class="history-meta">
                        <span class="history-date">${date}</span>
                        <span class="history-score">${data.score}</span>
                    </div>
                    <div class="history-actions">
                        <button class="history-btn view-hist-btn" onclick="restoreHistoryItem('${docSnap.id}')">View</button>
                        <button class="history-btn del-hist-btn" onclick="deleteHistoryItem('${docSnap.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
        elements.historyList.innerHTML = html;
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
window.DESIGN_VERSION = "4.10.0";
console.log("DesignCheck v4.10.0 Final Pro Stability Loaded");

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
            document.querySelector('.ai-ref-container .browse-btn').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    };
}

window.clearAiRefImage = () => {
    aiReferenceImageBase64 = null;
    document.getElementById('aiRefInput').value = '';
    document.getElementById('aiRefPreviewBox').classList.add('hidden');
    document.querySelector('.ai-ref-container .browse-btn').classList.remove('hidden');
};

// ================ PREMIUM AI DESIGNER ================
window.generateAIDesign = async () => {
    const promptArea = document.getElementById('aiDesignPrompt');
    if (!promptArea) return;
    const prompt = promptArea.value.trim();
    if (!prompt) return alert("براہ کرم بتائیں کہ آپ کیا بنانا چاہتے ہیں۔");

    // v4.9.0: Expanded access logic (Admin, Approved License OR sufficient Credits)
    const canAccess = window.userState.isAdmin || window.userState.licenseStatus === 'approved' || (window.userState.credits >= 5);
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
        const keyToUse = getApiKey() || "AIzaSyC7f4QH6CSRN6dAhGNm7P4kMHTv12mtdEo";
        
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
                
                // v4.11.0: MEGA PRO DESIGN QUALITY PROMPT
                let aiPrompt = `
                    You are an Elite UI/UX & Graphic Designer (expert in Canva & Photoshop).
                    Your task is to create a stunning, highly creative, and professionally structured Fabric.js JSON design for this request: "${prompt}"

                    WORKSPACE BASE: 800x600 pixels.
                    
                    MANDATORY DESIGN THEORY & STRUCTURE (MUST FOLLOW STRICTLY):
                    1. FOUNDATION (Background): You MUST start with a large background "Rect" (width: 800, height: 600, left:0, top:0). Fill it with a rich, modern, aesthetic hex color that fits the theme (e.g., deep blue, warm beige, sleek black). DO NOT USE plain white unless it is a minimalist theme.
                    2. DECORATIVE ELEMENTS: You MUST add 3 to 5 background decorative shapes (e.g., large Circles or Triangles placed in corners or offset from the center). Give them interesting contrasting colors or partial opacity (e.g., opacity: 0.15) to make the background less boring.
                    3. MAIN CONTENT CARD (Container): Create a central container "Rect" for the text (e.g., width: 500, height: 350, left: 150, top: 125, rx: 20, ry: 20). Fill it with a high-contrast color compared to the background (e.g., white if background is dark, or dark grey if background is light). 
                       - You MUST add a heavy drop shadow to this card for depth: "shadow": { "color": "rgba(0,0,0,0.5)", "blur": 25, "offsetX": 0, "offsetY": 15 }.
                    4. TYPOGRAPHY (Hierarchy & Alignment):
                       - Add a Hero Heading (type: 'i-text'). Use a modern font like "Outfit" or "Montserrat". Make it large (fontSize: 50-70), bold (fontWeight: 'bold', fill: '#000' or '#fff' depending on card background), and visually striking.
                       - Add a Subheading (type: 'i-text'). Make it smaller (fontSize: 20-25) and regular weight.
                       - Ensure PERFECT ALIGNMENT (e.g., center text horizontally inside the main card at left: 400).
                    5. ACCENT ELEMENTS: Add small accent shapes (e.g., a thin Solid Line under the heading, or small bright Circles near the text) to make it look like a real graphic design flyer/banner.
                    6. IMAGES & LOGOS (CRITICAL FOR GRAPHICS): If the user asks for a specific logo, product, photo, or visual item (e.g., "Coffee Cup", "Car", "Burger Logo"), you MUST include a FabricJS Image object to represent it. Since you cannot upload files, use this dynamic AI Image Generator URL for the "src":
                       "https://image.pollinations.ai/prompt/[SEARCH_KEYWORDS]?width=400&height=400&nologo=true"
                       (Replace [SEARCH_KEYWORDS] with URL-encoded ENGLISH words ONLY, e.g., "minimalist%20coffee%20cup%20logo". NEVER use Urdu or emojis in the URL).
                       You MUST add "crossOrigin": "anonymous" to the image object so it loads properly.
                       Example Image Object: { "type": "image", "src": "https://image.pollinations.ai/prompt/coffee%20cup?width=300&height=300&nologo=true", "originX": "center", "originY": "center", "left": 400, "top": 300, "crossOrigin": "anonymous" }
                    7. REFERENCE SYNC: If you received a Reference Image, you MUST extract its exact mood, layout geometry, and its exact HEX color palette. Reproduce its aesthetic perfectly using FabricJS shapes and text.
                    
                    DO NOT just output 3 floating circles or plain text. You MUST output a fully composed, highly stylized, magazine-quality flyer or poster using Fabric JS JSON.
                    
                    Return ONLY VALID JSON containing an "objects" array with FabricJS entities. NO markdown formatting, just the raw JSON structured as:
                    { "objects": [ { ...background... }, { ...decorations... }, { ...shadow card... }, { ...images (if any)... }, { ...heading & texts... } ] }
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
                    
                    if (window.loadDesignFromCode) {
                        window.loadDesignFromCode(cleanText);
                    }
                    
                    alert("AI ڈیزائن تیار ہے! آپ اسے 'AI Editor' ٹیب میں اپنی مرضی سے تبدیل کر سکتے ہیں۔");
                    
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

// ================ UI UPDATES ================
function updateUI() {
    const hasLocalKey = !!getApiKey();
    if (userState.loggedIn) {
        elements.loginBtn.classList.add('hidden');
        elements.authContainer.classList.remove('hidden');
        
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
        let displayStr = `Credits ${credits}`;
        
        if (userState.isAdmin) {
            displayStr = "Admin";
        } else if (userState.licenseStatus === 'approved') {
            displayStr = "Unlimited";
        }

        if (elements.profileCredits) elements.profileCredits.innerText = displayStr;
        if (elements.profileCreditsModal) elements.profileCreditsModal.innerText = displayStr;

        // Upgrade Prompt Visibility (v3.5 Unified)
        // If credits <= 0, we show BUY button even if they have a local key or are admin (for testing)
        const isOutOfCredits = (credits <= 0 && userState.licenseStatus !== 'approved');
        console.log("v3.5 Logic - Credits:", credits, "OutOfCredits:", isOutOfCredits);
        
        const rBtn = document.getElementById('runAnalysisBtn');
        const bBtn = document.getElementById('buyCreditsBtn');

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

        // Management Visibility
        if (userState.isAdmin) {
            elements.adminPanelSection.classList.remove('hidden');
        } else {
            elements.adminPanelSection.classList.add('hidden');
        }

    } else {
        elements.loginBtn.classList.remove('hidden');
        elements.authContainer.classList.add('hidden');
        elements.loginBtn.innerHTML = "<i class='fa-brands fa-google'></i> Google سے سائن ان کریں";
    }
}

// Admin Dashboard Logic (VIP Card Layout)
window.openAdminPanel = async () => {
    const adminView = document.getElementById('adminDashboardView');
    adminView.classList.remove('hidden');
    
    elements.adminUsersList.innerHTML = "<div class='loading-spinner-container' style='grid-column: 1/-1; text-align: center; padding: 50px;'><div class='spinner' style='margin: 0 auto;'></div><p style='margin-top:15px;'>VIP ڈیٹا لوڈ ہو رہا ہے...</p></div>";
    
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        elements.adminUsersList.innerHTML = "";
        
        const users = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            // Filter out admin
            if (!ADMIN_EMAILS.includes(data.email)) {
                users.push({id: doc.id, ...data});
            }
        });

        // Sorting: Pending claims first, then recently active
        users.sort((a, b) => {
            if (a.paymentStatus === 'pending') return -1;
            if (b.paymentStatus === 'pending') return 1;
            return (b.lastActive?.seconds || 0) - (a.lastActive?.seconds || 0);
        });

        if (users.length === 0) {
            elements.adminUsersList.innerHTML = "<p style='grid-column: 1/-1; text-align: center; opacity: 0.5; padding: 50px;'>کوئی ممبر دستیاب نہیں ہے۔</p>";
            return;
        }

        users.forEach((data) => {
            const lastActive = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'New';
            const isPendingCredit = data.paymentStatus === 'pending';
            
            let statusBadge = `<span class="status-badge badge-trial">Free User</span>`;
            if (isPendingCredit) statusBadge = `<span class="status-badge badge-pending">Payment Pending</span>`;
            else if (data.credits > 10) statusBadge = `<span class="status-badge badge-premium">Premium User</span>`;

            const card = document.createElement('div');
            card.className = `admin-user-card ${isPendingCredit ? 'pending-highlight' : ''}`;
            
            card.innerHTML = `
                <div class="user-card-header">
                    <div class="user-info-main">
                        <span class="user-email-chip">${data.email}</span>
                        <div style="margin-top:5px;">${statusBadge}</div>
                    </div>
                </div>

                ${isPendingCredit ? `
                <div class="claim-details-box">
                    <span class="claim-label">Credit Claim Details:</span>
                    <div class="claim-value"><i class="fa-solid fa-user"></i> ${data.claimName || 'N/A'}</div>
                    <div class="claim-value" style="font-size: 0.8rem; color: var(--neon-cyan); direction: ltr; text-align: left; margin-top:5px;">
                        <i class="fa-solid fa-hashtag"></i> TID: ${data.claimTid || 'N/A'}
                    </div>
                </div>
                ` : ''}

                <div class="user-stats-row">
                    <div class="stat-item">
                        <div class="stat-label">Credits</div>
                        <div class="stat-value" style="color: var(--neon-purple);">${data.credits || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Analyzed</div>
                        <div class="stat-value">${data.usedCredits || 0}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Joined</div>
                        <div class="stat-value" style="font-size: 0.7rem; opacity: 0.7;">${lastActive}</div>
                    </div>
                </div>
                
                <div class="user-actions">
                    ${isPendingCredit ? `
                        <button class="action-btn claim-approve" onclick="grantCredits('${data.id}', 50, true)">Approve Payment (+50)</button>
                        <button class="action-btn danger-btn" onclick="rejectClaim('${data.id}')">Reject Claim</button>
                    ` : ''}

                    <button class="action-btn approve" onclick="grantCredits('${data.id}', 10)">+10 Creds</button>
                    <button class="action-btn approve" onclick="grantCredits('${data.id}', 100)">+100 Creds</button>
                    <button class="action-btn danger-btn" onclick="resetUserCredits('${data.id}')">Reset</button>
                    <button class="action-btn danger-btn" onclick="deleteUser('${data.id}')">Delete</button>
                </div>
            `;
            elements.adminUsersList.appendChild(card);
        });
    } catch (e) {
        console.error("Admin Fetch Error:", e);
        elements.adminUsersList.innerHTML = "<p style='color:red; grid-column: 1/-1; text-align: center;'>ڈیٹا لوڈ کرنے میں مسئلہ ہوا۔</p>";
    }
};

window.resetUserCredits = async (uid) => {
    if (!confirm("Are you sure you want to reset this user's credits to 0?")) return;
    const userRef = doc(db, "users", uid);
    try {
        await updateDoc(userRef, { credits: 0, usedCredits: 0 }); // Reset usedCredits as well
        alert("Credits reset successfully.");
        openAdminPanel();
    } catch (e) {
        alert("Error resetting credits.");
    }
};

window.grantCredits = async (uid, amount, isApproval = false) => {
    const userRef = doc(db, "users", uid);
    try {
        // Increment credits
        const querySnapshot = await getDocs(collection(db, "users"));
        const userDoc = querySnapshot.docs.find(d => d.id === uid);
        const currentCredits = userDoc.data().credits || 0;
        
        const updates = { credits: currentCredits + amount };
        if (isApproval) {
            updates.paymentStatus = 'approved';
            updates.claimApprovedAt = serverTimestamp();
        }

        await updateDoc(userRef, updates);
        alert(`کامیابی! کریڈٹس اپ ڈیٹ کر دیے گئے۔`);
        openAdminPanel(); // Refresh list
    } catch (e) {
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

window.closeAdminPanel = () => {
    document.getElementById('adminDashboardView').classList.add('hidden');
};

// ================ NEW PAYMENT & SHARE FEATURES ================
window.submitCreditClaim = async () => {
    const name = document.getElementById('creditNameInput').value.trim();
    const tid = document.getElementById('creditTidInput').value.trim();

    if (!name || !tid) return alert("براہ کرم اپنا نام اور TID درج کریں۔");
    if (!userState.loggedIn) return alert("پہلے لاگ ان کریں!");
    
    const userRef = doc(db, "users", userState.uid);
    try {
        // Give 5 temporary credits immediately and mark as pending
        await updateDoc(userRef, {
            credits: userState.credits + 5,
            paymentStatus: 'pending',
            claimName: name,
            claimTid: tid,
            lastClaimAt: serverTimestamp()
        });
        
        toggleModal('creditClaimModal', false);
        document.getElementById('claimStatus').style.display = 'block';
        document.getElementById('claimBtn').disabled = true;
        alert("آپ کو 5 عارضی کریڈٹس دے دیے گئے ہیں۔ ایڈمن جلد آپ کی پیمنٹ چیک کر کے اسے اپروو کر دے گا۔");
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
        elements.saveStatusMsg.style.display = 'block';
        updateUI();
        setTimeout(() => {
            elements.saveStatusMsg.style.display = 'none';
        }, 3000);
    }
};

function getApiKey() {
    return localStorage.getItem('gemini_api_key');
}

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

// ================ AI ANALYSIS (v3.7) ================
window.runAnalysis = async () => {
    console.time("AnalysisPhase");
    console.log("v4.1.0: Analysis started...");

    if (!currentImageBase64) {
        alert("پہلے ڈیزائن اپلوڈ کریں۔");
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
        console.warn("Safety Kill: Analysis forced closed due to timeout.");
        alert("تجزیہ بہت دیر لے رہا ہے۔ براہ کرم انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔");
    }, 15000);

    try {
        const typedKey = elements.apiKeyInput ? elements.apiKeyInput.value.trim() : "";
        let keyToUse = typedKey || getApiKey();
        let isDefaultKey = false;
        if (!keyToUse) {
            keyToUse = "AIzaSyC7f4QH6CSRN6dAhGNm7P4kMHTv12mtdEo";
            isDefaultKey = true;
        }

        console.log("v4.1.0: Processing (Key: " + (typedKey ? "Typed" : (isDefaultKey ? "Default" : "Saved")) + ")");
        const compressedBase64 = await compressImage(currentImageBase64);
        const mimeType = "image/jpeg";
        const base64Data = compressedBase64.split(',')[1];

        const prompt = `
            تم ایک سینئر گرافک ڈیزائنر ہو (Senior Graphic Designer)۔
            دیے گئے ڈیزائن کا گہرائی سے جائزہ لو (Detailed Critique)۔
            نتیجہ صرف JSON فارمیٹ میں دیں:
            {
                "score": Number (0-100),
                "accessibility": "ایکسیسبلٹی (اردو)",
                "contrast": "تضاد (اردو)",
                "strengths": ["خوبی1", "خوبی2"],
                "improvements": ["بہتری1", "بہتری2"],
                "detailed_improvements": [
                    { "text": "تفصیلی بہتری کا پوائنٹ 1", "priority": "mandatory" },
                    { "text": "تفصیلی بہتری کا پوائنٹ 2", "priority": "optional" }
                ],
                "pricing": {
                    "current": "موجودہ ریٹ (e.g. 2000-5000)",
                    "improved": "بہتری کے بعد ریٹ (e.g. 8000-10000)"
                },
                "client_impression": {
                    "level": "پروفیشنل / نوآموز / درمیانہ",
                    "feedback": "کلائنٹ پر کیا اثر پڑے گا (اردو)",
                    "warning": "اگر ڈیزائن بہت برا ہے تو وارننگ (اردو) ورنہ خالی چھوڑ دیں"
                },
                "colors": ["#hex1", "#hex2"],
                "fonts": ["Font1", "Font2"]
            }
            جواب صرف اردو میں دیں۔
            "priority" میں صرف "mandatory" یا "optional" لکھیں۔
            "pricing" میں روپوں (PKR) کا ذکر کریں (اگر ضرورت ہو تو USD بھی لکھ سکتے ہیں)۔
        `;

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

        // v4.5.0: Smart Auto-Model Detection
        let modelToUse = "gemini-1.5-flash"; // Default fallback
        try {
            console.log("v4.5.0: Detecting available models...");
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${keyToUse}`;
            const listRes = await fetch(listUrl);
            const listData = await listRes.json();
            
            if (listData.models && listData.models.length > 0) {
                // Find best flash model
                const bestModel = listData.models.find(m => 
                    m.supportedGenerationMethods.includes("generateContent") && 
                    m.name.includes("flash") && 
                    !m.name.includes("exp")
                ) || listData.models.find(m => m.supportedGenerationMethods.includes("generateContent"));
                
                if (bestModel) {
                    modelToUse = bestModel.name.split('/').pop();
                    console.log("v4.5.0: Selected Model -> " + modelToUse);
                }
            }
        } catch (e) {
            console.warn("Model detection failed, using fallback.");
        }

        const endpoint = "v1beta";
        console.log(`v4.5.0 Final Attempt: ${modelToUse} (${endpoint})`);
        
        const controller = new AbortController();
        const url = `https://generativelanguage.googleapis.com/${endpoint}/models/${modelToUse}:generateContent?key=${keyToUse}`;
        
        try {
            const fetchSignal = AbortSignal.timeout ? AbortSignal.timeout(15000) : controller.signal;
            if (!AbortSignal.timeout) setTimeout(() => controller.abort(), 15000);

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
            }
        } catch (err) {
            lastErrorMsg = err.message;
        }

        if (!response?.ok) {
            if (quotaHit || (lastErrorMsg && (lastErrorMsg.includes("quota") || lastErrorMsg.includes("429")))) {
                const source = isDefaultKey ? "سسٹم کی لمیٹ ختم ہے" : `آپ کی Key (${keyToUse.substring(0, 6)}...${keyToUse.substring(keyToUse.length - 4)}) کی لمیٹ ختم ہے`;
                throw new Error(`فری لمیٹ مکمل ہے (${source})۔\n\n[Google Error: ${lastErrorMsg}]\n\n(حل: موبائل ڈیٹا یا VPN ٹرائی کریں)`);
            }
            throw new Error(`ٹیکنیکل ایرر (${modelToUse}): ${lastErrorMsg || "رابطہ سست ہے"}`);
        }

        if (scanStatusText) scanStatusText.innerText = "نتائج دکھائے جا رہے ہیں...";
        const text = dataJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("AI نے کوئی جواب نہیں دیا۔");
        
        displayResults(JSON.parse(text));

        // v4.7.0: Auto-Save to History
        if (userState.loggedIn) {
            saveAnalysisToHistory(JSON.parse(text), compressedBase64);
        }

        // v4.5.1: Credit system restored
        if (userState.loggedIn && !userState.isAdmin && userState.licenseStatus !== 'approved') {
            deductCredit().catch(e => console.log("Credit deduction handled in background."));
        }
        console.log("v4.5.1: Success - Credit deduction active.");

    } catch (err) {
        console.error("ANALYSIS ERROR:", err);
        alert("مسلہ: " + err.message);
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
    
    elements.overallScoreText.innerText = data.score;
    elements.accessOut.innerText = data.accessibility;
    elements.contrastOut.innerText = data.contrast;
    
    elements.reportGoodOut.innerHTML = data.strengths.map(s => `<div class="chip chip-success">${s}</div>`).join('');
    elements.reportBadOut.innerHTML = data.improvements.map(i => `<div class="chip chip-warning">${i}</div>`).join('');

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
    if (data.colors && data.colors.length > 0) {
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
