/**
 * Quiz Management for Gita Daily
 * Handles weekly quiz generation, submission, and scoring
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize quiz status
    checkQuizStatus();
    
    // Initialize event listeners
    initEventListeners();
});

/**
 * Initialize event listeners for quiz actions
 */
function initEventListeners() {
    // Start quiz button
    const startQuizBtn = document.getElementById('start-quiz-btn');
    if (startQuizBtn) {
        startQuizBtn.addEventListener('click', generateQuiz);
    }
    
    // Retake quiz button
    const retakeQuizBtn = document.getElementById('retake-quiz-btn');
    if (retakeQuizBtn) {
        retakeQuizBtn.addEventListener('click', generateQuiz);
    }
    
    // Quiz form submission
    const quizForm = document.getElementById('quiz-form');
    if (quizForm) {
        quizForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitQuiz();
        });
    }
}

/**
 * Check quiz status - available, locked, or completed
 */
function checkQuizStatus() {
    // Show loading state
    const quizStatusEl = document.getElementById('quiz-status');
    const loadingEl = quizStatusEl.querySelector('.quiz-status-loading');
    const lockedEl = quizStatusEl.querySelector('.quiz-status-locked');
    const completedEl = quizStatusEl.querySelector('.quiz-status-completed');
    const availableEl = quizStatusEl.querySelector('.quiz-status-available');
    
    // Show only loading initially
    loadingEl.classList.remove('d-none');
    lockedEl.classList.add('d-none');
    completedEl.classList.add('d-none');
    availableEl.classList.add('d-none');
    
    // Fetch progress to determine quiz status
    fetch('/api/progress')
        .then(response => response.json())
        .then(data => {
            // Hide loading
            loadingEl.classList.add('d-none');
            
            if (data.quizUnlocked) {
                // Quiz is available
                availableEl.classList.remove('d-none');
            } else {
                // Quiz is locked, show progress
                lockedEl.classList.remove('d-none');
                
                // Update small progress tracker in quiz view
                const progressTracker = document.getElementById('quiz-progress-tracker');
                if (progressTracker) {
                    progressTracker.innerHTML = '';
                    
                    data.progress.forEach(day => {
                        const dayCircle = document.createElement('div');
                        dayCircle.className = day.completed ? 'progress-circle completed' : 'progress-circle';
                        if (day.is_today) dayCircle.classList.add('today');
                        
                        dayCircle.innerHTML = day.completed ? '<i class="fas fa-check"></i>' : '';
                        
                        progressTracker.appendChild(dayCircle);
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error checking quiz status:', error);
            loadingEl.classList.add('d-none');
            
            // Show error message
            quizStatusEl.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Failed to check quiz status. Please try again later.
                </div>
            `;
        });
}

/**
 * Generate a new quiz
 */
function generateQuiz() {
    // Show loading state
    const quizStatusEl = document.getElementById('quiz-status');
    const quizContentEl = document.getElementById('quiz-content');
    const quizResultsEl = document.getElementById('quiz-results');
    
    quizStatusEl.innerHTML = `
        <div class="card-body">
            <div class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Generating your quiz...</p>
            </div>
        </div>
    `;
    
    quizContentEl.classList.add('d-none');
    quizResultsEl.classList.add('d-none');
    
    // Request quiz generation from API
    fetch('/api/quiz/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        // Hide status and show quiz content
        quizStatusEl.classList.add('d-none');
        quizContentEl.classList.remove('d-none');
        
        // Populate quiz questions
        renderQuizQuestions(data);
    })
    .catch(error => {
        console.error('Error generating quiz:', error);
        quizStatusEl.innerHTML = `
            <div class="card-body">
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Failed to generate quiz. Please try again later.
                </div>
                <div class="text-center mt-3">
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        <i class="fas fa-redo me-2"></i> Try Again
                    </button>
                </div>
            </div>
        `;
    });
}

/**
 * Render quiz questions in the DOM
 */
function renderQuizQuestions(quizData) {
    const questionsContainer = document.getElementById('quiz-questions');
    questionsContainer.innerHTML = '';
    
    // Store quiz ID for submission
    questionsContainer.setAttribute('data-quiz-id', quizData.quiz_id);
    
    // Create each question
    quizData.questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'quiz-question';
        
        // Create header based on question type
        let questionHeader = '';
        if (question.question_type === 'sanskrit_to_english') {
            questionHeader = 'Translate this Sanskrit shloka to English:';
        } else {
            questionHeader = 'Match this English translation to its Sanskrit shloka:';
        }
        
        // Fetch the actual question content
        fetch(`/api/shlokas/daily`)
            .then(response => response.json())
            .then(data => {
                // Find the shloka that matches this question
                const shloka = data.shlokas.find(s => s.id === question.shloka_id);
                
                if (shloka) {
                    // Create question content based on type
                    const questionContent = question.question_type === 'sanskrit_to_english' 
                        ? shloka.sanskrit 
                        : shloka.english;
                    
                    // Create options
                    let optionsHTML = '';
                    question.options.forEach(option => {
                        const optionId = `q${question.id}_${option.replace(/\s+/g, '_').substring(0, 10)}`;
                        
                        optionsHTML += `
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="question_${question.id}" 
                                       id="${optionId}" value="${option}" required>
                                <label class="form-check-label" for="${optionId}">
                                    ${option}
                                </label>
                            </div>
                        `;
                    });
                    
                    // Build the complete question HTML
                    questionElement.innerHTML = `
                        <div class="question-header">
                            <span class="question-number">Question ${index + 1}:</span> ${questionHeader}
                        </div>
                        <div class="question-content">
                            ${questionContent}
                        </div>
                        <div class="question-options">
                            ${optionsHTML}
                        </div>
                    `;
                    
                    questionsContainer.appendChild(questionElement);
                }
            })
            .catch(error => {
                console.error('Error fetching shloka details:', error);
                questionElement.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Failed to load question ${index + 1}. Please try again later.
                    </div>
                `;
                questionsContainer.appendChild(questionElement);
            });
    });
}

/**
 * Submit quiz answers
 */
function submitQuiz() {
    const questionsContainer = document.getElementById('quiz-questions');
    const quizId = questionsContainer.getAttribute('data-quiz-id');
    
    // Collect answers
    const answers = {};
    const questionInputs = document.querySelectorAll('[name^="question_"]');
    
    questionInputs.forEach(input => {
        if (input.checked) {
            const questionId = input.name.replace('question_', '');
            answers[questionId] = input.value;
        }
    });
    
    // Check if all questions are answered
    const questions = document.querySelectorAll('.quiz-question');
    if (Object.keys(answers).length < questions.length) {
        alert('Please answer all questions before submitting.');
        return;
    }
    
    // Show loading state
    const quizContentEl = document.getElementById('quiz-content');
    quizContentEl.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Submitting your answers...</p>
        </div>
    `;
    
    // Submit answers to API
    fetch('/api/quiz/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            quiz_id: quizId,
            answers: answers
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showQuizResults(data.score);
        } else {
            showQuizError('Failed to submit quiz. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error submitting quiz:', error);
        showQuizError('An error occurred. Please try again later.');
    });
}

/**
 * Show quiz results
 */
function showQuizResults(score) {
    const quizStatusEl = document.getElementById('quiz-status');
    const quizContentEl = document.getElementById('quiz-content');
    const quizResultsEl = document.getElementById('quiz-results');
    
    // Hide other sections
    quizStatusEl.classList.add('d-none');
    quizContentEl.classList.add('d-none');
    
    // Update score display
    const scoreElement = document.getElementById('result-score-value');
    scoreElement.textContent = `${score}%`;
    
    // Update message based on score
    const messageElement = document.getElementById('score-message');
    if (score >= 90) {
        messageElement.textContent = 'Excellent! You have mastered these shlokas!';
    } else if (score >= 70) {
        messageElement.textContent = 'Great job! You have a good understanding of the Gita.';
    } else if (score >= 50) {
        messageElement.textContent = 'Good effort! Keep studying to improve your knowledge.';
    } else {
        messageElement.textContent = 'Keep practicing! The wisdom of the Gita takes time to absorb.';
    }
    
    // Show results
    quizResultsEl.classList.remove('d-none');
}

/**
 * Show quiz error message
 */
function showQuizError(message) {
    const quizStatusEl = document.getElementById('quiz-status');
    const quizContentEl = document.getElementById('quiz-content');
    const quizResultsEl = document.getElementById('quiz-results');
    
    // Hide other sections
    quizResultsEl.classList.add('d-none');
    
    // Show error in content area
    quizContentEl.classList.remove('d-none');
    quizContentEl.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <i class="fas fa-exclamation-circle me-2"></i>
            ${message}
        </div>
        <div class="text-center mt-3">
            <button class="btn btn-primary" onclick="window.location.reload()">
                <i class="fas fa-redo me-2"></i> Try Again
            </button>
        </div>
    `;
}
