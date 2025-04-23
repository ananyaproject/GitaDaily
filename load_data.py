from app import app
from utils import load_shlokas_from_csv

if __name__ == "__main__":
    with app.app_context():
        load_shlokas_from_csv()