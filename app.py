from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, emit
import database as db
import helpers as help

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'

socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

active_players = {}

@app.route('/')
def home():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print('[CONNECT] someone connects..')

@socketio.on('disconnect')
def handle_disconnect():
    socket_id = request.sid
    for full_id, player in list(active_players.items()):
        if player.get('socket_id') == socket_id:
            print(f'[DISCONNECT] saving {full_id} before disconnect..')
            db.update_player(full_id, player)
            del active_players[full_id]
            break

@socketio.on('join')
def handle_join(data):
    # TODO handle sessions and persistence: currently, every new join creates new players
    # get display name
    display_name = data.get('displayName', 'somehow_unnamed').strip()
    # get all player ids
    all_players = db.get_all_players('full_id')
    existing_ids = [p['full_id'] for p in all_players if p.get('full_id')]
    # give new player unique id
    full_id = help.generate_player_id(display_name, existing_ids)
    # create new player
    player_data = db.create_player(full_id, display_name)
    # request, update player socket id
    socket_id = request.sid
    db.update_player_socket_id(full_id, socket_id)
    active_players[full_id] = {
        'full_id': full_id,
        'socket_id': socket_id,
        'display_name': display_name,
        'efficiency': player_data['efficiency'],
        'mastery': player_data['mastery'],
        'artistry': player_data['artistry'],
        'inventory': player_data['inventory']
    }
    emit('join_success', {
        'player': player_data,
        'full_id': full_id,
        'display_name': display_name
    })

if __name__ == '__main__':
    socketio.run(app, debug=True)