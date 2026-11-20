export const input = document.getElementById('find-input');
export const badge = document.getElementById('engine-badge');
export const gif = document.getElementById('preview-gif');
export const gifBox = document.querySelector('.gif-box');
export const grid = document.getElementById('links-grid');

export const showSearchAreaCheck = document.getElementById('show-search-area');
export const showGifCheck = document.getElementById('show-gif');
export const showFaviconsCheck = document.getElementById('show-favicons');
export const gifSource = document.getElementById('gif-source');
export const gifDone = document.getElementById('gif-done');
export const gifUploadBtn = document.getElementById('gif-upload-btn');
export const gifUploadRemove = document.getElementById('gif-upload-remove');
export const gifUploadFile = document.getElementById('gif-upload-file');
export const gifUploadName = document.getElementById('gif-upload-name');
export const gifUploadStatus = document.getElementById('gif-upload-status');

export const autoThemeCheck = document.getElementById('auto-theme');
export const bgColorLabel = document.getElementById('bg-color-label');
export const textColorLabel = document.getElementById('text-color-label');
export const lightBgRow = document.getElementById('light-bg-color-row');
export const lightTextRow = document.getElementById('light-text-color-row');

export const bgColorPicker = document.getElementById('bg-color-picker');
export const bgColorInput = document.getElementById('bg-color');
export const lightBgColorPicker = document.getElementById('light-bg-color-picker');
export const lightBgColorInput = document.getElementById('light-bg-color');

export const textColorPicker = document.getElementById('text-color-picker');
export const textColorInput = document.getElementById('text-color');
export const lightTextColorPicker = document.getElementById('light-text-color-picker');
export const lightTextColorInput = document.getElementById('light-text-color');

export const fontSelect = document.getElementById('font-select');
export const openNewtabCheck = document.getElementById('open-newtab');
export const autohideSettingsCheck = document.getElementById('autohide-settings');

export const categoryTogglesContainer = document.getElementById('category-toggles');
export const categoriesEditorContainer = document.getElementById('categories-editor');
export const addCategoryBtn = document.getElementById('add-category-btn');

export const openSettingsBtn = document.getElementById('open-settings');
export const closeSettingsBtn = document.getElementById('close-settings');
export const settingsModal = document.getElementById('settings');

export const exportSettingsBtn = document.getElementById('export-settings');
export const importSettingsBtn = document.getElementById('import-settings');
export const importSettingsFile = document.getElementById('import-settings-file');
export const backupStatus = document.getElementById('backup-status');

export const browserApi = globalThis.browser ?? globalThis.chrome;
export const FALLBACK_SETTINGS = {
    'show-search-area': true,
    'show-gif': true,
    'show-favicons': false,
    'open-newtab': false,
    'autohide-settings': false
};
export const FALLBACK_THEME = {
    auto: false,
    bg: '#191919',
    text: '#fafafa',
    lightBg: '#fafafa',
    lightText: '#191919',
    font: 'Departure Mono'
};
export let config = {};
export function setConfig(value) { config = value; }
export let defaultConfig = {};
export function setDefaultConfig(value) { defaultConfig = value; }

export const GIF_DB_NAME = 'chromium-newtab-assets';
export const GIF_DB_VERSION = 1;
export const GIF_STORE_NAME = 'assets';
export const GIF_STORE_KEY = 'gif';
export const MAX_GIF_BYTES = 10 * 1024 * 1024;
export const SUPPORTED_GIF_TYPES = new Set([
    'image/gif',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/avif'
]);
export const SUPPORTED_GIF_EXTENSIONS = ['.gif', '.png', '.jpg', '.jpeg', '.webp', '.avif'];
export const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';


export const state = {
    draggedCategoryIndex: null,
    draggedShortcut: null,
    backupStatusTimer: null,
    gifUploadStatusTimer: null,
    uploadedGif: null,
    uploadedGifUrl: null,
    gifUploadInProgress: false,
};
