from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import database as db

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'

socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

active_players = {}

@app.route('/')
def home():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print('someone connects..')

@socketio.on('disconnect')
def handle_disconnect():
    player_id = request.sid
    if player_id in active_players:
        print(f'saving {active_players[player_id]["name"]} before disconnect..')
        db.update_player(player_id, active_players[player_id])
        del active_players[player_id]

@socketio.on('join')
def handle_join(data):
    name = data.get('name', '_unnamed_player').strip()
    player_id = request.sid
    existing_player = db.get_player(name)
    if existing_player:
        print(f'OLD player joins: {name}')
        player_data = dict(existing_player)
        player_data['id'] = player_id
        active_players[player_id] = player_data
        emit('join_success', {'player': player_data})
    else:
        print(f'NEW player joins: {name}')
        player_data = db.create_player(player_id, name)
        active_players[player_id] = player_data
        emit('join_success', {'player': player_data})

if __name__ == '__main__':
    socketio.run(app, debug=True)