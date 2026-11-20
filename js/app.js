import './search.js';
import { input, gif, grid, showSearchAreaCheck, showGifCheck, showFaviconsCheck, gifSource, gifDone, gifUploadBtn, gifUploadRemove, gifUploadFile, autoThemeCheck, bgColorPicker, bgColorInput, lightBgColorPicker, lightBgColorInput, textColorPicker, textColorInput, lightTextColorPicker, lightTextColorInput, fontSelect, openNewtabCheck, autohideSettingsCheck, categoriesEditorContainer, addCategoryBtn, openSettingsBtn, closeSettingsBtn, settingsModal, exportSettingsBtn, importSettingsBtn, importSettingsFile, config, state } from './shared.js';
import { applyCachedState, handleGifUpload, removeUploadedGif, applyGifSource } from './images.js';
import { init } from './startup.js';
import { syncSettingsUI, applyTheme, applyAutohide, updateTheme } from './appearance.js';
import { render, renderCategoryToggles, renderCategoriesEditor } from './shortcuts.js';
import { saveConfig, updateSettings } from './storage.js';
import { exportSettings, handleImportFile } from './backup.js';

document.addEventListener('mouseup', () => {
    if (state.draggedCategoryIndex === null && !state.draggedShortcut && categoriesEditorContainer) {
        categoriesEditorContainer.querySelectorAll('.category-card[draggable="true"], .shortcut-row[draggable="true"]').forEach(el => {
            el.draggable = false;
        });
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
if (showFaviconsCheck) {
    showFaviconsCheck.addEventListener('change', () => updateSettings('show-favicons', showFaviconsCheck.checked));
}

if (grid) {
    grid.addEventListener('error', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('link-favicon')) {
            e.target.style.display = 'none';
            const bullet = e.target.nextElementSibling;
            if (bullet && bullet.classList.contains('bullet')) {
                bullet.style.display = '';
            }
        }
    }, true);
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

if (autoThemeCheck) {
    autoThemeCheck.addEventListener('change', () => {
        updateTheme('auto', autoThemeCheck.checked);
        syncSettingsUI();
    });
}

if (bgColorPicker) {
    bgColorPicker.addEventListener('input', () => updateTheme('bg', bgColorPicker.value));
}
if (bgColorInput) {
    bgColorInput.addEventListener('change', () => updateTheme('bg', bgColorInput.value.trim()));
}
if (lightBgColorPicker) {
    lightBgColorPicker.addEventListener('input', () => updateTheme('lightBg', lightBgColorPicker.value));
}
if (lightBgColorInput) {
    lightBgColorInput.addEventListener('change', () => updateTheme('lightBg', lightBgColorInput.value.trim()));
}
if (textColorPicker) {
    textColorPicker.addEventListener('input', () => updateTheme('text', textColorPicker.value));
}
if (textColorInput) {
    textColorInput.addEventListener('change', () => updateTheme('text', textColorInput.value.trim()));
}
if (lightTextColorPicker) {
    lightTextColorPicker.addEventListener('input', () => updateTheme('lightText', lightTextColorPicker.value));
}
if (lightTextColorInput) {
    lightTextColorInput.addEventListener('change', () => updateTheme('lightText', lightTextColorInput.value.trim()));
}

if (typeof window !== 'undefined' && window.matchMedia) {
    const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
        if (config.theme?.auto) {
            applyTheme(config.theme);
        }
    };
    if (typeof systemThemeMedia.addEventListener === 'function') {
        systemThemeMedia.addEventListener('change', handleSystemThemeChange);
    } else if (typeof systemThemeMedia.addListener === 'function') {
        systemThemeMedia.addListener(handleSystemThemeChange);
    }
}
if (fontSelect) {
    fontSelect.addEventListener('change', () => updateTheme('font', fontSelect.value));
}
if (openNewtabCheck) {
    openNewtabCheck.addEventListener('change', () => updateSettings('open-newtab', openNewtabCheck.checked));
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

applyCachedState();
init();
