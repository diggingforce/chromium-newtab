import { input, config } from './shared.js';
import { findShortcuts } from './search-model.js';
import { esc } from './backup.js';

let matches = [];
let selected = -1;

export function closeSuggestions() {
    document.getElementById('shortcut-suggestions').hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    selected = -1;
}

export function updateSuggestions() {
    const list = document.getElementById('shortcut-suggestions');
    matches = findShortcuts(config.sections, input.value);
    selected = -1;
    list.innerHTML = matches.map((link, index) => `<li id="suggestion-${index}" role="option" aria-selected="false" data-index="${index}">
        <span>${esc(link.name)}</span><small>${esc(link.category)} · ${esc(new URL(link.url).hostname)}</small>
    </li>`).join('');
    list.hidden = !matches.length;
    input.setAttribute('aria-expanded', String(Boolean(matches.length)));
    input.removeAttribute('aria-activedescendant');
}

function openMatch(index) {
    const match = matches[index];
    if (!match) return;
    if (config.settings?.['open-newtab']) window.open(match.url, '_blank', 'noopener,noreferrer');
    else window.location.href = match.url;
    closeSuggestions();
}

export function setupSuggestions() {
    const list = document.getElementById('shortcut-suggestions');
    input.addEventListener('input', updateSuggestions);
    input.addEventListener('focus', updateSuggestions);
    input.addEventListener('keydown', event => {
        if (list.hidden) return;
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            selected = selected < 0 ? (direction > 0 ? 0 : matches.length - 1) : (selected + direction + matches.length) % matches.length;
            [...list.children].forEach((item, index) => item.setAttribute('aria-selected', String(index === selected)));
            input.setAttribute('aria-activedescendant', `suggestion-${selected}`);
        } else if (event.key === 'Enter' && selected >= 0) {
            event.preventDefault();
            event.stopImmediatePropagation();
            openMatch(selected);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopImmediatePropagation();
            closeSuggestions();
        }
    }, true);
    list.addEventListener('mousedown', event => event.preventDefault());
    list.addEventListener('click', event => {
        const option = event.target.closest('[data-index]');
        if (option) openMatch(Number(option.dataset.index));
    });
    input.addEventListener('blur', closeSuggestions);
}
