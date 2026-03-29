// ================ EDITOR LOGIC (v4.9.3 - RADICAL REFACTOR) ================

let canvas;
const baseWidth = 800; // Fixed internal High-Res width
const baseHeight = 533; // Fixed internal High-Res height

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
        // v4.9.3: High-Res Stable Workspace
        canvas = new fabric.Canvas('designCanvas', {
            width: baseWidth,
            height: baseHeight,
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
                    img.scaleToWidth(300);
                    canvas.add(img);
                    canvas.centerObject(img); // v4.9.3: Absolute Centering
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

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-container-wrapper');
    if (!wrapper || !canvas) return;
    
    // v4.9.3: Stable Responsive Scaling
    const containerWidth = wrapper.offsetWidth;
    const scale = Math.min(containerWidth / baseWidth, 1.0);
    
    canvas.setZoom(scale);
    canvas.setDimensions({
        width: baseWidth * scale,
        height: baseHeight * scale
    });
    
    canvas.calcOffset(); // Critical for click mapping
    canvas.requestRenderAll();
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
    blur: 20,
    offsetX: 8,
    offsetY: 8
});

// Manual Tools (v4.9.3 Absolute Centering)
window.addTextToCanvas = () => {
    if (!canvas) return;
    const text = new fabric.IText('اپنی تحریر یہاں لکھیں', {
        fontFamily: 'Outfit',
        fill: '#1a1a1a',
        fontSize: 60,
        fontWeight: 'bold',
        shadow: proShadow,
        originX: 'center',
        originY: 'center'
    });
    canvas.add(text);
    canvas.centerObject(text);
    text.setCoords();
    canvas.setActiveObject(text);
    canvas.requestRenderAll();
};

window.addRectToCanvas = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
        fill: '#00e5ff',
        width: 250,
        height: 250,
        rx: 20,
        ry: 20,
        shadow: proShadow,
        stroke: '#00b8d4',
        strokeWidth: 3,
        originX: 'center',
        originY: 'center'
    });
    canvas.add(rect);
    canvas.centerObject(rect);
    rect.setCoords();
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();
};

window.addCircleToCanvas = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
        fill: '#ff0070',
        radius: 125,
        shadow: proShadow,
        stroke: '#c50058',
        strokeWidth: 3,
        originX: 'center',
        originY: 'center'
    });
    canvas.add(circle);
    canvas.centerObject(circle);
    circle.setCoords();
    canvas.setActiveObject(circle);
    canvas.requestRenderAll();
};

window.clearCanvas = () => {
    if (confirm("کیا آپ پورا ڈیزائن ختم کرنا چاہتے ہیں؟")) {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.requestRenderAll();
        resizeCanvas();
    }
};

window.exportCanvas = () => {
    if (!canvas) return;
    // Export at 1:1 scale (No zoom)
    const originalScale = canvas.getZoom();
    canvas.setZoom(1);
    canvas.setDimensions({ width: baseWidth, height: baseHeight });
    
    const link = document.createElement('a');
    link.download = `DesignCheck_Export_${Date.now()}.png`;
    link.href = canvas.toDataURL({ format: 'png', quality: 1 });
    link.click();
    
    resizeCanvas();
};

// AI Engine Connector (v4.9.3 Stable Loader)
window.loadDesignFromCode = (rawCode) => {
    if (!canvas) return;
    const code = rawCode || document.getElementById('aiDesignCodeInput')?.value?.trim();
    if (!code) return;

    try {
        const jsonText = code.replace(/```json|```/g, '').trim();
        const designData = JSON.parse(jsonText);
        
        canvas.loadFromJSON(designData, () => {
            canvas.requestRenderAll();
            resizeCanvas();
            setTimeout(() => {
                canvas.calcOffset();
                canvas.requestRenderAll();
                console.log("AI Design loaded successfully (v4.9.3).");
            }, 500);
        });
    } catch (e) {
        console.error("AI Load Error:", e);
    }
};
