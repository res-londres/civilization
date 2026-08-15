import secrets

MAX_NAME_CHARS = 20
MAX_ATTEMPTS = 100
TAG_RANGE = 100000

def generate_player_id(display_name, existing_ids):
    clean_name = ''.join(c for c in display_name if c.isalnum())[:MAX_NAME_CHARS]
    if not clean_name:
        raise ValueError('[ERROR] generate_player_id: invalid display name: enter valid alphanumeric name')
    for _ in range(MAX_ATTEMPTS):
        tag = secrets.randbelow(TAG_RANGE)
        tag_str = str(tag).zfill(5)
        full_id = f'{clean_name}#{tag_str}'
        if full_id not in existing_ids:
            return full_id
    # wont fail hopefully

