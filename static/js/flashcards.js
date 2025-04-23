/**
 * Flashcards Management for Gita Daily
 * Handles shloka flashcards, favorites, and daily progress
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize flashcards
    initializeFlashcards();
    
    // Initialize notification settings
    initializeNotificationSettings();
    
    // Event listener for mark complete button
    const markCompleteBtn = document.getElementById('mark-complete-btn');
    if (markCompleteBtn) {
        markCompleteBtn.addEventListener('click', markDayAsComplete);
    }
});

/**
 * Initialize flashcards from API
 */
function initializeFlashcards() {
    // Fetch daily shlokas
    fetch('/api/shlokas/daily')
        .then(response => response.json())
        .then(data => {
            if (data.shlokas && data.shlokas.length > 0) {
                createFlashcards(data.shlokas);
            } else {
                const swiperContainer = document.querySelector('#shloka-swiper .swiper-wrapper');
                swiperContainer.innerHTML = `
                    <div class="swiper-slide">
                        <div class="flashcard">
                            <div class="flashcard-front">
                                <div class="text-center">
                                    <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                                    <h3>No Shlokas Available</h3>
                                    <p>Please try again later.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error fetching shlokas:', error);
            const swiperContainer = document.querySelector('#shloka-swiper .swiper-wrapper');
            swiperContainer.innerHTML = `
                <div class="swiper-slide">
                    <div class="flashcard">
                        <div class="flashcard-front">
                            <div class="text-center">
                                <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
                                <h3>Failed to Load Shlokas</h3>
                                <p>Please check your connection and try again.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    
    // Fetch progress
    fetch('/api/progress')
        .then(response => response.json())
        .then(data => {
            if (data.progress) {
                updateProgressTracker(data.progress);
            }
        })
        .catch(error => {
            console.error('Error fetching progress:', error);
        });
}

/**
 * Create flashcards from shloka data
 */
function createFlashcards(shlokas) {
    const swiperContainer = document.querySelector('#shloka-swiper .swiper-wrapper');
    swiperContainer.innerHTML = '';
    
    shlokas.forEach(shloka => {
        const slideElement = document.createElement('div');
        slideElement.className = 'swiper-slide';
        
        slideElement.innerHTML = `
            <div class="flashcard" data-shloka-id="${shloka.id}">
                <div class="flashcard-front">
                    <div class="shloka-id">${shloka.id}</div>
                    <div class="shloka-sanskrit">${shloka.sanskrit}</div>
                    <button class="favorite-btn ${shloka.isFavorite ? 'active' : ''}" data-shloka-id="${shloka.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <div class="flashcard-hint">Tap to see English translation</div>
                </div>
                <div class="flashcard-back">
                    <div class="shloka-id">${shloka.id}</div>
                    <div class="shloka-english">${shloka.english}</div>
                    <button class="favorite-btn ${shloka.isFavorite ? 'active' : ''}" data-shloka-id="${shloka.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <div class="flashcard-hint">Tap to see Sanskrit</div>
                </div>
            </div>
        `;
        
        swiperContainer.appendChild(slideElement);
    });
    
    // Initialize Swiper
    const swiper = new Swiper('#shloka-swiper', {
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        effect: 'cards',
        grabCursor: true,
        slidesPerView: 1,
        spaceBetween: 30
    });
    
    // Add click event to flashcards for flipping
    const flashcards = document.querySelectorAll('.flashcard');
    flashcards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't flip if clicking on favorite button
            if (e.target.closest('.favorite-btn')) {
                return;
            }
            
            this.classList.toggle('flipped');
        });
    });
    
    // Add click event to favorite buttons
    const favoriteButtons = document.querySelectorAll('.favorite-btn');
    favoriteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const shlokaId = this.getAttribute('data-shloka-id');
            toggleFavorite(shlokaId, this);
        });
    });
}

/**
 * Toggle favorite status for a shloka
 */
function toggleFavorite(shlokaId, buttonElement) {
    fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            shloka_id: shlokaId
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update all instances of this favorite button
            const allButtons = document.querySelectorAll(`.favorite-btn[data-shloka-id="${shlokaId}"]`);
            allButtons.forEach(btn => {
                if (data.isFavorite) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            
            // Show notification
            const message = data.isFavorite ? 'Added to favorites' : 'Removed from favorites';
            showNotification(message);
        }
    })
    .catch(error => {
        console.error('Error toggling favorite:', error);
        showNotification('Failed to update favorites', 'error');
    });
}

/**
 * Mark today's reading as complete
 */
function markDayAsComplete() {
    fetch('/api/shlokas/mark-complete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update UI to reflect completion
            const markCompleteBtn = document.getElementById('mark-complete-btn');
            markCompleteBtn.disabled = true;
            markCompleteBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Completed for Today';
            
            // Update progress display
            fetch('/api/progress')
                .then(response => response.json())
                .then(progressData => {
                    updateProgressTracker(progressData.progress);
                    
                    // Show notification about quiz if unlocked
                    if (progressData.quizUnlocked) {
                        showNotification('Weekly quiz is now available!', 'info');
                    } else {
                        showNotification('Progress saved! Keep up the good work!');
                    }
                });
        }
    })
    .catch(error => {
        console.error('Error marking as complete:', error);
        showNotification('Failed to save progress', 'error');
    });
}

/**
 * Update the progress tracker with weekly data
 */
function updateProgressTracker(progressData) {
    const progressTracker = document.getElementById('progress-tracker');
    if (!progressTracker) return;
    
    progressTracker.innerHTML = '';
    
    progressData.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'progress-day';
        
        const circleClass = day.completed ? 'progress-circle completed' : 'progress-circle';
        const todayClass = day.is_today ? ' today' : '';
        
        const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
        
        dayElement.innerHTML = `
            <div class="${circleClass}${todayClass}">
                <i class="${day.completed ? 'fas fa-check' : ''}"></i>
            </div>
            <span class="progress-day-label">${dayName}</span>
        `;
        
        progressTracker.appendChild(dayElement);
    });
    
    // Check if today is completed and update button
    const todayData = progressData.find(day => day.is_today);
    if (todayData && todayData.completed) {
        const markCompleteBtn = document.getElementById('mark-complete-btn');
        if (markCompleteBtn) {
            markCompleteBtn.disabled = true;
            markCompleteBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Completed for Today';
        }
    }
}

/**
 * Initialize notification settings
 */
function initializeNotificationSettings() {
    const timeInput = document.getElementById('notification-time');
    const saveButton = document.getElementById('save-notification-time');
    
    if (!timeInput || !saveButton) return;
    
    // Fetch current notification time
    fetch('/api/user/notification-time')
        .then(response => response.json())
        .then(data => {
            if (data.notification_time) {
                timeInput.value = data.notification_time;
            } else {
                // Default to 8 AM
                timeInput.value = '08:00';
            }
        })
        .catch(error => {
            console.error('Error fetching notification time:', error);
            timeInput.value = '08:00';
        });
    
    // Save notification time
    saveButton.addEventListener('click', function() {
        const time = timeInput.value;
        
        if (!time) {
            showNotification('Please select a valid time', 'error');
            return;
        }
        
        fetch('/api/user/notification-time', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                time: time
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Notification time saved');
                
                // Save to localStorage for client-side notifications
                localStorage.setItem('gitaDaily_notificationTime', time);
                setupLocalNotification(time);
            }
        })
        .catch(error => {
            console.error('Error saving notification time:', error);
            showNotification('Failed to save notification time', 'error');
        });
    });
    
    // Set up notification from localStorage if exists
    const savedTime = localStorage.getItem('gitaDaily_notificationTime');
    if (savedTime) {
        setupLocalNotification(savedTime);
    }
}

/**
 * Set up local notification based on time
 */
function setupLocalNotification(timeString) {
    // Clear any existing notification interval
    if (window.notificationInterval) {
        clearInterval(window.notificationInterval);
    }
    
    // Set interval to check time
    window.notificationInterval = setInterval(() => {
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
 * Show notification popup
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = notification.querySelector('.notification-text');
    
    notificationText.textContent = message;
    notification.className = `notification-popup ${type}`;
    notification.classList.add('show');
    
    // Add click event to close button
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', function() {
        notification.classList.remove('show');
    });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}
