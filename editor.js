// ================ EDITOR LOGIC (v4.9.7 - DEFINITIVE PRO UPGRADE) ================

let canvas;
const baseWidth = 800; 
const baseHeight = 600; 

// Professional Font List (50+ items)
const PRO_FONTS = [
    "Outfit", "Roboto", "Noto Nastaliq Urdu", "Arial", "Verdana", "Times New Roman", 
    "Georgia", "Impact", "Courier New", "Comic Sans MS", "Anton", "Bebas Neue", 
    "Dancing Script", "Exo 2", "Inconsolata", "Kanit", "Lobster", "Montserrat", 
    "Oswald", "Pacifico", "Playfair Display", "Quicksand", "Raleway", "Righteous", 
    "Satisfy", "Titillium Web", "Varela Round", "Abril Fatface", "Alfa Slab One", 
    "Amatic SC", "Architects Daughter", "Caveat", "Cinzel", "Comfortaa", 
    "Courgette", "Domine", "Fredoka One", "Gloria Hallelujah", "Great Vibes", 
    "Indie Flower", "Josefin Sans", "Kaushan Script", "Koushun", "Luckiest Guy", 
    "Meriweather", "Orbitron", "Permanent Marker", "Poiret One", "Press Start 2P", 
    "Sacramento", "Shadows Into Light", "Special Elite", "Yellowtail"
];

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
        
        // Unified UI Listeners
        canvas.on('selection:created', (e) => { if(e.selected[0]) syncProSidebar(e.selected[0]); });
        canvas.on('selection:updated', (e) => { if(e.selected[0]) syncProSidebar(e.selected[0]); });
        canvas.on('selection:cleared', () => clearSidebarSync());
    }
    
    populateFontList();
    bindSidebarEvents();

    // v4.9.7: Global Keyboard Deletion
    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && canvas && canvas.getActiveObject()) {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            deleteActiveObject();
        }
    });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function populateFontList() {
    const list = document.getElementById('fontListContainer');
    if (!list) return;
    list.innerHTML = "";
    
    PRO_FONTS.forEach(font => {
        const btn = document.createElement('button');
        btn.className = "font-item-btn";
        btn.innerText = font;
        btn.style.fontFamily = font;
        btn.onclick = () => applyFontToActive(font);
        list.appendChild(btn);
    });
}

function bindSidebarEvents() {
    document.getElementById('itemColorPicker')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject();
        if (obj) {
            obj.set('fill', e.target.value);
            canvas.renderAll();
        }
    });
}

function applyFontToActive(font) {
    const obj = canvas.getActiveObject();
    if (obj && obj.type === 'i-text') {
        obj.set('fontFamily', font);
        canvas.renderAll();
        
        // Update active class in list
        document.querySelectorAll('.font-item-btn').forEach(b => {
            b.classList.toggle('active', b.innerText === font);
        });
    }
}

function syncProSidebar(obj) {
    // Sync Color
    const colorPicker = document.getElementById('itemColorPicker');
    if (colorPicker && obj.fill && typeof obj.fill === 'string' && obj.fill.startsWith('#')) {
        colorPicker.value = obj.fill;
    }

    // Sync Font
    if (obj.type === 'i-text') {
        const font = obj.fontFamily;
        document.querySelectorAll('.font-item-btn').forEach(b => {
            b.classList.toggle('active', b.innerText === font);
        });
    }
}

function clearSidebarSync() {
    document.querySelectorAll('.font-item-btn').forEach(b => b.classList.remove('active'));
}

function resizeCanvas() {
    const card = document.querySelector('.canvas-card');
    const wrapper = document.querySelector('.canvas-container-wrapper');
    if (!wrapper || !card || !canvas) return;
    
    const containerWidth = card.offsetWidth - 80;
    const containerHeight = card.offsetHeight - 80;
    
    const scale = Math.min(containerWidth / baseWidth, containerHeight / baseHeight, 1.0);
    
    wrapper.style.transform = `scale(${scale})`;
    canvas.calcOffset();
}

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
        editor?.style.display = 'grid'; // Enable sidebar grid
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
    const state = window.userState || {};
    const hasAccess = state.isAdmin || state.licenseStatus === 'approved' || (Number(state.credits || 0) > 0);
    if (hasAccess) gate.classList.add('hidden');
    else gate.classList.remove('hidden');
}

window.deleteActiveObject = () => {
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
        fontFamily: 'Outfit', fill: '#1a1a1a', fontSize: 60, fontWeight: 'bold'
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
};

window.addRectToCanvas = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
        left: 400, top: 300, originX: 'center', originY: 'center',
        fill: '#00e5ff', width: 250, height: 200, rx: 20, ry: 20
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
};

window.addCircleToCanvas = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
        left: 400, top: 300, originX: 'center', originY: 'center',
        fill: '#ff0070', radius: 120
    });
    canvas.add(circle);
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
            // v4.9.7: Definitively Unlock All AI Objects
            canvas.getObjects().forEach(obj => {
                obj.set({
                    selectable: true,
                    evented: true,
                    lockMovementX: false,
                    lockMovementY: false,
                    lockScalingX: false,
                    lockScalingY: false,
                    lockRotation: false,
                    hasControls: true,
                    hasBorders: true
                });
            });
            canvas.renderAll();
            canvas.calcOffset();
            console.log("AI Design Unlocked & Loaded (v4.9.7)");
        });
    } catch (e) {
        console.error("AI Load Error:", e);
    }
};
