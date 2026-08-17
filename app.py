from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import database as db
import helpers as help
import threading
import time

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'

socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

active_players = {}
global_resources = {}
sync_counter = 0

SYNC_INTERVAL = 0

# ----------load-resources---------- #
def load_resources():
    print('[RESOURCE] loading resources from database..')
    global global_resources
    try:
        resources = db.get_all_resources()
        for resource in resources:
            name = resource['name']
            global_resources[name] = {
                'name': name,
                'display_name': resource['display_name'],
                'amount': float(resource['amount']),  
                'min_amount': float(resource['min_amount']),  
                'max_amount': float(resource['max_amount']),  
                'base_recovery_rate': float(resource['base_recovery_rate']),  
                'recovery_rate': float(resource['recovery_rate']),  
                'recovery_base': float(resource['recovery_base']),  
                'base_gathering_time': int(resource['base_gathering_time']),
                'base_yield': float(resource['base_yield']),
                'gatherers': int(resource['gatherers']) if resource.get('gatherers') else 0,
                'tool_requirements': resource['tool_requirements'] or []
            }
        print('[RESOURCE] resources loaded from database successfully')
    except Exception as e:
        print(f'[RESOURCE] ERROR loading resources: {e}')

def get_resource(name):
    return global_resources.get(name)

def get_all_resources():
    return global_resources

# -----------resource-recovery---------- #
def recovery_loop():
    while True:
        time.sleep(1)
        tick_resource_recovery()
        send_resources()

def tick_resource_recovery():
    global global_resources
    if not global_resources:
        return
    for name, resource in global_resources.items():
        if resource['amount'] >= resource['max_amount']:
            continue
        # calculate recovery per second (scaled by current amount)
        # recovery_per_second = (base_recovery_rate / 3600) * (amount / recovery_base)
        # cap factor at 1.0
        base_rate_per_second = resource['base_recovery_rate'] / 3600.0
        factor = min(resource['amount'] / resource['recovery_base'], 1.0)
        # calculate recovery this tick
        recovery = max(base_rate_per_second * factor, 0.001)
        # apply recovery (clamped at max amount)
        new_amount = min(resource['amount'] + recovery, resource['max_amount'])
        resource['amount'] = new_amount

def send_resources(socket_id=None):
    if not active_players:
        return
    resources_data = {}
    for name, data in global_resources.items():
        per_second_rate = data['base_recovery_rate'] / 3600.0  
        factor = min(data['amount'] / data['recovery_base'], 1.0)
        actual_recovery_per_second = per_second_rate * factor
        resources_data[name] = {
            'name': name,
            'displayName': data['display_name'],
            'amount': round(data['amount'], 2),
            'maxAmount': data['max_amount'],
            'recoveryRate': round(actual_recovery_per_second, 3),
            'gatherers': data['gatherers'] or 0
        }
    socketio.emit('resources_update', {'resources': resources_data}, to=socket_id)

# ----------syncing-to-database---------- #
def sync_loop():
    while True:
        time.sleep(SYNC_INTERVAL) 
        try:
            sync_resources_to_database()
        except Exception as e:
            print(f'[SYNC] ERROR while syncing to database: {e}')

def sync_resources_to_database():
    print('[SYNC] syncing resources to database..')
    global global_resources
    if not global_resources:
        return
    for name, resource in global_resources.items():
        amount = round(resource['amount'], 2)
        db.update_resource_amount(name, amount)
    print('[SYNC] resources synced to database successfully')

# -----------cookies---------- #
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

# ----------route----------- #
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

# ----------connection----------- #
@socketio.on('connect')
def handle_connect(auth=None):
    print('[CONNECT] someone connects..')
    send_resources(request.sid)
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
    send_resources(socket_id)
    print(f'[JOIN] join success: {full_id}')
    emit('join_success', {
        'player': player_data,
        'full_id': full_id,
        'display_name': display_name,
        'set_cookie': True
    })

# -----------disconnection---------- #
@socketio.on('disconnect')
def handle_disconnect():
    socket_id = request.sid
    for full_id, player_data in list(active_players.items()):
        if player_data.get('socket_id') == socket_id:
            print(f'[DISCONNECT] saving data before disconnect: {full_id}')
            db.update_player(full_id, player_data)
            del active_players[full_id]
            break

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

# ----------run----------- #
if __name__ == '__main__':
    load_resources()
    recovery_thread = threading.Thread(target=recovery_loop, daemon=True)
    recovery_thread.start()
    sync_thread = threading.Thread(target=sync_loop, daemon=True)
    sync_thread.start()
    socketio.run(app, debug=True)
