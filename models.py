from datetime import datetime
from app import db
from uuid import uuid4
import random

class Visitor(db.Model):
    """Simple visitor model to track users with just a session ID"""
    __tablename__ = 'visitors'
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid4()))
    session_id = db.Column(db.String, nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    last_visit = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    email = db.Column(db.String, nullable=True)  # Optional email for notifications
    
    # Progress and preferences
    notification_time = db.Column(db.String, nullable=True)
    last_quiz_date = db.Column(db.Date, nullable=True)
    last_quiz_score = db.Column(db.Integer, nullable=True)
    last_shloka_date = db.Column(db.Date, nullable=True)
    
    # Relationships
    favorites = db.relationship('Favorite', backref='visitor', lazy=True)
    progress = db.relationship('DailyProgress', backref='visitor', lazy=True)

    @staticmethod
    def get_or_create(session_id):
        """Get visitor by session_id or create a new one"""
        visitor = Visitor.query.filter_by(session_id=session_id).first()
        if not visitor:
            visitor = Visitor(session_id=session_id)
            db.session.add(visitor)
            db.session.commit()
        return visitor

class Favorite(db.Model):
    __tablename__ = 'favorites'
    id = db.Column(db.Integer, primary_key=True)
    visitor_id = db.Column(db.String, db.ForeignKey('visitors.id'), nullable=False)
    shloka_id = db.Column(db.String, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

class DailyProgress(db.Model):
    __tablename__ = 'daily_progress'
    id = db.Column(db.Integer, primary_key=True)
    visitor_id = db.Column(db.String, db.ForeignKey('visitors.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
class Shloka(db.Model):
    __tablename__ = 'shlokas'
    id = db.Column(db.String, primary_key=True)
    sanskrit = db.Column(db.Text, nullable=False)
    english = db.Column(db.Text, nullable=False)
    
class VisitorShloka(db.Model):
    __tablename__ = 'visitor_shlokas'
    id = db.Column(db.Integer, primary_key=True)
    visitor_id = db.Column(db.String, db.ForeignKey('visitors.id'), nullable=False)
    shloka_id = db.Column(db.String, db.ForeignKey('shlokas.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    
class Quiz(db.Model):
    __tablename__ = 'quizzes'
    id = db.Column(db.Integer, primary_key=True)
    visitor_id = db.Column(db.String, db.ForeignKey('visitors.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    score = db.Column(db.Integer, nullable=True)
    completed = db.Column(db.Boolean, default=False)
    
    # Relationships
    questions = db.relationship('QuizQuestion', backref='quiz', lazy=True)
    
class QuizQuestion(db.Model):
    __tablename__ = 'quiz_questions'
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    shloka_id = db.Column(db.String, db.ForeignKey('shlokas.id'), nullable=False)
    question_type = db.Column(db.String, nullable=False)  # 'sanskrit_to_english' or 'english_to_sanskrit'
    correct_answer = db.Column(db.String, nullable=False)
    options = db.Column(db.Text, nullable=False)  # JSON string of options
    user_answer = db.Column(db.String, nullable=True)
    is_correct = db.Column(db.Boolean, nullable=True)
