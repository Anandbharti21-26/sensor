import os
from flask import Flask, render_template

app = Flask(__name__)

# Register blueprint for API routes
from backend.routes import api
app.register_blueprint(api, url_prefix='/api')

from backend.database import init_db

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    # Initialize database
    init_db()
    print("Starting IoT Sensor CRC Monitor on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
