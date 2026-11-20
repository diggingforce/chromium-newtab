import { config } from './shared.js';
import { esc } from './backup.js';
import { httpUrl } from './search-model.js';
import { saveConfig } from './storage.js';

export function renderBangsEditor() {
    const editor = document.getElementById('bangs-editor');
    const bangs = config.search?.bangs || {};
    editor.innerHTML = Object.entries(bangs).map(([key, bang]) => bangForm(key, bang)).join('');
    editor.querySelectorAll('form').forEach(bindBangForm);
}

function bangForm(key = '', bang = {}) {
    return `<form class="bang-card" data-key="${esc(key)}">
        <label>command <input name="command" value="${esc(key)}" placeholder="!docs" required pattern="![A-Za-z0-9_-]+"></label>
        <label>name <input name="name" value="${esc(bang.name || '')}" required></label>
        <label>search URL <input name="url" type="url" value="${esc(bang.url || '')}" placeholder="https://example.org/?q=" required></label>
        <label>homepage (optional) <input name="home" type="url" value="${esc(bang.home || '')}" placeholder="https://example.org/"></label>
        <div class="editor-actions"><button class="btn-small" type="submit">save bang</button>
        <button class="btn-small delete-bang" type="button">delete</button></div>
        <p class="backup-status" role="status" aria-live="polite"></p>
    </form>`;
}

function bindBangForm(form) {
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const data = new FormData(form);
        const key = data.get('command').trim().toLowerCase();
        const name = data.get('name').trim();
        const url = data.get('url').trim();
        const home = data.get('home').trim();
        const status = form.querySelector('[role="status"]');
        const oldKey = form.dataset.key;
        if (!/^![a-z0-9_-]+$/.test(key) || !name || !httpUrl(url) || (home && !httpUrl(home))) {
            status.textContent = 'use a command such as !docs and valid HTTP or HTTPS URLs';
            return;
        }
        config.search ??= {};
        config.search.bangs ??= {};
        if (key !== oldKey && Object.hasOwn(config.search.bangs, key)) {
            status.textContent = 'this command already exists';
            return;
        }
        if (oldKey !== key) delete config.search.bangs[oldKey];
        config.search.bangs[key] = { name, url, ...(home ? { home } : {}) };
        form.dataset.key = key;
        await saveConfig();
        status.textContent = 'bang updated';
    });
    form.querySelector('.delete-bang').addEventListener('click', () => {
        if (config.search?.bangs) delete config.search.bangs[form.dataset.key];
        saveConfig();
        form.remove();
    });
}

export function setupBangsEditor() {
    document.getElementById('add-bang').addEventListener('click', () => {
        const editor = document.getElementById('bangs-editor');
        editor.insertAdjacentHTML('beforeend', bangForm());
        const form = editor.lastElementChild;
        bindBangForm(form);
        form.elements.command.focus();
    });
}
