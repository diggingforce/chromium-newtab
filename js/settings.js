import { settingsModal, openSettingsBtn, closeSettingsBtn, config, state } from './shared.js';
import { closeSuggestions } from './suggestions.js';

export function hasPendingSettingsEdits() {
    if (state.gifUploadInProgress) return true;
    for (const form of document.querySelectorAll('.bang-card')) {
        const key = form.dataset.key;
        const bang = config.search?.bangs?.[key];
        if (!bang || form.elements.command.value !== key ||
            ['name', 'url', 'home'].some(field => form.elements[field].value !== (bang[field] || ''))) return true;
    }
    const fields = {
        'gif-source': config.gif || 'assets/gif.gif',
        'bg-color': config.theme?.bg || '#191919',
        'text-color': config.theme?.text || '#fafafa',
        'light-bg-color': config.theme?.lightBg || '#fafafa',
        'light-text-color': config.theme?.lightText || '#191919'
    };
    return Object.entries(fields).some(([id, value]) => {
        const field = document.getElementById(id);
        return (id === 'gif-source' || document.activeElement === field) && field.value !== value;
    });
}

export function expandSection(section) {
    section.classList.remove('collapsed');
    section.querySelector('.section-toggle').setAttribute('aria-expanded', 'true');
    section.querySelector('.section-arrow').textContent = '▼';
}

export function setupSettings() {
    const content = document.querySelector('main');
    openSettingsBtn.setAttribute('aria-haspopup', 'dialog');
    openSettingsBtn.setAttribute('aria-controls', 'settings');
    openSettingsBtn.addEventListener('click', () => {
        closeSuggestions();
        settingsModal.classList.remove('hidden');
        settingsModal.showModal();
        openSettingsBtn.setAttribute('aria-expanded', 'true');
        content.inert = true;
        closeSettingsBtn.focus();
    });
    closeSettingsBtn.addEventListener('click', () => settingsModal.close());
    settingsModal.addEventListener('close', () => {
        settingsModal.classList.add('hidden');
        content.inert = false;
        openSettingsBtn.setAttribute('aria-expanded', 'false');
        openSettingsBtn.focus();
    });
    settingsModal.querySelectorAll('.section-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const section = button.closest('.settings-section');
            const collapsed = section.classList.toggle('collapsed');
            button.setAttribute('aria-expanded', String(!collapsed));
            button.querySelector('.section-arrow').textContent = collapsed ? '▶' : '▼';
        });
    });
}
