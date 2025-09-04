/**********************************

GRILLE MAGNÉTIQUE ET AUTO-ARRANGEMENT GLOBAL
À ajouter dans un nouveau fichier js/enhancements.js

**********************************/

// === VARIABLES GLOBALES ===
window.LoopyEnhancements = {
    gridVisible: false,
    gridSize: 20
};

// === FONCTIONS DE GRILLE ===

// Dessiner la grille sur le canvas
function drawGrid(ctx, canvas) {
    if (!window.LoopyEnhancements.gridVisible || !LoopyNode.snapToGrid) return;
    
    ctx.save();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    
    const gridSize = LoopyNode.GRID_SIZE * 2; // *2 pour la résolution retina
    
    // Lignes verticales
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Lignes horizontales  
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    ctx.restore();
}

// === AUTO-ARRANGEMENT GLOBAL ===

// Trouve tous les composants connectés
function findConnectedComponents(nodes, edges) {
    const visited = new Set();
    const components = [];
    
    function dfs(node, component) {
        if (visited.has(node)) return;
        visited.add(node);
        component.push(node);
        
        // Trouve tous les nœuds connectés
        edges.forEach(edge => {
            if (edge.from === node && !visited.has(edge.to)) {
                dfs(edge.to, component);
            }
            if (edge.to === node && !visited.has(edge.from)) {
                dfs(edge.from, component);
            }
        });
    }
    
    nodes.forEach(node => {
        if (!visited.has(node)) {
            const component = [];
            dfs(node, component);
            if (component.length > 1) {
                components.push(component);
            }
        }
    });
    
    return components;
}

// Arrange un groupe de nœuds en cercle
function arrangeGroupInCircle(nodes) {
    if (nodes.length < 3) return;
    
    // Calcule le centre du groupe actuel
    let centerX = 0, centerY = 0;
    nodes.forEach(node => {
        centerX += node.x;
        centerY += node.y;
    });
    centerX /= nodes.length;
    centerY /= nodes.length;
    
    // Calcule le rayon basé sur le nombre de nœuds
    const radius = Math.max(120, nodes.length * 40);
    
    // Place les nœuds en cercle
    nodes.forEach((node, index) => {
        const angle = (2 * Math.PI * index) / nodes.length;
        let newX = centerX + radius * Math.cos(angle);
        let newY = centerY + radius * Math.sin(angle);
        
        // Applique la grille magnétique si activée
        if (LoopyNode.snapToGrid) {
            const snapped = LoopyNode.snapToGridPosition(newX, newY);
            newX = snapped.x;
            newY = snapped.y;
        }
        
        node.x = newX;
        node.y = newY;
    });
}

// Auto-arrangement global
function arrangeAllConnectedNodes() {
    if (!window.loopy || !window.loopy.model) return;
    
    const nodes = window.loopy.model.nodes;
    const edges = window.loopy.model.edges;
    
    if (!nodes || !edges) return;
    
    const connectedGroups = findConnectedComponents(nodes, edges);
    
    connectedGroups.forEach(group => {
        if (group.length >= 3) { // Au moins 3 nœuds pour faire un cercle
            arrangeGroupInCircle(group);
        }
    });
    
    // Forcer le rendu
    if (window.loopy.update) {
        window.loopy.update();
    }
}

// === INTERFACE UTILISATEUR ===

// Créer le bouton de grille
function createGridToggleButton() {
    const button = document.createElement('button');
    button.id = 'grid-toggle-btn';
    button.innerHTML = '⊞';
    button.title = 'Basculer la grille magnétique (Ctrl+G)';
    button.style.cssText = `
        position: absolute;
        top: 10px;
        right: 200px;
        z-index: 1000;
        padding: 8px 12px;
        background: ${LoopyNode.snapToGrid ? '#4CAF50' : 'white'};
        color: ${LoopyNode.snapToGrid ? 'white' : '#333'};
        border: 2px solid #333;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        transition: all 0.2s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    button.onclick = () => {
        LoopyNode.snapToGrid = !LoopyNode.snapToGrid;
        window.LoopyEnhancements.gridVisible = LoopyNode.snapToGrid;
        
        button.style.background = LoopyNode.snapToGrid ? '#4CAF50' : 'white';
        button.style.color = LoopyNode.snapToGrid ? 'white' : '#333';
        
        // Forcer le rendu
        if (window.loopy && window.loopy.update) {
            window.loopy.update();
        }
    };
    
    document.body.appendChild(button);
    return button;
}

// Créer le bouton d'auto-arrangement
function createAutoArrangeButton() {
    const button = document.createElement('button');
    button.id = 'auto-arrange-btn';
    button.innerHTML = '⭯';
    button.title = 'Auto-arrangement en cercle (Ctrl+Shift+A)';
    button.style.cssText = `
        position: absolute;
        top: 10px;
        right: 140px;
        z-index: 1000;
        padding: 8px 12px;
        background: white;
        color: #333;
        border: 2px solid #333;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        transition: all 0.2s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    button.onclick = () => {
        // Animation du bouton
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 100);
        
        arrangeAllConnectedNodes();
    };
    
    button.onmouseenter = () => {
        button.style.background = '#f0f0f0';
    };
    
    button.onmouseleave = () => {
        button.style.background = 'white';
    };
    
    document.body.appendChild(button);
    return button;
}

// === RACCOURCIS CLAVIER ===

function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        // Ctrl/Cmd + G pour basculer la grille
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g' && !event.shiftKey) {
            event.preventDefault();
            LoopyNode.snapToGrid = !LoopyNode.snapToGrid;
            window.LoopyEnhancements.gridVisible = LoopyNode.snapToGrid;
            
            const gridButton = document.getElementById('grid-toggle-btn');
            if (gridButton) {
                gridButton.style.background = LoopyNode.snapToGrid ? '#4CAF50' : 'white';
                gridButton.style.color = LoopyNode.snapToGrid ? 'white' : '#333';
            }
            
            if (window.loopy && window.loopy.update) {
                window.loopy.update();
            }
        }
        
        // Ctrl/Cmd + Shift + A pour auto-arrangement
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'a') {
            event.preventDefault();
            arrangeAllConnectedNodes();
        }
    });
}

// === INTÉGRATION DANS LE RENDU ===

function hookIntoLoopyRenderer() {
    // Attendre que Loopy soit chargé
    if (!window.loopy || !window.loopy.canvas) {
        setTimeout(hookIntoLoopyRenderer, 100);
        return;
    }
    
    // Hook dans la méthode de rendu existante
    const originalUpdate = window.loopy.update;
    if (originalUpdate) {
        window.loopy.update = function() {
            // Appeler la méthode originale
            const result = originalUpdate.call(this);
            
            // Dessiner la grille après
            if (this.canvas && this.canvas.getContext) {
                const ctx = this.canvas.getContext('2d');
                drawGrid(ctx, this.canvas);
            }
            
            return result;
        };
    }
    
    // Alternative : hook dans la méthode draw si update n'existe pas
    const originalDraw = window.loopy.draw;
    if (originalDraw && !originalUpdate) {
        window.loopy.draw = function() {
            // Dessiner la grille avant tout
            if (this.canvas && this.canvas.getContext) {
                const ctx = this.canvas.getContext('2d');
                drawGrid(ctx, this.canvas);
            }
            
            // Appeler le rendu original
            return originalDraw.call(this);
        };
    }
}

// === INITIALISATION ===

function initLoopyEnhancements() {
    // Initialiser l'état de la grille
    window.LoopyEnhancements.gridVisible = LoopyNode.snapToGrid;
    
    // Créer les boutons de l'interface
    createGridToggleButton();
    createAutoArrangeButton();
    
    // Initialiser les raccourcis clavier
    initKeyboardShortcuts();
    
    // Intégrer dans le système de rendu de Loopy
    hookIntoLoopyRenderer();
    
    console.log('Loopy Enhancements initialized!');
}

// === AUTO-DÉMARRAGE ===

// Initialiser quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoopyEnhancements);
} else {
    // Si le DOM est déjà chargé, attendre un peu que Loopy soit initialisé
    setTimeout(initLoopyEnhancements, 500);
}

// Exporter pour usage externe
window.LoopyEnhancements.arrangeAllConnectedNodes = arrangeAllConnectedNodes;
window.LoopyEnhancements.toggleGrid = function() {
    LoopyNode.snapToGrid = !LoopyNode.snapToGrid;
    window.LoopyEnhancements.gridVisible = LoopyNode.snapToGrid;
};