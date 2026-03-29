// ================ EDITOR LOGIC (v4.8.0) ================

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
        console.warn("Fabric library not loaded yet, retrying...");
        setTimeout(initEditor, 200);
        return;
    }
    
    if (!canvas) {
        canvas = new fabric.Canvas('designCanvas', {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: '#ffffff'
        });
        window.dc_canvas = canvas; // Global access
    }
    
    // Responsive Scaling
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const container = document.querySelector('.canvas-container-wrapper');
    if (!container) return;
    
    const scale = Math.min(container.offsetWidth / canvasWidth, 0.9);
    canvas.setZoom(scale);
    canvas.setWidth(canvasWidth * scale);
    canvas.setHeight(canvasHeight * scale);
}

// Tab Switching
window.switchTab = (tab) => {
    const analyzer = document.getElementById('analyzerView');
    const editor = document.getElementById('editorView');
    const tabs = document.querySelectorAll('.tab-btn');
    
    if (tab === 'analyzer') {
        analyzer.classList.remove('hidden');
        editor.classList.add('hidden');
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        analyzer.classList.add('hidden');
        editor.classList.remove('hidden');
        tabs[1].classList.add('active');
        tabs[0].classList.remove('active');
        
        // Refresh canvas size when shown
        setTimeout(resizeCanvas, 100);
        
        // Check Premium Gate
        checkPremiumAccess();
    }
};

function checkPremiumAccess() {
    const gate = document.getElementById('editorPremiumGate');
    // userState is global from analyze.js
    if (window.userState && (window.userState.isAdmin || window.userState.licenseStatus === 'approved')) {
        gate.classList.add('hidden');
    } else {
        gate.classList.remove('hidden');
    }
}

// Manual Tools
window.addTextToCanvas = () => {
    const text = new fabric.IText('Type here...', {
        left: 100,
        top: 100,
        fontFamily: 'Outfit',
        fill: '#333',
        fontSize: 30
    });
    canvas.add(text);
    canvas.setActiveObject(text);
};

window.addRectToCanvas = () => {
    const rect = new fabric.Rect({
        left: 150,
        top: 150,
        fill: '#00e5ff',
        width: 100,
        height: 100,
        rx: 10,
        ry: 10
    });
    canvas.add(rect);
};

window.addCircleToCanvas = () => {
    const circle = new fabric.Circle({
        left: 200,
        top: 200,
        fill: '#9d00ff',
        radius: 50
    });
    canvas.add(circle);
};

window.clearCanvas = () => {
    if (confirm("Clear entire canvas?")) {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
    }
};

window.exportCanvas = () => {
    const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1
    });
    const link = document.createElement('a');
    link.download = 'design_check_export.png';
    link.href = dataURL;
    link.click();
};

// File Upload for Editor
const editorFileInput = document.getElementById('editorFileInput');
if (editorFileInput) {
    editorFileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target.result, (img) => {
                img.scaleToWidth(200);
                canvas.add(img);
                canvas.centerObject(img);
                canvas.renderAll();
            });
        };
        reader.readAsDataURL(file);
    };
}

// AI CODE TO DESIGN
window.loadDesignFromCode = () => {
    const codeInput = document.getElementById('aiDesignCodeInput');
    const code = codeInput.value.trim();
    if (!code) return alert("Please paste the design code first.");

    try {
        // AI might give JSON or base64. User wants "special code". 
        // We expect JSON for now, or we can handle simple cases.
        const designData = JSON.parse(code.replace(/```json|```/g, '').trim());
        canvas.loadFromJSON(designData, () => {
            canvas.renderAll();
            alert("ڈیزائن کامیابی سے لوڈ ہو گیا ہے!");
        });
    } catch (e) {
        alert("Invalid Design Code. Please make sure to copy exact code from the AI.");
        console.error("Parse Error:", e);
    }
};
