import pandas as pd
import random
import json
from datetime import datetime, timedelta, date
from app import app, db
from models import Shloka, Visitor, DailyProgress, VisitorShloka, Quiz, QuizQuestion

def load_shlokas_from_csv():
    """Load shlokas from CSV file into the database"""
    try:
        # Check if shlokas are already loaded
        if db.session.query(Shloka).count() > 0:
            return
        
        # Load CSV file from attached_assets 
        df = pd.read_csv('./attached_assets/Gita-data.csv')
        
        # Insert shlokas into database
        for _, row in df.iterrows():
            shloka = Shloka(
                id=row['id'],
                sanskrit=row['SA'],
                english=row['EN']
            )
            db.session.add(shloka)
        
        db.session.commit()
        app.logger.info(f"Loaded {len(df)} shlokas from CSV")
    except Exception as e:
        app.logger.error(f"Error loading shlokas: {str(e)}")
        db.session.rollback()

def get_daily_shlokas(visitor_id):
    """Get 5 consecutive shlokas for the day based on visitor's progress"""
    today = date.today()
    
    # Check if visitor already has shlokas for today
    visitor_shlokas = VisitorShloka.query.filter_by(
        visitor_id=visitor_id, 
        date=today
    ).all()
    
    if visitor_shlokas:
        # Return the shlokas that were already assigned
        shloka_ids = [vs.shloka_id for vs in visitor_shlokas]
        return Shloka.query.filter(Shloka.id.in_(shloka_ids)).order_by(Shloka.id).all()
    
    # Determine the starting point for this visitor
    # Get the last assigned shloka for this visitor
    last_assigned = VisitorShloka.query.filter_by(
        visitor_id=visitor_id
    ).join(Shloka, VisitorShloka.shloka_id == Shloka.id).order_by(Shloka.id.desc()).first()
    
    if last_assigned:
        # Start from the next shloka after the last one assigned
        last_shloka_id = last_assigned.shloka_id
        # Extract the numeric part of the ID if it's in format like 'BG1.1'
        try:
            # For IDs in format like 'BG1.1', split by '.' and get the values
            if '.' in last_shloka_id:
                last_chapter, last_verse = last_shloka_id.replace('BG', '').split('.')
                last_chapter = int(last_chapter)
                last_verse = int(last_verse)
                # Start from the next verse
                next_verse = last_verse + 1
                next_shloka_id = f"BG{last_chapter}.{next_verse}"
                
                # Check if next shloka exists
                next_shloka = Shloka.query.get(next_shloka_id)
                if not next_shloka:
                    # Start from the next chapter
                    next_chapter = last_chapter + 1
                    next_shloka_id = f"BG{next_chapter}.1"
                    next_shloka = Shloka.query.get(next_shloka_id)
                    if not next_shloka:
                        # If no next chapter, start from the beginning
                        next_shloka_id = "BG1.1"
            else:
                # For other formats, start from the beginning
                next_shloka_id = "BG1.1"
        except:
            # If any parsing error, start from the beginning
            next_shloka_id = "BG1.1"
    else:
        # If no previous shlokas, start from the beginning
        next_shloka_id = "BG1.1"
    
    # Get 5 consecutive shlokas starting from the next_shloka_id
    selected_shlokas = Shloka.query.filter(Shloka.id >= next_shloka_id).order_by(Shloka.id).limit(5).all()
    
    # If we don't have 5 shlokas (might be at the end of the book), 
    # cycle back to the beginning to get the remaining
    if len(selected_shlokas) < 5:
        remaining_count = 5 - len(selected_shlokas)
        remaining_shlokas = Shloka.query.order_by(Shloka.id).limit(remaining_count).all()
        selected_shlokas.extend(remaining_shlokas)
    
    # Save the selected shlokas for this visitor for today
    selected_ids = [s.id for s in selected_shlokas]
    for shloka_id in selected_ids:
        visitor_shloka = VisitorShloka(
            visitor_id=visitor_id,
            shloka_id=shloka_id,
            date=today
        )
        db.session.add(visitor_shloka)
    
    # Update visitor's last shloka date
    visitor = Visitor.query.get(visitor_id)
    if visitor:
        visitor.last_shloka_date = today
    
    # Create daily progress for today if not exists
    progress = DailyProgress.query.filter_by(
        visitor_id=visitor_id,
        date=today
    ).first()
    
    if not progress:
        progress = DailyProgress(
            visitor_id=visitor_id,
            date=today,
            completed=False
        )
        db.session.add(progress)
    
    db.session.commit()
    
    return selected_shlokas

def mark_daily_progress_complete(visitor_id):
    """Mark the daily progress as complete"""
    today = date.today()
    
    # Find the daily progress for today
    progress = DailyProgress.query.filter_by(
        visitor_id=visitor_id,
        date=today
    ).first()
    
    if not progress:
        progress = DailyProgress(
            visitor_id=visitor_id,
            date=today,
            completed=True
        )
        db.session.add(progress)
    else:
        progress.completed = True
    
    db.session.commit()
    return progress

def get_weekly_progress(visitor_id):
    """Get the visitor's progress for the past 7 days"""
    today = date.today()
    start_date = today - timedelta(days=6)  # Get the last 7 days
    
    progress_data = []
    for i in range(7):
        current_date = start_date + timedelta(days=i)
        
        # Find progress for this date
        progress = DailyProgress.query.filter_by(
            visitor_id=visitor_id,
            date=current_date
        ).first()
        
        progress_data.append({
            'date': current_date.strftime('%Y-%m-%d'),
            'completed': progress.completed if progress else False,
            'is_today': current_date == today
        })
    
    return progress_data

def is_quiz_unlocked(visitor_id):
    """Check if the weekly quiz is unlocked for the visitor"""
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    
    # Count completed days in this week
    completed_days = DailyProgress.query.filter(
        DailyProgress.visitor_id == visitor_id,
        DailyProgress.date >= start_of_week,
        DailyProgress.date <= today,
        DailyProgress.completed == True
    ).count()
    
    # Check if visitor has already taken the quiz this week
    quiz = Quiz.query.filter(
        Quiz.visitor_id == visitor_id,
        Quiz.date >= start_of_week,
        Quiz.date <= today
    ).first()
    
    # Quiz is unlocked if visitor has completed at least 5 days and hasn't taken the quiz yet
    # Relaxed from 7 days to 5 days to make it more accessible
    return completed_days >= 5 and not quiz

def generate_weekly_quiz(visitor_id):
    """Generate a weekly quiz for the visitor"""
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    
    # Get all shlokas from this week
    visitor_shlokas = VisitorShloka.query.filter(
        VisitorShloka.visitor_id == visitor_id,
        VisitorShloka.date >= start_of_week,
        VisitorShloka.date <= today
    ).all()
    
    shloka_ids = [vs.shloka_id for vs in visitor_shlokas]
    shlokas = Shloka.query.filter(Shloka.id.in_(shloka_ids)).all()
    
    # Create quiz
    quiz = Quiz(
        visitor_id=visitor_id,
        date=today,
        completed=False
    )
    db.session.add(quiz)
    db.session.flush()  # Get the quiz ID
    
    # Generate 7 questions (or less if not enough shlokas)
    num_questions = min(7, len(shlokas))
    question_shlokas = random.sample(shlokas, num_questions) if num_questions > 0 else []
    
    # If we don't have enough shlokas from this week, add some random ones
    if num_questions < 5:
        additional_needed = 5 - num_questions
        existing_ids = [s.id for s in question_shlokas]
        additional_shlokas = Shloka.query.filter(
            ~Shloka.id.in_(existing_ids)
        ).order_by(db.func.random()).limit(additional_needed).all()
        
        question_shlokas.extend(additional_shlokas)
    
    for i, shloka in enumerate(question_shlokas):
        # Alternate between Sanskrit to English and English to Sanskrit questions
        question_type = 'sanskrit_to_english' if i % 2 == 0 else 'english_to_sanskrit'
        
        # Get incorrect options (3 other random shlokas)
        other_shlokas = [s for s in shlokas if s.id != shloka.id]
        if len(other_shlokas) >= 3:
            incorrect_options = random.sample(other_shlokas, 3)
        else:
            # If not enough shlokas, use all available ones and supplement with more
            all_other_shlokas = Shloka.query.filter(
                Shloka.id != shloka.id
            ).order_by(db.func.random()).limit(10).all()
            incorrect_options = random.sample(all_other_shlokas, min(3, len(all_other_shlokas)))
        
        # Create options
        if question_type == 'sanskrit_to_english':
            correct_answer = shloka.english
            options = [s.english for s in incorrect_options] + [shloka.english]
        else:
            correct_answer = shloka.sanskrit
            options = [s.sanskrit for s in incorrect_options] + [shloka.sanskrit]
        
        # Shuffle options
        random.shuffle(options)
        
        # Create question
        question = QuizQuestion(
            quiz_id=quiz.id,
            shloka_id=shloka.id,
            question_type=question_type,
            correct_answer=correct_answer,
            options=json.dumps(options)
        )
        db.session.add(question)
    
    db.session.commit()
    return quiz

def submit_quiz_answers(quiz_id, answers):
    """Submit answers for a quiz and calculate score"""
    quiz = Quiz.query.get(quiz_id)
    if not quiz:
        return None
    
    correct_count = 0
    total_questions = len(quiz.questions)
    
    for question_id, answer in answers.items():
        question = QuizQuestion.query.get(int(question_id))
        if question and question.quiz_id == quiz.id:
            question.user_answer = answer
            question.is_correct = (answer == question.correct_answer)
            if question.is_correct:
                correct_count += 1
    
    score = int((correct_count / total_questions) * 100) if total_questions > 0 else 0
    quiz.score = score
    quiz.completed = True
    
    # Update visitor's last quiz info
    visitor = Visitor.query.get(quiz.visitor_id)
    if visitor:
        visitor.last_quiz_date = quiz.date
        visitor.last_quiz_score = score
    
    db.session.commit()
    return quiz

def get_initial_shlokas(count=5):
    """Get sequential shlokas for non-authenticated users, starting from chapter 1"""
    # For the landing page, always start from the beginning
    return Shloka.query.order_by(Shloka.id).limit(count).all()
