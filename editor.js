// ================ EDITOR LOGIC (v4.9.8 - EMERGENCY RECOVERY) ================

// v4.9.8: GLOBAL NAVIGATION (MUST BE AT TOP)
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
        editor?.classList.remove('hidden'); // CSS now handles the 'display: grid'
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

// v4.11.0: UNDO/REDO STATE
let historyUndo = [];
let historyRedo = [];
let isStateChanging = false;

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
    try {
        if (typeof fabric === 'undefined') {
            console.warn("Fabric not ready, retrying...");
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
            
            canvas.on('selection:created', (e) => { if(e.selected && e.selected[0]) syncProSidebar(e.selected[0]); });
            canvas.on('selection:updated', (e) => { if(e.selected && e.selected[0]) syncProSidebar(e.selected[0]); });
            canvas.on('selection:cleared', () => clearSidebarSync());

            // UNDO/REDO LISTENERS
            canvas.on('object:added', () => saveState());
            canvas.on('object:removed', () => saveState());
            canvas.on('object:modified', () => saveState());
            canvas.on('path:created', () => saveState());
            
            // Initial state
            const initialState = JSON.stringify(canvas.toDatalessJSON());
            historyUndo = [initialState];
            updateUndoRedoUI();
        }
        
        populateFontList();
        bindSidebarEvents();
        setupDrawingListeners();

        document.addEventListener('keydown', (e) => {
            // Delete key
            if ((e.key === 'Delete' || e.key === 'Backspace') && canvas && canvas.getActiveObject()) {
                if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
                deleteActiveObject();
            }
            
            const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
            if (isInput) return;

            // Undo: Ctrl + Z
            const isUndo = (e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ') && !e.shiftKey;
            if (isUndo) {
                e.preventDefault();
                console.log("Keyboard Undo Triggered");
                if (typeof window.undo === 'function') window.undo();
            }
            
            // Redo: Ctrl + Y or Ctrl + Shift + Z
            const isRedo = ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y' || e.code === 'KeyY')) || 
                           ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ'));
            if (isRedo) {
                e.preventDefault();
                console.log("Keyboard Redo Triggered");
                if (typeof window.redo === 'function') window.redo();
            }
        });

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

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        console.log("AI Editor Initialized (v4.9.8)");
    } catch (err) {
        console.error("Editor Init Error:", err);
    }
}

function populateFontList() {
    const list = document.getElementById('customFontListMenu');
    if (!list) return;
    list.innerHTML = "";
    
    PRO_FONTS.forEach(font => {
        const li = document.createElement('li');
        li.innerText = font;
        li.style.fontFamily = `"${font}", sans-serif`;
        
        li.onmouseenter = () => {
            const obj = canvas?.getActiveObject();
            if (obj && obj.type === 'i-text') {
                if (!window.originalFontBeforeHover) {
                    window.originalFontBeforeHover = obj.fontFamily;
                }
                obj.set('fontFamily', font);
                canvas.renderAll();
            }
        };
        
        li.onclick = (e) => {
            e.stopPropagation();
            applyFontToActive(font);
            window.originalFontBeforeHover = font; // Save permanently
            document.getElementById('selectedFontDisplay').value = font;
            document.getElementById('customFontListMenu').classList.add('hidden');
            window.fontDropdownOpen = false;
        };
        
        list.appendChild(li);
    });
}

function bindSidebarEvents() {
    document.getElementById('topColorPicker')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject();
        if (obj) {
            if (obj.type === 'line') {
                obj.set('stroke', e.target.value);
            } else {
                obj.set('fill', e.target.value);
            }
            canvas.renderAll();
        }
    });

    document.getElementById('opacitySlider')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject();
        if (obj) {
            obj.set('opacity', parseFloat(e.target.value));
            canvas.renderAll();
        }
    });

    // NEW: Border (Stroke) Color
    document.getElementById('shapeStrokeColorPicker')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject();
        if (obj && obj.type !== 'i-text' && obj.type !== 'image') {
            obj.set('stroke', e.target.value);
            canvas.renderAll();
        }
    });

    // NEW: Border (Stroke) Width
    document.getElementById('shapeStrokeWidthSlider')?.addEventListener('input', (e) => {
        const obj = canvas.getActiveObject();
        if (obj && obj.type !== 'i-text' && obj.type !== 'image') {
            obj.set('strokeWidth', parseInt(e.target.value, 10));
            // Ensure stroke color exists if width > 0 and no stroke was set
            if (parseInt(e.target.value, 10) > 0 && !obj.stroke) {
                const color = document.getElementById('shapeStrokeColorPicker')?.value || '#000000';
                obj.set('stroke', color);
            }
            canvas.renderAll();
        }
    });
}

// ==== UI DROPDOWNS ==== //
window.originalFontBeforeHover = null;
window.fontDropdownOpen = false;

window.toggleFontDropdown = (e) => {
    e.stopPropagation();
    const menu = document.getElementById('customFontListMenu');
    if (menu) {
        menu.classList.toggle('hidden');
        window.fontDropdownOpen = !menu.classList.contains('hidden');
    }
};

window.toggleShapesMenu = (e) => {
    e.stopPropagation();
    const menu = document.getElementById('shapesDropdownMenu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
};

document.addEventListener('click', (e) => {
    // Font dropdown
    if (window.fontDropdownOpen && !e.target.closest('.font-dropdown-wrapper')) {
        document.getElementById('customFontListMenu')?.classList.add('hidden');
        window.fontDropdownOpen = false;
        
        // Restore original font if user hovered but didn't click
        const obj = canvas?.getActiveObject();
        if (obj && obj.type === 'i-text' && window.originalFontBeforeHover) {
            obj.set('fontFamily', window.originalFontBeforeHover);
            canvas.renderAll();
        }
    }
    
    // Shapes dropdown
    const shapesMenu = document.getElementById('shapesDropdownMenu');
    if (shapesMenu && !shapesMenu.classList.contains('hidden') && !e.target.closest('.editor-tools-grid')) {
        shapesMenu.classList.add('hidden');
    }
});

window.applyFontToActive = (font) => {
    const obj = canvas.getActiveObject();
    if (obj && obj.type === 'i-text') {
        obj.set('fontFamily', font);
        canvas.renderAll();
    }
};

window.toggleTextFormat = (format) => {
    const obj = canvas.getActiveObject();
    if (obj && obj.type === 'i-text') {
        if (format === 'bold') {
            obj.set('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold');
            document.getElementById('boldBtn').classList.toggle('active', obj.fontWeight === 'bold');
        } else if (format === 'italic') {
            obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic');
            document.getElementById('italicBtn').classList.toggle('active', obj.fontStyle === 'italic');
        }
        canvas.renderAll();
    }
};

function syncProSidebar(obj) {
    const toolbar = document.getElementById('contextToolbar');
    const textGroup = document.getElementById('textToolsGroup');
    const colorGroup = document.getElementById('colorToolsGroup');
    const imgGroup = document.getElementById('imgToolsGroup');
    const shapeGroup = document.getElementById('shapeToolsGroup');
    
    if (!toolbar) return;
    
    toolbar.classList.remove('hidden');
    textGroup.classList.add('hidden');
    colorGroup.classList.add('hidden');
    imgGroup.classList.add('hidden');
    if (shapeGroup) shapeGroup.classList.add('hidden');

    const topColor = document.getElementById('topColorPicker');

    if (obj.type === 'i-text') {
        textGroup.classList.remove('hidden');
        colorGroup.classList.remove('hidden');
        
        if (topColor && obj.fill && typeof obj.fill === 'string' && obj.fill.startsWith('#')) {
            topColor.value = obj.fill;
        }
        
        const topFont = document.getElementById('selectedFontDisplay');
        if (topFont) topFont.value = obj.fontFamily;
        window.originalFontBeforeHover = obj.fontFamily;
        
        document.getElementById('boldBtn')?.classList.toggle('active', obj.fontWeight === 'bold');
        document.getElementById('italicBtn')?.classList.toggle('active', obj.fontStyle === 'italic');
        
    } else if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'triangle' || obj.type === 'path' || obj.type === 'polygon' || obj.type === 'line') {
        colorGroup.classList.remove('hidden');
        if (shapeGroup) shapeGroup.classList.remove('hidden');
        
        if (topColor && obj.type === 'line') {
            topColor.value = obj.stroke || '#ffffff';
        } else if (topColor && obj.fill && typeof obj.fill === 'string' && obj.fill.startsWith('#')) {
            topColor.value = obj.fill;
        }

        // Sync stroke inputs
        const strokeColor = document.getElementById('shapeStrokeColorPicker');
        const strokeWidth = document.getElementById('shapeStrokeWidthSlider');
        if (strokeColor) strokeColor.value = (typeof obj.stroke === 'string' && obj.stroke.startsWith('#')) ? obj.stroke : '#ffffff';
        if (strokeWidth) strokeWidth.value = obj.strokeWidth || 0;

    } else if (obj.type === 'image') {
        imgGroup.classList.remove('hidden');
        colorGroup.classList.remove('hidden'); // allow opacity on image
    }

    const opacitySlider = document.getElementById('opacitySlider');
    if (opacitySlider) opacitySlider.value = obj.opacity !== undefined ? obj.opacity : 1;
}

function clearSidebarSync() {
    document.getElementById('contextToolbar')?.classList.add('hidden');
}

// ==== DRAWING MODE SYSTEM ==== //
let isDrawingMode = false;
let shapeToDraw = null;
let startingPoint = null;
let drawingObject = null;

function setupDrawingListeners() {
    canvas.on('mouse:down', function(o) {
        if (!isDrawingMode || !shapeToDraw) return;
        
        const pointer = canvas.getPointer(o.e);
        startingPoint = { x: pointer.x, y: pointer.y };

        if (shapeToDraw === 'rect') {
            drawingObject = new fabric.Rect({
                left: startingPoint.x, top: startingPoint.y,
                originX: 'left', originY: 'top',
                width: 0, height: 0,
                fill: '#00e5ff', rx: 10, ry: 10,
                selectable: false, evented: false
            });
            canvas.add(drawingObject);
        } else if (shapeToDraw === 'circle') {
            drawingObject = new fabric.Circle({
                left: startingPoint.x, top: startingPoint.y,
                originX: 'center', originY: 'center',
                radius: 0, fill: '#ff0070',
                selectable: false, evented: false
            });
            canvas.add(drawingObject);
        } else if (shapeToDraw === 'triangle') {
            drawingObject = new fabric.Triangle({
                left: startingPoint.x, top: startingPoint.y,
                originX: 'left', originY: 'top',
                width: 0, height: 0,
                fill: '#ffbb00',
                selectable: false, evented: false
            });
            canvas.add(drawingObject);
        } else if (shapeToDraw === 'line') {
            drawingObject = new fabric.Line([startingPoint.x, startingPoint.y, startingPoint.x, startingPoint.y], {
                stroke: '#1a1a1a', strokeWidth: 5,
                selectable: false, evented: false
            });
            canvas.add(drawingObject);
        }
    });

    canvas.on('mouse:move', function(o) {
        if (!isDrawingMode || !drawingObject) return;
        
        const pointer = canvas.getPointer(o.e);

        if (shapeToDraw === 'rect' || shapeToDraw === 'triangle') {
            const w = Math.abs(pointer.x - startingPoint.x);
            const h = Math.abs(pointer.y - startingPoint.y);
            
            drawingObject.set({
                width: w,
                height: h,
                left: Math.min(pointer.x, startingPoint.x),
                top: Math.min(pointer.y, startingPoint.y)
            });
        } else if (shapeToDraw === 'circle') {
            const radius = Math.max(Math.abs(pointer.x - startingPoint.x), Math.abs(pointer.y - startingPoint.y)) / 2;
            drawingObject.set({ radius: radius });
        } else if (shapeToDraw === 'line') {
            drawingObject.set({ x2: pointer.x, y2: pointer.y });
        }
        canvas.renderAll();
    });

    canvas.on('mouse:up', function(o) {
        if (!isDrawingMode || !drawingObject) return;

        drawingObject.set({
            selectable: true,
            evented: true
        });
        drawingObject.setCoords();
        
        // Stop drawing mode
        isDrawingMode = false;
        shapeToDraw = null;
        drawingObject = null;
        document.querySelector('.canvas-card').classList.remove('drawing-mode');
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
        
        // Re-enable selection
        canvas.selection = true;
        canvas.getObjects().forEach(obj => obj.set('selectable', true));
    });
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

window.checkPremiumAccess = () => {
    const gate = document.getElementById('editorPremiumGate');
    if (!gate) return;
    const state = window.userState || {};
    const hasAccess = state.isAdmin || state.licenseStatus === 'approved' || (Number(state.credits || 0) > 0);
    if (hasAccess) gate.classList.add('hidden');
    else gate.classList.remove('hidden');
};

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
        fontFamily: 'Outfit', fill: '#1a1a1a', fontSize: 60, fontWeight: 'bold'
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
};

window.startDrawingShape = (shapeType) => {
    if (!canvas) return;
    
    // Hide dropdown
    document.getElementById('shapesDropdownMenu')?.classList.add('hidden');
    
    isDrawingMode = true;
    shapeToDraw = shapeType;
    
    document.querySelector('.canvas-card').classList.add('drawing-mode');
    canvas.defaultCursor = 'crosshair';
    canvas.hoverCursor = 'crosshair';
    
    // Disable selection while drawing
    canvas.selection = false;
    canvas.discardActiveObject();
    canvas.renderAll();
};

window.duplicateObject = () => {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    activeObject.clone((clonedObj) => {
        canvas.discardActiveObject();
        clonedObj.set({
            left: clonedObj.left + 20,
            top: clonedObj.top + 20,
            evented: true,
        });
        if (clonedObj.type === 'activeSelection') {
            clonedObj.canvas = canvas;
            clonedObj.forEachObject((obj) => canvas.add(obj));
            clonedObj.setCoords();
        } else {
            canvas.add(clonedObj);
        }
        canvas.setActiveObject(clonedObj);
        canvas.requestRenderAll();
        saveState(); // Capture duplication
    });
};

// ==== UNDO / REDO SYSTEM ==== //
window.saveState = () => {
    if (isStateChanging) return;
    if (!canvas) return;
    
    const json = JSON.stringify(canvas.toDatalessJSON());
    
    // Only push if different from last state
    if (historyUndo.length > 0 && historyUndo[historyUndo.length - 1] === json) return;

    historyUndo.push(json);
    if (historyUndo.length > 50) historyUndo.shift(); // Limit to 50
    historyRedo = []; // Clear redo on new action
    
    // Update UI buttons if they exist
    updateUndoRedoUI();
};

window.undo = () => {
    if (historyUndo.length <= 1) return; // Need at least 1 state to go back
    
    isStateChanging = true;
    const currentState = historyUndo.pop();
    historyRedo.push(currentState);
    
    const lastState = historyUndo[historyUndo.length - 1];
    
    canvas.loadFromJSON(lastState, () => {
        canvas.renderAll();
        isStateChanging = false;
        updateUndoRedoUI();
    });
};

window.redo = () => {
    if (historyRedo.length === 0) return;
    
    isStateChanging = true;
    const nextState = historyRedo.pop();
    historyUndo.push(nextState);
    
    canvas.loadFromJSON(nextState, () => {
        canvas.renderAll();
        isStateChanging = false;
        updateUndoRedoUI();
    });
};

function updateUndoRedoUI() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn) undoBtn.classList.toggle('disabled', historyUndo.length <= 1);
    if (redoBtn) redoBtn.classList.toggle('disabled', historyRedo.length === 0);
}

window.bringForward = () => {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
        canvas.bringForward(activeObject);
        canvas.renderAll();
    }
};

window.sendBackward = () => {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
        canvas.sendBackwards(activeObject);
        canvas.renderAll();
    }
};

window.processRemoveBackground = async () => {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') {
        alert("براہ کرم کسی تصویر کو منتخب کریں۔");
        return;
    }

    const modal = document.getElementById('bgProcessingModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    try {
        const url = activeObject.getSrc();
        
        // Call @imgly/background-removal
        const blob = await imglyRemoveBackground(url);
        
        const fr = new FileReader();
        fr.onload = (e) => {
            const newRes = e.target.result;
            fabric.Image.fromURL(newRes, (newImg) => {
                newImg.set({
                    left: activeObject.left,
                    top: activeObject.top,
                    scaleX: activeObject.scaleX,
                    scaleY: activeObject.scaleY,
                    angle: activeObject.angle
                });
                
                canvas.add(newImg);
                canvas.remove(activeObject);
                canvas.setActiveObject(newImg);
                canvas.renderAll();
                
                if (modal) {
                    modal.classList.add('hidden');
                    modal.style.display = 'none';
                }
            });
        };
        fr.readAsDataURL(blob);

    } catch (e) {
        console.error(e);
        alert("بیک گراؤنڈ ہٹانے میں مسئلہ ہوا۔ براؤزر ماڈل ڈاؤنلوڈ کرنے میں ناکام رہا۔");
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }
};

window.clearCanvas = () => {
    if (confirm("کیا آپ پورا ڈیزائن ختم کرنا چاہتے ہیں؟")) {
        if(canvas) {
            canvas.clear();
            canvas.backgroundColor = '#ffffff';
            canvas.renderAll();
        }
    }
};

window.exportCanvas = () => {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `DesignCheck_${Date.now()}.png`;
    link.href = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    link.click();
};

window.loadDesignFromCode = async function(rawCode) {
    if (!canvas) {
        alert("Canvas error. Please refresh.");
        return;
    }
    
    isStateChanging = false; 
    const codeBox = document.getElementById('aiDesignCodeInput');
    let code = rawCode || codeBox?.value?.trim();
    
    if (!code || code.includes("انتظر")) return;

    // Show processing modal for Magic BG removal
    const bgModal = document.getElementById('bgProcessingModal');
    if (bgModal) {
        bgModal.classList.remove('hidden');
        bgModal.style.display = 'flex';
    }

    try {
        let jsonText = code.trim();
        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const start = jsonText.indexOf('{');
        const end = jsonText.lastIndexOf('}');
        
        if (start === -1) {
             const arrStart = jsonText.indexOf('[');
             const arrEnd = jsonText.lastIndexOf(']');
             if (arrStart !== -1 && arrEnd !== -1) {
                 jsonText = `{ "objects": ${jsonText.substring(arrStart, arrEnd + 1)} }`;
             } else {
                 throw new Error("No JSON found.");
             }
        } else {
            jsonText = jsonText.substring(start, end + 1);
        }
        
        const data = JSON.parse(jsonText);
        const objs = data.objects || data;

        if (!Array.isArray(objs)) throw new Error("No objects found.");

        isStateChanging = true;
        canvas.clear();
        canvas.backgroundColor = data.background || data.backgroundColor || '#ffffff';
        
        let totalItems = objs.length;
        let processedItems = 0;

        for (let i = 0; i < objs.length; i++) {
            const o = objs[i];
            try {
                if (typeof o.left !== 'number') o.left = 100 + (i * 20);
                if (typeof o.top !== 'number') o.top = 100 + (i * 20);
                
                const type = (o.type || 'rect').toLowerCase();

                if (type.includes('text') || type === 'rect' || type === 'circle' || type === 'triangle' || type === 'ellipse') {
                    let fabObj;
                    if (type.includes('text')) fabObj = new fabric.IText(o.text || 'Text', o);
                    else if (type === 'rect') fabObj = new fabric.Rect(o);
                    else if (type === 'circle') fabObj = new fabric.Circle(o);
                    else if (type === 'triangle') fabObj = new fabric.Triangle(o);
                    else if (type === 'ellipse') fabObj = new fabric.Ellipse(o);
                    
                    if (fabObj) {
                        applyDefaultStyles(fabObj);
                        canvas.add(fabObj);
                    }
                    processedItems++;
                } 
                else if (type === 'image' && o.src) {
                    // MAGIC: Auto Background Removal for AI Images
                    try {
                        const blob = await imglyRemoveBackground(o.src);
                        const reader = new FileReader();
                        await new Promise((resolve) => {
                            reader.onload = async (e) => {
                                fabric.Image.fromURL(e.target.result, (img) => {
                                    img.set(o);
                                    applyDefaultStyles(img);
                                    canvas.add(img);
                                    // Move to Front if it's a logo style keyword
                                    if (o.src.toLowerCase().includes('logo') || o.src.toLowerCase().includes('burger')) {
                                        canvas.bringToFront(img);
                                    }
                                    resolve();
                                }, { crossOrigin: 'anonymous' });
                            };
                            reader.readAsDataURL(blob);
                        });
                    } catch (bgE) {
                        console.warn("Auto BG Removal failed, loading as-is:", bgE);
                        await new Promise((resolve) => {
                            fabric.Image.fromURL(o.src, (img) => {
                                img.set(o);
                                applyDefaultStyles(img);
                                canvas.add(img);
                                resolve();
                            }, { crossOrigin: 'anonymous' });
                        });
                    }
                    processedItems++;
                } else {
                    const Klass = fabric.util.getKlass(type);
                    if (Klass) {
                        const generic = new Klass(o);
                        applyDefaultStyles(generic);
                        canvas.add(generic);
                    }
                    processedItems++;
                }
                
                canvas.renderAll();
                if (processedItems >= totalItems) finalizeLoad();
            } catch (e) {
                console.error("Obj load fail:", e);
                processedItems++;
            }
        }

        function applyDefaultStyles(obj) {
            obj.set({
                selectable: true,
                evented: true,
                cornerColor: 'var(--neon-cyan)',
                transparentCorners: false,
                cornerStyle: 'circle'
            });
            if (obj.type && obj.type.includes('text')) {
                obj.set({ originX: 'center', originY: 'center' });
            }
        }

        function finalizeLoad() {
            if (bgModal) {
                bgModal.classList.add('hidden');
                bgModal.style.display = 'none';
            }
            canvas.renderAll();
            canvas.calcOffset();
            isStateChanging = false;
            saveState();
        }

        // Safety timeout
        setTimeout(finalizeLoad, 10000);

    } catch (e) {
        if (bgModal) {
            bgModal.classList.add('hidden');
            bgModal.style.display = 'none';
        }
        isStateChanging = false;
        console.error("LOAD FATAL:", e);
    }
};
