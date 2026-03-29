// ================ EDITOR LOGIC (v4.9.6 - FINAL STABILITY) ================

let canvas;
const baseWidth = 800; 
const baseHeight = 600; 

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
        canvas = new fabric.Canvas('designCanvas', {
            width: baseWidth,
            height: baseHeight,
            backgroundColor: '#ffffff',
            preserveObjectStacking: true,
            selection: true
        });
        window.dc_canvas = canvas; 
        
        // v4.9.6: Robust Selection Sync
        canvas.on('selection:created', (e) => { if(e.selected && e.selected[0]) syncToolbar(e.selected[0]); });
        canvas.on('selection:updated', (e) => { if(e.selected && e.selected[0]) syncToolbar(e.selected[0]); });
        canvas.on('selection:cleared', () => hideToolbar());
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
                    canvas.centerObject(img);
                    img.setCoords();
                    canvas.setActiveObject(img);
                    canvas.renderAll();
                });
            };
            reader.readAsDataURL(file);
        };
    }

    // Global Keyboard Deletion
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && canvas && canvas.getActiveObject()) {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            deleteActiveObject();
        }
    });

    // Formatting Tool Listeners
    document.getElementById('itemColorPicker')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject();
        if (obj) {
            obj.set('fill', e.target.value);
            if (obj.type === 'i-text') obj.set('stroke', null); // Text optimization
            canvas.renderAll();
        }
    });

    document.getElementById('itemFontSelector')?.addEventListener('change', (e) => {
        const obj = canvas.getActiveObject();
        if (obj && obj.type === 'i-text') {
            obj.set('fontFamily', e.target.value);
            canvas.renderAll();
        }
    });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function syncToolbar(obj) {
    const toolbar = document.getElementById('editorFormattingToolbar');
    if (!toolbar) return;
    
    toolbar.style.opacity = "1";
    toolbar.style.pointerEvents = "all";

    // Sync Color
    const colorPicker = document.getElementById('itemColorPicker');
    if (colorPicker && obj.fill && typeof obj.fill === 'string' && obj.fill.startsWith('#')) {
        colorPicker.value = obj.fill;
    }

    // Sync Font Area
    const fontArea = document.getElementById('fontSelectorArea');
    const fontSelect = document.getElementById('itemFontSelector');
    if (fontArea && fontSelect) {
        if (obj.type === 'i-text') {
            fontArea.style.display = "flex";
            fontSelect.value = obj.fontFamily || 'Outfit';
        } else {
            fontArea.style.display = "none";
        }
    }
}

function hideToolbar() {
    const toolbar = document.getElementById('editorFormattingToolbar');
    if (toolbar) {
        toolbar.style.opacity = "0.5";
        toolbar.style.pointerEvents = "none";
    }
}

function resizeCanvas() {
    const card = document.querySelector('.canvas-card');
    const wrapper = document.querySelector('.canvas-container-wrapper');
    if (!wrapper || !card || !canvas) return;
    
    const containerWidth = card.offsetWidth - 40;
    const scale = Math.min(containerWidth / baseWidth, 1.0);
    
    wrapper.style.transform = `scale(${scale})`;
    card.style.height = (baseHeight * scale + 150) + "px"; 
    
    canvas.calcOffset();
}

// v4.9.6: TAB SWITCH STABILITY
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
        
        // Critical: Update layout and access on switch
        setTimeout(() => {
            resizeCanvas();
            checkPremiumAccess();
            if (canvas) canvas.calcOffset();
        }, 100);
    }
};

function checkPremiumAccess() {
    const gate = document.getElementById('editorPremiumGate');
    if (!gate) return;
    
    // v4.9.6: Safely checking exported window.userState
    const state = window.userState || {};
    const hasAccess = state.isAdmin || 
                      state.licenseStatus === 'approved' || 
                      (Number(state.credits || 0) > 0);

    if (hasAccess) {
        gate.classList.add('hidden');
    } else {
        gate.classList.remove('hidden');
    }
}

window.deleteActiveObject = () => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) {
        canvas.remove(obj);
        canvas.discardActiveObject();
        canvas.renderAll();
    }
};

window.addTextToCanvas = () => {
    if (!canvas) return;
    const text = new fabric.IText('اپنی تحریر لکھیں', {
        left: 400, top: 300, originX: 'center', originY: 'center',
        fontFamily: 'Outfit', fill: '#1a1a1a', fontSize: 60, fontWeight: 'bold',
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 20, offsetX: 10, offsetY: 10 })
    });
    canvas.add(text);
    text.setCoords();
    canvas.setActiveObject(text);
    canvas.renderAll();
};

window.addRectToCanvas = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
        left: 400, top: 300, originX: 'center', originY: 'center',
        fill: '#00e5ff', width: 250, height: 200, rx: 20, ry: 20,
        stroke: '#00b8d4', strokeWidth: 4,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 20, offsetX: 10, offsetY: 10 })
    });
    canvas.add(rect);
    rect.setCoords();
    canvas.setActiveObject(rect);
    canvas.renderAll();
};

window.addCircleToCanvas = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
        left: 400, top: 300, originX: 'center', originY: 'center',
        fill: '#ff0070', radius: 120, stroke: '#c50058', strokeWidth: 4,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 20, offsetX: 10, offsetY: 10 })
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
    const link = document.createElement('a');
    link.download = `DesignCheck_${Date.now()}.png`;
    link.href = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    link.click();
};

window.loadDesignFromCode = (rawCode) => {
    if (!canvas) return;
    const code = rawCode || document.getElementById('aiDesignCodeInput')?.value?.trim();
    if (!code) return;

    try {
        const jsonText = code.replace(/```json|```/g, '').trim();
        const designData = JSON.parse(jsonText);
        
        canvas.loadFromJSON(designData, () => {
            canvas.renderAll();
            canvas.calcOffset();
            console.log("AI Design Loaded v4.9.6 Final Stability");
        });
    } catch (e) {
        console.error("AI Load Error:", e);
    }
};
