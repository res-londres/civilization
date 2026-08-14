import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
    
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

def get_player(name):
    conn, cur = get_conn_cur(cursor=RealDictCursor)
    cur.execute('SELECT * FROM players WHERE name = %s', (name,))
    player = cur.fetchone()
    close_conn_cur(conn, cur)
    if player:
        if 'created_at' in player and player['created_at']:
            player['created_at'] = player['created_at'].isoformat()
    return player 

def create_player(player_id, name):
    conn, cur = get_conn_cur()
    inventory = {
        'wood': 0, 'stone': 0, 'copper': 0, 'tin': 0,
        'iron': 0, 'water': 0, 'herbs': 0, 'fiber': 0, 'clay': 0,
    }
    cur.execute('''
        INSERT INTO players (id, name, efficiency, mastery, artistry, inventory)
        VALUES (%s, %s, %s, %s, %s, %s)
    ''', (player_id, name, 100, 20, 0, json.dumps(inventory)))
    close_conn_cur(conn, cur, commit=True)
    return {
        'id': player_id,
        'name': name,
        'efficiency': 100,
        'mastery': 20,
        'artistry': 0,
        'inventory': inventory,
    }

def update_player(player_id, player_data):
    conn, cur = get_conn_cur()
    inventory_json = json.dumps(player_data.get('inventory', {}))
    cur.execute('''
        UPDATE players
        SET efficiency = %s,
            mastery = %s,
            artistry = %s,
            inventory = %s
        WHERE id = %s
    ''', (
        player_data.get('efficiency', 100),
        player_data.get('mastery', 20),
        player_data.get('artistry', 0),
        inventory_json,
        player_id
    ))
    close_conn_cur(conn, cur, commit=True)

