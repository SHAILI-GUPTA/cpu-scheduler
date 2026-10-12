import os
import sys

# Add parent directory to path so it can import scheduler
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from scheduler import app

# Vercel WSGI entry point
# Exports 'app' for @vercel/python
if __name__ == "__main__":
    app.run()
