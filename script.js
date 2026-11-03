const input = document.getElementById('find-input');
const badge = document.getElementById('engine-badge');
const gif = document.getElementById('preview-gif');
const gifBox = document.querySelector('.gif-box');
const grid = document.getElementById('links-grid');

const showSearchAreaCheck = document.getElementById('show-search-area');
const showGifCheck = document.getElementById('show-gif');
const gifSource = document.getElementById('gif-source');
const gifDone = document.getElementById('gif-done');
const gifUploadBtn = document.getElementById('gif-upload-btn');
const gifUploadRemove = document.getElementById('gif-upload-remove');
const gifUploadFile = document.getElementById('gif-upload-file');
const gifUploadName = document.getElementById('gif-upload-name');
const gifUploadStatus = document.getElementById('gif-upload-status');

const bgColorPicker = document.getElementById('bg-color-picker');
const bgColorInput = document.getElementById('bg-color');
const textColorPicker = document.getElementById('text-color-picker');
const textColorInput = document.getElementById('text-color');
const fontSelect = document.getElementById('font-select');
const autohideSettingsCheck = document.getElementById('autohide-settings');

const categoryTogglesContainer = document.getElementById('category-toggles');
const categoriesEditorContainer = document.getElementById('categories-editor');
const addCategoryBtn = document.getElementById('add-category-btn');

const openSettingsBtn = document.getElementById('open-settings');
const closeSettingsBtn = document.getElementById('close-settings');
const settingsModal = document.getElementById('settings');

const exportSettingsBtn = document.getElementById('export-settings');
const importSettingsBtn = document.getElementById('import-settings');
const importSettingsFile = document.getElementById('import-settings-file');
const backupStatus = document.getElementById('backup-status');

const browserApi = globalThis.browser ?? globalThis.chrome;
const FALLBACK_SETTINGS = {
    'show-search-area': true,
    'show-gif': true,
    'autohide-settings': false
};
const FALLBACK_THEME = {
    bg: '#191919',
    text: '#fafafa',
    font: 'Departure Mono'
};
let config = {};
let defaultConfig = {};
let draggedCategoryIndex = null;
let draggedShortcut = null;
let backupStatusTimer = null;
let gifUploadStatusTimer = null;
let uploadedGif = null;
let uploadedGifUrl = null;
let gifUploadInProgress = false;

const GIF_DB_NAME = 'chromium-newtab-assets';
const GIF_DB_VERSION = 1;
const GIF_STORE_NAME = 'assets';
const GIF_STORE_KEY = 'gif';
const MAX_GIF_BYTES = 10 * 1024 * 1024;
const SUPPORTED_GIF_TYPES = new Set([
    'image/gif',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/avif'
]);
const SUPPORTED_GIF_EXTENSIONS = ['.gif', '.png', '.jpg', '.jpeg', '.webp', '.avif'];
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function applyCachedState() {
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
            const cachedGif = localStorage.getItem('newtab_gif');
            gif.src = cachedGif || 'gif.gif';
        } else if (gif) {
            gif.src = TRANSPARENT_PIXEL;
        }
    }
}
applyCachedState();

function openGifDatabase() {
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

async function gifStoreRequest(mode, action) {
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

async function readUploadedGif() {
    const asset = await gifStoreRequest('readonly', store => store.get(GIF_STORE_KEY));
    if (!asset || !asset.blob) return null;
    return asset;
}

function clearUploadedGifCache() {
    if (uploadedGifUrl) {
        URL.revokeObjectURL(uploadedGifUrl);
        uploadedGifUrl = null;
    }
    uploadedGif = null;
    try {
        localStorage.removeItem('newtab_gif_uploaded');
    } catch (e) {}
}

function setUploadedGif(asset) {
    clearUploadedGifCache();
    uploadedGif = {
        name: typeof asset.name === 'string' && asset.name ? asset.name : 'uploaded image',
        type: typeof asset.type === 'string' ? asset.type : '',
        size: Number(asset.size) || 0
    };
    uploadedGifUrl = URL.createObjectURL(asset.blob);
    if (gif) gif.src = uploadedGifUrl;
}

async function restoreUploadedGif() {
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

function isSupportedGifFile(file) {
    const type = String(file.type || '').toLowerCase();
    if (SUPPORTED_GIF_TYPES.has(type)) return true;

    const name = String(file.name || '').toLowerCase();
    return SUPPORTED_GIF_EXTENSIONS.some(ext => name.endsWith(ext));
}

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function setGifUploadStatus(message, isError = false) {
    if (!gifUploadStatus) return;

    gifUploadStatus.textContent = message;
    gifUploadStatus.classList.toggle('error', Boolean(isError));

    if (gifUploadStatusTimer) clearTimeout(gifUploadStatusTimer);
    gifUploadStatusTimer = setTimeout(() => {
        gifUploadStatus.textContent = '';
        gifUploadStatus.classList.remove('error');
    }, 6000);
}

function updateGifUploadUI() {
    const hasUpload = Boolean(uploadedGif);

    if (gifUploadName) {
        gifUploadName.textContent = hasUpload ? uploadedGif.name : 'no file selected';
        gifUploadName.title = hasUpload ? uploadedGif.name : '';
    }
    if (gifUploadRemove) gifUploadRemove.hidden = !hasUpload;
    if (gifUploadBtn) {
        gifUploadBtn.textContent = hasUpload ? 'replace' : 'choose file';
        gifUploadBtn.disabled = gifUploadInProgress;
    }
}

async function handleGifUpload(file) {
    if (!file || gifUploadInProgress) {
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

        gifUploadInProgress = true;
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
        gifUploadInProgress = false;
        updateGifUploadUI();
        if (gifUploadFile) gifUploadFile.value = '';
    }
}

async function removeUploadedGif({ silent = false } = {}) {
    if (!uploadedGif && !uploadedGifUrl) return true;

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

async function applyGifSource() {
    if (!gifSource) return;

    const value = gifSource.value.trim();

    if (uploadedGif || uploadedGifUrl) {
        if (value === (config.gif || 'gif.gif')) {
            setGifUploadStatus('uploaded image is active. use remove to delete it.');
            return;
        }

        const removed = await removeUploadedGif({ silent: true });
        if (!removed) return;
    }

    await updateSettings('gif', value);
}

async function init() {
    try {
        const res = await fetch('config.json');
        if (res.ok) {
            config = await res.json();
            defaultConfig = JSON.parse(JSON.stringify(config));
        }
    } catch (e) {
        console.warn('Could not fetch config.json:', e);
    }

    if (browserApi?.storage?.local) {
        try {
            const saved = await browserApi.storage.local.get('config');
            if (saved?.config) {
                config = {
                    ...config,
                    ...saved.config,
                    settings: {
                        ...(config.settings || {}),
                        ...(saved.config.settings || {})
                    },
                    theme: {
                        ...(config.theme || {}),
                        ...(saved.config.theme || {})
                    },
                    sections: saved.config.sections || config.sections
                };
            }
        } catch (e) {
            console.warn('Could not read storage:', e);
        }
    }

    if (!config.settings) {
        config.settings = { ...FALLBACK_SETTINGS };
    }

    if (!config.theme) {
        config.theme = { ...FALLBACK_THEME };
    }

    if (!Array.isArray(config.sections)) {
        config.sections = [];
    }

    if (!Object.keys(defaultConfig).length) {
        defaultConfig = {
            settings: { ...FALLBACK_SETTINGS },
            theme: { ...FALLBACK_THEME },
            sections: []
        };
    }

    delete config.settings.gif;
    if (defaultConfig.settings) delete defaultConfig.settings.gif;

    await restoreUploadedGif();
    syncSettingsUI();
    render(config);
    renderCategoryToggles();
    renderCategoriesEditor();
}

function syncSettingsUI() {
    if (!config.settings) config.settings = {};
    if (!config.theme) config.theme = {};

    if (showSearchAreaCheck) showSearchAreaCheck.checked = Boolean(config.settings['show-search-area']);
    if (showGifCheck) showGifCheck.checked = Boolean(config.settings['show-gif']);
    if (gifSource) gifSource.value = config.gif || 'gif.gif';
    if (autohideSettingsCheck) autohideSettingsCheck.checked = Boolean(config.settings['autohide-settings']);

    updateGifUploadUI();
    applyAutohide(config.settings['autohide-settings']);
    applyTheme(config.theme);
}

function applyTheme(theme) {
    if (!theme) return;
    try {
        localStorage.setItem('newtab_theme', JSON.stringify(theme));
    } catch (e) {}
    const root = document.documentElement;
    if (theme.bg) {
        root.style.setProperty('--bg', theme.bg);
        if (bgColorInput) bgColorInput.value = theme.bg;
        if (bgColorPicker && /^#[0-9a-f]{6}$/i.test(theme.bg)) {
            bgColorPicker.value = theme.bg;
        }
    }
    if (theme.text) {
        root.style.setProperty('--foreground', theme.text);
        if (textColorInput) textColorInput.value = theme.text;
        if (textColorPicker && /^#[0-9a-f]{6}$/i.test(theme.text)) {
            textColorPicker.value = theme.text;
        }
    }
    if (theme.font) {
        const fontMap = {
            'Departure Mono': "'Departure Mono', monospace",
            'Maple Mono': "'Maple Mono', monospace",
            'monospace': 'monospace',
            'sans-serif': 'system-ui, -apple-system, sans-serif',
            'serif': 'Georgia, serif'
        };
        root.style.setProperty('--font', fontMap[theme.font] || theme.font);
        if (fontSelect) fontSelect.value = theme.font;
    }
}

function applyAutohide(enable) {
    if (openSettingsBtn) {
        openSettingsBtn.classList.toggle('autohide', Boolean(enable));
    }
}

function updateTheme(key, value) {
    if (!config.theme) config.theme = {};
    config.theme[key] = value;
    applyTheme(config.theme);
    saveConfig();
}

function sectionKey(title) {
    const slug = String(title ?? '')
        .normalize('NFC')
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '');
    return `show-${slug || 'untitled'}`;
}

function legacySectionKey(title) {
    return `show-${String(title ?? '').toLowerCase()}`;
}

function isSectionVisible(settings, title) {
    const key = sectionKey(title);
    if (Object.prototype.hasOwnProperty.call(settings, key)) return settings[key] !== false;
    return settings[legacySectionKey(title)] !== false;
}

function render(data) {
    if (data.title) document.title = data.title;

    if (uploadedGifUrl) {
        if (gif && gif.getAttribute('src') !== uploadedGifUrl) {
            gif.src = uploadedGifUrl;
        }
        try {
            localStorage.setItem('newtab_gif_uploaded', 'true');
        } catch (e) {}
    } else {
        const targetGif = data.gif || 'gif.gif';
        if (gif && gif.getAttribute('src') !== targetGif) {
            gif.src = targetGif;
        }
        try {
            localStorage.setItem('newtab_gif', targetGif);
            localStorage.removeItem('newtab_gif_uploaded');
        } catch (e) {}
    }

    const settings = data.settings || {};
    const showSearchArea = settings['show-search-area'] !== false;
    const showGif = settings['show-gif'] !== false;

    try {
        localStorage.setItem('newtab_show_gif', String(showGif));
    } catch (e) {}

    applyAutohide(settings['autohide-settings']);

    const searchArea = document.querySelector('.search-area');
    if (searchArea) searchArea.style.display = showSearchArea ? 'flex' : 'none';
    if (gifBox) gifBox.style.display = showGif ? 'inline-flex' : 'none';
    if (gif) gif.style.display = showGif ? 'block' : 'none';

    if (grid && Array.isArray(data.sections)) {
        grid.innerHTML = data.sections.map((section, idx) => `
            <div class="category-block" data-idx="${idx}">
                <h2 class="category-title">${esc(section.title)}</h2>
                <ul>
                    ${(section.links || []).map(link => `
                        <li>
                            <a href="${esc(link.url)}">
                                <span class="bullet">•</span>${esc(link.name)}
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');

        grid.querySelectorAll('.category-block').forEach(block => {
            const section = data.sections[Number(block.dataset.idx)];
            if (section) {
                block.style.display = isSectionVisible(settings, section.title) ? '' : 'none';
            }
        });
    }
}

function renderCategoryToggles() {
    if (!categoryTogglesContainer || !Array.isArray(config.sections)) return;

    categoryTogglesContainer.innerHTML = config.sections.map((section, idx) => {
        const key = sectionKey(section.title);
        const isChecked = isSectionVisible(config.settings, section.title);
        const id = `toggle-cat-${idx}`;
        return `
            <div>
                <label for="${id}">${esc(section.title)}</label>
                <input type="checkbox" id="${id}" data-key="${esc(key)}" ${isChecked ? 'checked' : ''}>
            </div>
        `;
    }).join('');

    categoryTogglesContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const key = checkbox.dataset.key;
            updateSettings(key, checkbox.checked);
        });
    });
}

function renderCategoriesEditor() {
    if (!categoriesEditorContainer || !Array.isArray(config.sections)) return;

    categoriesEditorContainer.innerHTML = config.sections.map((section, sIdx) => `
        <div class="category-card" data-section="${sIdx}">
            <div class="category-card-header">
                <span class="drag-handle" title="Drag to rearrange category">⋮⋮</span>
                <input type="text" class="category-title-input" value="${esc(section.title)}" placeholder="Category title">
                <button type="button" class="btn-small add-link-btn">+ link</button>
                <button type="button" class="btn-small btn-del del-cat-btn" title="Delete category">✕</button>
            </div>
            <div class="category-shortcuts-list">
                ${(section.links || []).map((link, lIdx) => `
                    <div class="shortcut-row" data-link="${lIdx}">
                        <span class="drag-handle shortcut-drag-handle" title="Drag to rearrange shortcut">•</span>
                        <input type="text" class="shortcut-name" value="${esc(link.name)}" placeholder="Name">
                        <input type="text" class="shortcut-url" value="${esc(link.url)}" placeholder="https://...">
                        <button type="button" class="btn-small btn-del del-link-btn" title="Delete link">✕</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    categoriesEditorContainer.querySelectorAll('.category-card').forEach(card => {
        const sIdx = Number(card.dataset.section);
        const catHandle = card.querySelector('.category-card-header .drag-handle');

        if (catHandle) {
            catHandle.addEventListener('mouseenter', () => {
                if (!draggedShortcut) card.draggable = true;
            });
            catHandle.addEventListener('mouseleave', () => {
                if (draggedCategoryIndex === null) card.draggable = false;
            });
            catHandle.addEventListener('mousedown', () => {
                if (!draggedShortcut) card.draggable = true;
            });
        }

        card.addEventListener('dragstart', (e) => {
            if (e.target !== card || !card.draggable || draggedShortcut) {
                e.preventDefault();
                return;
            }
            draggedCategoryIndex = sIdx;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(sIdx));
        });

        card.addEventListener('dragend', () => {
            card.draggable = false;
            card.classList.remove('dragging');
            categoriesEditorContainer.querySelectorAll('.category-card').forEach(c => {
                c.classList.remove('drag-over');
            });
            draggedCategoryIndex = null;
        });

        card.addEventListener('dragover', (e) => {
            if (draggedCategoryIndex === null) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedCategoryIndex !== sIdx) {
                card.classList.add('drag-over');
            }
        });

        card.addEventListener('dragleave', (e) => {
            if (!card.contains(e.relatedTarget)) {
                card.classList.remove('drag-over');
            }
        });

        card.addEventListener('drop', (e) => {
            if (draggedCategoryIndex === null) return;
            e.preventDefault();
            card.classList.remove('drag-over');
            if (draggedCategoryIndex !== sIdx) {
                const [moved] = config.sections.splice(draggedCategoryIndex, 1);
                config.sections.splice(sIdx, 0, moved);
                saveConfig();
                render(config);
                renderCategoryToggles();
                renderCategoriesEditor();
            }
        });

        const shortcutsList = card.querySelector('.category-shortcuts-list');
        shortcutsList.addEventListener('dragover', (e) => {
            if (!draggedShortcut) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        shortcutsList.addEventListener('drop', (e) => {
            if (!draggedShortcut || e.target !== shortcutsList) return;
            e.preventDefault();
            e.stopPropagation();
            const fromSec = draggedShortcut.sIdx;
            const fromLink = draggedShortcut.lIdx;
            const [moved] = config.sections[fromSec].links.splice(fromLink, 1);
            if (!config.sections[sIdx].links) config.sections[sIdx].links = [];
            config.sections[sIdx].links.push(moved);
            saveConfig();
            render(config);
            renderCategoriesEditor();
        });

        const titleInput = card.querySelector('.category-title-input');
        titleInput.addEventListener('input', () => {
            const oldTitle = config.sections[sIdx].title;
            const newTitle = titleInput.value.trim() || 'Untitled';
            config.sections[sIdx].title = newTitle;
            const oldKeys = [sectionKey(oldTitle), legacySectionKey(oldTitle)];
            const newKey = sectionKey(newTitle);
            const prev = oldKeys.map(k => config.settings[k]).find(v => v !== undefined);
            if (prev !== undefined && !oldKeys.includes(newKey)) {
                config.settings[newKey] = prev;
                oldKeys.forEach(k => { delete config.settings[k]; });
            }
            saveConfig();
            render(config);
            renderCategoryToggles();
        });

        const addLinkBtn = card.querySelector('.add-link-btn');
        addLinkBtn.addEventListener('click', () => {
            if (!config.sections[sIdx].links) config.sections[sIdx].links = [];
            config.sections[sIdx].links.push({ name: 'new', url: 'https://' });
            saveConfig();
            render(config);
            renderCategoriesEditor();
        });

        const delCatBtn = card.querySelector('.del-cat-btn');
        delCatBtn.addEventListener('click', () => {
            config.sections.splice(sIdx, 1);
            saveConfig();
            render(config);
            renderCategoryToggles();
            renderCategoriesEditor();
        });

        card.querySelectorAll('.shortcut-row').forEach(row => {
            const lIdx = Number(row.dataset.link);
            const shortcutHandle = row.querySelector('.shortcut-drag-handle');
            const nameInput = row.querySelector('.shortcut-name');
            const urlInput = row.querySelector('.shortcut-url');
            const delLinkBtn = row.querySelector('.del-link-btn');

            if (shortcutHandle) {
                shortcutHandle.addEventListener('mouseenter', () => {
                    row.draggable = true;
                });
                shortcutHandle.addEventListener('mouseleave', () => {
                    if (!draggedShortcut) row.draggable = false;
                });
                shortcutHandle.addEventListener('mousedown', () => {
                    row.draggable = true;
                });
            }

            row.addEventListener('dragstart', (e) => {
                if (e.target !== row || !row.draggable) {
                    e.preventDefault();
                    return;
                }
                e.stopPropagation();
                draggedShortcut = { sIdx, lIdx };
                row.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', `${sIdx}:${lIdx}`);
            });

            row.addEventListener('dragend', (e) => {
                e.stopPropagation();
                row.draggable = false;
                row.classList.remove('dragging');
                categoriesEditorContainer.querySelectorAll('.shortcut-row').forEach(r => r.classList.remove('drag-over'));
                draggedShortcut = null;
            });

            row.addEventListener('dragover', (e) => {
                if (!draggedShortcut) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                if (draggedShortcut.sIdx !== sIdx || draggedShortcut.lIdx !== lIdx) {
                    row.classList.add('drag-over');
                }
            });

            row.addEventListener('dragleave', (e) => {
                if (!row.contains(e.relatedTarget)) {
                    row.classList.remove('drag-over');
                }
            });

            row.addEventListener('drop', (e) => {
                if (!draggedShortcut) return;
                e.preventDefault();
                e.stopPropagation();
                row.classList.remove('drag-over');
                const fromSec = draggedShortcut.sIdx;
                const fromLink = draggedShortcut.lIdx;
                if (fromSec === sIdx && fromLink === lIdx) return;

                const [moved] = config.sections[fromSec].links.splice(fromLink, 1);
                config.sections[sIdx].links.splice(lIdx, 0, moved);
                saveConfig();
                render(config);
                renderCategoriesEditor();
            });

            nameInput.addEventListener('input', () => {
                config.sections[sIdx].links[lIdx].name = nameInput.value;
                saveConfig();
                render(config);
            });

            urlInput.addEventListener('input', () => {
                config.sections[sIdx].links[lIdx].url = urlInput.value;
                saveConfig();
                render(config);
            });

            delLinkBtn.addEventListener('click', () => {
                config.sections[sIdx].links.splice(lIdx, 1);
                saveConfig();
                render(config);
                renderCategoriesEditor();
            });
        });
    });
}

document.addEventListener('mouseup', () => {
    if (draggedCategoryIndex === null && !draggedShortcut && categoriesEditorContainer) {
        categoriesEditorContainer.querySelectorAll('.category-card[draggable="true"], .shortcut-row[draggable="true"]').forEach(el => {
            el.draggable = false;
        });
    }
});

async function saveConfig() {
    if (browserApi?.storage?.local) {
        try {
            await browserApi.storage.local.set({ config });
        } catch (e) {
            console.warn('Could not save to storage:', e);
        }
    }
}

async function updateSettings(setting, value) {
    if (setting === 'gif') {
        config.gif = value;
        try {
            localStorage.setItem('newtab_gif', value || 'gif.gif');
        } catch (e) {}
    } else {
        if (!config.settings) config.settings = {};
        config.settings[setting] = value;
        if (setting === 'show-gif') {
            try {
                localStorage.setItem('newtab_show_gif', String(value));
            } catch (e) {}
        }
    }
    await saveConfig();
    render(config);
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSafeKey(key) {
    return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

const UNSAFE_URL_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'blob:', 'filesystem:'];

function isSafeUrl(value) {
    if (typeof value !== 'string') return false;

    const normalized = value
        .replace(/[\s\u0000-\u001f\u007f-\u009f\ufeff\u200b-\u200d\u2060]/g, '')
        .toLowerCase();

    if (!normalized) return false;

    return !UNSAFE_URL_SCHEMES.some(scheme => normalized.startsWith(scheme));
}

function sanitizeImportedConfig(raw) {
    if (!isPlainObject(raw)) return null;

    const source = isPlainObject(raw.config) ? raw.config : raw;
    if (!isPlainObject(source)) return null;

    const result = {};
    let skipped = 0;

    if (typeof source.title === 'string') result.title = source.title;
    if (typeof source.gif === 'string') result.gif = source.gif;

    if (isPlainObject(source.theme)) {
        const theme = {};
        ['bg', 'text', 'font'].forEach(key => {
            if (typeof source.theme[key] !== 'string') return;

            if ((key === 'bg' || key === 'text') && typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && !CSS.supports('color', source.theme[key])) {
                skipped += 1;
                return;
            }

            theme[key] = source.theme[key];
        });
        if (Object.keys(theme).length) result.theme = theme;
    }

    if (isPlainObject(source.settings)) {
        const settings = {};
        Object.entries(source.settings).forEach(([key, value]) => {
            if (!isSafeKey(key) || typeof value !== 'boolean') {
                skipped += 1;
                return;
            }
            settings[key] = value;
        });
        if (Object.keys(settings).length) result.settings = settings;
    }

    if (Array.isArray(source.sections)) {
        const sections = source.sections.filter(isPlainObject);
        skipped += source.sections.length - sections.length;

        result.sections = sections.map(section => {
            const links = Array.isArray(section.links) ? section.links : [];
            const validLinks = links
                .filter(isPlainObject)
                .filter(link => typeof link.name === 'string' && typeof link.url === 'string' && isSafeUrl(link.url))
                .map(link => ({ name: link.name, url: link.url }));

            skipped += links.length - validLinks.length;

            return {
                title: typeof section.title === 'string' && section.title.trim() ? section.title : 'Untitled',
                links: validLinks
            };
        });
    }

    if (isPlainObject(source.search)) {
        const search = {};

        if (isPlainObject(source.search.bangs)) {
            const entries = Object.entries(source.search.bangs);
            const bangs = {};

            entries.forEach(([key, bang]) => {
                if (!isSafeKey(key)) return;
                if (isPlainObject(bang) && typeof bang.name === 'string' && typeof bang.url === 'string' && isSafeUrl(bang.url)) {
                    bangs[key] = { name: bang.name, url: bang.url };
                }
            });

            skipped += entries.length - Object.keys(bangs).length;
            if (Object.keys(bangs).length) search.bangs = bangs;
        }

        if (typeof source.search.default === 'string') {
            if (isSafeUrl(source.search.default)) {
                search.default = source.search.default;
            } else {
                skipped += 1;
            }
        }

        if (Object.keys(search).length) result.search = search;
    }

    if (!Object.keys(result).length) return null;

    return { config: result, skipped };
}

function pruneStaleCategorySettings() {
    const keep = new Set(['show-search-area', 'show-gif']);
    config.sections.forEach(section => {
        keep.add(sectionKey(section.title));
        keep.add(legacySectionKey(section.title));
    });

    Object.keys(config.settings).forEach(key => {
        if (key.startsWith('show-') && !keep.has(key)) {
            delete config.settings[key];
        }
    });
}

function applyImportedConfig(imported) {
    const base = Object.keys(defaultConfig).length
        ? JSON.parse(JSON.stringify(defaultConfig))
        : {};

    config = {
        ...base,
        ...imported,
        settings: {
            ...(base.settings || {}),
            ...(imported.settings || {})
        },
        theme: {
            ...(base.theme || {}),
            ...(imported.theme || {})
        }
    };

    if (!Array.isArray(config.sections)) config.sections = [];
    if (!config.settings || !Object.keys(config.settings).length) {
        config.settings = { ...FALLBACK_SETTINGS };
    }
    if (!config.theme || !Object.keys(config.theme).length) {
        config.theme = { ...FALLBACK_THEME };
    }

    pruneStaleCategorySettings();
    saveConfig();
    syncSettingsUI();
    render(config);
    renderCategoryToggles();
    renderCategoriesEditor();
}

function setBackupStatus(message, isError = false) {
    if (!backupStatus) return;

    backupStatus.textContent = message;
    backupStatus.classList.toggle('error', Boolean(isError));

    if (backupStatusTimer) clearTimeout(backupStatusTimer);
    backupStatusTimer = setTimeout(() => {
        backupStatus.textContent = '';
        backupStatus.classList.remove('error');
    }, 6000);
}

function exportSettings() {
    const payload = {
        app: 'chromium-newtab',
        version: 1,
        exportedAt: new Date().toISOString(),
        config
    };

    try {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = `chromium-newtab-settings-${date}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setBackupStatus('settings exported');
    } catch (e) {
        console.warn('Could not export settings:', e);
        setBackupStatus('export failed', true);
    }
}

async function handleImportFile(file) {
    if (!file) return;

    try {
        const text = await file.text();
        const sanitized = sanitizeImportedConfig(JSON.parse(text));

        if (!sanitized) {
            console.warn('Import rejected: no recognized settings in file');
            setBackupStatus('import failed: invalid settings file', true);
            return;
        }

        const confirmed = window.confirm('Import these settings? This will replace your current theme, shortcuts and preferences.');
        if (!confirmed) {
            setBackupStatus('import cancelled');
            return;
        }

        const removedUpload = await removeUploadedGif({ silent: true });
        if (!removedUpload) {
            setBackupStatus('import failed: could not clear uploaded image', true);
            return;
        }

        applyImportedConfig(sanitized.config);

        const skippedSuffix = sanitized.skipped
            ? ` (${sanitized.skipped} invalid item${sanitized.skipped === 1 ? '' : 's'} skipped)`
            : '';
        setBackupStatus(`settings imported from ${file.name}${skippedSuffix}`);
    } catch (e) {
        console.error('Could not import settings:', e);
        setBackupStatus(`import failed: ${e?.message || 'invalid settings file'}`, true);
    } finally {
        if (importSettingsFile) importSettingsFile.value = '';
    }
}

function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isDirectUrl(val) {
    if (val.startsWith('http://') || val.startsWith('https://')) return true;
    if (/^localhost(:\d+)?(\/.*)?$/i.test(val)) return true;
    if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(val)) return true;
    if (val.includes('.') && !val.includes(' ') && !val.startsWith('!')) return true;
    return false;
}

input.addEventListener('input', function () {
    const val = this.value.trim();
    if (!val) {
        badge.textContent = '[/]';
        return;
    }

    const firstWord = val.split(/\s+/)[0].toLowerCase();
    const bangs = config.search?.bangs || {};

    if (bangs[firstWord]) {
        badge.textContent = `!${bangs[firstWord].name || firstWord.slice(1)}`;
    } else if (isDirectUrl(val)) {
        badge.textContent = 'go';
    } else {
        badge.textContent = 'search';
    }
});

input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        const val = this.value.trim();
        if (!val) return;

        const parts = val.split(/\s+/);
        const prefix = parts[0].toLowerCase();
        const bangs = config.search?.bangs || {};

        if (bangs[prefix]) {
            const query = parts.slice(1).join(' ');
            const bang = bangs[prefix];
            if (query) {
                window.location.href = bang.url + encodeURIComponent(query);
            } else {
                window.location.href = `https://${bang.name}.com`;
            }
            return;
        }

        if (/^r\/[a-zA-Z0-9_]+$/i.test(val)) {
            window.location.href = `https://reddit.com/${val}`;
            return;
        }

        if (isDirectUrl(val)) {
            if (/^localhost(:\d+)?/i.test(val) || /^\d{1,3}(\.\d{1,3}){3}/.test(val)) {
                window.location.href = val.startsWith('http') ? val : 'http://' + val;
            } else {
                window.location.href = val.startsWith('http') ? val : 'https://' + val;
            }
            return;
        }

        if (browserApi?.search?.query) {
            browserApi.search.query({ text: val, disposition: 'CURRENT_TAB' });
        } else {
            const defaultSearch = config.search?.default || 'https://google.com/search?q=';
            window.location.href = defaultSearch + encodeURIComponent(val);
        }
    } else if (e.key === 'Escape') {
        this.value = '';
        badge.textContent = '[/]';
        this.blur();
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        if (settingsModal && !settingsModal.classList.contains('hidden')) {
            settingsModal.classList.add('hidden');
        }
    }

    const isTyping = document.activeElement && (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA'
    );

    if (e.key === '/' && !isTyping) {
        e.preventDefault();
        input.focus();
    }
});

if (showSearchAreaCheck) {
    showSearchAreaCheck.addEventListener('change', () => updateSettings('show-search-area', showSearchAreaCheck.checked));
}
if (showGifCheck) {
    showGifCheck.addEventListener('change', () => updateSettings('show-gif', showGifCheck.checked));
}

if (gifDone && gifSource) {
    gifDone.addEventListener('click', () => applyGifSource());
    gifSource.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            applyGifSource();
        }
    });
}

if (gifUploadBtn && gifUploadFile) {
    gifUploadBtn.addEventListener('click', () => gifUploadFile.click());
}
if (gifUploadFile) {
    gifUploadFile.addEventListener('change', () => {
        const file = gifUploadFile.files?.[0];
        if (file) {
            handleGifUpload(file);
        } else {
            gifUploadFile.value = '';
        }
    });
}
if (gifUploadRemove) {
    gifUploadRemove.addEventListener('click', () => removeUploadedGif());
}

if (bgColorPicker) {
    bgColorPicker.addEventListener('input', () => updateTheme('bg', bgColorPicker.value));
}
if (bgColorInput) {
    bgColorInput.addEventListener('change', () => updateTheme('bg', bgColorInput.value.trim()));
}
if (textColorPicker) {
    textColorPicker.addEventListener('input', () => updateTheme('text', textColorPicker.value));
}
if (textColorInput) {
    textColorInput.addEventListener('change', () => updateTheme('text', textColorInput.value.trim()));
}
if (fontSelect) {
    fontSelect.addEventListener('change', () => updateTheme('font', fontSelect.value));
}
if (autohideSettingsCheck) {
    autohideSettingsCheck.addEventListener('change', () => {
        updateSettings('autohide-settings', autohideSettingsCheck.checked);
        applyAutohide(autohideSettingsCheck.checked);
    });
}

if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', () => {
        if (!Array.isArray(config.sections)) config.sections = [];
        config.sections.push({ title: 'New Category', links: [] });
        const shortcutsSection = document.getElementById('section-shortcuts');
        if (shortcutsSection && shortcutsSection.classList.contains('collapsed')) {
            shortcutsSection.classList.remove('collapsed');
            const arrow = shortcutsSection.querySelector('.section-arrow');
            if (arrow) arrow.textContent = '▼';
        }
        saveConfig();
        render(config);
        renderCategoryToggles();
        renderCategoriesEditor();
    });
}

document.querySelectorAll('.settings-section-header').forEach(header => {
    header.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const section = header.closest('.settings-section');
        if (section) {
            const isCollapsed = section.classList.toggle('collapsed');
            const arrow = header.querySelector('.section-arrow');
            if (arrow) arrow.textContent = isCollapsed ? '▶' : '▼';
        }
    });
});

if (openSettingsBtn && settingsModal) {
    openSettingsBtn.addEventListener('click', () => settingsModal.classList.toggle('hidden'));
}
if (closeSettingsBtn && settingsModal) {
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
}

if (exportSettingsBtn) {
    exportSettingsBtn.addEventListener('click', exportSettings);
}
if (importSettingsBtn && importSettingsFile) {
    importSettingsBtn.addEventListener('click', () => importSettingsFile.click());
    importSettingsFile.addEventListener('change', () => {
        handleImportFile(importSettingsFile.files?.[0]);
    });
}

init();
