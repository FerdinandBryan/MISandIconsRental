from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS,cross_origin
import os
import datetime
import uuid
import mysql.connector
import base64
from mysql.connector import Error
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from flask import redirect, url_for,send_from_directory

app = Flask(__name__)
cors = CORS(app, resources={
    r"/*": {
        "origins":"*",
        "methods": ["GET","POST", "PUT","DELETE"],
        "allow_headers":["Content-Type"]
    }
})
app.config['CORS-HEADERS'] = 'Content-Type'

# Database configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'oninrusselbryan123',
    'database': 'mis_icons_rental',
    'auth_plugin': 'mysql_native_password' 
}

# Helper function to generate unique IDs
def generate_id():
    return str(uuid.uuid4())

# Database connection function
def get_db_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        if connection.is_connected():
            print("Connected to the database")
            return connection
    except Error as e:
        print(f"Error connecting to MySQL database: {e}")
        return None

# Route to serve static html
@app.route('/')
def serve_html():
    return send_from_directory('static','main_index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static',path)


# Route to fetch all inventory items
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    connection = get_db_connection()
    if connection is None:
        return jsonify({'success': False, 'message': 'Failed to connect to database'})
    
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM inventory_items")
    inventory_items = cursor.fetchall()
    
    print(f"Fetched inventory items: {inventory_items}")
    
    cursor.close()
    connection.close()
    return jsonify(inventory_items)

# Route to add a new item to the inventory
@app.route('/api/inventory', methods=['POST'])
def add_inventory_item():
    print("!!!!!!!!!!!!!!!!!test!!!!!!!!!!!!!!!!!!!!!!!!!!11")
    data = request.form
    item = {
        'name': data.get('name'),
        'category': data.get('category'),
        'description': data.get('description'),
        'status': data.get('status'),  
        'image':  base64.b64encode(request.files['image'].read()) if 'image' in request.files else None
        # 'image': request.files['image'].read() if 'image' in request.files else None
    }
    
    print(f"Adding item to inventory: {item}")
    
    connection = get_db_connection()
    if connection is None:
        return jsonify({'success': False, 'message': 'Failed to connect to database'})
    
    try:
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO inventory_items (name, category, description, status, image)
            VALUES (%s, %s, %s, %s, %s)
        """, (item['name'], item['category'], item['description'], item['status'], item['image']))
        connection.commit()
        cursor.close()
        connection.close()
        print("Item added successfully")
    except Error as e:
        print(f"Error adding item to inventory: {e}")
        return jsonify({'success': False, 'message': 'Failed to add item to database'})
    
    return jsonify({'success': True, 'name': item.name, 'category' :item.category,'description': item.description,'status': item.status,'image': item.image})

# Route to borrow an item
@app.route('/api/borrow', methods=['POST'])
def borrow_item():
    data = request.json
    item_id = data.get('itemId')
    student_id = data.get('studentId')
    borrow_time = data.get('borrowTime')
    return_time = data.get('returnTime')

    connection = get_db_connection()
    if connection is None:
        return jsonify({'success': False, 'message': 'Failed to connect to database'})
    
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM inventory_items WHERE id = %s", (item_id,))
    item = cursor.fetchone()

    if not item or item['status'] != 'available':
        cursor.close()
        connection.close()
        return jsonify({'success': False, 'message': 'Item not available or does not exist'})

    cursor.execute("UPDATE inventory_items SET status = 'borrowed' WHERE id = %s", (item_id,))
    cursor.execute("""
        INSERT INTO borrowed_items (itemId, studentId, borrowDate, dueDate)
        VALUES (%s, %s, %s, %s)
    """, (item_id, student_id, borrow_time, return_time))
    connection.commit()
    cursor.close()
    connection.close()
    return jsonify({'success': True})

# Route to delete an item from the inventory
@app.route('/api/inventory/<item_id>', methods=['DELETE'])
def delete_inventory_item(item_id):
    connection = get_db_connection()
    if connection is None:
        return jsonify({'success': False, 'message': 'Failed to connect to database'})
    
    cursor = connection.cursor()

    cursor.execute("SELECT * FROM inventory_items WHERE id = %s", (item_id,))
    item = cursor.fetchone()
    
    if not item:
        cursor.close()
        connection.close()
        return jsonify({'success': False, 'message': 'Item not found'})

    cursor.execute("DELETE FROM inventory_items WHERE id = %s", (item_id,))
    connection.commit()
    cursor.close()
    connection.close()
    return jsonify({'success': True})

# Route to add a new student
@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.json
    student_id = generate_id()
    student = {
        'id': student_id,
        'studentid': '0000-0000',
        'name': data.get('name'),
        'email': data.get('email'),
        'course': data.get('course')
    }
    
    print(f"Adding student: {student}")
    
    connection = get_db_connection()
    if connection is None:
        return jsonify({'success': False, 'message': 'Failed to connect to database'})
    
    try:
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO students (id, studentid, name, email, course)
            VALUES (%s, %s, %s, %s, %s)
        """, (student_id, student['studentid'], student['name'], student['email'], student['course']))
        connection.commit()
        cursor.close()
        connection.close()
        print("Student added successfully")
    except Error as e:
        print(f"Error adding student: {e}")
        return jsonify({'success': False, 'message': 'Failed to add student to database'})
    
    return jsonify({'success': True, 'student': student})

if __name__ == '__main__':
    # Create tables if they don't exist
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory_items (
                id int auto_increment primary KEY,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) NOT NULL,
                image LONGBLOB
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS borrowed_items (
                id int auto_increment PRIMARY KEY,
                itemId int NOT NULL,
                studentId VARCHAR(36) NOT NULL,
                borrowDate DATETIME NOT NULL,
                dueDate DATETIME NOT NULL,
                FOREIGN KEY (itemId) REFERENCES inventory_items(id),
                FOREIGN KEY (studentId) REFERENCES students(id)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id VARCHAR(36) PRIMARY KEY,
                studentid VARCHAR(255) NOT NULL DEFAULT '0000-0000',
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                course VARCHAR(255) NOT NULL
            )
        """)
        connection.commit()
        cursor.close()
        connection.close()
    
    # Ensure the Flask server runs on a different port (e.g., 5000)
    app.run(debug=True, port=5000)