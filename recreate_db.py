import os
import logging
from app import app, db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def recreate_database():
    """
    Drops all tables and recreates them.
    Use with caution as this will delete all data.
    """
    with app.app_context():
        logger.info("Dropping all tables...")
        db.drop_all()
        
        logger.info("Creating all tables...")
        db.create_all()
        
        logger.info("Database tables have been recreated successfully.")

if __name__ == "__main__":
    recreate_database()