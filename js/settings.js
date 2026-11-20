import { settingsModal, openSettingsBtn, closeSettingsBtn } from './shared.js';
import { closeSuggestions } from './suggestions.js';

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
