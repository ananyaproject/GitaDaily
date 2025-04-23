/**
 * Notifications System for Gita Daily
 * Handles notification display and scheduling
 */

document.addEventListener('DOMContentLoaded', function() {
    // Set up close button for notifications
    const notificationElement = document.getElementById('notification');
    if (notificationElement) {
        const closeButton = notificationElement.querySelector('.notification-close');
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                notificationElement.classList.remove('show');
            });
        }
    }
    
    // Check for stored notification time and set up notifications
    initializeLocalNotifications();
});

/**
 * Initialize local notifications based on stored preferences
 */
function initializeLocalNotifications() {
    const notificationTime = localStorage.getItem('gitaDaily_notificationTime');
    if (notificationTime) {
        setupNotificationCheck(notificationTime);
    }
}

/**
 * Set up notification check interval
 */
function setupNotificationCheck(timeString) {
    // Clear any existing interval
    if (window.notificationCheckInterval) {
        clearInterval(window.notificationCheckInterval);
    }
    
    // Check every minute if it's time for notification
    window.notificationCheckInterval = setInterval(() => {
        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;
        
        if (currentTime === timeString) {
            showNotification('🕉️ Your shloka awaits: Shloka a day keeps maya away.', 'info');
        }
    }, 60000); // Check every minute
}

/**
 * Display a notification
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    const notificationText = notification.querySelector('.notification-text');
    
    notificationText.textContent = message;
    notification.className = `notification-popup ${type}`;
    notification.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}
