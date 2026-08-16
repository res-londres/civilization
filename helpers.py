import secrets

MAX_NAME_CHARS = 11
MAX_ATTEMPTS = 100
TAG_RANGE = 100000

def generate_player_id(display_name, existing_ids):
    display_name = display_name[:MAX_NAME_CHARS]
    if not display_name.isalnum():
        raise ValueError('[ERROR] generate_player_id: invalid display name: enter valid alphanumeric name')
    for _ in range(MAX_ATTEMPTS):
        tag = secrets.randbelow(TAG_RANGE)
        tag_str = str(tag).zfill(5)
        full_id = f'{display_name}#{tag_str}'
        if full_id not in existing_ids:
            return full_id
    # wont fail hopefully

def store_in_active_players(active_players, full_id, socket_id, player_data):
    active_players[full_id] = {
        'full_id': full_id,
        'socket_id': socket_id,
        'display_name': player_data['display_name'],
        'efficiency': player_data['efficiency'],
        'mastery': player_data['mastery'],
        'artistry': player_data['artistry'],
        'inventory': player_data['inventory'],
    }
