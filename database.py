import os
import json
import random
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

PLAYER_COLUMNS = ('full_id', 'socket_id', 'display_name', 'efficiency', 'mastery', 'artistry', 'inventory')

# ----------db---------- #
def get_db_connection():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError('DATABASE_URL not found in .env')
    return psycopg2.connect(database_url)

def get_conn_cur(cursor=psycopg2.extensions.cursor):
    conn = get_db_connection()
    return conn, conn.cursor(cursor_factory=cursor)

def close_conn_cur(conn, cur, commit=False):
    if commit: conn.commit()
    cur.close()
    conn.close()

# ----------player---------- #
EFFICIENCY_MU = 100
EFFICIENCY_SIGMA = 2
MASTERY_MU = 50
MASTERY_SIGMA = 5
def create_player(full_id, display_name):
    conn, cur = get_conn_cur()
    inventory = {}
    cur.execute('''
        INSERT INTO players (full_id, display_name, efficiency, mastery, artistry, inventory)
        VALUES (%s, %s, %s, %s, %s, %s)
    ''', (full_id, display_name, 0, 0, 0, json.dumps(inventory)))
    close_conn_cur(conn, cur, commit=True)
    return {
        'full_id': full_id,
        'display_name': display_name,
        'efficiency': int(random.gauss(EFFICIENCY_MU, EFFICIENCY_SIGMA)),
        'mastery': int(MASTERY_MU + abs(random.gauss(0, MASTERY_SIGMA))),
        'artistry': 0,
        'inventory': inventory,
    }

def update_player(full_id, player_data):
    conn, cur = get_conn_cur()
    inventory_json = json.dumps(player_data.get('inventory', {}))
    cur.execute('''
        UPDATE players
        SET efficiency = %s,
            mastery = %s,
            artistry = %s,
            inventory = %s
        WHERE full_id = %s
    ''', (
        player_data.get('efficiency', 0),
        player_data.get('mastery', 0),
        player_data.get('artistry', 0),
        inventory_json,
        full_id,
    ))
    close_conn_cur(conn, cur, commit=True)

def update_player_socket_id(full_id, socket_id):
    conn, cur = get_conn_cur()
    cur.execute('''
        UPDATE players 
        SET socket_id = %s 
        WHERE full_id = %s
    ''', (socket_id, full_id))
    close_conn_cur(conn, cur, commit=True)

def get_all_players(*cols):
    conn, cur = get_conn_cur(cursor=RealDictCursor)
    columns = ', '.join(col for col in cols if col in PLAYER_COLUMNS)
    if not columns: 
        columns = '*'
    cur.execute(f'SELECT {columns} FROM players')
    players = cur.fetchall()
    close_conn_cur(conn, cur)
    return players

def get_player_by_full_id(full_id):
    conn, cur = get_conn_cur(cursor=RealDictCursor)
    cur.execute('SELECT * FROM players WHERE full_id = %s', (full_id,))
    player_data = cur.fetchone()
    close_conn_cur(conn, cur)
    if player_data and 'created_at' in player_data and player_data['created_at']:
        player_data['created_at'] = player_data['created_at'].isoformat()
    return player_data
