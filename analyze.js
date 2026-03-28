import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc, increment, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-analytics.js";
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

const ADMIN_EMAIL = "ibraheemashshuraim@gmail.com";

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
    adminUsersList: document.getElementById('adminUsersList'),
    colorPaletteOut: document.getElementById('colorPaletteOut'),
    fontsUsedOut: document.getElementById('fontsUsedOut'),
    resultsCard: document.querySelector('.results-card'),
    statusHeader: document.getElementById('statusHeader'),
    exportGroup: document.getElementById('exportGroup')
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
            userState.isAdmin = (user.email === ADMIN_EMAIL);
            
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

// --- VERSION TAG ---
window.DESIGN_VERSION = "3.0";

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

        // Upgrade Prompt Visibility
        const isOutOfCredits = (credits <= 0 && !hasLocalKey && !userState.isAdmin && userState.licenseStatus !== 'approved');
        
        if (isOutOfCredits) {
            elements.buyCreditsSection.classList.remove('hidden');
            // Swap Analyze button for Buy button on main screen if 0 credits
            const mainAnalyzeBtn = document.querySelector('button[onclick="runAnalysis()"]');
            if (mainAnalyzeBtn) {
                mainAnalyzeBtn.innerHTML = "<i class='fa-solid fa-gem'></i> اپگریڈ کریں (Buy Credits)";
                mainAnalyzeBtn.style.background = "linear-gradient(45deg, #ffd700, #ffb300)";
                mainAnalyzeBtn.style.color = "#000";
                mainAnalyzeBtn.setAttribute("onclick", "toggleModal('profileDropdown', true)");
            }
        } else {
            elements.buyCreditsSection.classList.add('hidden');
            const mainAnalyzeBtn = document.querySelector('button[onclick*="profileDropdown"]');
            if (mainAnalyzeBtn && mainAnalyzeBtn.innerText.includes("اپگریڈ")) {
                mainAnalyzeBtn.innerHTML = "<i class='fa-solid fa-wand-magic-sparkles'></i> اینالائز کریں (Analyze)";
                mainAnalyzeBtn.style.background = "";
                mainAnalyzeBtn.style.color = "";
                mainAnalyzeBtn.setAttribute("onclick", "runAnalysis()");
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
            if (data.email !== ADMIN_EMAIL) {
                users.push({id: doc.id, ...data});
            }
        });

        // Sorting: Pending claims first, then license claims, then recently active
        users.sort((a, b) => {
            if (a.paymentStatus === 'pending' || a.licenseStatus === 'pending') return -1;
            if (b.paymentStatus === 'pending' || b.licenseStatus === 'pending') return 1;
            return (b.lastActive?.seconds || 0) - (a.lastActive?.seconds || 0);
        });

        if (users.length === 0) {
            elements.adminUsersList.innerHTML = "<p style='grid-column: 1/-1; text-align: center; opacity: 0.5; padding: 50px;'>کوئی ممبر دستیاب نہیں ہے۔</p>";
            return;
        }

        users.forEach((data) => {
            const lastActive = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'New';
            const isPendingCredit = data.paymentStatus === 'pending';
            const isPendingLicense = data.licenseStatus === 'pending';
            const hasLicense = data.licenseStatus === 'approved';
            
            let statusBadge = `<span class="status-badge badge-trial">Free User</span>`;
            if (hasLicense) statusBadge = `<span class="status-badge badge-license"><i class="fa-solid fa-crown"></i> Licensed</span>`;
            else if (isPendingLicense) statusBadge = `<span class="status-badge badge-pending">License Pending</span>`;
            else if (isPendingCredit) statusBadge = `<span class="status-badge badge-pending">Payment Pending</span>`;
            else if (data.credits > 10) statusBadge = `<span class="status-badge badge-premium">Premium User</span>`;

            const card = document.createElement('div');
            card.className = `admin-user-card ${(isPendingCredit || isPendingLicense) ? 'pending-highlight' : ''}`;
            
            card.innerHTML = `
                <div class="user-card-header">
                    <div class="user-info-main">
                        <span class="user-email-chip">${data.email}</span>
                        <div style="margin-top:5px;">${statusBadge}</div>
                    </div>
                </div>

                ${(isPendingCredit || isPendingLicense) ? `
                <div class="claim-details-box">
                    <span class="claim-label">${isPendingLicense ? 'License Claim' : 'Credit Claim'} Details:</span>
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
                    ` : ''}
                    ${isPendingLicense ? `
                        <button class="action-btn claim-approve" style="background: #ffd700;" onclick="approveLicense('${data.id}')">Approve Full License</button>
                    ` : ''}
                    
                    ${(isPendingCredit || isPendingLicense) ? `
                        <button class="action-btn danger-btn" style="grid-column: span 2;" onclick="rejectClaim('${data.id}')">Reject Claim</button>
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

window.approveLicense = async (uid) => {
    if (!confirm("Are you sure you want to approve the FULL LICENSE for this user?")) return;
    const userRef = doc(db, "users", uid);
    try {
        await updateDoc(userRef, {
            licenseStatus: 'approved',
            credits: 99999, // Infinite-like credits
            licenseApprovedAt: serverTimestamp()
        });
        alert("License Approved Successfully!");
        openAdminPanel();
    } catch (e) {
        alert("Error approving license.");
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

window.submitLicenseClaim = async () => {
    const name = document.getElementById('licenseNameInput').value.trim();
    const tid = document.getElementById('licenseTidInput').value.trim();

    if (!name || !tid) return alert("براہ کرم اپنا نام اور TID درج کریں۔");
    if (!userState.loggedIn) return alert("پہلے لاگ ان کریں!");
    
    const userRef = doc(db, "users", userState.uid);
    try {
        await updateDoc(userRef, {
            licenseStatus: 'pending',
            claimName: name,
            claimTid: tid,
            lastLicenseClaimAt: serverTimestamp()
        });
        
        toggleModal('licenseClaimModal', false);
        toggleModal('licenseModal', false);
        alert("آپ کی لائسنس کی درخواست بھیج دی گئی ہے۔ ایڈمن جلد آپ سے رابطہ کرے گا۔");
    } catch (e) {
        console.error("License Claim Error:", e);
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

// ================ AI ANALYSIS ================
window.runAnalysis = async () => {
    if (!currentImageBase64) {
        alert("پہلے ڈیزائن اپلوڈ کریں۔");
        return;
    }

    let keyToUse = getApiKey() || elements.apiKeyInput.value.trim();
    
    // Compulsory Credit Check for all logged-in users (except Admin/License)
    if (userState.loggedIn && !userState.isAdmin && userState.licenseStatus !== 'approved') {
        if (Number(userState.credits || 0) <= 0) {
            alert("آپ کے پاس کریڈٹس ختم ہو گئے ہیں۔ براہ کرم مزید کریڈٹس خریدیں۔");
            toggleModal('profileDropdown', true);
            return;
        }
    }

    // Default API Key Fallback if none provided
    if (!keyToUse) {
        keyToUse = "AIzaSyC7f4QH6CSRN6dAhGNm7P4kMHTv12mtdEo"; // Default system key
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
                "improvements": ["پہلی بہتری", "دوسری بہتری", "تیسری بہتری"],
                "colors": ["Hex Code 1", "Hex Code 2", "Hex Code 3"],
                "fonts": ["Font Family 1", "Font Family 2"]
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

        const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash"];
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
            
            // --- COMPULSORY CREDIT DEDUCTION ---
            if (userState.loggedIn && !userState.isAdmin && userState.licenseStatus !== 'approved') {
                deductCredit().catch(err => console.error("Deduction error:", err));
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
