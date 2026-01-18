/**
 * Toast Notification System
 *
 * Provides configurable toast notifications with various types (success, error, warning, info)
 * and automatic dismissal. Supports custom icons and durations.
 */

const Toast = {
    container: null,
    queue: [],
    isShowing: false,

    /**
     * Initialize the Toast system by locating the toast container
     */
    init() {
        this.container = document.getElementById('toast-container');
    },

    /**
     * Show a toast notification
     * @param {Object} options - Toast configuration options
     * @param {string} options.type - Toast type (success, error, warning, info, level-up, task-complete, sprint-start, sprint-end, achievement)
     * @param {string} options.title - Optional title text
     * @param {string} options.message - Main message content
     * @param {number} options.duration - Auto-dismiss duration in milliseconds (default: 3000)
     * @param {string|null} options.icon - Custom icon (overrides default)
     * @returns {HTMLElement} The created toast element
     */
    show(options) {
        const { type = 'info', title = '', message = '', duration = 3000, icon = null } = options;

        const defaultIcons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            'level-up': '🎉',
            'task-complete': '✅',
            'sprint-start': '🚀',
            'sprint-end': '🏁',
            'achievement': '🏆'
        };

        const toastIcon = icon || defaultIcons[type] || defaultIcons.info;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${toastIcon}</span>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;

        // Close button handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.onclick = () => this.dismiss(toast);

        this.container.appendChild(toast);

        // Play notification sound if SoundSystem is available
        if (typeof SoundSystem !== 'undefined' && SoundSystem.play) {
            SoundSystem.play('notification');
        }

        // Auto-dismiss after duration
        setTimeout(() => this.dismiss(toast), duration);

        return toast;
    },

    /**
     * Dismiss a toast notification with animation
     * @param {HTMLElement} toast - The toast element to dismiss
     */
    dismiss(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    },

    /**
     * Show a success toast
     * @param {string} title - Title text
     * @param {string} message - Message content
     * @param {number} duration - Duration in milliseconds
     * @returns {HTMLElement} The created toast element
     */
    success(title, message, duration) {
        return this.show({ type: 'success', title, message, duration });
    },

    /**
     * Show an error toast
     * @param {string} title - Title text
     * @param {string} message - Message content
     * @param {number} duration - Duration in milliseconds
     * @returns {HTMLElement} The created toast element
     */
    error(title, message, duration) {
        return this.show({ type: 'error', title, message, duration });
    },

    /**
     * Show a warning toast
     * @param {string} title - Title text
     * @param {string} message - Message content
     * @param {number} duration - Duration in milliseconds
     * @returns {HTMLElement} The created toast element
     */
    warning(title, message, duration) {
        return this.show({ type: 'warning', title, message, duration });
    },

    /**
     * Show an info toast
     * @param {string} title - Title text
     * @param {string} message - Message content
     * @param {number} duration - Duration in milliseconds
     * @returns {HTMLElement} The created toast element
     */
    info(title, message, duration) {
        return this.show({ type: 'info', title, message, duration });
    },

    /**
     * Hide all active toasts
     */
    hideAll() {
        const toasts = this.container.querySelectorAll('.toast');
        toasts.forEach(toast => this.dismiss(toast));
    }
};

export { Toast };
