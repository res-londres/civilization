from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'

socketio = SocketIO(app, cors_allowed_origins='*')

@app.route('/')
def home():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print('someone connects..')

@socketio.on('join')
def handle_join(data):
    name = data.get('name', '_unnamed_player').strip()
    player_id = request.sid
    emit('join_success', {'id': player_id, 'name': name})

if __name__ == '__main__':
    socketio.run(app, debug=True)