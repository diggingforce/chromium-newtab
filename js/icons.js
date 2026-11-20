import { config } from './shared.js';
import { saveConfig } from './storage.js';
import { render } from './shortcuts.js';

export async function readLocalIcon(file) {
    if (!file || !['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/x-icon', 'image/vnd.microsoft.icon'].includes(file.type)) throw new Error('choose a PNG, JPEG, WebP, GIF, AVIF or ICO image');
    if (!file.size || file.size > 1024 * 1024) throw new Error('choose an image up to 1 MB');
    const bitmap = await createImageBitmap(file);
    try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 32;
        const context = canvas.getContext('2d');
        const scale = Math.min(32 / bitmap.width, 32 / bitmap.height);
        const width = bitmap.width * scale;
        const height = bitmap.height * scale;
        context.drawImage(bitmap, (32 - width) / 2, (32 - height) / 2, width, height);
        return canvas.toDataURL('image/png');
    } finally {
        bitmap.close();
    }
}

export function syncIconsUI() {
    document.getElementById('favicon-source').value = config.icons?.source === 'local' ? 'local' : 'remote';
}

export function setupIcons() {
    document.getElementById('favicon-source').addEventListener('change', event => {
        config.icons = { source: event.target.value };
        render(config);
        saveConfig();
    });
}
