import { gif, gifBox, gifSource, gifUploadBtn, gifUploadRemove, gifUploadFile, gifUploadName, gifUploadStatus, config, GIF_DB_NAME, GIF_DB_VERSION, GIF_STORE_NAME, GIF_STORE_KEY, MAX_GIF_BYTES, SUPPORTED_GIF_TYPES, SUPPORTED_GIF_EXTENSIONS, TRANSPARENT_PIXEL, state } from './shared.js';
import { syncSettingsUI, applyTheme } from './appearance.js';
import { render } from './shortcuts.js';
import { updateSettings } from './storage.js';
import { applyCachedLayout } from './layout.js';

export function applyCachedState() {
    applyCachedLayout();
    try {
        const cachedTheme = localStorage.getItem('newtab_theme');
        if (cachedTheme) {
            applyTheme(JSON.parse(cachedTheme));
        }
    } catch (e) {}

    const cachedShowGif = localStorage.getItem('newtab_show_gif');
    if (cachedShowGif === 'false') {
        if (gifBox) gifBox.style.display = 'none';
        if (gif) gif.style.display = 'none';
    } else {
        let hasUploadedGif = false;
        try {
            hasUploadedGif = localStorage.getItem('newtab_gif_uploaded') === 'true';
        } catch (e) {}
        if (gif && !hasUploadedGif) {
            let cachedGif = localStorage.getItem('newtab_gif');
            if (cachedGif === 'gif.gif') cachedGif = 'assets/gif.gif';
            gif.src = cachedGif || 'assets/gif.gif';
        } else if (gif) {
            gif.src = TRANSPARENT_PIXEL;
        }
    }
}

export function openGifDatabase() {
    return new Promise((resolve, reject) => {
        if (!globalThis.indexedDB) {
            reject(new Error('IndexedDB is not available'));
            return;
        }

        const request = indexedDB.open(GIF_DB_NAME, GIF_DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(GIF_STORE_NAME)) {
                db.createObjectStore(GIF_STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Could not open image storage'));
    });
}

export async function gifStoreRequest(mode, action) {
    const db = await openGifDatabase();

    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            try {
                db.close();
            } catch (e) {}
            callback(value);
        };

        let transaction;
        try {
            transaction = db.transaction(GIF_STORE_NAME, mode);
        } catch (e) {
            finish(reject, e);
            return;
        }

        let request;
        try {
            request = action(transaction.objectStore(GIF_STORE_NAME));
        } catch (e) {
            finish(reject, e);
            return;
        }

        let result;
        request.onsuccess = () => {
            result = request.result;
        };
        request.onerror = () => finish(reject, request.error || new Error('Image storage error'));
        transaction.oncomplete = () => finish(resolve, result);
        transaction.onerror = () => finish(reject, transaction.error || new Error('Image storage error'));
        transaction.onabort = () => finish(reject, transaction.error || new Error('Image storage aborted'));
    });
}

export async function readUploadedGif() {
    const asset = await gifStoreRequest('readonly', store => store.get(GIF_STORE_KEY));
    if (!asset || !asset.blob) return null;
    return asset;
}

export function clearUploadedGifCache() {
    if (state.uploadedGifUrl) {
        URL.revokeObjectURL(state.uploadedGifUrl);
        state.uploadedGifUrl = null;
    }
    state.uploadedGif = null;
    try {
        localStorage.removeItem('newtab_gif_uploaded');
    } catch (e) {}
}

export function setUploadedGif(asset) {
    clearUploadedGifCache();
    state.uploadedGif = {
        name: typeof asset.name === 'string' && asset.name ? asset.name : 'uploaded image',
        type: typeof asset.type === 'string' ? asset.type : '',
        size: Number(asset.size) || 0
    };
    state.uploadedGifUrl = URL.createObjectURL(asset.blob);
    if (gif) gif.src = state.uploadedGifUrl;
}

export async function restoreUploadedGif() {
    try {
        const asset = await readUploadedGif();
        if (!asset) {
            clearUploadedGifCache();
            return;
        }
        setUploadedGif(asset);
        try {
            localStorage.setItem('newtab_gif_uploaded', 'true');
        } catch (e) {}
    } catch (e) {
        console.warn('Could not load uploaded gif:', e);
        clearUploadedGifCache();
    }
}

export function isSupportedGifFile(file) {
    const type = String(file.type || '').toLowerCase();
    if (SUPPORTED_GIF_TYPES.has(type)) return true;

    const name = String(file.name || '').toLowerCase();
    return SUPPORTED_GIF_EXTENSIONS.some(ext => name.endsWith(ext));
}

export function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function setGifUploadStatus(message, isError = false) {
    if (!gifUploadStatus) return;

    gifUploadStatus.textContent = message;
    gifUploadStatus.classList.toggle('error', Boolean(isError));

    if (state.gifUploadStatusTimer) clearTimeout(state.gifUploadStatusTimer);
    state.gifUploadStatusTimer = setTimeout(() => {
        gifUploadStatus.textContent = '';
        gifUploadStatus.classList.remove('error');
    }, 6000);
}

export function updateGifUploadUI() {
    const hasUpload = Boolean(state.uploadedGif);

    if (gifUploadName) {
        gifUploadName.textContent = hasUpload ? state.uploadedGif.name : 'no file selected';
        gifUploadName.title = hasUpload ? state.uploadedGif.name : '';
    }
    if (gifUploadRemove) gifUploadRemove.hidden = !hasUpload;
    if (gifUploadBtn) {
        gifUploadBtn.textContent = hasUpload ? 'replace' : 'choose file';
        gifUploadBtn.disabled = state.gifUploadInProgress;
    }
}

export async function handleGifUpload(file) {
    if (!file || state.gifUploadInProgress) {
        if (gifUploadFile) gifUploadFile.value = '';
        return;
    }

    try {
        if (!isSupportedGifFile(file)) {
            setGifUploadStatus('unsupported file. choose a gif, png, jpg, webp or avif image', true);
            return;
        }
        if (!file.size) {
            setGifUploadStatus('file is empty', true);
            return;
        }
        if (file.size > MAX_GIF_BYTES) {
            setGifUploadStatus(`file is too large. max size is ${formatFileSize(MAX_GIF_BYTES)}`, true);
            return;
        }

        state.gifUploadInProgress = true;
        updateGifUploadUI();
        setGifUploadStatus('saving...');

        const asset = {
            blob: file,
            name: file.name || 'uploaded image',
            type: file.type || '',
            size: file.size
        };

        await gifStoreRequest('readwrite', store => store.put(asset, GIF_STORE_KEY));
        setUploadedGif(asset);
        try {
            localStorage.setItem('newtab_gif_uploaded', 'true');
        } catch (e) {}
        syncSettingsUI();
        render(config);
        setGifUploadStatus(`using ${asset.name} (${formatFileSize(asset.size)})`);
    } catch (e) {
        console.warn('Could not save uploaded gif:', e);
        setGifUploadStatus('could not save the image. try again or use a URL.', true);
    } finally {
        state.gifUploadInProgress = false;
        updateGifUploadUI();
        if (gifUploadFile) gifUploadFile.value = '';
    }
}

export async function removeUploadedGif({ silent = false } = {}) {
    if (!state.uploadedGif && !state.uploadedGifUrl) return true;

    try {
        await gifStoreRequest('readwrite', store => store.delete(GIF_STORE_KEY));
    } catch (e) {
        console.warn('Could not delete uploaded gif:', e);
        if (!silent) setGifUploadStatus('could not remove the uploaded image', true);
        return false;
    }

    clearUploadedGifCache();
    try {
        if (config.gif) {
            localStorage.setItem('newtab_gif', config.gif);
        } else {
            localStorage.removeItem('newtab_gif');
        }
    } catch (e) {}

    syncSettingsUI();
    render(config);
    if (!silent) setGifUploadStatus('uploaded image removed');
    return true;
}

export async function applyGifSource() {
    if (!gifSource) return;

    const value = gifSource.value.trim();
    const currentConfig = config;
    const previous = config.gif;
    const hasUpload = Boolean(state.uploadedGif || state.uploadedGifUrl);

    if (hasUpload) {
        const activeDefault = config.gif || 'assets/gif.gif';
        if (value === activeDefault || (value === 'gif.gif' && activeDefault === 'assets/gif.gif')) {
            setGifUploadStatus('uploaded image is active. use remove to delete it.');
            return;
        }

    }

    const normalizedValue = value === 'gif.gif' ? 'assets/gif.gif' : value;
    const saved = await updateSettings('gif', normalizedValue);
    if (config !== currentConfig) return;
    if (!saved) {
        if (config.gif === normalizedValue) config.gif = previous;
        render(config);
        setGifUploadStatus('could not save the image URL. your uploaded image was kept. try again after resolving the save status.', true);
        return;
    }
    if (hasUpload && !await removeUploadedGif({ silent: true })) return;
    gifSource.value = config.gif;
}
