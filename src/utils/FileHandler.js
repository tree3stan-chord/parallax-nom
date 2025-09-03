export class FileHandler {
    constructor(options = {}) {
        this.options = {
            acceptedTypes: ['audio/*'],
            maxFileSize: 100 * 1024 * 1024, // 100MB
            dragDropTarget: null,
            onFileSelect: null,
            onFileError: null,
            onDragOver: null,
            onDragLeave: null,
            ...options
        };
        
        this.fileInput = null;
        this.dragDropTarget = null;
        this.setupFileInput();
        
        if (this.options.dragDropTarget) {
            this.setupDragDrop(this.options.dragDropTarget);
        }
    }

    setupFileInput() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = this.options.acceptedTypes.join(',');
        this.fileInput.style.display = 'none';
        
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });
        
        document.body.appendChild(this.fileInput);
    }

    setupDragDrop(target) {
        if (typeof target === 'string') {
            this.dragDropTarget = document.querySelector(target);
        } else if (target instanceof HTMLElement) {
            this.dragDropTarget = target;
        }
        
        if (!this.dragDropTarget) {
            console.warn('Drag drop target not found');
            return;
        }
        
        this.dragDropTarget.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dragDropTarget.classList.add('drag-over');
            
            if (this.options.onDragOver) {
                this.options.onDragOver(e);
            }
        });
        
        this.dragDropTarget.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Only remove class if leaving the target itself, not child elements
            if (!this.dragDropTarget.contains(e.relatedTarget)) {
                this.dragDropTarget.classList.remove('drag-over');
                
                if (this.options.onDragLeave) {
                    this.options.onDragLeave(e);
                }
            }
        });
        
        this.dragDropTarget.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.dragDropTarget.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            const audioFiles = files.filter(file => this.isValidFile(file));
            
            if (audioFiles.length > 0) {
                this.handleFile(audioFiles[0]); // Use first valid file
            } else if (files.length > 0) {
                this.handleError(new Error('No valid audio files found'));
            }
        });
    }

    isValidFile(file) {
        // Check file type
        const typeMatch = this.options.acceptedTypes.some(type => {
            if (type === 'audio/*') {
                return file.type.startsWith('audio/');
            }
            return file.type === type;
        });
        
        if (!typeMatch) {
            return false;
        }
        
        // Check file size
        if (file.size > this.options.maxFileSize) {
            return false;
        }
        
        return true;
    }

    handleFile(file) {
        if (!this.isValidFile(file)) {
            const error = new Error(`Invalid file: ${file.name}. Must be audio file under ${Math.round(this.options.maxFileSize / 1024 / 1024)}MB`);
            this.handleError(error);
            return;
        }
        
        if (this.options.onFileSelect) {
            this.options.onFileSelect(file);
        }
    }

    handleError(error) {
        console.error('File handler error:', error);
        if (this.options.onFileError) {
            this.options.onFileError(error);
        }
    }

    openFileDialog() {
        this.fileInput.click();
    }

    destroy() {
        if (this.fileInput && this.fileInput.parentNode) {
            this.fileInput.parentNode.removeChild(this.fileInput);
        }
        
        if (this.dragDropTarget) {
            this.dragDropTarget.classList.remove('drag-over');
        }
    }
}

export function createFileInputButton(options = {}) {
    const button = document.createElement('button');
    button.textContent = options.text || 'Upload Audio File';
    button.className = options.className || 'parallax-file-button';
    
    const fileHandler = new FileHandler({
        ...options,
        onFileSelect: (file) => {
            if (options.onFileSelect) {
                options.onFileSelect(file);
            }
        }
    });
    
    button.addEventListener('click', () => {
        fileHandler.openFileDialog();
    });
    
    button.fileHandler = fileHandler;
    return button;
}
