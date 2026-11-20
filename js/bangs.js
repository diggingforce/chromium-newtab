import { rememberDeletion } from './undo.js';
import { expandSection } from './settings.js';
import { config } from './shared.js';
import { esc } from './utils.js';
import { httpUrl } from './search-model.js';
import { saveConfig } from './storage.js';
import { bangKeys } from './bangs-model.js';

export function renderBangsEditor() {
    const editor = document.getElementById('bangs-editor');
    const bangs = config.search?.bangs || {};
    editor.innerHTML = bangKeys(config.search).map(key => bangForm(key, bangs[key])).join('');
    editor.querySelectorAll('form').forEach(bindBangForm);
}

function bangForm(key = '', bang = {}) {
    return `<form class="bang-card" data-key="${esc(key)}">
        <label>command <input name="command" value="${esc(key)}" placeholder="!docs" required></label>
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
        const order = bangKeys(config.search);
        const index = order.indexOf(oldKey);
        if (index === -1) order.push(key);
        else order[index] = key;
        config.search.bangOrder = order;
        if (oldKey !== key) delete config.search.bangs[oldKey];
        config.search.bangs[key] = { name, url, ...(home ? { home } : {}) };
        form.dataset.key = key;
        const saved = await saveConfig();
        status.textContent = saved ? 'bang updated' : 'bang updated in this tab; check the save status above';
    });
    form.querySelector('.delete-bang').addEventListener('click', () => {
        const key = form.dataset.key;
        const deleted = config.search?.bangs?.[key];
        if (deleted) {
            const order = bangKeys(config.search);
            const index = order.indexOf(key);
            delete config.search.bangs[key];
            config.search.bangOrder = order.filter(command => command !== key);
            rememberDeletion('bang', () => {
                if (Object.hasOwn(config.search.bangs, key)) return false;
                const restoredOrder = bangKeys(config.search);
                restoredOrder.splice(index, 0, key);
                config.search.bangs[key] = deleted;
                config.search.bangOrder = restoredOrder;
            });
        }
        saveConfig();
        form.remove();
    });
}

export function setupBangsEditor() {
    document.getElementById('add-bang').addEventListener('click', () => {
        expandSection(document.getElementById('section-bangs'));
        const editor = document.getElementById('bangs-editor');
        editor.insertAdjacentHTML('beforeend', bangForm());
        const form = editor.lastElementChild;
        bindBangForm(form);
        form.elements.command.focus();
    });
}
