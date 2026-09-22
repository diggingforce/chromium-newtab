const input = document.getElementById('find-input');
const badge = document.getElementById('engine-badge');
const gif = document.getElementById('preview-gif');
const gifBox = document.querySelector('.gif-box');
const grid = document.getElementById('links-grid');

const showSearchAreaCheck = document.getElementById('show-search-area');
const showGifCheck = document.getElementById('show-gif');
const gifSource = document.getElementById('gif-source');
const gifDone = document.getElementById('gif-done');

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

const browserApi = globalThis.browser ?? globalThis.chrome;
let config = {};
let draggedCategoryIndex = null;
let draggedShortcut = null;

async function init() {
    try {
        const res = await fetch('config.json');
        if (res.ok) {
            config = await res.json();
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
        config.settings = {
            'show-search-area': true,
            'show-gif': true,
            'autohide-settings': false
        };
    }

    if (!config.theme) {
        config.theme = {
            bg: '#191919',
            text: '#fafafa',
            font: 'Departure Mono'
        };
    }

    if (!Array.isArray(config.sections)) {
        config.sections = [];
    }

    if (showSearchAreaCheck) showSearchAreaCheck.checked = Boolean(config.settings['show-search-area']);
    if (showGifCheck) showGifCheck.checked = Boolean(config.settings['show-gif']);
    if (gifSource) gifSource.value = config.gif || 'gif.gif';
    if (autohideSettingsCheck) autohideSettingsCheck.checked = Boolean(config.settings['autohide-settings']);

    applyAutohide(config.settings['autohide-settings']);
    applyTheme(config.theme);
    render(config);
    renderCategoryToggles();
    renderCategoriesEditor();
}

function applyTheme(theme) {
    if (!theme) return;
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

function render(data) {
    if (data.title) document.title = data.title;
    if (data.gif && gif) gif.src = data.gif;

    const settings = data.settings || {};
    const showSearchArea = settings['show-search-area'] !== false;
    const showGif = settings['show-gif'] !== false;

    applyAutohide(settings['autohide-settings']);

    const searchArea = document.querySelector('.search-area');
    if (searchArea) searchArea.style.display = showSearchArea ? 'flex' : 'none';
    if (gifBox) gifBox.style.display = showGif ? 'inline-flex' : 'none';
    if (gif) gif.style.display = showGif ? 'block' : 'none';

    if (grid && Array.isArray(data.sections)) {
        grid.innerHTML = data.sections.map(section => `
            <div class="category-block" data-title="${esc(section.title.toLowerCase())}">
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
            const title = block.dataset.title;
            if (title) {
                block.style.display = settings[`show-${title}`] !== false ? '' : 'none';
            }
        });
    }
}

function renderCategoryToggles() {
    if (!categoryTogglesContainer || !Array.isArray(config.sections)) return;

    categoryTogglesContainer.innerHTML = config.sections.map((section, idx) => {
        const key = `show-${section.title.toLowerCase()}`;
        const isChecked = config.settings[key] !== false;
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
        <div class="category-card" data-section="${sIdx}" draggable="true">
            <div class="category-card-header">
                <span class="drag-handle" title="Drag to rearrange category">⋮⋮</span>
                <input type="text" class="category-title-input" value="${esc(section.title)}" placeholder="Category title">
                <button type="button" class="btn-small add-link-btn">+ link</button>
                <button type="button" class="btn-small btn-del del-cat-btn" title="Delete category">✕</button>
            </div>
            <div class="category-shortcuts-list">
                ${(section.links || []).map((link, lIdx) => `
                    <div class="shortcut-row" data-link="${lIdx}" draggable="true">
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

        card.addEventListener('dragstart', (e) => {
            if (e.target.closest('.shortcut-row')) return;
            if (e.target.tagName === 'INPUT' || (e.target.tagName === 'BUTTON' && !e.target.classList.contains('drag-handle'))) {
                e.preventDefault();
                return;
            }
            draggedCategoryIndex = sIdx;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(sIdx));
        });

        card.addEventListener('dragend', () => {
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
            const oldTitleKey = `show-${config.sections[sIdx].title.toLowerCase()}`;
            const newTitle = titleInput.value.trim() || 'Untitled';
            config.sections[sIdx].title = newTitle;
            const newTitleKey = `show-${newTitle.toLowerCase()}`;
            if (config.settings[oldTitleKey] !== undefined && oldTitleKey !== newTitleKey) {
                config.settings[newTitleKey] = config.settings[oldTitleKey];
                delete config.settings[oldTitleKey];
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
            const nameInput = row.querySelector('.shortcut-name');
            const urlInput = row.querySelector('.shortcut-url');
            const delLinkBtn = row.querySelector('.del-link-btn');

            row.addEventListener('dragstart', (e) => {
                if (e.target.tagName === 'INPUT' || (e.target.tagName === 'BUTTON' && !e.target.classList.contains('drag-handle'))) {
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
    if (!config.settings) config.settings = {};
    config.settings[setting] = value;
    if (setting === 'gif') config.gif = value;
    await saveConfig();
    render(config);
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
    gifDone.addEventListener('click', () => updateSettings('gif', gifSource.value.trim()));
    gifSource.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            updateSettings('gif', gifSource.value.trim());
        }
    });
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

init();
