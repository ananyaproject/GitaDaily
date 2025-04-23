/**
 * Progress Tracking for Gita Daily
 * Handles weekly progress display and updates
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check and update progress display
    updateProgressDisplay();
});

/**
 * Update progress display based on API data
 */
function updateProgressDisplay() {
    const progressTracker = document.getElementById('progress-tracker');
    if (!progressTracker) return;
    
    fetch('/api/progress')
        .then(response => response.json())
        .then(data => {
            if (data.progress) {
                renderProgressTracker(data.progress, progressTracker);
                
                // If quiz is unlocked, show notification
                if (data.quizUnlocked) {
                    showQuizAvailableNotification();
                }
                
                // Update complete button if today is already completed
                const todayProgress = data.progress.find(day => day.is_today);
                if (todayProgress && todayProgress.completed) {
                    updateCompletedButton();
                }
            }
        })
        .catch(error => {
            console.error('Error fetching progress:', error);
            progressTracker.innerHTML = `
                <div class="alert alert-warning" role="alert">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Unable to load progress data.
                </div>
            `;
        });
}

/**
 * Render progress tracker with weekly data
 */
function renderProgressTracker(progressData, trackerElement) {
    trackerElement.innerHTML = '';
    
    progressData.forEach(day => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const dayElement = document.createElement('div');
        dayElement.className = 'progress-day';
        
        // Create circle with appropriate classes
        const circleClasses = ['progress-circle'];
        if (day.completed) circleClasses.push('completed');
        if (day.is_today) circleClasses.push('today');
        
        dayElement.innerHTML = `
            <div class="${circleClasses.join(' ')}">
                ${day.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <span class="progress-day-label">${dayName}</span>
        `;
        
        trackerElement.appendChild(dayElement);
    });
}

/**
 * Show notification that quiz is available
 */
function showQuizAvailableNotification() {
    if (typeof showNotification === 'function') {
        showNotification('Weekly quiz is now available! Test your knowledge.', 'info');
    } else {
        console.log('Quiz is available notification');
    }
}

/**
 * Update the complete button to show completed state
 */
function updateCompletedButton() {
    const completeButton = document.getElementById('mark-complete-btn');
    if (completeButton) {
        completeButton.disabled = true;
        completeButton.innerHTML = '<i class="fas fa-check-circle me-2"></i> Completed for Today';
        completeButton.classList.remove('btn-success');
        completeButton.classList.add('btn-secondary');
    }
}
