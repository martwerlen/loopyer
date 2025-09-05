/**
 * Enregistreur WebM pour Loopy
 * Alternative moderne Ã  GIF.js utilisant MediaRecorder API
 */

class AdvancedLoopyWebMRecorder {
    constructor(loopy) {
        this.loopy = loopy;
        this.mediaRecorder = null;
        this.isRecording = false;
        this.recordingStartTime = 0;
        this.recordedChunks = [];
        
        // ParamÃ¨tres par dÃ©faut
        this.settings = {
            duration: 10, // secondes
            fps: 30, // MediaRecorder gÃ¨re automatiquement
            quality: 1000000, // bits par seconde
            width: 1920, // Non utilisÃ© avec MediaRecorder mais gardÃ© pour l'interface
            height: 1080,
            format: 'webm' // 'webm' ou 'mp4' selon support navigateur
        };
        
        this.settingsVisible = false;
    }
    
    init() {
        // VÃ©rifier support MediaRecorder
        if (!MediaRecorder.isTypeSupported('video/webm')) {
            console.warn('WebM non supporté, tentative MP4...');
            if (!MediaRecorder.isTypeSupported('video/mp4')) {
                console.error('Enregistrement vidéo non supporté par ce navigateur');
                this.updateStatus('Enregistrement non supporté');
                return;
            }
            this.settings.format = 'mp4';
        }
        
        this.createUI();
        this.bindEvents();
        this.updateStatus('Prêt à  enregistrer (WebM)');
        console.log('WebM Recorder initialisé');
    }
    
    createUI() {
        const settingsDiv = document.getElementById('gif-settings');
        if (settingsDiv) {
            settingsDiv.innerHTML = `
                <div class="gif-settings-content">
                    <h3>Paramètres d'enregistrement vidÃ©o</h3>
                    
                    <div class="gif-setting">
                        <label>DurÃ©e (secondes):</label>
                        <input type="number" id="record-duration" min="1" max="60" value="${this.settings.duration}">
                    </div>
                    
                    <div class="gif-setting">
                        <label>QualitÃ© (bits/s):</label>
                        <select id="record-quality">
                            <option value="500000">Basse (500k)</option>
                            <option value="1000000" selected>Moyenne (1M)</option>
                            <option value="2000000">Haute (2M)</option>
                            <option value="5000000">TrÃ¨s haute (5M)</option>
                        </select>
                    </div>
                    
                    <div class="gif-setting">
                        <label>Format:</label>
                        <select id="record-format">
                            <option value="webm">WebM (recommandÃ©)</option>
                            <option value="mp4">MP4 (si supportÃ©)</option>
                        </select>
                    </div>
                    
                    <div class="gif-actions">
                        <button id="record-apply-settings" class="gif-btn">Appliquer</button>
                        <button id="record-reset-settings" class="gif-btn">RÃ©initialiser</button>
                        <button id="record-test-support" class="gif-btn">Tester support</button>
                    </div>
                </div>
            `;
        }
    }
    
    bindEvents() {
        // Bouton d'enregistrement principal
        const recordBtn = document.getElementById('gif-record-btn');
        if (recordBtn) {
            recordBtn.textContent = 'Enregistrer VidÃ©o';
            recordBtn.addEventListener('click', () => this.toggleRecording());
        }
        
        // Bouton des paramÃ¨tres
        const settingsBtn = document.getElementById('gif-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.toggleSettings());
        }
        
        // Boutons des paramÃ¨tres
        const applyBtn = document.getElementById('record-apply-settings');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applySettings());
        }
        
        const resetBtn = document.getElementById('record-reset-settings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }
        
        const testBtn = document.getElementById('record-test-support');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testSupport());
        }
        
        // Auto-application des paramÃ¨tres
        const inputs = ['record-duration', 'record-quality', 'record-format'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', () => this.applySettings());
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
        this.settings.duration = parseInt(document.getElementById('record-duration')?.value) || this.settings.duration;
        this.settings.quality = parseInt(document.getElementById('record-quality')?.value) || this.settings.quality;
        this.settings.format = document.getElementById('record-format')?.value || this.settings.format;
        
        this.updateStatus('ParamÃ¨tres appliquÃ©s');
    }
    
    resetSettings() {
        this.settings = {
            duration: 10,
            fps: 30,
            quality: 1000000,
            width: 1920,
            height: 1080,
            format: 'webm'
        };
        
        document.getElementById('record-duration').value = this.settings.duration;
        document.getElementById('record-quality').value = this.settings.quality;
        document.getElementById('record-format').value = this.settings.format;
        
        this.updateStatus('ParamÃ¨tres rÃ©initialisÃ©s');
    }
    
    testSupport() {
        const formats = ['video/webm', 'video/webm;codecs=vp9', 'video/mp4', 'video/mp4;codecs=h264'];
        const supported = formats.filter(format => MediaRecorder.isTypeSupported(format));
        
        console.log('Formats supportÃ©s:', supported);
        this.updateStatus(`Formats supportÃ©s: ${supported.length > 0 ? supported.join(', ') : 'Aucun'}`);
    }
    
    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }
    
    startRecording() {
        if (this.isRecording) return;
        
        try {
            // Obtenir le canvas de Loopy
            const loopyCanvas = document.querySelector('#canvasses canvas');
            if (!loopyCanvas) {
                this.updateStatus('Canvas non trouvÃ©');
                return;
            }
            
            // CrÃ©er le stream vidÃ©o depuis le canvas
            const stream = loopyCanvas.captureStream(this.settings.fps);
            
            // DÃ©terminer le type MIME
            let mimeType = `video/${this.settings.format}`;
            if (this.settings.format === 'webm' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                mimeType = 'video/webm;codecs=vp9';
            } else if (this.settings.format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
                mimeType = 'video/mp4;codecs=h264';
            }
            
            // Configuration MediaRecorder
            const options = {
                mimeType: mimeType,
                videoBitsPerSecond: this.settings.quality
            };
            
            console.log('Configuration enregistrement:', options);
            
            // CrÃ©er le MediaRecorder
            this.mediaRecorder = new MediaRecorder(stream, options);
            this.recordedChunks = [];
            
            // Ã‰vÃ©nements MediaRecorder
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    console.log('Chunk reÃ§u:', event.data.size, 'bytes');
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.onRecordingComplete();
            };
            
            this.mediaRecorder.onerror = (event) => {
                console.error('Erreur MediaRecorder:', event.error);
                this.updateStatus('Erreur d\'enregistrement');
                this.isRecording = false;
                this.updateRecordButton();
            };
            
            // DÃ©marrer l'enregistrement
            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            
            this.updateRecordButton();
            this.updateStatus(`Enregistrement ${this.settings.format.toUpperCase()}...`);
            
            // ArrÃªt automatique
            setTimeout(() => {
                if (this.isRecording && this.mediaRecorder.state === 'recording') {
                    this.stopRecording();
                }
            }, this.settings.duration * 1000);
            
            console.log('Enregistrement dÃ©marrÃ©');
            
        } catch (error) {
            console.error('Erreur dÃ©marrage enregistrement:', error);
            this.updateStatus('Erreur: ' + error.message);
            this.isRecording = false;
        }
    }
    
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;
        
        console.log('ArrÃªt enregistrement...');
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.updateRecordButton();
        this.updateStatus('Finalisation...');
    }
    
    onRecordingComplete() {
        console.log('Enregistrement terminÃ©, chunks:', this.recordedChunks.length);
        
        if (this.recordedChunks.length === 0) {
            this.updateStatus('Aucune donnÃ©e enregistrÃ©e');
            return;
        }
        
        // CrÃ©er le blob vidÃ©o
        const blob = new Blob(this.recordedChunks, {
            type: `video/${this.settings.format}`
        });
        
        console.log('VidÃ©o crÃ©Ã©e:', blob.size, 'bytes');
        
        // TÃ©lÃ©charger le fichier
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `loopy-animation-${Date.now()}.${this.settings.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        const duration = (Date.now() - this.recordingStartTime) / 1000;
        const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
        this.updateStatus(`VidÃ©o tÃ©lÃ©chargÃ©e ! (${duration.toFixed(1)}s, ${sizeMB} MB)`);
        
        // Nettoyer
        this.cleanup();
    }
    
    updateRecordButton() {
        const btn = document.getElementById('gif-record-btn');
        if (btn) {
            if (this.isRecording) {
                btn.textContent = 'ArrÃªter';
                btn.style.background = '#ff4444';
            } else {
                btn.textContent = 'Enregistrer VidÃ©o';
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
    
    cleanup() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
    }
}

// Auto-initialisation
(function() {
    function tryInitWebMRecorder() {
        if (typeof window !== 'undefined' && window.loopy) {
            try {
                window.loopy.webmRecorder = new AdvancedLoopyWebMRecorder(window.loopy);
                window.loopy.webmRecorder.init();
                console.log('WebM Recorder auto-initialisÃ©');
            } catch (error) {
                console.error('Erreur auto-initialisation WebM:', error);
            }
        } else {
            setTimeout(tryInitWebMRecorder, 500);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInitWebMRecorder);
    } else {
        tryInitWebMRecorder();
    }
})();