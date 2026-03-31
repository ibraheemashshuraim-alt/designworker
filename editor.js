// ================ EDITOR LOGIC (v4.18.6 - FINAL STABLE EDITION) ================

// v4.9.8: GLOBAL NAVIGATION
window.switchTab = (tab) => {
    console.log("Switching Tab to:", tab);
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
            if (typeof resizeCanvas === 'function') resizeCanvas();
            if (typeof checkPremiumAccess === 'function') checkPremiumAccess();
            if (canvas && typeof canvas.calcOffset === 'function') canvas.calcOffset();
        }, 50);
    }
};

let canvas;
const baseWidth = 800; 
const baseHeight = 600; 

// Global States
let historyUndo = [];
let historyRedo = [];
let isStateChanging = false;
let isDrawingMode = false;
let shapeToDraw = null;
let startingPoint = { x: 0, y: 0 };
let drawingObject = null;

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

// Initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initEditor());
} else {
    initEditor();
}

function initEditor() {
    try {
        if (typeof fabric === 'undefined') {
            setTimeout(initEditor, 250);
            return;
        }
        
        const canvasElement = document.getElementById('designCanvas');
        if (!canvasElement) return;

        if (!canvas) {
            canvas = new fabric.Canvas('designCanvas', {
                width: baseWidth, height: baseHeight,
                backgroundColor: '#ffffff', preserveObjectStacking: true
            });
            window.dc_canvas = canvas; 
            
            canvas.on('selection:created', (e) => { if(e.selected[0]) syncProSidebar(e.selected[0]); });
            canvas.on('selection:updated', (e) => { if(e.selected[0]) syncProSidebar(e.selected[0]); });
            canvas.on('selection:cleared', () => clearSidebarSync());

            canvas.on('object:added', () => saveState());
            canvas.on('object:modified', () => saveState());
            canvas.on('object:removed', () => saveState());
            
            saveState(); // Initial
        }
        
        populateFontList();
        bindSidebarEvents();
        setupDrawingListeners();
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Keyboard bindings
        document.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            if (e.key === 'Delete' || e.key === 'Backspace') deleteActiveObject();
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') undo();
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') redo();
        });

    } catch (err) {
        console.error("Editor Init Error:", err);
    }
}

// UI Sync
function syncProSidebar(obj) {
    const toolbar = document.getElementById('contextToolbar');
    if (!toolbar) return;
    toolbar.classList.remove('hidden');

    const groups = {
        text: document.getElementById('textToolsGroup'),
        shape: document.getElementById('shapeToolsGroup'),
        img: document.getElementById('imgToolsGroup')
    };

    Object.values(groups).forEach(g => g?.classList.add('hidden'));

    if (obj.type === 'i-text') {
        groups.text?.classList.remove('hidden');
        const fDisp = document.getElementById('selectedFontDisplay');
        if (fDisp) fDisp.value = obj.fontFamily;
    } else if (obj.type === 'image') {
        groups.img?.classList.remove('hidden');
    } else {
        groups.shape?.classList.remove('hidden');
        const sWidth = document.getElementById('shapeStrokeWidthSlider');
        if (sWidth) sWidth.value = obj.strokeWidth || 0;
    }

    const colorPicker = document.getElementById('topColorPicker');
    if (colorPicker) colorPicker.value = (typeof obj.fill === 'string' && obj.fill.startsWith('#')) ? obj.fill : '#000000';
    
    const opac = document.getElementById('opacitySlider');
    if (opac) opac.value = obj.opacity || 1;

    const bound = obj.getBoundingRect();
    toolbar.style.top = (bound.top - 80) + "px";
    toolbar.style.left = (bound.left + bound.width / 2) + "px";
}

function clearSidebarSync() {
    document.getElementById('contextToolbar')?.classList.add('hidden');
}


// AI Design Loader (v4.18.6)
window.loadDesignFromCode = async function(rawCode) {
    if (!canvas) return alert("Canvas not ready.");
    const codeBox = document.getElementById('aiDesignCodeInput');
    let code = rawCode || codeBox?.value?.trim();
    if (!code) return;

    try {
        let jsonText = code.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = jsonText.indexOf('{');
        const end = jsonText.lastIndexOf('}');
        if (start === -1) throw new Error("JSON invalid");
        jsonText = jsonText.substring(start, end + 1);
        
        const data = JSON.parse(jsonText);
        const objs = data.objects || data;
        if (!Array.isArray(objs)) return;

        isStateChanging = true;
        canvas.clear();
        canvas.backgroundColor = data.background || '#ffffff';

        objs.forEach((o, i) => {
            const type = (o.type || 'rect').toLowerCase();
            let fabObj;
            if (type.includes('text')) fabObj = new fabric.IText(o.text || 'Text', o);
            else if (type === 'rect') fabObj = new fabric.Rect(o);
            else if (type === 'circle') fabObj = new fabric.Circle(o);
            else if (type === 'image' && o.src) {
                fabric.Image.fromURL(o.src, (img) => {
                    img.set(o);
                    canvas.add(img).renderAll();
                }, { crossOrigin: 'anonymous' });
            } else {
                const Klass = fabric.util.getKlass(type);
                if (Klass) fabObj = new Klass(o);
            }

            if (fabObj) {
                fabObj.set({ selectable: true, evented: true, cornerColor: '#22d3ee' });
                canvas.add(fabObj);
            }
        });

        setTimeout(() => { canvas.renderAll(); isStateChanging = false; saveState(); }, 1500);
    } catch (e) {
        console.error("AI Load Fail:", e);
        isStateChanging = false;
    }
};

function populateFontList() {
    const list = document.getElementById('customFontListMenu');
    if (!list) return;
    list.innerHTML = "";
    PRO_FONTS.forEach(font => {
        const li = document.createElement('li');
        li.innerText = font;
        li.style.fontFamily = `"${font}"`;
        li.onclick = () => { applyFontToActive(font); list.classList.add('hidden'); };
        list.appendChild(li);
    });
}

function bindSidebarEvents() {
    document.getElementById('topColorPicker')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject();
        if (obj) { obj.set(obj.type === 'line' ? 'stroke' : 'fill', e.target.value); canvas.renderAll(); }
    });
    document.getElementById('opacitySlider')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject();
        if (obj) { obj.set('opacity', parseFloat(e.target.value)); canvas.renderAll(); }
    });
}

// Drawing Logic
window.startDrawingShape = (type) => {
    isDrawingMode = true;
    shapeToDraw = type;
    canvas.defaultCursor = 'crosshair';
    canvas.selection = false;
};

function setupDrawingListeners() {
    canvas.on('mouse:down', (o) => {
        if (!isDrawingMode) return;
        const p = canvas.getPointer(o.e);
        startingPoint = { x: p.x, y: p.y };
        const common = { left: p.x, top: p.y, fill: 'rgba(34,211,238,0.3)', stroke: '#22d3ee', strokeWidth: 2 };
        if (shapeToDraw === 'rect') drawingObject = new fabric.Rect({ ...common, width: 0, height: 0 });
        else if (shapeToDraw === 'circle') drawingObject = new fabric.Circle({ ...common, radius: 0 });
        if (drawingObject) canvas.add(drawingObject);
    });
    canvas.on('mouse:move', (o) => {
        if (!isDrawingMode || !drawingObject) return;
        const p = canvas.getPointer(o.e);
        const w = Math.abs(p.x - startingPoint.x);
        const h = Math.abs(p.y - startingPoint.y);
        if (shapeToDraw === 'rect') drawingObject.set({ width: w, height: h, left: Math.min(p.x, startingPoint.x), top: Math.min(p.y, startingPoint.y) });
        else if (shapeToDraw === 'circle') drawingObject.set({ radius: w / 2 });
        canvas.renderAll();
    });
    canvas.on('mouse:up', () => {
        if (!isDrawingMode) return;
        isDrawingMode = false;
        canvas.defaultCursor = 'default';
        canvas.selection = true;
        if (drawingObject) { drawingObject.setCoords(); canvas.setActiveObject(drawingObject); }
        drawingObject = null;
        saveState();
    });
}

// Background Removal
window.processRemoveBackground = async () => {
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== 'image') return alert("Select an image first.");
    const modal = document.getElementById('bgProcessingModal');
    if (modal) modal.style.display = 'flex';
    try {
        const blob = await fetch(obj.getSrc()).then(r => r.blob());
        const resultBlob = await imglyRemoveBackground(blob);
        const url = URL.createObjectURL(resultBlob);
        fabric.Image.fromURL(url, (newImg) => {
            newImg.set({ left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY });
            canvas.remove(obj).add(newImg).setActiveObject(newImg).renderAll();
            saveState();
            if (modal) modal.style.display = 'none';
        });
    } catch (e) {
        alert("BG Removal Error");
        if (modal) modal.style.display = 'none';
    }
};

// Utils
function applyFontToActive(font) {
    const obj = canvas.getActiveObject();
    if (obj && obj.type === 'i-text') { obj.set('fontFamily', font); canvas.renderAll(); saveState(); }
}

window.toggleTextFormat = (format) => {
    const obj = canvas.getActiveObject();
    if (!obj || obj.type !== 'i-text') return;
    if (format === 'bold') obj.set('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold');
    else if (format === 'italic') obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic');
    canvas.renderAll();
    saveState();
};

function saveState() {
    if (isStateChanging) return;
    const json = JSON.stringify(canvas.toDatalessJSON());
    if (historyUndo.length > 0 && historyUndo[historyUndo.length-1] === json) return;
    historyUndo.push(json);
    if (historyUndo.length > 50) historyUndo.shift();
    historyRedo = [];
}

window.undo = () => {
    if (historyUndo.length <= 1) return;
    isStateChanging = true;
    historyRedo.push(historyUndo.pop());
    canvas.loadFromJSON(historyUndo[historyUndo.length-1], () => { canvas.renderAll(); isStateChanging = false; });
};

window.redo = () => {
    if (historyRedo.length === 0) return;
    isStateChanging = true;
    const state = historyRedo.pop();
    historyUndo.push(state);
    canvas.loadFromJSON(state, () => { canvas.renderAll(); isStateChanging = false; });
};

function deleteActiveObject() {
    const obj = canvas.getActiveObject();
    if (obj) { canvas.remove(obj); canvas.discardActiveObject().renderAll(); saveState(); }
}

function resizeCanvas() {
    const card = document.querySelector('.canvas-card');
    const wrapper = document.querySelector('.canvas-container-wrapper');
    if (!wrapper || !card || !canvas) return;
    const scale = Math.min((card.offsetWidth-80)/baseWidth, (card.offsetHeight-80)/baseHeight, 1.0);
    wrapper.style.transform = `scale(${scale})`;
 }

window.checkPremiumAccess = () => {
    const gate = document.getElementById('editorPremiumGate');
    const state = window.userState || {};
    const hasAccess = state.isAdmin || state.licenseStatus === 'approved' || (Number(state.credits || 0) > 0);
    gate?.classList.toggle('hidden', hasAccess);
};
