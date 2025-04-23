/**
 * Gita Daily - Main Application Script
 * 
 * This script serves as the main entry point for the client-side application.
 * It initializes components and coordinates functionality between different modules.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Gita Daily application initialized');
    
    // Initialize notification system
    initializeNotificationSystem();
    
    // Set up dark mode toggle if present
    initializeDarkModeToggle();
    
    // Set up notification close button
    setupNotificationCloseButton();
});

/**
 * Initialize notification system
 * Set up periodic checks for scheduled notifications
 */
function initializeNotificationSystem() {
    // Get notification preferences from localStorage
    const notificationTime = localStorage.getItem('gitaDaily_notificationTime');
    if (notificationTime) {
        console.log('Notification scheduled for:', notificationTime);
        setupNotificationTimer(notificationTime);
    }
    
    // Check if notification permission is granted
    if (Notification && Notification.permission !== 'granted') {
        // Add request button if present
        const notificationPermissionBtn = document.getElementById('request-notification-permission');
        if (notificationPermissionBtn) {
            notificationPermissionBtn.classList.remove('d-none');
            notificationPermissionBtn.addEventListener('click', requestNotificationPermission);
        }
    }
}

/**
 * Request browser notification permission
 */
function requestNotificationPermission() {
    if (Notification && Notification.permission !== 'granted') {
        Notification.requestPermission().then(function(permission) {
            if (permission === 'granted') {
                showNotification('Notifications enabled!', 'success');
            }
        });
    }
}

/**
 * Set up notification timer based on user preference
 */
function setupNotificationTimer(timeString) {
    // Clear any existing timer
    if (window.notificationTimer) {
        clearInterval(window.notificationTimer);
    }
    
    // Set up interval to check time
    window.notificationTimer = setInterval(function() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;
        
        if (currentTime === timeString) {
            // Show notification in browser
            if (Notification && Notification.permission === 'granted') {
                const notification = new Notification('Gita Daily', {
                    body: '🕉️ Your shloka awaits: Shloka a day keeps maya away.',
                    icon: '/static/images/logo.svg'
                });
                
                notification.onclick = function() {
                    window.focus();
                    notification.close();
                    window.location.href = '/dashboard';
                };
            }
            
            // Also show in-app notification
            showNotification('🕉️ Your shloka awaits: Shloka a day keeps maya away.', 'info');
        }
    }, 60000); // Check every minute
}

/**
 * Set up notification close button
 */
function setupNotificationCloseButton() {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    const closeButton = notification.querySelector('.notification-close');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            notification.classList.remove('show');
        });
    }
}

/**
 * Initialize dark mode toggle functionality
 */
function initializeDarkModeToggle() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (!darkModeToggle) return;
    
    // Check for saved preference
    const isDarkMode = localStorage.getItem('gitaDaily_darkMode') === 'true';
    
    // Set initial state
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }
    
    // Add event listener
    darkModeToggle.addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('gitaDaily_darkMode', 'true');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('gitaDaily_darkMode', 'false');
        }
    });
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

/**
 * Utility function to safely parse JSON
 */
function safeJSONParse(jsonString, fallback = {}) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('JSON parse error:', error);
        return fallback;
    }
}

/**
 * Global notification function that can be called from any module
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    const notificationText = notification.querySelector('.notification-text');
    if (!notificationText) return;
    
    notificationText.textContent = message;
    notification.className = `notification-popup ${type}`;
    notification.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}
