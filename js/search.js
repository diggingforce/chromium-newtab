import { bangDestination } from './search-model.js';
import { input, badge, browserApi, config } from './shared.js';

export function isDirectUrl(val) {
    if (/^https?:\/\//i.test(val)) return true;
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

    if (Object.hasOwn(bangs, firstWord)) {
        badge.textContent = `!${bangs[firstWord].name || firstWord.slice(1)}`;
    } else if (isDirectUrl(val)) {
        badge.textContent = 'go';
    } else {
        badge.textContent = 'search';
    }
});

input.addEventListener('keydown', function (e) {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') {
        const val = this.value.trim();
        if (!val) return;

        const parts = val.split(/\s+/);
        const prefix = parts[0].toLowerCase();
        const bangs = config.search?.bangs || {};

        if (Object.hasOwn(bangs, prefix)) {
            const query = parts.slice(1).join(' ');
            const bang = bangs[prefix];
            const destination = bangDestination(bang, query);
            if (destination) window.location.href = destination;
            return;
        }

        if (/^r\/[a-zA-Z0-9_]+$/i.test(val)) {
            window.location.href = `https://reddit.com/${val}`;
            return;
        }

        if (isDirectUrl(val)) {
            if (/^localhost(:\d+)?/i.test(val) || /^\d{1,3}(\.\d{1,3}){3}/.test(val)) {
                window.location.href = /^https?:\/\//i.test(val) ? val : 'http://' + val;
            } else {
                window.location.href = /^https?:\/\//i.test(val) ? val : 'https://' + val;
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
