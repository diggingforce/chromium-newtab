import { renderBangsEditor } from './bangs.js';
import { gif, browserApi, FALLBACK_SETTINGS, FALLBACK_THEME, config, setConfig, defaultConfig, setDefaultConfig } from './shared.js';
import { restoreUploadedGif } from './images.js';
import { syncSettingsUI } from './appearance.js';
import { render, renderCategoryToggles, renderCategoriesEditor } from './shortcuts.js';

export async function init() {
    try {
        const res = await fetch('config.json');
        if (res.ok) {
            setConfig(await res.json());
            setDefaultConfig(JSON.parse(JSON.stringify(config)));
        }
    } catch (e) {
        console.warn('Could not fetch config.json:', e);
    }

    if (browserApi?.storage?.local) {
        try {
            const saved = await browserApi.storage.local.get('config');
            if (saved?.config) {
                setConfig({
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
                });
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
    } else {
        config.theme = { ...FALLBACK_THEME, ...config.theme };
    }

    if (!Array.isArray(config.sections)) {
        config.sections = [];
    }

    if (!Object.keys(defaultConfig).length) {
        setDefaultConfig({
            settings: { ...FALLBACK_SETTINGS },
            theme: { ...FALLBACK_THEME },
            sections: []
        });
    }

    delete config.settings.gif;
    if (defaultConfig.settings) delete defaultConfig.settings.gif;
    if (config.gif === 'gif.gif') {
        config.gif = 'assets/gif.gif';
    }

    await restoreUploadedGif();
    syncSettingsUI();
    render(config);
    renderCategoryToggles();
    renderCategoriesEditor();
    renderBangsEditor();
}
