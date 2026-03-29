// ================ EDITOR LOGIC (v4.8.9) ================

let canvas;
const canvasWidth = 600;
const canvasHeight = 400;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initEditor());
} else {
    initEditor();
}

function initEditor() {
    if (typeof fabric === 'undefined') {
        console.warn("Fabric library not loaded yet...");
        setTimeout(initEditor, 200);
        return;
    }
    
    const canvasElement = document.getElementById('designCanvas');
    if (!canvasElement) return;

    if (!canvas) {
        // v4.8.9: Preserve Object Stack correctly
        canvas = new fabric.Canvas('designCanvas', {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true
        });
        window.dc_canvas = canvas; // Global access
    }
    
    // Attach File Upload (Properly scoped)
    const fileInput = document.getElementById('editorFileInput');
    if (fileInput) {
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (f) => {
                fabric.Image.fromURL(f.target.result, (img) => {
                    img.scaleToWidth(250);
                    canvas.add(img);
                    canvas.centerObject(img);
                    canvas.setActiveObject(img);
                    canvas.renderAll();
                });
            };
            reader.readAsDataURL(file);
        };
    }

    // Responsive Scaling
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const container = document.querySelector('.canvas-container-wrapper');
    if (!container || !canvas) return;
    
    // Smooth scaling without breaking selection
    const scale = Math.min(container.offsetWidth / canvasWidth, 0.95);
    canvas.setZoom(scale);
    canvas.setDimensions({
        width: canvasWidth * scale,
        height: canvasHeight * scale
    });
}

// Tab Switching
window.switchTab = (tab) => {
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
        
        // Finalize canvas on switch
        setTimeout(resizeCanvas, 100);
        checkPremiumAccess();
    }
};

function checkPremiumAccess() {
    const gate = document.getElementById('editorPremiumGate');
    if (!gate) return;
    
    // v4.9.0: Relaxed Gate - Allow if Admin, Approved License OR has any Credits
    const hasAccess = window.userState && (
        window.userState.isAdmin || 
        window.userState.licenseStatus === 'approved' || 
        (Number(window.userState.credits || 0) > 0)
    );

    if (hasAccess) {
        gate.classList.add('hidden');
    } else {
        gate.classList.remove('hidden');
    }
}

// Manual Tools (v4.8.9 Robustness & Centering)
window.addTextToCanvas = () => {
    if (!canvas) return;
    const center = canvas.getVpCenter();
    const text = new fabric.IText('اپنی تحریر لکھیں', {
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center',
        fontFamily: 'Outfit',
        fill: '#333',
        fontSize: 40
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
};

window.addRectToCanvas = () => {
    if (!canvas) return;
    const center = canvas.getVpCenter();
    const rect = new fabric.Rect({
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center',
        fill: '#00e5ff',
        width: 150,
        height: 150,
        rx: 15,
        ry: 15
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
};

window.addCircleToCanvas = () => {
    if (!canvas) return;
    const center = canvas.getVpCenter();
    const circle = new fabric.Circle({
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center',
        fill: '#9d00ff',
        radius: 75
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
};

window.clearCanvas = () => {
    if (confirm("کیا آپ پورا کینوس صاف کرنا چاہتے ہیں؟")) {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
        resizeCanvas();
    }
};

window.exportCanvas = () => {
    if (!canvas) return;
    // Export at 1:1 scale (ignore zoom)
    const originalScale = canvas.getZoom();
    canvas.setZoom(1);
    canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
    
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });
    const link = document.createElement('a');
    link.download = 'DesignCheck_Export.png';
    link.href = dataURL;
    link.click();
    
    // Restore zoom
    resizeCanvas();
};

// AI CODE TO DESIGN (v4.8.9 Automatic Support)
window.loadDesignFromCode = (forcedCode) => {
    const codeInput = document.getElementById('aiDesignCodeInput');
    const code = forcedCode || codeInput?.value?.trim();
    
    if (!code) {
        if (!forcedCode) alert("براہ کرم پہلے ڈیزائن کوڈ پیسٹ کریں۔");
        return;
    }

    try {
        const cleanJSON = code.replace(/```json|```/g, '').trim();
        const designData = JSON.parse(cleanJSON);
        
        canvas.loadFromJSON(designData, () => {
            canvas.renderAll();
            resizeCanvas();
            console.log("AI Design Loaded Successfully.");
            // Force a slight delay to ensure rendering is visible
            setTimeout(() => canvas.renderAll(), 100);
        });
    } catch (e) {
        console.error("AI Design Load Error:", e);
        if (!forcedCode) alert("کوڈ درست نہیں ہے۔ براہ کرم پورا کوڈ کاپی کر کے پیسٹ کریں۔");
    }
};
