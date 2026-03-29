// ================ EDITOR LOGIC (v4.9.2) ================

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
        setTimeout(initEditor, 250);
        return;
    }
    
    const canvasElement = document.getElementById('designCanvas');
    if (!canvasElement) return;

    if (!canvas) {
        // v4.9.2: 100% Reliable Stack and Selection
        canvas = new fabric.Canvas('designCanvas', {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true,
            selection: true
        });
        window.dc_canvas = canvas; 
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
                    const scale = Math.min(250 / img.width, 250 / img.height);
                    img.scale(scale);
                    canvas.add(img);
                    canvas.centerObject(img); // Center in workspace
                    img.setCoords();
                    canvas.setActiveObject(img);
                    canvas.renderAll();
                });
            };
            reader.readAsDataURL(file);
        };
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-container-wrapper');
    if (!wrapper || !canvas) return;
    
    const scale = Math.min(wrapper.offsetWidth / canvasWidth, 0.98);
    canvas.setZoom(scale);
    canvas.setDimensions({
        width: canvasWidth * scale,
        height: canvasHeight * scale
    });
}

// Global View Switch
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
        
        setTimeout(() => {
            resizeCanvas();
            checkPremiumAccess();
        }, 150);
    }
};

function checkPremiumAccess() {
    const gate = document.getElementById('editorPremiumGate');
    if (!gate) return;
    
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

// Pro Styling Helper
const proShadow = new fabric.Shadow({
    color: 'rgba(0,0,0,0.3)',
    blur: 15,
    offsetX: 5,
    offsetY: 5
});

// Manual Tools (v4.9.2 Definitive Centering)
window.addTextToCanvas = () => {
    if (!canvas) return;
    const text = new fabric.IText('اپنی تحریر لکھیں', {
        fontFamily: 'Outfit',
        fill: '#1a1a1a',
        fontSize: 50,
        shadow: proShadow
    });
    canvas.add(text);
    canvas.centerObject(text); // v4.9.2: Perfect Centering
    text.setCoords();
    canvas.setActiveObject(text);
    canvas.renderAll();
};

window.addRectToCanvas = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
        fill: '#00e5ff',
        width: 180,
        height: 120,
        rx: 15,
        ry: 15,
        shadow: proShadow,
        stroke: '#00b8d4',
        strokeWidth: 2
    });
    canvas.add(rect);
    canvas.centerObject(rect);
    rect.setCoords();
    canvas.setActiveObject(rect);
    canvas.renderAll();
};

window.addCircleToCanvas = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
        fill: '#ff0070',
        radius: 80,
        shadow: proShadow,
        stroke: '#c50058',
        strokeWidth: 2
    });
    canvas.add(circle);
    canvas.centerObject(circle);
    circle.setCoords();
    canvas.setActiveObject(circle);
    canvas.renderAll();
};

window.clearCanvas = () => {
    if (confirm("کیا آپ پورا ڈیزائن ختم کرنا چاہتے ہیں؟")) {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
        resizeCanvas();
    }
};

window.exportCanvas = () => {
    if (!canvas) return;
    const originalScale = canvas.getZoom();
    canvas.setZoom(1);
    canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
    
    const link = document.createElement('a');
    link.download = 'DesignCheck_Export.png';
    link.href = canvas.toDataURL({ format: 'png', quality: 1 });
    link.click();
    
    resizeCanvas();
};

// AI Engine Connector (v4.9.2 Auto-Load Support)
window.loadDesignFromCode = (rawCode) => {
    if (!canvas) return;
    const code = rawCode || document.getElementById('aiDesignCodeInput')?.value?.trim();
    if (!code) return;

    try {
        const jsonText = code.replace(/```json|```/g, '').trim();
        const designData = JSON.parse(jsonText);
        
        canvas.loadFromJSON(designData, () => {
            canvas.renderAll();
            resizeCanvas();
            // Force re-draw to ensure visibility
            setTimeout(() => {
                canvas.requestRenderAll();
                console.log("AI Design loaded & rendered.");
            }, 300);
        });
    } catch (e) {
        console.error("AI Load Error:", e);
    }
};
