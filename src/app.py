from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import datetime
import uuid
import mysql.connector
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)


DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'oninrusselbryan123',
    'database': 'mis_icons_rental'
}


DATA_DIR = 'data'
UPLOAD_FOLDER = os.path.join(DATA_DIR, 'images')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)


def initialize_database():
    conn = get_db_connection()
    cursor = conn.cursor()
    

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inventory (
            id VARCHAR(20) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            status VARCHAR(20) NOT NULL,
            description TEXT,
            imageUrl VARCHAR(255),
            borrowedBy VARCHAR(20),
            returnTime VARCHAR(50)
        )
    ''')
    

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id VARCHAR(20) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            yearSection VARCHAR(20) NOT NULL,
            course VARCHAR(50) NOT NULL,
            imageUrl VARCHAR(255)
        )
    ''')
    
 
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS borrow_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            itemId VARCHAR(20) NOT NULL,
            studentId VARCHAR(20) NOT NULL,
            borrowTime VARCHAR(50) NOT NULL,
            returnTime VARCHAR(50) NOT NULL,
            returned BOOLEAN NOT NULL DEFAULT FALSE,
            FOREIGN KEY (itemId) REFERENCES inventory(id),
            FOREIGN KEY (studentId) REFERENCES students(id)
        )
    ''')
    
 
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL
        )
    ''')
    

    cursor.execute("SELECT COUNT(*) FROM inventory")
    if cursor.fetchone()[0] == 0:
        items = [
            ("MIS-001", "Projector", "MIS", "available", "HD Projector with HDMI support", "https://www.cairnscorporatepahire.com.au/wp-content/uploads/Projector-and-Projector-Screen-Cairns-Corporate-PA-Hire-1024x1024.jpg", None, None),
            ("MIS-003", "Printer", "MIS", "borrowed", "Color laser printer", None, "2021-0001", "2025-03-09 15:00"),
            ("ICON-001", "Arduino Kit", "ICON", "available", "Arduino Uno with sensors kit", None, None, None),
            ("ICON-002", "Raspberry Pi", "ICON", "borrowed", "Raspberry Pi 4 with 4GB RAM", None, "2022-0032", "2025-03-08 16:30"),
            ("ICON-003", "Oscilloscope", "ICON", "available", "Digital Oscilloscope 100MHz", None, None, None),
            ("THING-001", "Whiteboard Markers", "THING", "available", "Set of 4 colors", None, None, None),
            ("THING-002", "Extension Cord", "THING", "available", "5-meter extension cord with surge protection", None, None, None)
        ]
        cursor.executemany('''
            INSERT INTO inventory (id, name, category, status, description, imageUrl, borrowedBy, returnTime)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', items)
    
    cursor.execute("SELECT COUNT(*) FROM students")
    if cursor.fetchone()[0] == 0:
        students = [
            ("2023-0001", "BERNABE", "2-A", "BSCS", None),
            ("2023-0002", "GONZALES", "2-A", "BSCS", None),
            ("2023-0003", "HERNANDEZ", "2-A", "BSCS", None)
        ]
        cursor.executemany('''
            INSERT INTO students (id, name, yearSection, course, imageUrl)
            VALUES (%s, %s, %s, %s, %s)
        ''', students)
    

    cursor.execute("SELECT COUNT(*) FROM borrow_history")
    if cursor.fetchone()[0] == 0:
        history = [
            ("MIS-003", "2023-0001", "2025-03-08 10:00", "2025-03-09 15:00", False),
            ("ICON-002", "2023-0002", "2025-03-08 09:30", "2025-03-08 16:30", False),
             ("ICON-001", "2023-0003", "2025-03-08 09:50", "2025-03-08 16:50", False)
        ]
        cursor.executemany('''
            INSERT INTO borrow_history (itemId, studentId, borrowTime, returnTime, returned)
            VALUES (%s, %s, %s, %s, %s)
        ''', history)
    

    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        users = [
            ("admin", generate_password_hash("admin123"), "admin"),
            ("student", generate_password_hash("student123"), "student")
        ]
        cursor.executemany('''
            INSERT INTO users (username, password, role)
            VALUES (%s, %s, %s)
        ''', users)
    
    conn.commit()
    cursor.close()
    conn.close()


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/images/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)




@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    if user and check_password_hash(user['password'], password):
        return jsonify({
            'success': True,
            'role': user['role']
        })
    
    return jsonify({
        'success': False,
        'message': 'Invalid username or password'
    }), 401


@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM inventory")
    inventory = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return jsonify(inventory)

@app.route('/api/inventory', methods=['POST'])
def add_item():
    data = request.form.to_dict()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    category = data.get('category')
    cursor.execute("SELECT COUNT(*) FROM inventory WHERE category = %s", (category,))
    count = cursor.fetchone()[0]
    new_item_number = str(count + 1).zfill(3)
    new_item_id = f"{category}-{new_item_number}"
    
    new_item = {
        'id': new_item_id,
        'name': data.get('name'),
        'category': category,
        'status': 'available',
        'description': data.get('description'),
        'imageUrl': None,
        'borrowedBy': None,
        'returnTime': None
    }
    
    if 'image' in request.files:
        image_file = request.files['image']
        if image_file and allowed_file(image_file.filename):
            filename = secure_filename(image_file.filename)
            file_extension = filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{new_item_id}_{uuid.uuid4().hex}.{file_extension}"
            
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            image_file.save(image_path)
            
            new_item['imageUrl'] = f"/api/images/{unique_filename}"
    
    cursor.execute('''
        INSERT INTO inventory (id, name, category, status, description, imageUrl, borrowedBy, returnTime)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ''', (
        new_item['id'], 
        new_item['name'], 
        new_item['category'], 
        new_item['status'], 
        new_item['description'], 
        new_item['imageUrl'],
        new_item['borrowedBy'],
        new_item['returnTime']
    ))
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return jsonify({
        'success': True,
        'item': new_item
    })

@app.route('/api/inventory/<item_id>', methods=['PUT'])
def update_item(item_id):
    data = request.form.to_dict() if request.form else request.json
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM inventory WHERE id = %s", (item_id,))
    item = cursor.fetchone()
    
    if not item:
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Item not found'
        }), 404
    
    update_fields = []
    update_values = []
    
    if 'name' in data:
        update_fields.append("name = %s")
        update_values.append(data['name'])
        item['name'] = data['name']
    
    if 'description' in data:
        update_fields.append("description = %s")
        update_values.append(data['description'])
        item['description'] = data['description']
    
    if 'status' in data:
        update_fields.append("status = %s")
        update_values.append(data['status'])
        item['status'] = data['status']
    
    if request.files and 'image' in request.files:
        image_file = request.files['image']
        if image_file and allowed_file(image_file.filename):
            if item.get('imageUrl'):
                old_filename = item['imageUrl'].split('/')[-1]
                old_path = os.path.join(app.config['UPLOAD_FOLDER'], old_filename)
                if os.path.exists(old_path):
                    os.remove(old_path)
            
            filename = secure_filename(image_file.filename)
            file_extension = filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{item_id}_{uuid.uuid4().hex}.{file_extension}"
            
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            image_file.save(image_path)
            
            update_fields.append("imageUrl = %s")
            new_image_url = f"/api/images/{unique_filename}"
            update_values.append(new_image_url)
            item['imageUrl'] = new_image_url
    
    if update_fields:
        update_query = f"UPDATE inventory SET {', '.join(update_fields)} WHERE id = %s"
        update_values.append(item_id)
        cursor.execute(update_query, update_values)
        conn.commit()
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'success': True,
        'item': item
    })

@app.route('/api/inventory/<item_id>', methods=['DELETE'])
def delete_item(item_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM inventory WHERE id = %s", (item_id,))
    item = cursor.fetchone()
    
    if not item:
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Item not found'
        }), 404
    
    if item.get('imageUrl'):
        image_filename = item['imageUrl'].split('/')[-1]
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
        if os.path.exists(image_path):
            os.remove(image_path)
    
    cursor.execute("DELETE FROM borrow_history WHERE itemId = %s", (item_id,))
    
    cursor.execute("DELETE FROM inventory WHERE id = %s", (item_id,))
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return jsonify({
        'success': True,
        'item': item
    })


@app.route('/api/inventory/<item_id>/image', methods=['POST'])
def upload_item_image(item_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM inventory WHERE id = %s", (item_id,))
    item = cursor.fetchone()
    
    if not item:
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Item not found'
    }), 404
    
    if 'image' not in request.files:
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'No image file provided'
        }), 400
    
    image_file = request.files['image']
    if not image_file or not allowed_file(image_file.filename):
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Invalid file format. Allowed formats: png, jpg, jpeg, gif'
        }), 400
    
    if item.get('imageUrl'):
        old_filename = item['imageUrl'].split('/')[-1]
        old_path = os.path.join(app.config['UPLOAD_FOLDER'], old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
    
    filename = secure_filename(image_file.filename)
    file_extension = filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{item_id}_{uuid.uuid4().hex}.{file_extension}"
    
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
    image_file.save(image_path)
    
    new_image_url = f"/api/images/{unique_filename}"
    cursor.execute("UPDATE inventory SET imageUrl = %s WHERE id = %s", (new_image_url, item_id))
    conn.commit()
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'success': True,
        'imageUrl': new_image_url
    })


@app.route('/api/inventory/<item_id>/image', methods=['DELETE'])
def delete_item_image(item_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM inventory WHERE id = %s", (item_id,))
    item = cursor.fetchone()
    
    if not item:
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Item not found'
        }), 404
    
    if not item.get('imageUrl'):
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Item does not have an image'
        }), 400
    
    image_filename = item['imageUrl'].split('/')[-1]
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
    if os.path.exists(image_path):
        os.remove(image_path)
    
    cursor.execute("UPDATE inventory SET imageUrl = NULL WHERE id = %s", (item_id,))
    conn.commit()
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'success': True,
        'message': 'Image deleted successfully'
    })


@app.route('/api/students', methods=['GET'])
def get_students():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM students")
    students = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return jsonify(students)

@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.form.to_dict() if request.form else request.json
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    student = {
        'id': data.get('id'),
        'name': data.get('name'),
        'yearSection': data.get('yearSection'),
        'course': data.get('course'),
        'imageUrl': None
    }
    
    if request.files and 'image' in request.files:
        image_file = request.files['image']
        if image_file and allowed_file(image_file.filename):
            filename = secure_filename(image_file.filename)
            file_extension = filename.rsplit('.', 1)[1].lower()
            unique_filename = f"student_{student['id']}_{uuid.uuid4().hex}.{file_extension}"
            
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            image_file.save(image_path)
            
            student['imageUrl'] = f"/api/images/{unique_filename}"
    
    cursor.execute('''
        INSERT INTO students (id, name, yearSection, course, imageUrl)
        VALUES (%s, %s, %s, %s, %s)
    ''', (
        student['id'],
        student['name'],
        student['yearSection'],
        student['course'],
        student['imageUrl']
    ))
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'success': True,
        'student': student
    })

@app.route('/api/students/<student_id>', methods=['PUT'])
def update_student(student_id):
    data = request.form.to_dict() if request.form else request.json
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
   
    cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
    student = cursor.fetchone()
    
    if not student:
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Student not found'
        }), 404
  
    update_fields = []
    update_values = []
    
    if 'name' in data:
        update_fields.append("name = %s")
        update_values.append(data['name'])
        student['name'] = data['name']
    
    if 'yearSection' in data:
        update_fields.append("yearSection = %s")
        update_values.append(data['yearSection'])
        student['yearSection'] = data['yearSection']
    
    if 'course' in data:
        update_fields.append("course = %s")
        update_values.append(data['course'])
        student['course'] = data['course']

    if request.files and 'image' in request.files:
        image_file = request.files['image']
        if image_file and allowed_file(image_file.filename):
            if student.get('imageUrl'):
                old_filename = student['imageUrl'].split('/')[-1]
                old_path = os.path.join(app.config['UPLOAD_FOLDER'], old_filename)
                if os.path.exists(old_path):
                    os.remove(old_path)
            
          
            filename = secure_filename(image_file.filename)
            file_extension = filename.rsplit('.', 1)[1].lower()
            unique_filename = f"student_{student_id}_{uuid.uuid4().hex}.{file_extension}"
            
           
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            image_file.save(image_path)
        
            update_fields.append("imageUrl = %s")
            new_image_url = f"/api/images/{unique_filename}"
            update_values.append(new_image_url)
            student['imageUrl'] = new_image_url
    
    if update_fields:
        update_query = f"UPDATE students SET {', '.join(update_fields)} WHERE id = %s"
        update_values.append(student_id)
        cursor.execute(update_query, update_values)
        conn.commit()
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'success': True,
        'student': student
    })

@app.route('/api/students/<student_id>', methods=['DELETE'])
def delete_student(student_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT * FROM students WHERE id = %s", (student_id,))
    student = cursor.fetchone()
    
    if not student:
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Student not found'
        }), 404
    
    if student.get('imageUrl'):
        image_filename = student['imageUrl'].split('/')[-1]
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
        if os.path.exists(image_path):
            os.remove(image_path)
    
    try:
        cursor.execute("DELETE FROM borrow_history WHERE studentId = %s", (student_id,))
        
        cursor.execute("UPDATE inventory SET status = 'available', borrowedBy = NULL, returnTime = NULL WHERE borrowedBy = %s", (student_id,))

        cursor.execute("DELETE FROM students WHERE id = %s", (student_id,))
        
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'student': student
        })
    except mysql.connector.Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': False,
            'message': f'Database error: {str(err)}'
        }), 500

@app.route('/api/borrow', methods=['POST'])
def borrow_item():
    data = request.json
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM inventory WHERE id = %s", (data.get('itemId'),))
    item = cursor.fetchone()
    
    if not item:
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Item not found'
        }), 404
    
    if item['status'] != 'available':
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Item is not available for borrowing'
        }), 400

    cursor.execute("SELECT * FROM students WHERE id = %s", (data.get('studentId'),))
    student = cursor.fetchone()
    
    if not student:
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Student not found'
        }), 404

    borrow_time = data.get('borrowTime', datetime.datetime.now().strftime('%Y-%m-%d %H:%M'))
    return_time = data.get('returnTime')
    
    try:
        cursor.execute(
            "UPDATE inventory SET status = 'borrowed', borrowedBy = %s, returnTime = %s WHERE id = %s",
            (student['id'], return_time, item['id'])
        )

        cursor.execute(
            "INSERT INTO borrow_history (itemId, studentId, borrowTime, returnTime, returned) VALUES (%s, %s, %s, %s, %s)",
            (item['id'], student['id'], borrow_time, return_time, False)
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Item {item["name"]} has been borrowed by {student["name"]}'
        })
    except mysql.connector.Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': False,
            'message': f'Database error: {str(err)}'
        }), 500

@app.route('/api/return/<item_id>', methods=['POST'])
def return_item(item_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM inventory WHERE id = %s", (item_id,))
    item = cursor.fetchone()
    
    if not item:
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Item not found'
        }), 404
    
    if item['status'] != 'borrowed':
        cursor.close()
        conn.close()
        return jsonify({
            'success': False,
            'message': 'Item is not currently borrowed'
        }), 400
    
    try:
        cursor.execute(
            "SELECT * FROM borrow_history WHERE itemId = %s AND returned = FALSE ORDER BY borrowTime DESC LIMIT 1",
            (item_id,)
        )
        borrow_record = cursor.fetchone()
        
        if borrow_record:
            cursor.execute(
                "UPDATE borrow_history SET returned = TRUE WHERE id = %s",
                (borrow_record['id'],)
            )
        
        cursor.execute(
            "UPDATE inventory SET status = 'available', borrowedBy = NULL, returnTime = NULL WHERE id = %s",
            (item_id,)
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Item {item["name"]} has been returned'
        })
    except mysql.connector.Error as err:
        conn.rollback()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': False,
            'message': f'Database error: {str(err)}'
        }), 500

@app.route('/api/borrow-history', methods=['GET'])
def get_borrow_history():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute('''
        SELECT bh.*, i.name as itemName, s.name as studentName 
        FROM borrow_history bh
        JOIN inventory i ON bh.itemId = i.id
        JOIN students s ON bh.studentId = s.id
        ORDER BY bh.borrowTime DESC
    ''')
    history = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return jsonify(history)

if __name__ == '__main__':
    initialize_database()
    app.run(debug=True)