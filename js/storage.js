import { browserApi, config, setConfig, FALLBACK_THEME, FALLBACK_SETTINGS } from './shared.js';
import { hasPendingSettingsEdits } from './settings.js';
import { render, renderCategoriesEditor, renderCategoryToggles } from './shortcuts.js';
import { syncSettingsUI } from './appearance.js';
import { renderBangsEditor } from './bangs.js';
import { clearUndo } from './undo.js';
import { closeSuggestions } from './suggestions.js';
import { createSaveQueue, configFingerprint } from './save-queue.js';

const ownWrites = new Set();
let remoteConfig = null;
let failed = false;
let dirty = false;
let readFailed = false;
let persistedFingerprint = null;
let loadingRemote = false;

function showSaveStatus(status) {
    const output = document.getElementById('save-status');
    const messages = {
        saving: 'saving…', saved: 'all changes saved',
        error: 'could not save changes. try again.',
        conflict: 'settings changed in another tab. load them or keep your edits.',
        readError: 'could not read saved settings. reload before editing.'
    };
    output.textContent = messages[status] || status;
    output.classList.toggle('error', ['error', 'readError'].includes(status));
    document.getElementById('retry-save').hidden = status !== 'error';
    document.getElementById('reload-settings').hidden = status !== 'readError';
    document.getElementById('load-remote').hidden = !remoteConfig;
    document.getElementById('keep-local').hidden = !remoteConfig;
}

const queue = createSaveQueue(async snapshot => {
    const key = configFingerprint(snapshot);
    if (key === persistedFingerprint) return;
    if (browserApi?.storage?.local) {
        ownWrites.add(key);
        if (ownWrites.size > 30) ownWrites.delete(ownWrites.values().next().value);
    }
    try {
        if (browserApi?.storage?.local) await browserApi.storage.local.set({ config: snapshot });
        else localStorage.setItem('newtab_config', key);
        persistedFingerprint = key;
    } catch (error) {
        ownWrites.delete(key);
        throw error;
    }
}, status => {
    failed = status === 'error';
    if (status === 'saved') dirty = false;
    showSaveStatus(remoteConfig ? 'conflict' : status);
});

export async function readConfig() {
    const value = browserApi?.storage?.local
        ? (await browserApi.storage.local.get('config'))?.config
        : JSON.parse(localStorage.getItem('newtab_config') || 'null');
    persistedFingerprint = value ? configFingerprint(value) : null;
    return value;
}

export function reportReadError() {
    readFailed = true;
    showSaveStatus('readError');
}

export function saveConfig() {
    if (readFailed) {
        reportReadError();
        return Promise.resolve(false);
    }
    dirty = true;
    if (remoteConfig) {
        showSaveStatus('conflict');
        return Promise.resolve(false);
    }
    return queue.save(config);
}

function applyRemote(value) {
    queue.discard();
    setConfig({ ...value, theme: { ...FALLBACK_THEME, ...value.theme }, settings: { ...FALLBACK_SETTINGS, ...value.settings }, sections: value.sections || [] });
    dirty = false;
    failed = false;
    remoteConfig = null;
    clearUndo();
    closeSuggestions();
    syncSettingsUI();
    render(config);
    renderCategoryToggles();
    renderCategoriesEditor();
    renderBangsEditor();
    showSaveStatus('saved');
}

function receiveRemote(value) {
    if (!value) return;
    const fingerprint = configFingerprint(value);
    persistedFingerprint = fingerprint;
    if (ownWrites.delete(fingerprint) || fingerprint === configFingerprint(config)) return;
    if (dirty || failed || queue.busy || hasPendingSettingsEdits()) {
        remoteConfig = value;
        queue.discard();
        showSaveStatus('conflict');
    } else applyRemote(value);
}

async function loadRemote() {
    if (!remoteConfig || loadingRemote) return;
    loadingRemote = true;
    document.getElementById('load-remote').disabled = true;
    document.getElementById('keep-local').disabled = true;
    try {
        queue.discard();
        await queue.idle();
        const value = remoteConfig;
        if (value && await queue.save(value) && remoteConfig === value) applyRemote(value);
    } finally {
        loadingRemote = false;
        document.getElementById('load-remote').disabled = false;
        document.getElementById('keep-local').disabled = false;
    }
}

export function setupStorage() {
    browserApi?.storage?.onChanged?.addListener((changes, area) => {
        if (area === 'local' && changes.config?.newValue) receiveRemote(changes.config.newValue);
    });
    if (!browserApi?.storage?.local) window.addEventListener('storage', event => {
        if (event.key === 'newtab_config' && event.newValue) {
            try { receiveRemote(JSON.parse(event.newValue)); } catch { reportReadError(); }
        }
    });
    document.getElementById('reload-settings').addEventListener('click', () => window.location.reload());
    document.getElementById('retry-save').addEventListener('click', saveConfig);
    document.getElementById('load-remote').addEventListener('click', loadRemote);
    document.getElementById('keep-local').addEventListener('click', () => {
        remoteConfig = null;
        saveConfig();
    });
    window.addEventListener('pagehide', () => queue.flush());
}

export async function updateSettings(setting, value) {
    if (setting === 'gif') config.gif = value === 'gif.gif' ? 'assets/gif.gif' : value;
    else {
        config.settings ??= {};
        config.settings[setting] = value;
    }
    render(config);
    return saveConfig();
}
