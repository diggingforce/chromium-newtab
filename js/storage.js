import { gif, browserApi, config } from './shared.js';
import { render } from './shortcuts.js';

export async function saveConfig() {
    if (browserApi?.storage?.local) {
        try {
            await browserApi.storage.local.set({ config });
        } catch (e) {
            console.warn('Could not save to storage:', e);
        }
    }
}

export async function updateSettings(setting, value) {
    if (setting === 'gif') {
        const normalized = value === 'gif.gif' ? 'assets/gif.gif' : value;
        config.gif = normalized;
        try {
            localStorage.setItem('newtab_gif', normalized || 'assets/gif.gif');
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
