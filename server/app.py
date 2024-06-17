from flask import Flask, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
from flask_cors import CORS
import bcrypt
import pytz
from twilio.rest import Client
from dotenv import load_dotenv
from datetime import datetime, timedelta
import os
import re
from flask_socketio import SocketIO
from waitress import serve

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# MongoDB connection
mongo_uri = os.getenv('MONGO_URI', 'mongodb+srv://yongchun021030:lkpFNX0Hun8tUh1Z@cluster-swfs.zvavyj2.mongodb.net/')
client = MongoClient(mongo_uri)
db = client['washroom']
users_collection = db['users']
feedback_collection = db['feedback']
usage_collection = db['usage']
configurations_collection = db['configurations']
problems_collection = db['problems']

# Get Twilio credentials from environment variables
twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID')
twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN')
twilio_whatsapp_number = os.getenv('TWILIO_WHATSAPP_NUMBER')
cleaner_phone_number = os.getenv('CLEANER_PHONE_NUMBER')

twilio_client = Client(twilio_account_sid, twilio_auth_token)

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password'].encode('utf-8')

    user = users_collection.find_one({'username': username})
    if user and bcrypt.checkpw(password, user['password'].encode('utf-8')):
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'message': 'Invalid credentials'})

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data['username']
    password = data['password'].encode('utf-8')

    hashed_password = bcrypt.hashpw(password, bcrypt.gensalt())

    new_user = {
        'username': username,
        'password': hashed_password.decode('utf-8')
    }

    users_collection.insert_one(new_user)
    return jsonify({'success': True, 'message': 'User registered successfully'})

@app.route('/all-usages', methods=['GET'])
def get_all_usages():
    today = datetime.now().strftime('%Y-%m-%d')
    usages = usage_collection.aggregate([
        {'$match': {'timestamp': {'$regex': f'^{today}'}}},
        {'$group': {'_id': {'toiletType': '$toiletType', 'floor': '$floor'}, 'totalUsage': {'$sum': 1}}},
        {'$sort': {'totalUsage': -1}}
    ])
    usage_list = [
        {'washroom': f"{usage['_id']['floor']} {usage['_id']['toiletType']}", 'totalUsage': usage['totalUsage']}
        for usage in usages
    ]
    return jsonify(usage_list)


@app.route('/feedbacks', methods=['GET'])
def get_feedbacks():
    today = datetime.now().strftime('%Y-%m-%d')
    feedbacks = feedback_collection.find({'timestamp': {'$regex': f'^{today}'}}).sort('timestamp', -1).limit(4)
    malaysia_tz = pytz.timezone('Asia/Kuala_Lumpur')

    feedback_list = []
    for fb in feedbacks:
        timestamp = fb.get('timestamp')
        if timestamp:
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            timestamp = timestamp.astimezone(malaysia_tz).strftime('%Y-%m-%d %H:%M:%S')
        else:
            timestamp = 'N/A'
        
        feedback_list.append({
            'time': timestamp,
            'washroom': f"{fb.get('floor', 'N/A')} {fb.get('toiletType', 'UNKNOWN')}",
            'rating': fb.get('rating', 'N/A')
        })

    return jsonify(feedback_list)

@app.route('/usages', methods=['GET'])
def get_usages():
    today = datetime.now().strftime('%Y-%m-%d')
    usages = usage_collection.aggregate([
        {'$match': {'timestamp': {'$regex': f'^{today}'}}},
        {'$group': {'_id': {'toiletType': '$toiletType', 'floor': '$floor'}, 'totalUsage': {'$sum': 1}}},
        {'$sort': {'totalUsage': -1}},
        {'$limit': 3}
    ])
    usage_list = [
        {'washroom': f"{usage['_id']['floor']} {usage['_id']['toiletType']}", 'totalUsage': usage['totalUsage']}
        for usage in usages
    ]
    return jsonify(usage_list)

@app.route('/configurations', methods=['GET'])
def get_configurations():
    configurations = configurations_collection.find()
    config_list = [
        {
            'id': str(config.get('_id')),
            'toiletType': config.get('toiletType', 'N/A'),
            'floor': config.get('floor', 'N/A')
        }
        for config in configurations
    ]
    return jsonify(config_list)

@app.route('/problems', methods=['GET'])
def get_problems():
    today = datetime.now().strftime('%Y-%m-%d')
    problems = problems_collection.find({
        'timestamp': {'$regex': f'^{today}'},
        'solved': False
    })
    problem_set = set()
    problem_list = []
    malaysia_tz = pytz.timezone('Asia/Kuala_Lumpur')

    for problem in problems:
        description = problem.get('description', 'N/A')
        floor = problem.get('floor', 'N/A')
        toiletType = problem.get('toiletType', 'UNKNOWN')
        problem_key = (description, floor, toiletType)

        if problem_key not in problem_set:
            problem_set.add(problem_key)
            timestamp = problem.get('timestamp')
            if timestamp:
                if isinstance(timestamp, str):
                    timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                timestamp = timestamp.astimezone(malaysia_tz).strftime('%Y-%m-%d %H:%M:%S')
            else:
                timestamp = 'N/A'

            problem_list.append({
                'id': str(problem.get('_id')),
                'description': description,
                'floor': floor,
                'toiletType': toiletType,
                'timestamp': timestamp,
                'solved': problem.get('solved', False)
            })

    return jsonify(problem_list)


@app.route('/washroom-stats', methods=['GET'])
def get_washroom_stats():
    today = datetime.now().strftime('%Y-%m-%d')
    stats = feedback_collection.aggregate([
        {'$match': {'timestamp': {'$regex': f'^{today}'}}},
        {
            '$group': {
                '_id': {
                    'floor': '$floor',
                    'toiletType': '$toiletType'
                },
                'totalFeedback': {'$sum': 1},
                'overallRating': {'$avg': '$rating'}
            }
        }
    ])
    stats_list = [
        {
            'floor': stat['_id']['floor'],
            'toiletType': stat['_id']['toiletType'],
            'totalFeedback': stat['totalFeedback'],
            'overallRating': round(stat['overallRating'], 1)
        }
        for stat in stats
    ]
    return jsonify(stats_list)

@app.route('/send-action-message', methods=['POST'])
def send_action_message():
    data = request.get_json()
    message_body = data.get('message')

    message = twilio_client.messages.create(
        body=message_body,
        from_=twilio_whatsapp_number,
        to=cleaner_phone_number
    )
    
    return jsonify({'success': True, 'message_sid': message.sid})

@app.route('/washrooms', methods=['GET'])
def get_washrooms():
    configurations = configurations_collection.find()
    result = [
        {'floor': config.get('floor'), 'toiletType': config.get('toiletType')}
        for config in configurations
    ]
    return jsonify(result)

@app.route('/report', methods=['GET'])
def get_report():
    date_type = request.args.get('dateType')
    date_value = request.args.get('dateValue')
    washroom = request.args.get('washroom')
    report_type = request.args.get('reportType')

    floor, toilet_type = washroom.split(' ')
    query = {
        'floor': floor,
        'toiletType': toilet_type
    }

    if date_type == 'day':
        start_date = datetime.strptime(date_value, '%Y-%m-%d')
        end_date = start_date + timedelta(days=1)
    elif date_type == 'month':
        start_date = datetime.strptime(date_value, '%Y-%m')
        next_month = start_date.replace(day=28) + timedelta(days=4)  # this will never fail
        end_date = next_month - timedelta(days=next_month.day)

    query['timestamp'] = {'$gte': start_date.strftime('%Y-%m-%d %H:%M:%S'), '$lt': end_date.strftime('%Y-%m-%d %H:%M:%S')}

    result = {}
    data = []
    if report_type == 'usage':
        usages = usage_collection.aggregate([
            {'$match': query},
            {
                '$group': {
                    '_id': {
                        'hour': {'$hour': {'$dateFromString': {'dateString': '$timestamp'}}} if date_type == 'day' else {'$dayOfMonth': {'$dateFromString': {'dateString': '$timestamp'}}},
                    },
                    'totalUsage': {'$sum': 1}
                }
            },
            {'$sort': {'_id': 1}}
        ])
        usage_data = list(usages)
        if not usage_data:
            return jsonify({'message': 'No data available'})

        if date_type == 'day':
            result = [0] * 24
            for usage in usage_data:
                hour = usage['_id']['hour']
                result[hour] = usage['totalUsage']
        else:
            days_in_month = (end_date - start_date).days
            result = [0] * days_in_month
            for usage in usage_data:
                day = usage['_id']['hour']
                result[day - 1] = usage['totalUsage']

    elif report_type == 'feedback':
        data = problems_collection.aggregate([
            {'$match': query},
            {'$group': {'_id': '$description', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}}
        ])
        data = list(data)
        if not data:
            return jsonify({'message': 'No data available'})
        labels, counts = zip(*[(entry['_id'], entry['count']) for entry in data])
        result = {'labels': labels, 'data': counts, 'backgroundColor': ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'], 'counts': counts}
    
    elif report_type == 'rating':
        data = feedback_collection.aggregate([
            {'$match': query},
            {'$group': {'_id': '$rating', 'count': {'$sum': 1}}},
            {'$sort': {'_id': 1}}
        ])
        data = list(data)
        if not data:
            return jsonify({'message': 'No data available'})
        rating_counts = {entry['_id']: entry['count'] for entry in data}
        result = [rating_counts.get(i, 0) for i in range(6)]
    
    return jsonify(result)


@app.route('/notifications', methods=['GET'])
def get_notifications():
    today = datetime.now().strftime('%Y-%m-%d')
    problems = problems_collection.find({'timestamp': {'$regex': f'^{today}'}, 'solved': False}).sort('timestamp', -1)
    malaysia_tz = pytz.timezone('Asia/Kuala_Lumpur')

    notifications = []
    for problem in problems:
        timestamp = problem.get('timestamp')
        if timestamp:
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            timestamp = timestamp.astimezone(malaysia_tz).strftime('%Y-%m-%d %H:%M:%S')
        else:
            timestamp = 'N/A'
        
        notifications.append({
            'id': str(problem.get('_id')),
            'description': problem.get('description', 'N/A'),
            'floor': problem.get('floor', 'N/A'),
            'toiletType': problem.get('toiletType', 'N/A'),
            'timestamp': timestamp,
            'read': problem.get('read', False)
        })
    
    return jsonify(notifications)

@app.route('/mark-notifications-read', methods=['POST'])
def mark_notifications_read():
    data = request.json
    ids = data.get('ids', [])
    for id in ids:
        problems_collection.update_one({'_id': ObjectId(id)}, {'$set': {'read': True}})
    return jsonify({'message': 'Notifications marked as read'})


if __name__ == '__main__':
    serve(app, host='0.0.0.0', port=5000)