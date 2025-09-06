/**
 * Enregistreur WebM pour Loopy - Version corrigée complète
 * Conservation des options d'enregistrement avec améliorations
 */

class LoopyWebMRecorder {
    static instance = null;
    
    static getInstance(loopy) {
        if (!LoopyWebMRecorder.instance) {
            LoopyWebMRecorder.instance = new LoopyWebMRecorder(loopy);
        }
        return LoopyWebMRecorder.instance;
    }
    
    constructor(loopy) {
        if (LoopyWebMRecorder.instance) {
            return LoopyWebMRecorder.instance;
        }
        
        this.loopy = loopy;
        this.mediaRecorder = null;
        this.isRecording = false;
        this.recordingStartTime = 0;
        this.recordedChunks = [];
        this.stream = null;
        this.recordingTimer = null;
        this.canvas = null;
        this.recordingId = 0;
        
        // Paramètres par défaut
        this.settings = {
            duration: 10,
            fps: 30,
            quality: 1000000,
            format: 'webm'
        };
        
        this.settingsVisible = false;
        this.isInitialized = false;
        this.eventHandlers = new Map();
        
        // Binding des méthodes
        this.onDataAvailable = this.onDataAvailable.bind(this);
        this.onRecordingStop = this.onRecordingStop.bind(this);
        this.onRecordingError = this.onRecordingError.bind(this);
        this.onRecordingStart = this.onRecordingStart.bind(this);
        this.toggleRecording = this.toggleRecording.bind(this);
        this.toggleSettings = this.toggleSettings.bind(this);
        this.applySettings = this.applySettings.bind(this);
        this.resetSettings = this.resetSettings.bind(this);
    }
    
    async init() {
        if (this.isInitialized) {
            return true;
        }
        
        try {
            // Attendre que le DOM soit prêt
            await this.waitForDOM();
            
            if (!this.checkBrowserSupport()) {
                this.updateStatus('Enregistrement non supporté');
                return false;
            }
            
            // Créer l'interface immédiatement
            this.createUI();
            this.bindEvents();
            
            // Le canvas sera recherché au moment de l'enregistrement
            this.updateStatus('Prêt à enregistrer');
            this.isInitialized = true;
            
            console.log('WebM Recorder initialisé avec succès');
            return true;
            
        } catch (error) {
            console.error('Erreur initialisation WebM Recorder:', error);
            this.updateStatus('Erreur d\'initialisation');
            return false;
        }
    }
    
    waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                resolve();
            } else {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            }
        });
    }
    
    checkBrowserSupport() {
        if (!window.MediaRecorder) {
            console.error('MediaRecorder API non supportée');
            return false;
        }
        
        const formats = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
        const supported = formats.find(format => MediaRecorder.isTypeSupported(format));
        
        if (!supported) {
            console.error('Aucun format vidéo supporté');
            return false;
        }
        
        console.log('Format supporté:', supported);
        return true;
    }
    
    createUI() {
        const settingsDiv = document.getElementById('gif-settings');
        if (settingsDiv) {
            // S'assurer que le div est visible et stylé correctement
            settingsDiv.style.display = 'none';  // Caché par défaut
            settingsDiv.style.visibility = 'visible';
            settingsDiv.style.opacity = '1';
            
            this.createSettingsContent(settingsDiv);
        }
    }
    
    createSettingsContent(settingsDiv) {
    settingsDiv.innerHTML = `
        <div class="gif-settings-content">
            <h3>Paramètres vidéo</h3>
            
            <div class="gif-setting">
                <label>Durée (s):</label>
                <input type="number" id="record-duration" min="1" max="60" value="${this.settings.duration}">
            </div>
            
            <div class="gif-setting">
                <label>Images/seconde:</label>
                <select id="record-fps">
                    <option value="15">15 fps</option>
                    <option value="24">24 fps</option>
                    <option value="30" selected>30 fps</option>
                    <option value="60">60 fps</option>
                </select>
            </div>
            
            <div class="gif-setting">
                <label>Format:</label>
                <select id="record-format">
                    <option value="webm" selected>WebM</option>
                    <option value="mp4">MP4</option>
                </select>
            </div>
            
            <div class="gif-setting">
                <label>Qualité:</label>
                <select id="record-quality">
                    <option value="500000">Basse (500 kbps)</option>
                    <option value="1000000" selected>Moyenne (1 Mbps)</option>
                    <option value="2000000">Haute (2 Mbps)</option>
                    <option value="4000000">Très haute (4 Mbps)</option>
                </select>
            </div>
            
            <div class="gif-actions">
                <button id="record-apply-settings" class="gif-btn">Appliquer</button>
                <button id="record-reset-settings" class="gif-btn">Reset</button>
            </div>
        </div>
    `;
    
    this.bindSettingsEvents();
}
    
    bindSettingsEvents() {
        // Bouton appliquer
        const applyBtn = document.getElementById('record-apply-settings');
        if (applyBtn) {
            applyBtn.addEventListener('click', this.applySettings);
        }
        
        // Bouton reset
        const resetBtn = document.getElementById('record-reset-settings');
        if (resetBtn) {
            resetBtn.addEventListener('click', this.resetSettings);
        }
    }
    
    bindEvents() {
        // Nettoyer les anciens event listeners
        this.removeEventListeners();
        
        // Bouton d'enregistrement
        const recordBtn = document.getElementById('gif-record-btn');
        if (recordBtn) {
            recordBtn.textContent = '🔴 Enregistrer Vidéo';
            this.eventHandlers.set('record-btn', this.toggleRecording);
            recordBtn.addEventListener('click', this.toggleRecording);
        }
        
        // Bouton paramètres
        const settingsBtn = document.getElementById('gif-settings-btn');
        if (settingsBtn) {
            this.eventHandlers.set('settings-btn', this.toggleSettings);
            settingsBtn.addEventListener('click', this.toggleSettings);
        }
        
        // Bouton appliquer
        const applyBtn = document.getElementById('record-apply-settings');
        if (applyBtn) {
            this.eventHandlers.set('apply-btn', this.applySettings);
            applyBtn.addEventListener('click', this.applySettings);
        }
        
        // Bouton reset
        const resetBtn = document.getElementById('record-reset-settings');
        if (resetBtn) {
            this.eventHandlers.set('reset-btn', this.resetSettings);
            resetBtn.addEventListener('click', this.resetSettings);
        }
    }
    
    removeEventListeners() {
        const buttons = [
            { id: 'gif-record-btn', handler: 'record-btn' },
            { id: 'gif-settings-btn', handler: 'settings-btn' },
            { id: 'record-apply-settings', handler: 'apply-btn' },
            { id: 'record-reset-settings', handler: 'reset-btn' }
        ];
        
        buttons.forEach(({ id, handler }) => {
            const btn = document.getElementById(id);
            const handlerFunc = this.eventHandlers.get(handler);
            if (btn && handlerFunc) {
                btn.removeEventListener('click', handlerFunc);
            }
        });
        
        this.eventHandlers.clear();
    }
    
    toggleSettings() {
        this.settingsVisible = !this.settingsVisible;
        const settingsDiv = document.getElementById('gif-settings');
        const settingsBtn = document.getElementById('gif-settings-btn');
        
        if (settingsDiv && settingsBtn) {
            if (this.settingsVisible) {
                settingsDiv.style.display = 'block';
                settingsBtn.textContent = '❌ Masquer';
                settingsBtn.style.background = '#ff6666';
                
                // Mettre à jour les valeurs dans l'interface
                this.updateUIValues();
            } else {
                settingsDiv.style.display = 'none';
                settingsBtn.textContent = '⚙️ Options';
                settingsBtn.style.background = '#4444ff';
            }
        }
    }
    
    updateUIValues() {
        const durationInput = document.getElementById('record-duration');
        const fpsSelect = document.getElementById('record-fps');
        const qualitySelect = document.getElementById('record-quality');
        
        if (durationInput) durationInput.value = this.settings.duration;
        if (fpsSelect) fpsSelect.value = this.settings.fps;
        if (qualitySelect) qualitySelect.value = this.settings.quality;
    }
    
    applySettings() {
        const duration = document.getElementById('record-duration')?.value;
        const fps = document.getElementById('record-fps')?.value;
        const quality = document.getElementById('record-quality')?.value;
        
        if (duration) this.settings.duration = parseInt(duration);
        if (fps) this.settings.fps = parseInt(fps);
        if (quality) this.settings.quality = parseInt(quality);
        
        console.log('Nouveaux paramètres:', this.settings);
        this.updateStatus('Paramètres appliqués: ' + this.settings.duration + 's, ' + this.settings.fps + 'fps');
        
        setTimeout(() => {
            this.updateStatus('Prêt à enregistrer');
        }, 2000);
    }
    
    resetSettings() {
        this.settings = {
            duration: 10,
            fps: 30,
            quality: 1000000,
            format: 'webm'
        };
        
        this.updateUIValues();
        this.updateStatus('Paramètres réinitialisés');
        
        setTimeout(() => {
            this.updateStatus('Prêt à enregistrer');
        }, 2000);
    }
    
    async findCanvas() {
        if (this.canvas && this.canvas.parentNode) {
            return this.canvas;
        }
        
        const canvasContainer = document.getElementById('canvasses');
        if (!canvasContainer) {
            throw new Error('Container canvasses non trouvé');
        }
        
        const canvas = canvasContainer.querySelector('canvas');
        if (!canvas) {
            throw new Error('Canvas non trouvé');
        }
        
        // Attendre que le canvas ait une taille valide
        let attempts = 0;
        while ((canvas.width === 0 || canvas.height === 0) && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (canvas.width === 0 || canvas.height === 0) {
            throw new Error('Canvas invalide (taille 0)');
        }
        
        this.canvas = canvas;
        console.log('Canvas trouvé:', canvas.width, 'x', canvas.height);
        return canvas;
    }
    
    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }
    
    async startRecording() {
        if (this.isRecording) {
            console.warn('Enregistrement déjà en cours');
            return;
        }
        
        this.recordingId++;
        const currentId = this.recordingId;
        console.log('=== DÉMARRAGE ENREGISTREMENT', currentId, '===');
        
        this.forceCleanup();
        
        try {
            this.updateStatus('Initialisation...');
            
            const canvas = await this.findCanvas();
            
            // Créer le stream avec les FPS configurés
            this.stream = canvas.captureStream(this.settings.fps);
            if (!this.stream || this.stream.getTracks().length === 0) {
                throw new Error('Impossible de créer le stream');
            }
            
            console.log('Stream créé avec', this.settings.fps, 'FPS pour enregistrement', currentId);
            
            // Déterminer le format selon les paramètres utilisateur
            let mimeTypes = [];
            if (this.settings.format === 'mp4') {
                mimeTypes = [
                    'video/mp4;codecs=avc1.42E01E',
                    'video/mp4'
                ];
            } else {
                // WebM par défaut
                mimeTypes = [
                    'video/webm;codecs=vp9',
                    'video/webm;codecs=vp8', 
                    'video/webm'
                ];
            }
            
            const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
            if (!mimeType) {
                throw new Error('Format ' + this.settings.format.toUpperCase() + ' non supporté');
            }
            
            console.log('Format utilisé:', mimeType, 'pour', this.settings.format.toUpperCase());
            
            // Créer MediaRecorder avec la qualité configurée
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType,
                videoBitsPerSecond: this.settings.quality
            });
            
            this.recordedChunks = [];
            
            // Event listeners
            this.mediaRecorder.ondataavailable = (event) => this.onDataAvailable(event, currentId);
            this.mediaRecorder.onstop = () => this.onRecordingStop(currentId);
            this.mediaRecorder.onerror = (event) => this.onRecordingError(event, currentId);
            this.mediaRecorder.onstart = () => this.onRecordingStart(currentId);
            
            // Démarrer
            this.mediaRecorder.start(1000);
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            
            this.updateRecordButton();
            
            // Timer d'arrêt automatique avec durée configurée
            let timeLeft = this.settings.duration;
            this.recordingTimer = setInterval(() => {
                timeLeft--;
                this.updateStatus(`Enregistrement ${currentId}... ${timeLeft}s restantes`);
                
                if (timeLeft <= 0 && this.recordingId === currentId) {
                    this.stopRecording();
                }
            }, 1000);
            
        } catch (error) {
            console.error('Erreur démarrage:', error);
            this.updateStatus('Erreur: ' + error.message);
            this.forceCleanup();
        }
    }
    
    onDataAvailable(event, recordingId) {
        if (recordingId !== this.recordingId) {
            console.warn('Chunk ignoré - ancien enregistrement', recordingId);
            return;
        }
        
        if (event.data && event.data.size > 0) {
            this.recordedChunks.push(event.data);
            console.log('Chunk reçu:', event.data.size, 'bytes');
        }
    }
    
    onRecordingStart(recordingId) {
        if (recordingId !== this.recordingId) return;
        console.log('Enregistrement démarré:', recordingId);
    }
    
    onRecordingStop(recordingId) {
        if (recordingId !== this.recordingId) {
            console.warn('Stop ignoré - ancien enregistrement', recordingId);
            return;
        }
        
        console.log('Arrêt enregistrement:', recordingId);
        this.processRecording();
    }
    
    onRecordingError(event, recordingId) {
        if (recordingId !== this.recordingId) return;
        
        console.error('Erreur enregistrement:', event.error);
        this.updateStatus('Erreur: ' + event.error.name);
        this.forceCleanup();
    }
    
    stopRecording() {
        if (!this.isRecording) return;
        
        console.log('=== ARRÊT ENREGISTREMENT', this.recordingId, '===');
        
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        
        this.isRecording = false;
        this.updateRecordButton();
        this.updateStatus('Finalisation...');
    }
    
    async processRecording() {
    console.log('Traitement enregistrement, chunks:', this.recordedChunks.length);
    
    if (this.recordedChunks.length === 0) {
        this.updateStatus('Aucune donnée');
        this.forceCleanup();
        return;
    }
    
    try {
        const mimeType = this.mediaRecorder.mimeType || 'video/webm';
        const originalBlob = new Blob(this.recordedChunks, { type: mimeType });
        
        this.updateStatus('Ajout du fond blanc...');
        
        // Traitement avec fond blanc
        const processedBlob = await this.processVideoWithWhiteBackground(originalBlob);
        
        console.log('Blob traité:', processedBlob.size, 'bytes');
        
        if (processedBlob.size > 0) {
            this.downloadVideo(processedBlob, mimeType);
            const sizeMB = (processedBlob.size / 1024 / 1024).toFixed(2);
            this.updateStatus(`Vidéo téléchargée ! (${sizeMB} MB)`);
        } else {
            this.updateStatus('Fichier vide');
        }
        
    } catch (error) {
        console.error('Erreur traitement:', error);
        this.updateStatus('Erreur traitement: ' + error.message);
    } finally {
        setTimeout(() => this.forceCleanup(), 1000);
    }
}

    async processVideoWithWhiteBackground(videoBlob) {
    return new Promise((resolve, reject) => {
        // Créer un élément vidéo pour lire le blob
        const video = document.createElement('video');
        video.src = URL.createObjectURL(videoBlob);
        video.muted = true;
        
        // Canvas pour recomposer avec fond blanc
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // MediaRecorder pour réenregistrer
        const chunks = [];
        let mediaRecorder;
        
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Créer le stream du canvas
            const stream = canvas.captureStream(30);
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: this.mediaRecorder.mimeType,
                videoBitsPerSecond: this.settings.quality
            });
            
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            
            mediaRecorder.onstop = () => {
                const processedBlob = new Blob(chunks, { type: videoBlob.type });
                URL.revokeObjectURL(video.src);
                resolve(processedBlob);
            };
            
            // Commencer l'enregistrement
            mediaRecorder.start();
            
            // Fonction de rendu frame par frame
            const renderFrame = () => {
                if (video.ended) {
                    mediaRecorder.stop();
                    return;
                }
                
                // Fond blanc
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Vidéo par-dessus
                ctx.drawImage(video, 0, 0);
                
                requestAnimationFrame(renderFrame);
            };
            
            video.play();
            renderFrame();
        };
        
        video.onerror = reject;
    });
}
    
    downloadVideo(blob, mimeType) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        
        a.href = url;
        a.download = `loopy-${timestamp}.${extension}`;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        console.log('Téléchargement:', a.download);
    }
    
    forceCleanup() {
        console.log('Nettoyage forcé...');
        
        this.isRecording = false;
        
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        
        if (this.mediaRecorder) {
            try {
                if (this.mediaRecorder.state !== 'inactive') {
                    this.mediaRecorder.stop();
                }
            } catch (e) {
                console.warn('Erreur arrêt MediaRecorder:', e);
            }
            
            this.mediaRecorder.ondataavailable = null;
            this.mediaRecorder.onstop = null;
            this.mediaRecorder.onerror = null;
            this.mediaRecorder.onstart = null;
            this.mediaRecorder = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                if (track.readyState === 'live') {
                    track.stop();
                }
            });
            this.stream = null;
        }
        
        this.recordedChunks = [];
        this.updateRecordButton();
    }
    
    updateRecordButton() {
        const btn = document.getElementById('gif-record-btn');
        if (btn) {
            if (this.isRecording) {
                btn.textContent = '⏹️ Arrêter';
                btn.style.background = '#ff4444';
                btn.classList.add('recording');
            } else {
                btn.textContent = '🔴 Enregistrer Vidéo';
                btn.style.background = '#44ff44';
                btn.classList.remove('recording');
            }
        }
    }
    
    updateStatus(message) {
        const statusDiv = document.getElementById('gif-status');
        if (statusDiv) {
            statusDiv.textContent = message;
        }
        console.log('Status:', message);
    }
    
    getDebugInfo() {
        return {
            isRecording: this.isRecording,
            recordingId: this.recordingId,
            hasStream: !!this.stream,
            hasMediaRecorder: !!this.mediaRecorder,
            chunksCount: this.recordedChunks.length,
            canvasFound: !!this.canvas,
            isInitialized: this.isInitialized,
            settings: this.settings
        };
    }
}

// Export global
window.LoopyWebMRecorder = LoopyWebMRecorder;