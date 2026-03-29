// ================ EDITOR LOGIC (v4.9.4 - NUCLEAR STABILITY) ================

let canvas;
const baseWidth = 800; // Fixed Internal Pixel Space (Resolution)
const baseHeight = 600; // Fixed Internal Pixel Space (Resolution)

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
        // v4.9.4: Absolute Single-Setup Canvas
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
                    canvas.centerObject(img); // Always center at 400, 300
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
    const card = document.querySelector('.canvas-card');
    const wrapper = document.querySelector('.canvas-container-wrapper');
    if (!wrapper || !card || !canvas) return;
    
    // v4.9.4: NUCLEAR FIX - CSS TRANSFORM SCALING
    // We scale the DOM element, NOT the internal Fabric coordinates.
    // This keeps 400,300 as the center on ALL devices.
    const containerWidth = card.offsetWidth - 40; // Padding
    const scale = Math.min(containerWidth / baseWidth, 1.0);
    
    wrapper.style.transform = `scale(${scale})`;
    
    // Ensure the card height adapts to the scaled canvas
    card.style.height = (baseHeight * scale + 100) + "px";
    
    canvas.calcOffset(); // Ensure clicks map correctly through the CSS scale
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
    offsetX: 10,
    offsetY: 10
});

// Manual Tools (v4.9.4 Definitive Centering)
window.addTextToCanvas = () => {
    if (!canvas) return;
    const text = new fabric.IText('اپنی تحریر لکھیں', {
        left: 400, // Absolute Center of 800
        top: 300,  // Absolute Center of 600
        originX: 'center',
        originY: 'center',
        fontFamily: 'Outfit',
        fill: '#1a1a1a',
        fontSize: 60,
        fontWeight: 'bold',
        shadow: proShadow
    });
    canvas.add(text);
    text.setCoords();
    canvas.setActiveObject(text);
    canvas.renderAll();
};

window.addRectToCanvas = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
        left: 400,
        top: 300,
        originX: 'center',
        originY: 'center',
        fill: '#00e5ff',
        width: 250,
        height: 200,
        rx: 20,
        ry: 20,
        shadow: proShadow,
        stroke: '#00b8d4',
        strokeWidth: 4
    });
    canvas.add(rect);
    rect.setCoords();
    canvas.setActiveObject(rect);
    canvas.renderAll();
};

window.addCircleToCanvas = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
        left: 400,
        top: 300,
        originX: 'center',
        originY: 'center',
        fill: '#ff0070',
        radius: 120,
        shadow: proShadow,
        stroke: '#c50058',
        strokeWidth: 4
    });
    canvas.add(circle);
    circle.setCoords();
    canvas.setActiveObject(circle);
    canvas.renderAll();
};

window.clearCanvas = () => {
    if (confirm("کیا آپ پورا ڈیزائن ختم کرنا چاہتے ہیں؟")) {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.renderAll();
    }
};

window.exportCanvas = () => {
    if (!canvas) return;
    // Always exports at full 800x600 resolution
    const link = document.createElement('a');
    link.download = `DesignCheck_Premium_Design_${Date.now()}.png`;
    link.href = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    link.click();
};

// AI Engine Connector (v4.9.4 Absolute Load)
window.loadDesignFromCode = (rawCode) => {
    if (!canvas) return;
    const code = rawCode || document.getElementById('aiDesignCodeInput')?.value?.trim();
    if (!code) return;

    try {
        const jsonText = code.replace(/```json|```/g, '').trim();
        const designData = JSON.parse(jsonText);
        
        canvas.loadFromJSON(designData, () => {
            // Ensure every loaded object is updated for v4.9.4 coordinates
            canvas.renderAll();
            canvas.calcOffset();
            console.log("AI Design loaded & stabilized (v4.9.4).");
        });
    } catch (e) {
        console.error("AI Load Error:", e);
    }
};
