import { sectionKey, legacySectionKey, isSectionVisible } from './shortcuts-model.js';
import { iconSource } from './icon-model.js';
import { readLocalIcon } from './icons.js';
import { applyLayout } from './layout.js';
import { rememberDeletion } from './undo.js';
import { input, gif, gifBox, grid, categoryTogglesContainer, categoriesEditorContainer, config, state } from './shared.js';
import { applyAutohide } from './appearance.js';
import { saveConfig, updateSettings } from './storage.js';
import { getDomain, esc } from './utils.js';

export function render(data) {
    applyLayout();
    if (data.title) document.title = data.title;

    if (state.uploadedGifUrl) {
        if (gif && gif.getAttribute('src') !== state.uploadedGifUrl) {
            gif.src = state.uploadedGifUrl;
        }
        try {
            localStorage.setItem('newtab_gif_uploaded', 'true');
        } catch (e) {}
    } else {
        let targetGif = data.gif || 'assets/gif.gif';
        if (targetGif === 'gif.gif') targetGif = 'assets/gif.gif';
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

    const searchArea = document.querySelector('.search-wrapper');
    if (searchArea) searchArea.style.display = showSearchArea ? 'flex' : 'none';
    if (gifBox) gifBox.style.display = showGif ? 'inline-flex' : 'none';
    if (gif) gif.style.display = showGif ? 'block' : 'none';

    const showFavicons = settings['show-favicons'] === true;
    const openNewtab = settings['open-newtab'] === true;
    const targetAttr = openNewtab ? ' target="_blank" rel="noopener noreferrer"' : '';

    if (grid && Array.isArray(data.sections)) {
        grid.innerHTML = data.sections.map((section, idx) => `
            <div class="category-block" data-idx="${idx}">
                <h2 class="category-title">${esc(section.title)}</h2>
                <ul>
                    ${(section.links || []).map(link => {
                        const domain = getDomain(link.url);
                        const source = iconSource(link, data.icons?.source, domain);
                        const iconHtml = showFavicons && source
                            ? `<img class="link-favicon" src="${esc(source)}" alt="" width="14" height="14" loading="lazy"><span class="bullet" style="display:none">•</span>`
                            : `<span class="bullet">•</span>`;
                        return `
                            <li>
                                <a href="${esc(link.url)}"${targetAttr}>
                                    ${iconHtml}${esc(link.name)}
                                </a>
                            </li>
                        `;
                    }).join('')}
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

export function renderCategoryToggles() {
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

export function renderCategoriesEditor() {
    if (!categoriesEditorContainer || !Array.isArray(config.sections)) return;

    categoriesEditorContainer.innerHTML = config.sections.map((section, sIdx) => `
        <div class="category-card" data-section="${sIdx}">
            <div class="category-card-header">
                <span class="drag-handle" title="Drag to rearrange category">⋮⋮</span>
                <input type="text" aria-label="Category title" class="category-title-input" value="${esc(section.title)}" placeholder="Category title">
                <button type="button" class="btn-small move-category-up" aria-label="Move category up" ${sIdx === 0 ? 'disabled' : ''}>↑</button><button type="button" class="btn-small move-category-down" aria-label="Move category down" ${sIdx === config.sections.length - 1 ? 'disabled' : ''}>↓</button>
                <button type="button" class="btn-small add-link-btn">+ link</button>
                <button type="button" class="btn-small btn-del del-cat-btn" aria-label="Delete category" title="Delete category">✕</button>
            </div>
            <div class="category-shortcuts-list">
                ${(section.links || []).map((link, lIdx) => `
                    <div class="shortcut-row" data-link="${lIdx}">
                        <span class="drag-handle shortcut-drag-handle" title="Drag to rearrange shortcut">•</span>
                        <input type="text" aria-label="Shortcut name" class="shortcut-name" value="${esc(link.name)}" placeholder="Name">
                        <input type="text" aria-label="Shortcut URL" class="shortcut-url" value="${esc(link.url)}" placeholder="https://...">
                        <button type="button" class="btn-small upload-icon" aria-label="Upload shortcut icon">icon</button>
                        <input type="file" class="icon-file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/x-icon,image/vnd.microsoft.icon" hidden>
                        <button type="button" class="btn-small remove-icon" aria-label="Remove shortcut icon" ${link.icon ? '' : 'hidden'}>clear icon</button>
                        <span class="icon-status" role="status" aria-live="polite"></span>
                        <button type="button" class="btn-small move-link-up" aria-label="Move shortcut up" ${lIdx === 0 ? 'disabled' : ''}>↑</button><button type="button" class="btn-small move-link-down" aria-label="Move shortcut down" ${lIdx === section.links.length - 1 ? 'disabled' : ''}>↓</button>
                        <button type="button" class="btn-small btn-del del-link-btn" aria-label="Delete link" title="Delete link">✕</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    categoriesEditorContainer.querySelectorAll('.category-card').forEach(card => {
        const sIdx = Number(card.dataset.section);
        bindMoveButtons(card, '.move-category-', config.sections, sIdx);
        const catHandle = card.querySelector('.category-card-header .drag-handle');

        if (catHandle) {
            catHandle.addEventListener('mouseenter', () => {
                if (!state.draggedShortcut) card.draggable = true;
            });
            catHandle.addEventListener('mouseleave', () => {
                if (state.draggedCategoryIndex === null) card.draggable = false;
            });
            catHandle.addEventListener('mousedown', () => {
                if (!state.draggedShortcut) card.draggable = true;
            });
        }

        card.addEventListener('dragstart', (e) => {
            if (e.target !== card || !card.draggable || state.draggedShortcut) {
                e.preventDefault();
                return;
            }
            state.draggedCategoryIndex = sIdx;
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
            state.draggedCategoryIndex = null;
        });

        card.addEventListener('dragover', (e) => {
            if (state.draggedCategoryIndex === null) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (state.draggedCategoryIndex !== sIdx) {
                card.classList.add('drag-over');
            }
        });

        card.addEventListener('dragleave', (e) => {
            if (!card.contains(e.relatedTarget)) {
                card.classList.remove('drag-over');
            }
        });

        card.addEventListener('drop', (e) => {
            if (state.draggedCategoryIndex === null) return;
            e.preventDefault();
            card.classList.remove('drag-over');
            if (state.draggedCategoryIndex !== sIdx) {
                const [moved] = config.sections.splice(state.draggedCategoryIndex, 1);
                config.sections.splice(sIdx, 0, moved);
                saveConfig();
                render(config);
                renderCategoryToggles();
                renderCategoriesEditor();
            }
        });

        const shortcutsList = card.querySelector('.category-shortcuts-list');
        shortcutsList.addEventListener('dragover', (e) => {
            if (!state.draggedShortcut) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        shortcutsList.addEventListener('drop', (e) => {
            if (!state.draggedShortcut || e.target !== shortcutsList) return;
            e.preventDefault();
            e.stopPropagation();
            const fromSec = state.draggedShortcut.sIdx;
            const fromLink = state.draggedShortcut.lIdx;
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
            const [deleted] = config.sections.splice(sIdx, 1);
            rememberDeletion('category', () => { config.sections.splice(Math.min(sIdx, config.sections.length), 0, deleted); });
            saveConfig();
            render(config);
            renderCategoryToggles();
            renderCategoriesEditor();
        });

        card.querySelectorAll('.shortcut-row').forEach(row => {
            const lIdx = Number(row.dataset.link);
            bindMoveButtons(row, '.move-link-', config.sections[sIdx].links, lIdx);
            const link = config.sections[sIdx].links[lIdx];
            const fileInput = row.querySelector('.icon-file');
            row.querySelector('.upload-icon').addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async () => {
                const status = row.querySelector('.icon-status');
                try {
                    const file = fileInput.files?.[0];
                    if (!file) return;
                    const icon = await readLocalIcon(file);
                    if (!config.sections.some(section => section.links.includes(link))) return;
                    link.icon = icon;
                    config.settings['show-favicons'] = true;
                    const saved = await saveConfig();
                    render(config);
                    row.querySelector('.remove-icon').hidden = false;
                    status.textContent = saved ? 'icon saved' : 'check save status';
                    document.getElementById('show-favicons').checked = true;
                } catch (error) {
                    status.textContent = error.message || 'could not read image';
                } finally { fileInput.value = ''; }
            });
            row.querySelector('.remove-icon').addEventListener('click', () => {
                delete link.icon;
                saveConfig();
                render(config);
                row.querySelector('.remove-icon').hidden = true;
                row.querySelector('.upload-icon').focus();
                row.querySelector('.icon-status').textContent = 'icon removed';
            });
            const shortcutHandle = row.querySelector('.shortcut-drag-handle');
            const nameInput = row.querySelector('.shortcut-name');
            const urlInput = row.querySelector('.shortcut-url');
            const delLinkBtn = row.querySelector('.del-link-btn');

            if (shortcutHandle) {
                shortcutHandle.addEventListener('mouseenter', () => {
                    row.draggable = true;
                });
                shortcutHandle.addEventListener('mouseleave', () => {
                    if (!state.draggedShortcut) row.draggable = false;
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
                state.draggedShortcut = { sIdx, lIdx };
                row.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', `${sIdx}:${lIdx}`);
            });

            row.addEventListener('dragend', (e) => {
                e.stopPropagation();
                row.draggable = false;
                row.classList.remove('dragging');
                categoriesEditorContainer.querySelectorAll('.shortcut-row').forEach(r => r.classList.remove('drag-over'));
                state.draggedShortcut = null;
            });

            row.addEventListener('dragover', (e) => {
                if (!state.draggedShortcut) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                if (state.draggedShortcut.sIdx !== sIdx || state.draggedShortcut.lIdx !== lIdx) {
                    row.classList.add('drag-over');
                }
            });

            row.addEventListener('dragleave', (e) => {
                if (!row.contains(e.relatedTarget)) {
                    row.classList.remove('drag-over');
                }
            });

            row.addEventListener('drop', (e) => {
                if (!state.draggedShortcut) return;
                e.preventDefault();
                e.stopPropagation();
                row.classList.remove('drag-over');
                const fromSec = state.draggedShortcut.sIdx;
                const fromLink = state.draggedShortcut.lIdx;
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
                const section = config.sections[sIdx];
                const [deleted] = section.links.splice(lIdx, 1);
                rememberDeletion('shortcut', () => {
                    if (!config.sections.includes(section)) return false;
                    section.links.splice(Math.min(lIdx, section.links.length), 0, deleted);
                });
                saveConfig();
                render(config);
                renderCategoriesEditor();
            });
        });
    });
}

function bindMoveButtons(container, prefix, items, index) {
    for (const [direction, offset] of [['up', -1], ['down', 1]]) {
        container.querySelector(prefix + direction).addEventListener('click', () => {
            const destination = index + offset;
            if (destination < 0 || destination >= items.length) return;
            [items[index], items[destination]] = [items[destination], items[index]];
            const sectionIndex = container.closest('[data-section]').dataset.section;
            saveConfig();
            render(config);
            renderCategoryToggles();
            renderCategoriesEditor();
            const selector = prefix.includes('category')
                ? `[data-section="${destination}"] ${prefix}${direction}`
                : `[data-section="${sectionIndex}"] [data-link="${destination}"] ${prefix}${direction}`;
            const button = categoriesEditorContainer.querySelector(selector);
            if (button?.disabled) button.parentElement.querySelector('input')?.focus();
            else button?.focus();
        });
    }
}
