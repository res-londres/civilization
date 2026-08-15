from flask import Flask, render_template, request, session, jsonify, make_response
from flask_socketio import SocketIO, emit
import database as db
import helpers as help

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'

socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

active_players = {}

def set_player_cookie(response, full_id):
    response.set_cookie(
        'player_id',
        full_id,
        max_age=365*24*60*60,
        httponly=True,
        samesite='Lax',
        path='/'
    )
    return response

def get_player_cookie():
    return request.cookies.get('player_id')

def clear_player_cookie(response):
    response.set_cookie('player_id', '', max_age=0, path='/')
    return response

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/check_session')
def check_session():
    '''HTTP endpoint to check if user has a session'''
    print(f'[HTTP] checking cookie...')
    full_id = get_player_cookie()
    if full_id:
        print(f'[HTTP] cookie found: {full_id}')
        player_data = db.get_player_by_full_id(full_id)
        if player_data:
            print(f'[HTTP] player found: {full_id}')
            return jsonify({'active': True, 'player': player_data})
    print(f'[HTTP] no active session')
    return jsonify({'active': False})

@socketio.on('connect')
def handle_connect():
    print('[CONNECT] someone connects..')
    full_id = get_player_cookie()
    if full_id:
        print(f'[CONNECT] session found: {full_id}')
        player_data = db.get_player_by_full_id(full_id)
        if player_data:
            print(f'[CONNECT] activating player: {full_id}')
            socket_id = request.sid
            db.update_player_socket_id(full_id, socket_id)
            help.store_in_active_players(active_players, full_id, socket_id, player_data)
            print(f'[CONNECT] player activated: {full_id}')
            return
    print(f'[CONNECT] no session to activate')

@socketio.on('disconnect')
def handle_disconnect():
    socket_id = request.sid
    for full_id, player_data in list(active_players.items()):
        if player_data.get('socket_id') == socket_id:
            print(f'[DISCONNECT] saving data before disconnect: {full_id}')
            db.update_player(full_id, player_data)
            del active_players[full_id]
            break

@socketio.on('join')
def handle_join(data):
    print(f'[JOIN] new player joining..')
    display_name = data.get('displayName', 'somehow_unnamed').strip()
    # get all player ids (to ensure new player gets unique id)
    all_players = db.get_all_players('full_id')
    existing_ids = [p['full_id'] for p in all_players if p.get('full_id')]
    try:
        full_id = help.generate_player_id(display_name, existing_ids)
    except ValueError:
        emit('join_error', {'reason': 'bad_name'})
        return
    # create new player
    player_data = db.create_player(full_id, display_name)
    socket_id = request.sid
    db.update_player_socket_id(full_id, socket_id)
    help.store_in_active_players(active_players, full_id, socket_id, player_data)
    print(f'[JOIN] join success: {full_id}')
    emit('join_success', {
        'player': player_data,
        'full_id': full_id,
        'display_name': display_name,
        'set_cookie': True
    })

@socketio.on('retire')
def handle_retire():
    socket_id = request.sid
    for full_id, player_data in list(active_players.items()):
        if player_data.get('socket_id') == socket_id:
            print(f'[RETIRE] player retiring: {full_id}')
            # TODO: move inventory to unclaimed
            emit('session_cleared', {'clear_cookie': True})
            del active_players[full_id]
            break

if __name__ == '__main__':
    socketio.run(app, debug=True)