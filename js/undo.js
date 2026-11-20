import { createHistory } from './history-model.js';
import { config } from './shared.js';
import { saveConfig } from './storage.js';
import { render, renderCategoriesEditor, renderCategoryToggles } from './shortcuts.js';
import { renderBangsEditor } from './bangs.js';

const history = createHistory();

function updateUndoUI(message) {
    document.getElementById('undo-delete').disabled = history.size === 0;
    document.getElementById('undo-status').textContent = message;
}

export function rememberDeletion(label, restore) {
    history.push({ label, restore });
    updateUndoUI(`${label} deleted. You can undo this deletion.`);
}

export function clearUndo() {
    history.clear();
    updateUndoUI('');
}

export function setupUndo() {
    document.getElementById('undo-delete').addEventListener('click', () => {
        const label = history.undo();
        if (!label) {
            updateUndoUI('could not restore: the command already exists');
            return;
        }
        saveConfig();
        render(config);
        renderCategoryToggles();
        renderCategoriesEditor();
        renderBangsEditor();
        updateUndoUI(`${label} restored`);
        if (!history.size) document.getElementById('close-settings').focus();
    });
}
