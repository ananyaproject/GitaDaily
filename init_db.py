from app import app, db
import models  # ensure models are imported for table creation

with app.app_context():
    db.create_all()
    print("Database initialized.")
