// ================ EDITOR LOGIC (v5.0.2 - FINAL STABILITY) ================

let canvas;
const baseWidth = 1000; 
const baseHeight = 750; 

// CDN Import for BG Removal
let removeBackground;
import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm')
    .then(module => {
        removeBackground = module.removeBackground;
        console.log("AI BG Remover Loaded (v5.0.2)");
    })
    .catch(err => console.error("BG Remover Load Fail:", err));

// --- Initialization Logic ---

function initEditor() {
    // 1. Check if Fabric Library is available globally
    if (typeof fabric === 'undefined') {
        console.warn("Fabric.js not ready, retrying in 250ms...");
        setTimeout(initEditor, 250);
        return;
    }
    
    const canvasElement = document.getElementById('designCanvas');
    if (!canvasElement) return;

    if (!canvas) {
        canvas = new fabric.Canvas('designCanvas', {
            width: baseWidth,
            height: baseHeight,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true,
            selection: true
        });
        window.dc_canvas = canvas; 
        
        canvas.on('selection:created', showSelectionToolbar);
        canvas.on('selection:updated', showSelectionToolbar);
        canvas.on('selection:cleared', hideSelectionToolbar);
    }
    
    // File Upload Listener
    const fileInput = document.getElementById('editorFileInput');
    if (fileInput) {
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (f) => {
                fabric.Image.fromURL(f.target.result, (img) => {
                    img.scaleToWidth(400);
                    canvas.add(img);
                    canvas.centerObject(img);
                    img.setCoords();
                    canvas.setActiveObject(img);
                    canvas.requestRenderAll();
                });
            };
            reader.readAsDataURL(file);
        };
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

// --- CORE FUNCTIONS (Hoisted) ---

function resizeCanvas() {
    const card = document.querySelector('.canvas-card');
    const wrapper = document.querySelector('.canvas-container-wrapper');
    if (!wrapper || !card || !canvas) return;
    
    const containerWidth = card.offsetWidth - 40;
    const scale = Math.min(containerWidth / baseWidth, 1.0);
    
    wrapper.style.transform = `scale(${scale})`;
    card.style.height = (baseHeight * scale + 120) + "px";
    canvas.calcOffset();
}

function showSelectionToolbar() {
    const bar = document.getElementById('selectionTools');
    if (bar) bar.style.display = 'flex';
}

function hideSelectionToolbar() {
    const bar = document.getElementById('selectionTools');
    if (bar) bar.style.display = 'none';
}

function checkPremiumAccess() {
    const gate = document.getElementById('editorPremiumGate');
    if (!gate) return;
    
    // Power-User bypass
    const isPowerUser = window.userState && (
        window.userState.email === 'abdullqudus.77@gmail.com' ||
        window.userState.isAdmin || 
        window.userState.licenseStatus === 'approved' || 
        (Number(window.userState.credits || 0) > 0)
    );

    if (isPowerUser) {
        gate.classList.add('hidden');
    } else if (window.userState && window.userState.loggedIn) {
        gate.classList.remove('hidden');
    }
}

// --- GLOBAL EXPORTS (Explicitly attached to window) ---

window.switchTab = function(tab) {
    const analyzer = document.getElementById('analyzerView');
    const editor = document.getElementById('editorView');
    const tabs = document.querySelectorAll('.tab-btn');
    if (tab === 'analyzer') {
        analyzer?.classList.remove('hidden');
        editor?.classList.add('hidden');
        tabs[0]?.classList.add('active');
        tabs[1]?.classList.remove('active');
    } else {
        analyzer?.classList.add('hidden');
        editor?.classList.remove('hidden');
        tabs[1]?.classList.add('active');
        tabs[0]?.classList.remove('active');
        setTimeout(() => { 
            resizeCanvas(); 
            checkPremiumAccess(); 
        }, 150);
    }
};

window.changeFont = function(fontName) {
    const active = canvas.getActiveObject();
    if (active && (active.type === 'i-text' || active.type === 'text')) {
        active.set('fontFamily', fontName);
        canvas.requestRenderAll();
    }
};

window.changeColor = function(color) {
    const active = canvas.getActiveObject();
    if (!active) return;
    if (active.type === 'activeSelection') {
        active.getObjects().forEach(obj => obj.set('fill', color));
    } else {
        active.set('fill', color);
    }
    canvas.requestRenderAll();
};

window.bringToFront = function() {
    const active = canvas.getActiveObject();
    if (active) { active.bringToFront(); canvas.requestRenderAll(); }
};

window.sendToBack = function() {
    const active = canvas.getActiveObject();
    if (active) { active.sendToBack(); canvas.requestRenderAll(); }
};

window.deleteSelected = function() {
    const active = canvas.getActiveObject();
    if (!active) return;
    if (active.type === 'activeSelection') {
        active.getObjects().forEach(obj => canvas.remove(obj));
        canvas.discardActiveSelection();
    } else {
        canvas.remove(active);
    }
    canvas.requestRenderAll();
};

window.removeSelectedBackground = async function() {
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'image' || !removeBackground) {
        return alert("براہ کرم ریمو کرنے کے لیے ایک تصویر کلک کریں (یا AI لوڈ ہو رہا ہے)۔");
    }
    const btn = document.getElementById('removeBGBtn');
    const oldHtml = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> AI ریمو کر رہا ہے...";
        const dataUrl = active.toDataURL();
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const resultBlob = await removeBackground(blob);
        const resultUrl = URL.createObjectURL(resultBlob);
        fabric.Image.fromURL(resultUrl, (newImg) => {
            newImg.set({
                left: active.left, top: active.top,
                scaleX: active.scaleX, scaleY: active.scaleY, angle: active.angle
            });
            canvas.remove(active); canvas.add(newImg);
            canvas.setActiveObject(newImg); canvas.requestRenderAll();
        });
    } catch (e) {
        alert("بیک گراؤنڈ ریمو کرنے میں مسئلہ ہوا۔");
    } finally {
        btn.disabled = false; btn.innerHTML = oldHtml;
    }
};

window.addTextToCanvas = function() {
    if (!canvas || typeof fabric === 'undefined') return;
    const text = new fabric.IText('اپنی تحریر لکھیں', {
        left: 500, top: 375, originX: 'center', originY: 'center',
        fontFamily: 'Gulzar', fill: '#1a1a1a', fontSize: 70
    });
    canvas.add(text); text.setCoords(); canvas.setActiveObject(text); canvas.requestRenderAll();
};

window.addRectToCanvas = function() {
    if (!canvas || typeof fabric === 'undefined') return;
    const rect = new fabric.Rect({
        left: 500, top: 375, originX: 'center', originY: 'center',
        fill: '#00e5ff', width: 300, height: 250, rx: 25, ry: 25
    });
    canvas.add(rect); rect.setCoords(); canvas.setActiveObject(rect); canvas.requestRenderAll();
};

window.addCircleToCanvas = function() {
    if (!canvas || typeof fabric === 'undefined') return;
    const circle = new fabric.Circle({
        left: 500, top: 375, originX: 'center', originY: 'center',
        fill: '#ff0070', radius: 150
    });
    canvas.add(circle); circle.setCoords(); canvas.setActiveObject(circle); canvas.requestRenderAll();
};

window.clearCanvas = function() {
    if (confirm("کیا آپ پورا ڈیزائن ختم کرنا چاہتے ہیں؟")) {
        canvas.clear(); canvas.backgroundColor = '#ffffff'; canvas.requestRenderAll(); resizeCanvas();
    }
};

window.exportCanvas = function() {
    if (!canvas) return;
    canvas.setZoom(1);
    canvas.setDimensions({ width: baseWidth, height: baseHeight });
    const link = document.createElement('a');
    link.download = `DesignCheck_Pro_${Date.now()}.png`;
    link.href = canvas.toDataURL({ format: 'png', quality: 1 });
    link.click();
    resizeCanvas();
};

window.loadDesignFromCode = function(rawCode) {
    if (!canvas) return;
    const code = rawCode || document.getElementById('aiDesignCodeInput')?.value?.trim();
    if (!code) return;
    try {
        const jsonText = code.replace(/```json|```/g, '').trim();
        canvas.loadFromJSON(JSON.parse(jsonText), () => {
            canvas.requestRenderAll(); resizeCanvas();
            setTimeout(() => { canvas.calcOffset(); canvas.requestRenderAll(); }, 500);
        });
    } catch (e) {
        console.error("AI Load Error:", e);
    }
};

// --- Start Services ---
initEditor();
setInterval(checkPremiumAccess, 2500);
window.checkPremiumAccess = checkPremiumAccess; // Export manually
