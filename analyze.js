import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, serverTimestamp, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

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

// Global State
let currentImageBase64 = null;
let userState = {
    loggedIn: false,
    uid: null,
    email: null,
    credits: 0,
    isAdmin: false
};

const ADMIN_EMAIL = "ibraheemashshuraim@gmail.com";

// DOM Elements
const elements = {
    loginBtn: document.getElementById('loginBtn'),
    authContainer: document.getElementById('authContainer'),
    fileInput: document.getElementById('fileInput'),
    designPreview: document.getElementById('designPreview'),
    canvasPlaceholder: document.getElementById('canvasPlaceholder'),
    workspaceActions: document.getElementById('workspaceActions'),
    resultsPanel: document.getElementById('resultsPanel'),
    initialAnalysisMsg: document.getElementById('initialAnalysisMsg'),
    analysisResults: document.getElementById('analysisResults'),
    overallScoreText: document.getElementById('overallScoreText'),
    accessOut: document.getElementById('accessOut'),
    contrastOut: document.getElementById('contrastOut'),
    reportGoodOut: document.getElementById('reportGoodOut'),
    reportBadOut: document.getElementById('reportBadOut'),
    scanningModal: document.getElementById('scanningModal'),
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
    adminUsersList: document.getElementById('adminUsersList')
};

// Ensure session persistence
setPersistence(auth, browserLocalPersistence);

// ================ AUTH FLOW ================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userState.loggedIn = true;
        userState.uid = user.uid;
        userState.email = user.email;
        userState.photoURL = user.photoURL;
        userState.isAdmin = (user.email === ADMIN_EMAIL);
        
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
    const userRef = doc(db, "users", user.uid);
    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            userState.credits = docSnap.data().credits || 0;
            updateUI();
        } else {
            setDoc(userRef, {
                email: user.email,
                credits: 10, // New user bonus
                createdAt: serverTimestamp()
            });
        }
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
        // Reset local state manually as a backup
        userState = { loggedIn: false, uid: null, email: null, credits: 0, isAdmin: false };
        updateUI();
        toggleModal('profileDropdown', false);
        window.location.reload(); // Hard refresh to ensure clean state
    } catch (e) {
        console.error("Logout Error:", e);
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

        // Display Avatar from Google Account
        if (userState.photoURL) {
            elements.profileAvatar.src = userState.photoURL;
            elements.profileAvatar.classList.remove('hidden');
            elements.profileIcon.classList.add('hidden');
            
            elements.modalAvatar.src = userState.photoURL;
            elements.modalAvatar.classList.remove('hidden');
            elements.modalIcon.classList.add('hidden');
        } else {
            elements.profileAvatar.classList.add('hidden');
            elements.profileIcon.classList.remove('hidden');
            
            elements.modalAvatar.classList.add('hidden');
            elements.modalIcon.classList.remove('hidden');
        }

        const creditsText = hasLocalKey ? "Unlimited (Local Key)" : `${userState.credits}`;
        elements.profileCreditsModal.innerText = creditsText;

        // Admin Panel Logic
        if (userState.isAdmin) {
            elements.adminPanelSection.classList.remove('hidden');
        } else {
            elements.adminPanelSection.classList.add('hidden');
        }

        // Check if credits are low to prompt buying
        if (userState.credits <= 0 && !hasLocalKey && !userState.isAdmin) {
            elements.buyCreditsSection.classList.remove('hidden');
        } else {
            elements.buyCreditsSection.classList.add('hidden');
        }

    } else {
        elements.loginBtn.classList.remove('hidden');
        elements.authContainer.classList.add('hidden');
        if (hasLocalKey) {
            elements.loginBtn.innerHTML = "<i class='fa-solid fa-key'></i> API Key دائیں طرف موجود ہے";
            elements.loginBtn.style.background = "var(--neon-purple)";
        } else {
            elements.loginBtn.innerHTML = "<i class='fa-brands fa-google'></i> لاگ ان کریں";
            elements.loginBtn.style.background = "";
        }
    }
}

// Admin Dashboard Logic
window.openAdminPanel = async () => {
    const adminView = document.getElementById('adminDashboardView');
    adminView.classList.remove('hidden');
    
    elements.adminUsersList.innerHTML = "<tr><td colspan='3'>لوڈ ہو رہا ہے...</td></tr>";
    
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        elements.adminUsersList.innerHTML = "";
        
        querySnapshot.forEach((userDoc) => {
            const data = userDoc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${data.email}</td>
                <td><span class="badge">${data.credits || 0}</span></td>
                <td>
                    <button class="action-btn approve" onclick="grantCredits('${userDoc.id}', 10)">+10</button>
                    <button class="action-btn approve" onclick="grantCredits('${userDoc.id}', 50)">+50</button>
                </td>
            `;
            elements.adminUsersList.appendChild(tr);
        });
    } catch (e) {
        console.error("Admin Fetch Error:", e);
        elements.adminUsersList.innerHTML = "<tr><td colspan='3'>ڈیٹا لوڈ کرنے میں مسئلہ ہوا۔</td></tr>";
    }
};

window.grantCredits = async (uid, amount) => {
    const userRef = doc(db, "users", uid);
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const userDoc = querySnapshot.docs.find(d => d.id === uid);
        const currentCredits = userDoc.data().credits || 0;
        
        await updateDoc(userRef, {
            credits: currentCredits + amount
        });
        alert(`کامیابی! ${amount} کریڈٹس شامل کر دیے گئے۔`);
        openAdminPanel(); // Refresh list
    } catch (e) {
        alert("کریڈٹ اپ ڈیٹ کرنے میں مسئلہ ہوا۔");
    }
};

window.closeAdminPanel = () => {
    document.getElementById('adminDashboardView').classList.add('hidden');
};

// ================ FILE HANDLING ================
elements.fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        currentImageBase64 = event.target.result;
        elements.designPreview.src = currentImageBase64;
        elements.designPreview.classList.remove('hidden');
        elements.canvasPlaceholder.classList.add('hidden');
        elements.workspaceActions.classList.remove('hidden');
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

// ================ AI ANALYSIS ================
window.runAnalysis = async () => {
    let keyToUse = getApiKey() || elements.apiKeyInput.value.trim();
    
    if (!keyToUse) {
        // If no global API key
        if (!userState.loggedIn) {
            alert("تجزیہ شروع کرنے کے لیے پہلے لاگ ان کریں یا اپنی API Key استعمال کریں۔");
            toggleModal('profileModal', true);
            return;
        }

        if (userState.credits <= 0 && !userState.isAdmin) {
            alert("آپ کے کریڈٹس ختم ہو چکے ہیں۔ براہ کرم پریمیم کریڈٹس حاصل کریں یا اپنی API Key استعمال کریں۔ (تفصیلات کے لیے پروفائل دیکھیں)");
            toggleModal('profileModal', true);
            return;
        }
    }

    elements.scanningModal.classList.remove('hidden');
    elements.initialAnalysisMsg.classList.add('hidden');
    elements.analysisResults.classList.add('hidden');

    try {
        const prompt = `
            تم ایک سینئر گرافک ڈیزائنر اور نقاد ہو (Senior Graphic Designer & Critic)۔
            دیے گئے ڈیزائن کا گہرائی سے جائزہ لو (Detailed Critique)۔
            تمہیں ان پہلوؤں پر توجہ دینی ہے:
            1. Layout & Alignment (ترتیب اور الائنمنٹ)
            2. Color Theory & Contrast (رنگوں کا انتخاب اور تضاد)
            3. Typography & Hierarchy (فونٹ اور اہمیت کا تعین)
            4. Overall Impact (مجموعی تاثر)

            براہ کرم نتیجہ صرف JSON فارمیٹ میں فراہم کریں اس ڈھانچے کے ساتھ:
            {
                "score": 0 سے 100 کے درمیان ایک نمبر,
                "accessibility": "ایکسیسبلٹی کے بارے میں ایک جملہ",
                "contrast": "رنگوں کے تضاد کے بارے میں ایک جملہ",
                "strengths": ["پہلی خوبی", "دوسری خوبی", "تیسری خوبی"],
                "improvements": ["پہلی بہتری", "دوسری بہتری", "تیسری بہتری"]
            }
            جواب صرف اردو (Urdu) میں ہونا چاہیے۔ صرف JSON واپس کریں، کوئی اضافی ٹیکسٹ نہ لکھیں۔
        `;

        const mimeType = currentImageBase64.substring(currentImageBase64.indexOf(':') + 1, currentImageBase64.indexOf(';'));
        const base64Data = currentImageBase64.split(',')[1];

        // Fetch options without the URL, as URL changes per model
        const fetchOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: mimeType || "image/jpeg", data: base64Data } }
                    ]
                }],
                generationConfig: {
                    temperature: 0.4
                }
            })
        };

        const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        let response = null;
        let dataJson = null;
        let lastErrorMsg = null;

        for (const modelName of modelsToTry) {
            console.log(`Trying model via fetch: ${modelName}...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${keyToUse}`;
            
            try {
                response = await fetch(url, fetchOptions);
                dataJson = await response.json();
                
                if (response.ok) {
                    console.log(`Success with model: ${modelName}`);
                    break; // Stop loop because we got a successful response
                } else {
                    let errMsg = `${modelName} Error: ${response.status}`;
                    if (dataJson.error && dataJson.error.message) {
                        errMsg += " - " + dataJson.error.message;
                    }
                    console.warn(errMsg);
                    lastErrorMsg = errMsg;
                    // Force response to null so we don't proceed outside the loop
                    response = null; 
                }
            } catch (err) {
                console.warn(`Fetch failed for ${modelName}:`, err);
                lastErrorMsg = err.message;
                response = null;
            }
        }

        if (!response || !dataJson) {
             throw new Error("All models failed. Last error: " + (lastErrorMsg || "Unknown"));
        }

        // Search for text in the response structure
        const text = dataJson.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
             throw new Error("API نے کوئی ٹیکسٹ واپس نہیں کیا۔");
        }
        
        console.log("AI Raw Response:", text);
        
        // Robust JSON parsing (handles potential markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            let data;
            try {
                data = JSON.parse(jsonMatch[0]);
            } catch (parseErr) {
                console.error("JSON Parsing Error:", parseErr);
                throw new Error("AI نے درست JSON فارمیٹ میں جواب نہیں دیا۔");
            }
            
            displayResults(data);
            
            // Only deduct credit if they are logged in and using default fallback
            // Assuming if they are logged in without a local key, it means we deduct.
            if (userState.loggedIn && !getApiKey()) {
                deductCredit();
            }
        } else {
            throw new Error("Invalid AI Response Structure (No JSON found)");
        }

    } catch (e) {
        console.error("Analysis Error:", e);
        let errorMsg = e.message;
        
        if (errorMsg.includes("404") || errorMsg.includes("not found")) {
            try {
                const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToUse}`);
                const listData = await listRes.json();
                let availableModels = "(کوئی ماڈل دستیاب نہیں)";
                if (listData.models && listData.models.length > 0) {
                    availableModels = listData.models.map(m => m.name.replace('models/', '')).join(",  ");
                }
                
                errorMsg = `آپ کی شامل کی گئی API Key (جو ${keyToUse.substring(0, 8)}... سے شروع ہو رہی ہے) پر 'gemini-1.5-flash' نہیں ہے۔\n\nآپ کی Key پر صرف یہ ماڈلز دستیاب ہیں:\n[ ${availableModels} ]\n\nبراہ کرم aistudio.google.com پر جا کر وہ Key بنائیں جس پر Gemini 1.5 کام کرے۔`;
            } catch(fetchErr) {
                errorMsg = `آپ کی شامل کی گئی API Key (جو ${keyToUse.substring(0, 8)}... سے شروع ہو رہی ہے) پر 'Gemini API' ایکٹیو نہیں ہے۔\n\nکیا آپ نے Firebase کی Key استعمال کی ہے؟\nبراہ کرم نیا ٹیب کھولیں اور aistudio.google.com پر جا کر اپنے گوگل اکاؤنٹ سے لاگ ان کریں اور 'Get API Key' پر کلک کر کے بالکل نئی Key بنائیں اور اسے یہاں Settings میں شامل کریں۔`;
            }
        }

        alert(`تجزیہ کے دوران کوئی تکنیکی مسئلہ پیش آیا ہے۔\nایرر کی تفصیل:\n${errorMsg}\n\nبراہ کرم یقینی بنائیں کہ آپ کی API Key درست ہے اور انٹرنیٹ چل رہا ہے۔`);
    } finally {
        elements.scanningModal.classList.add('hidden');
    }
};

async function deductCredit() {
    const userRef = doc(db, "users", userState.uid);
    await updateDoc(userRef, {
        credits: userState.credits - 1
    });
}

function displayResults(data) {
    elements.initialAnalysisMsg.classList.add('hidden');
    elements.analysisResults.classList.remove('hidden');
    
    elements.overallScoreText.innerText = data.score;
    elements.accessOut.innerText = data.accessibility;
    elements.contrastOut.innerText = data.contrast;
    
    elements.reportGoodOut.innerHTML = data.strengths.map(s => `<div class="chip chip-success">${s}</div>`).join('');
    elements.reportBadOut.innerHTML = data.improvements.map(i => `<div class="chip chip-warning">${i}</div>`).join('');
}

// Global modal/dropdown helpers
window.toggleModal = (id, show) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
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
