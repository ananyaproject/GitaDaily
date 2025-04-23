import os
import json
import uuid
from datetime import datetime, date, timedelta
from flask import render_template, request, redirect, url_for, jsonify, session
import pandas as pd
from app import app, db
from models import Visitor, Shloka, Favorite, VisitorShloka, Quiz, QuizQuestion, DailyProgress
from utils import (
    load_shlokas_from_csv, 
    get_daily_shlokas, 
    mark_daily_progress_complete,
    get_weekly_progress,
    is_quiz_unlocked,
    generate_weekly_quiz,
    submit_quiz_answers,
    get_initial_shlokas
)

# Before request middleware to handle sessions
@app.before_request
def before_request():
    # Create session ID if it doesn't exist
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
        
    # Set permanent session (30 days)
    session.permanent = True

# Load shlokas on startup
# Note: before_first_request is deprecated in newer Flask versions
# Using a function that runs with app context instead
def load_initial_data():
    with app.app_context():
        load_shlokas_from_csv()

# Call load_initial_data when this module is imported
load_initial_data()
    
# Helper function to get the current visitor
def get_current_visitor():
    if 'session_id' in session:
        return Visitor.get_or_create(session['session_id'])
    return None

@app.route('/')
def index():
    """Main page / Landing page"""
    # Get the first shloka to show on landing page
    random_shloka = get_initial_shlokas(1)[0] if Shloka.query.count() > 0 else None
    
    return render_template(
        'index.html',
        random_shloka=random_shloka
    )

@app.route('/dashboard')
def dashboard():
    """User dashboard with flashcards"""
    return render_template('dashboard.html')

@app.route('/favorites')
def favorites():
    """User favorites page"""
    return render_template('favorites.html')

@app.route('/quiz')
def quiz():
    """Weekly quiz page"""
    return render_template('quiz.html')

# API Routes

@app.route('/api/email/register', methods=['POST'])
def api_register_email():
    """API endpoint to register email for notifications"""
    data = request.json
    
    if not data or 'email' not in data:
        return jsonify({'error': 'Email is required'}), 400
    
    visitor = get_current_visitor()
    if visitor:
        visitor.email = data['email']
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Email registered successfully'
        })
    
    return jsonify({'error': 'Session not found'}), 400

@app.route('/api/shlokas/daily', methods=['GET'])
def api_daily_shlokas():
    """API endpoint to get daily shlokas"""
    visitor = get_current_visitor()
    
    if visitor:
        shlokas = get_daily_shlokas(visitor.id)
        
        return jsonify({
            'shlokas': [{
                'id': s.id,
                'sanskrit': s.sanskrit,
                'english': s.english,
                'isFavorite': Favorite.query.filter_by(
                    visitor_id=visitor.id,
                    shloka_id=s.id
                ).first() is not None
            } for s in shlokas]
        })
    else:
        # For non-logged in users, return initial shlokas
        shlokas = get_initial_shlokas(5)
        
        return jsonify({
            'shlokas': [{
                'id': s.id,
                'sanskrit': s.sanskrit,
                'english': s.english,
                'isFavorite': False
            } for s in shlokas]
        })

@app.route('/api/shlokas/mark-complete', methods=['POST'])
def api_mark_complete():
    """API endpoint to mark daily progress as complete"""
    visitor = get_current_visitor()
    
    if not visitor:
        return jsonify({'error': 'Session not found'}), 400
    
    progress = mark_daily_progress_complete(visitor.id)
    
    return jsonify({
        'success': True,
        'date': progress.date.strftime('%Y-%m-%d'),
        'completed': progress.completed
    })

@app.route('/api/favorites', methods=['GET'])
def api_get_favorites():
    """API endpoint to get user favorites"""
    visitor = get_current_visitor()
    
    if not visitor:
        return jsonify({'favorites': []})
    
    favorites = Favorite.query.filter_by(visitor_id=visitor.id).all()
    shloka_ids = [f.shloka_id for f in favorites]
    
    shlokas = Shloka.query.filter(Shloka.id.in_(shloka_ids)).all() if shloka_ids else []
    
    return jsonify({
        'favorites': [{
            'id': s.id,
            'sanskrit': s.sanskrit,
            'english': s.english
        } for s in shlokas]
    })

@app.route('/api/favorites/toggle', methods=['POST'])
def api_toggle_favorite():
    """API endpoint to toggle favorite status"""
    visitor = get_current_visitor()
    
    if not visitor:
        return jsonify({'error': 'Session not found'}), 400
    
    data = request.json
    
    if not data or 'shloka_id' not in data:
        return jsonify({'error': 'Invalid data'}), 400
    
    shloka_id = data['shloka_id']
    
    # Check if already favorited
    favorite = Favorite.query.filter_by(
        visitor_id=visitor.id,
        shloka_id=shloka_id
    ).first()
    
    if favorite:
        # Remove from favorites
        db.session.delete(favorite)
        is_favorite = False
    else:
        # Add to favorites
        favorite = Favorite(
            visitor_id=visitor.id,
            shloka_id=shloka_id
        )
        db.session.add(favorite)
        is_favorite = True
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'shloka_id': shloka_id,
        'isFavorite': is_favorite
    })

@app.route('/api/progress', methods=['GET'])
def api_progress():
    """API endpoint to get weekly progress"""
    visitor = get_current_visitor()
    
    if not visitor:
        # Return empty progress for non-logged in users
        today = date.today()
        empty_progress = []
        for i in range(7):
            empty_progress.append({
                'date': (today - timedelta(days=6-i)).strftime('%Y-%m-%d'),
                'completed': False,
                'is_today': i == 6
            })
        
        return jsonify({
            'progress': empty_progress,
            'quizUnlocked': False
        })
    
    progress_data = get_weekly_progress(visitor.id)
    quiz_unlocked = is_quiz_unlocked(visitor.id)
    
    return jsonify({
        'progress': progress_data,
        'quizUnlocked': quiz_unlocked
    })

@app.route('/api/quiz/generate', methods=['POST'])
def api_generate_quiz():
    """API endpoint to generate weekly quiz"""
    visitor = get_current_visitor()
    
    if not visitor:
        return jsonify({'error': 'Session not found'}), 400
    
    # Check if quiz is unlocked
    if not is_quiz_unlocked(visitor.id):
        # Generate a demo quiz for users who haven't completed enough days
        quiz = generate_weekly_quiz(visitor.id)
    else:
        quiz = generate_weekly_quiz(visitor.id)
    
    questions = []
    for q in quiz.questions:
        options = json.loads(q.options)
        questions.append({
            'id': q.id,
            'shloka_id': q.shloka_id,
            'question_type': q.question_type,
            'options': options
        })
    
    return jsonify({
        'quiz_id': quiz.id,
        'questions': questions
    })

@app.route('/api/quiz/submit', methods=['POST'])
def api_submit_quiz():
    """API endpoint to submit quiz answers"""
    visitor = get_current_visitor()
    
    if not visitor:
        return jsonify({'error': 'Session not found'}), 400
    
    data = request.json
    
    if not data or 'quiz_id' not in data or 'answers' not in data:
        return jsonify({'error': 'Invalid data'}), 400
    
    quiz = submit_quiz_answers(data['quiz_id'], data['answers'])
    
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404
    
    return jsonify({
        'success': True,
        'score': quiz.score,
        'completed': quiz.completed,
        'date': quiz.date.strftime('%Y-%m-%d')
    })

@app.route('/api/user/notification-time', methods=['POST'])
def api_set_notification_time():
    """API endpoint to set notification time"""
    visitor = get_current_visitor()
    
    if not visitor:
        return jsonify({'error': 'Session not found'}), 400
    
    data = request.json
    
    if not data or 'time' not in data:
        return jsonify({'error': 'Invalid data'}), 400
    
    visitor.notification_time = data['time']
    db.session.commit()
    
    return jsonify({
        'success': True,
        'notification_time': visitor.notification_time
    })

@app.route('/api/user/notification-time', methods=['GET'])
def api_get_notification_time():
    """API endpoint to get notification time"""
    visitor = get_current_visitor()
    
    if not visitor:
        return jsonify({'notification_time': None})
    
    return jsonify({
        'notification_time': visitor.notification_time
    })
