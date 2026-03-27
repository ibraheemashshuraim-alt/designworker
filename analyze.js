import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
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
    profileCredits: document.getElementById('profileCredits'),
    profileCreditsModal: document.getElementById('profileCreditsModal'),
    saveStatusMsg: document.getElementById('saveStatusMsg')
};

// ================ AUTH FLOW ================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userState.loggedIn = true;
        userState.uid = user.uid;
        userState.email = user.email;
        userState.isAdmin = (user.email === ADMIN_EMAIL);
        
        setupUserPersistence(user);
        updateUI();
    } else {
        userState.loggedIn = false;
        userState.uid = null;
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
    try {
        await signInWithPopup(auth, provider);
    } catch (e) {
        console.error("Login Error:", e);
        alert("لاگ ان میں مسئلہ پیش آیا۔");
    }
};

window.logout = () => signOut(auth);

// ================ UI UPDATES ================
function updateUI() {
    const hasLocalKey = !!getApiKey();
    if (userState.loggedIn) {
        elements.loginBtn.classList.add('hidden');
        elements.authContainer.classList.remove('hidden');
        elements.profileEmail.innerText = userState.email;
        elements.profileEmailVal.innerText = userState.email;
        const creditsText = hasLocalKey ? "Unlimited (Local Key)" : `${userState.credits} Credits`;
        elements.profileCredits.innerText = creditsText;
        elements.profileCreditsModal.innerText = creditsText;
    } else {
        elements.loginBtn.classList.remove('hidden');
        elements.authContainer.classList.add('hidden');
        if (hasLocalKey) {
            elements.loginBtn.innerText = "Local Key Active";
            elements.loginBtn.style.background = "var(--neon-purple)";
        } else {
            elements.loginBtn.innerText = "لاگ ان کریں";
            elements.loginBtn.style.background = "";
        }
    }
}

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
        setTimeout(() => elements.apiSettingsModal.classList.add('hidden'), 1000);
    }
};

function getApiKey() {
    return localStorage.getItem('gemini_api_key');
}

// ================ AI ANALYSIS ================
window.runAnalysis = async () => {
    let keyToUse = getApiKey() || elements.apiKeyInput.value.trim();
    
    // If no key is provided and user has no credits (or just no key provided)
    if (!keyToUse) {
        alert("تجزیہ شروع کرنے کے لیے براہ کرم اپنی Gemini API Key سیٹ کریں۔");
        elements.apiSettingsModal.classList.remove('hidden');
        return;
    }

    // If logged in, check credits
    if (userState.loggedIn && userState.credits <= 0) {
        // Technically they can use their own key, so we allow it if they entered one.
        // But if they rely on our credits, they must have some.
        // For now, if they provided a key, let them proceed.
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

// Global modal helpers
window.toggleModal = (id, show) => {
    const modal = document.getElementById(id);
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
};

// Initial setup
const savedKey = getApiKey();
if (savedKey) elements.apiKeyInput.value = savedKey;
