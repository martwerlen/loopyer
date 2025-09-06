/**
 * Enregistreur WebM pour Loopy - Version Singleton
 * Pattern singleton strict pour éviter les instances multiples
 */

class LoopyWebMRecorder {
    static instance = null;
    static isInitializing = false;
    
    static getInstance(loopy) {
        if (!LoopyWebMRecorder.instance && !LoopyWebMRecorder.isInitializing) {
            LoopyWebMRecorder.isInitializing = true;
            LoopyWebMRecorder.instance = new LoopyWebMRecorder(loopy);
            LoopyWebMRecorder.isInitializing = false;
            console.log('Instance WebM Recorder créée');
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
        this.recordingId = 0; // Pour traquer les enregistrements
        
        // Paramètres par défaut
        this.settings = {
            duration: 10,
            fps: 30,
            quality: 1000000,
            format: 'webm'
        };
        
        this.settingsVisible = false;
        this.isInitialized = false;
        
        // Binding des méthodes pour éviter les problèmes de contexte
        this.onDataAvailable = this.onDataAvailable.bind(this);
        this.onRecordingStop = this.onRecordingStop.bind(this);
        this.onRecordingError = this.onRecordingError.bind(this);
        this.onRecordingStart = this.onRecordingStart.bind(this);
    }
    
    init() {
        if (this.isInitialized) {
            console.log('WebM Recorder déjà initialisé');
            return true;
        }
        
        if (!this.checkBrowserSupport()) {
            this.updateStatus('Enregistrement non supporté');
            return false;
        }
        
        this.createUI();
        this.bindEvents();
        this.updateStatus('Prêt à enregistrer');
        this.isInitialized = true;
        
        console.log('WebM Recorder initialisé - ID:', this.recordingId);
        return true;
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
        if (settingsDiv && settingsDiv.innerHTML.trim() === '') {
            settingsDiv.innerHTML = `
                <div class="gif-settings-content">
                    <h3>Paramètres vidéo</h3>
                    
                    <div class="gif-setting">
                        <label>Durée (s):</label>
                        <input type="number" id="record-duration" min="1" max="60" value="${this.settings.duration}">
                    </div>
                    
                    <div class="gif-setting">
                        <label>Qualité:</label>
                        <select id="record-quality">
                            <option value="500000">Basse</option>
                            <option value="1000000" selected>Moyenne</option>
                            <option value="2000000">Haute</option>
                        </select>
                    </div>
                    
                    <div class="gif-actions">
                        <button id="record-apply-settings" class="gif-btn">Appliquer</button>
                        <button id="record-reset-settings" class="gif-btn">Reset</button>
                    </div>
                </div>
            `;
        }
    }
    
    bindEvents() {
        // Supprimer les anciens event listeners s'ils existent
        this.removeEventListeners();
        
        const recordBtn = document.getElementById('gif-record-btn');
        if (recordBtn) {
            recordBtn.textContent = 'Enregistrer Vidéo';
            recordBtn.onclick = () => this.toggleRecording();
        }
        
        const settingsBtn = document.getElementById('gif-settings-btn');
        if (settingsBtn) {
            settingsBtn.onclick = () => this.toggleSettings();
        }
        
        const applyBtn = document.getElementById('record-apply-settings');
        if (applyBtn) {
            applyBtn.onclick = () => this.applySettings();
        }
        
        const resetBtn = document.getElementById('record-reset-settings');
        if (resetBtn) {
            resetBtn.onclick = () => this.resetSettings();
        }
    }
    
    removeEventListeners() {
        const buttons = ['gif-record-btn', 'gif-settings-btn', 'record-apply-settings', 'record-reset-settings'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.onclick = null;
            }
        });
    }
    
    toggleSettings() {
        this.settingsVisible = !this.settingsVisible;
        const settingsDiv = document.getElementById('gif-settings');
        const settingsBtn = document.getElementById('gif-settings-btn');
        
        if (settingsDiv && settingsBtn) {
            if (this.settingsVisible) {
                settingsDiv.style.display = 'block';
                settingsBtn.textContent = 'Masquer';
                settingsBtn.style.background = '#ff6666';
            } else {
                settingsDiv.style.display = 'none';
                settingsBtn.textContent = 'Options';
                settingsBtn.style.background = '#4444ff';
            }
        }
    }
    
    applySettings() {
        const duration = document.getElementById('record-duration')?.value;
        const quality = document.getElementById('record-quality')?.value;
        
        if (duration) this.settings.duration = parseInt(duration);
        if (quality) this.settings.quality = parseInt(quality);
        
        this.updateStatus('Paramètres appliqués');
    }
    
    resetSettings() {
        this.settings = { duration: 10, fps: 30, quality: 1000000, format: 'webm' };
        document.getElementById('record-duration').value = this.settings.duration;
        document.getElementById('record-quality').value = this.settings.quality;
        this.updateStatus('Paramètres réinitialisés');
    }
    
    findCanvas() {
        if (this.canvas && this.canvas.parentNode) {
            return this.canvas;
        }
        
        // Recherche du canvas Loopy
        const canvasContainer = document.getElementById('canvasses');
        if (!canvasContainer) {
            console.error('Container canvasses non trouvé');
            return null;
        }
        
        const canvas = canvasContainer.querySelector('canvas');
        if (!canvas) {
            console.error('Canvas non trouvé');
            return null;
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
    
    startRecording() {
        if (this.isRecording) {
            console.warn('Enregistrement déjà en cours');
            return;
        }
        
        // Incrémenter l'ID d'enregistrement
        this.recordingId++;
        const currentId = this.recordingId;
        console.log('=== DÉMARRAGE ENREGISTREMENT', currentId, '===');
        
        // Nettoyage complet avant de commencer
        this.forceCleanup();
        
        try {
            const canvas = this.findCanvas();
            if (!canvas || canvas.width === 0 || canvas.height === 0) {
                this.updateStatus('Canvas invalide');
                return;
            }
            
            // Créer le stream
            this.stream = canvas.captureStream(this.settings.fps);
            if (!this.stream || this.stream.getTracks().length === 0) {
                this.updateStatus('Impossible de créer le stream');
                return;
            }
            
            console.log('Stream créé pour enregistrement', currentId);
            
            // Déterminer le meilleur format
            const mimeTypes = [
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8', 
                'video/webm',
                'video/mp4'
            ];
            
            const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
            console.log('Format utilisé:', mimeType);
            
            // Créer MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType,
                videoBitsPerSecond: this.settings.quality
            });
            
            this.recordedChunks = [];
            
            // Event listeners avec vérification d'ID
            this.mediaRecorder.ondataavailable = (event) => this.onDataAvailable(event, currentId);
            this.mediaRecorder.onstop = () => this.onRecordingStop(currentId);
            this.mediaRecorder.onerror = (event) => this.onRecordingError(event, currentId);
            this.mediaRecorder.onstart = () => this.onRecordingStart(currentId);
            
            // Démarrer
            this.mediaRecorder.start(1000); // Chunks toutes les secondes
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            
            this.updateRecordButton();
            
            // Timer d'arrêt automatique
            let timeLeft = this.settings.duration;
            this.recordingTimer = setInterval(() => {
                timeLeft--;
                this.updateStatus(`Enregistrement ${currentId}... ${timeLeft}s`);
                
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
    
    // Event handlers avec vérification d'ID
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
    
    processRecording() {
        console.log('Traitement enregistrement, chunks:', this.recordedChunks.length);
        
        if (this.recordedChunks.length === 0) {
            this.updateStatus('Aucune donnée');
            this.forceCleanup();
            return;
        }
        
        try {
            const mimeType = this.mediaRecorder.mimeType || 'video/webm';
            const blob = new Blob(this.recordedChunks, { type: mimeType });
            
            console.log('Blob créé:', blob.size, 'bytes');
            
            if (blob.size > 0) {
                this.downloadVideo(blob, mimeType);
                const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
                this.updateStatus(`Vidéo téléchargée ! (${sizeMB} MB)`);
            } else {
                this.updateStatus('Fichier vide');
            }
            
        } catch (error) {
            console.error('Erreur traitement:', error);
            this.updateStatus('Erreur traitement: ' + error.message);
        } finally {
            // Délai avant nettoyage pour laisser le téléchargement se faire
            setTimeout(() => this.forceCleanup(), 1000);
        }
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
            
            // Nettoyer les event listeners
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
                    console.log('Track arrêté:', track.kind);
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
                btn.textContent = 'Arrêter';
                btn.style.background = '#ff4444';
            } else {
                btn.textContent = 'Enregistrer Vidéo';
                btn.style.background = '#44ff44';
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
    
    // Méthode de diagnostic
    getDebugInfo() {
        return {
            isRecording: this.isRecording,
            recordingId: this.recordingId,
            hasStream: !!this.stream,
            hasMediaRecorder: !!this.mediaRecorder,
            chunksCount: this.recordedChunks.length,
            canvasFound: !!this.findCanvas(),
            isInitialized: this.isInitialized
        };
    }
}

// Export global - PAS d'auto-initialisation
window.LoopyWebMRecorder = LoopyWebMRecorder;