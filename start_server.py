from flask import Flask, send_from_directory, render_template, request, redirect, url_for, session, jsonify
import os
import hashlib
from datetime import datetime, timedelta
import psutil

app = Flask(__name__)
app.secret_key = 'your-secret-key-123'  # Для работы с сессиями

# Статистика игры
game_stats = {
    'total_users': 0,
    'online_users': set(),
    'total_games': 0,
    'player_scores': [],  # Список словарей с данными игроков
    'users': {},  # Словарь с данными пользователей
    'file_accesses': {}  # Словарь для отслеживания обращений к файлам
}

def generate_user_code(user_id):
    """Генерирует уникальный код пользователя на основе его ID"""
    hash_object = hashlib.sha256(user_id.encode())
    return hash_object.hexdigest()[:8].upper()

# Конфигурация блоков
BLOCK_COLORS = ['red', 'blue', 'green', 'yellow', 'purple']
BLOCK_TYPES = [
    {
        'name': 'Одиночный',
        'shape': [1],
        'width': 1,
        'size': 1
    },
    {
        'name': 'Горизонтальный x2',
        'shape': [1, 1],
        'width': 2,
        'size': 2
    },
    {
        'name': 'Вертикальный x2',
        'shape': [1, 1],
        'width': 1,
        'size': 2
    },
    {
        'name': 'Горизонтальный x3',
        'shape': [1, 1, 1],
        'width': 3,
        'size': 3
    },
    {
        'name': 'Вертикальный x3',
        'shape': [1, 1, 1],
        'width': 1,
        'size': 3
    },
    {
        'name': 'Квадрат 2x2',
        'shape': [1, 1, 1, 1],
        'width': 2,
        'size': 4
    },
    {
        'name': 'L-форма',
        'shape': [1, 0, 1, 1],
        'width': 2,
        'size': 3
    },
    {
        'name': 'Обратная L-форма',
        'shape': [0, 1, 1, 1],
        'width': 2,
        'size': 3
    },
    {
        'name': 'T-форма',
        'shape': [1, 1, 1, 0, 1, 0],
        'width': 3,
        'size': 4
    },
    {
        'name': 'Горизонтальный x4',
        'shape': [1, 1, 1, 1],
        'width': 4,
        'size': 4
    },
    {
        'name': 'Z-форма',
        'shape': [1, 1, 0, 0, 1, 1],
        'width': 3,
        'size': 4
    },
    {
        'name': 'S-форма',
        'shape': [0, 1, 1, 1, 1, 0],
        'width': 3,
        'size': 4
    },
    {
        'name': 'Крест',
        'shape': [0, 1, 0, 1, 1, 1, 0, 1, 0],
        'width': 3,
        'size': 5
    },
    {
        'name': 'U-форма',
        'shape': [1, 0, 1, 1, 1, 1],
        'width': 3,
        'size': 4
    }
]

ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = 'admin'

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def send_file(path):
    return send_from_directory('.', path)

@app.route('/boss/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['admin_logged_in'] = True
            return redirect(url_for('admin_panel'))
        else:
            return render_template('admin_login.html', error='Неверные учетные данные')
    
    return render_template('admin_login.html')

@app.route('/boss')
def admin_panel():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    
    # Получаем топ-10 игроков по очкам
    top_scores = sorted(game_stats['player_scores'], 
                       key=lambda x: x['score'], 
                       reverse=True)[:10]
    
    # Получаем топ-10 по времени в игре
    top_playtime = sorted(game_stats['player_scores'], 
                         key=lambda x: x['playtime'], 
                         reverse=True)[:10]
    
    # Подготавливаем список пользователей для отображения
    users_list = []
    for user_id, user_data in game_stats['users'].items():
        users_list.append({
            'username': user_data.get('username', 'Anonymous'),
            'code': user_data.get('code', ''),
            'score': user_data.get('score', 0),
            'playtime': user_data.get('playtime', 0),
            'last_active': user_data.get('last_active', 'Никогда')
        })
    
    # Сортируем пользователей по последней активности
    users_list.sort(key=lambda x: x['last_active'], reverse=True)
    
    return render_template('admin_panel.html',
                          total_users=game_stats['total_users'],
                          online_users=len(game_stats['online_users']),
                          total_games=game_stats['total_games'],
                          top_scores=top_scores,
                          top_playtime=top_playtime,
                          colors=BLOCK_COLORS,
                          block_types=BLOCK_TYPES,
                          users=users_list)

@app.route('/boss/logout')
def logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('admin_login'))

@app.route('/api/update_stats', methods=['POST'])
def update_stats():
    data = request.json
    if 'user_id' in data:
        user_id = data['user_id']
        
        # Создаем или обновляем данные пользователя
        if user_id not in game_stats['users']:
            game_stats['users'][user_id] = {
                'username': data.get('username', 'Anonymous'),
                'code': generate_user_code(user_id),
                'score': 0,
                'playtime': 0,
                'last_active': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }

        # Обновляем статистику
        if data.get('connect'):
            game_stats['online_users'].add(user_id)
        elif data.get('disconnect'):
            game_stats['online_users'].discard(user_id)
        
        if data.get('new_user'):
            game_stats['total_users'] += 1
        
        if data.get('game_complete'):
            game_stats['total_games'] += 1
            score = data.get('score', 0)
            playtime = data.get('playtime', 0)
            
            # Обновляем статистику пользователя
            user_data = game_stats['users'][user_id]
            user_data['score'] = max(user_data['score'], score)
            user_data['playtime'] += playtime
            user_data['last_active'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            game_stats['player_scores'].append({
                'user_id': user_id,
                'username': data.get('username', 'Anonymous'),
                'score': score,
                'playtime': playtime,
                'date': datetime.now()
            })
    
    return {'status': 'success'}

@app.route('/api/update_user', methods=['POST'])
def update_user():
    data = request.json
    if 'code' in data and 'score' in data:
        user_code = data['code']
        new_score = data['score']
        
        # Находим пользователя по коду
        for user_id, user_data in game_stats['users'].items():
            if user_data.get('code') == user_code:
                user_data['score'] = new_score
                return jsonify({'status': 'success'})
    
    return jsonify({'status': 'error', 'message': 'User not found or invalid data'})

@app.route('/api/connect_telegram', methods=['POST'])
def connect_telegram():
    data = request.json
    if 'user_id' in data and 'telegram_username' in data:
        user_id = data['user_id']
        telegram_username = data['telegram_username']
        
        if user_id in game_stats['users']:
            game_stats['users'][user_id]['telegram_username'] = telegram_username
            return jsonify({'status': 'success'})
    
    return jsonify({'status': 'error', 'message': 'User not found'})

@app.route('/admin/user/<user_code>')
def user_details(user_code):
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    
    # Находим пользователя по коду
    user_data = None
    for user_id, data in game_stats['users'].items():
        if data.get('code') == user_code:
            user_data = {
                'code': user_code,
                'telegram_id': data.get('telegram_username'),
                'name': data.get('username'),
                'username': data.get('username'),
                'join_date': data.get('join_date', 'Не указана'),
                'score': data.get('score', 0),
                'playtime': data.get('playtime', 0),
                'last_active': data.get('last_active', 'Никогда')
            }
            break
    
    if user_data is None:
        return 'Пользователь не найден', 404
        
    return render_template('user_details.html', user=user_data)

@app.route('/api/activity_stats')
def get_activity_stats():
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401

    # Получаем статистику активности по часам
    current_hour = datetime.now().hour
    hourly_stats = [0] * 24
    
    for user_id, user_data in game_stats['users'].items():
        last_active = user_data.get('last_active')
        if isinstance(last_active, str):
            try:
                last_active = datetime.strptime(last_active, '%Y-%m-%d %H:%M:%S')
                if last_active.date() == datetime.now().date():
                    hourly_stats[last_active.hour] += 1
            except ValueError:
                continue

    return jsonify({
        'hourly_activity': hourly_stats,
        'current_hour': current_hour
    })

@app.route('/api/server_stats')
def get_server_stats():
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401

    # Получаем статистику использования CPU
    cpu_percent = psutil.cpu_percent()
    
    # Получаем статистику использования памяти
    memory = psutil.virtual_memory()
    memory_percent = memory.percent
    
    # Получаем статистику использования диска
    disk = psutil.disk_usage('/')
    disk_percent = disk.percent
    
    # Получаем историю нагрузки CPU
    cpu_history = []
    current_time = datetime.now()
    for i in range(60):
        cpu_history.append({
            'time': (current_time - timedelta(minutes=i)).strftime('%H:%M'),
            'value': psutil.cpu_percent(interval=None)
        })
    cpu_history.reverse()
    
    # Получаем статистику по файлам
    file_stats = []
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith(('.py', '.js', '.html', '.css')):
                file_path = os.path.join(root, file)
                try:
                    stats = os.stat(file_path)
                    file_stats.append({
                        'name': file_path,
                        'size': stats.st_size,
                        'accesses': game_stats['file_accesses'].get(file_path, 0),
                        'load': calculate_file_load(file_path)
                    })
                except OSError:
                    continue

    return jsonify({
        'cpu': cpu_percent,
        'memory': memory_percent,
        'disk': disk_percent,
        'cpu_history': cpu_history,
        'file_stats': sorted(file_stats, key=lambda x: x['load'], reverse=True)[:10]
    })

def calculate_file_load(file_path):
    """Рассчитывает нагрузку на файл на основе количества обращений и размера"""
    accesses = game_stats['file_accesses'].get(file_path, 0)
    try:
        size = os.path.getsize(file_path)
        # Простая формула для расчета нагрузки
        load = (accesses * size) / (1024 * 1024)  # Нормализуем по МБ
        return min(100, load)
    except OSError:
        return 0

# Добавляем отслеживание обращений к файлам
@app.before_request
def track_file_access():
    if request.path.startswith('/static/'):
        file_path = request.path[8:]  # Убираем '/static/' из пути
        if 'file_accesses' not in game_stats:
            game_stats['file_accesses'] = {}
        game_stats['file_accesses'][file_path] = game_stats['file_accesses'].get(file_path, 0) + 1

if __name__ == '__main__':
    app.run(port=8000, debug=True) 