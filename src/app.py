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
from flask import redirect, url_for


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

# Route to fetch all inventory items
@app.route('/api/inventory', methods=['GET'])
@app.route('/api/inventory', methods=['GET', 'OPTIONS'])
def get_inventory():
    # Handle preflight CORS requests
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'GET')
        return response
    
    try:
        connection = get_db_connection()
        if connection is None:
            return jsonify({'success': False, 'message': 'Failed to connect to database'})
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM inventory_items")
        inventory_items = cursor.fetchall()
        
        print(f"Fetched inventory items: {inventory_items}")
        
        cursor.close()
        connection.close()
        
        # Create response with CORS headers
        response = jsonify(inventory_items)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response  
                               
    except Exception as e:
        print(f"Error fetching inventory: {str(e)}")
        response = jsonify({'success': False, 'message': f'Failed to fetch inventory: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response

# Route to add a new item to the inventory
@app.route('/api/inventory', methods=['POST', 'OPTIONS'])
def add_inventory_item():
    # Handle preflight CORS requests
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
        
    print("Processing inventory item addition")
    
    try:
        # Check if the request is JSON or form data
        if request.content_type and 'application/json' in request.content_type:
            # Handle JSON data
            data = request.json
            image_data = None
        else:
            # Handle form data
            data = request.form
            image_data = request.files['image'].read() if 'image' in request.files else None
            # Encode image data if it exists
            if image_data:
                image_data = base64.b64encode(image_data)
        
        # Create item dictionary
        item = {
            'name': data.get('name'),
            'category': data.get('category'),
            'description': data.get('description'),
            'status': data.get('status', 'available'),
            'image': image_data
        }
        
        print(f"Adding item to inventory: {item['name']}")
        
        # Connect to database
        connection = get_db_connection()
        if connection is None:
            return jsonify({'success': False, 'message': 'Failed to connect to database'})
        
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO inventory_items (name, category, description, status, image)
            VALUES (%s, %s, %s, %s, %s)
        """, (item['name'], item['category'], item['description'], item['status'], item['image']))
        connection.commit()
        cursor.close()
        connection.close()
        print("Item added successfully")
        
        # Create response with CORS headers
        response = jsonify({
            'success': True, 
            'message': 'Item added successfully',
            'item': {
                'name': item['name'],
                'category': item['category'],
                'description': item['description'],
                'status': item['status']
            }
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        print(f"Error adding item to inventory: {str(e)}")
        response = jsonify({'success': False, 'message': f'Failed to add item to database: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
    
# Route to borrow an item
@app.route('/api/borrow', methods=['POST'])
def borrow_item():
    data = request.json
    
    # Extract all required fields from request
    item_id = data.get('itemId')
    student_id = data.get('studentId')
    year_section = data.get('yearSection')
    course = data.get('course')
    hours_to_use = data.get('hoursToUse')
    borrow_date = data.get('borrowDate')
    due_date = data.get('dueDate')
    
    # Validate required fields
    if not all([item_id, student_id, year_section, course, hours_to_use, borrow_date, due_date]):
        return jsonify({'success': False, 'message': 'Missing required fields'})
    
    connection = get_db_connection()
    if connection is None:
        return jsonify({'success': False, 'message': 'Failed to connect to database'})
    
    try:
        # Create a dictionary cursor
        cursor = connection.cursor(dictionary=True)
        
        # Check if item exists and is available
        cursor.execute("SELECT * FROM inventory_items WHERE id = %s", (item_id,))
        item = cursor.fetchone()
        
        if not item or item['status'] != 'available':
            return jsonify({'success': False, 'message': 'Item not available or does not exist'})
        
        # Check if student exists
        cursor.execute("SELECT * FROM students WHERE student_id = %s", (student_id,))
        student = cursor.fetchone()
        
        if not student:
            return jsonify({'success': False, 'message': 'Student does not exist'})
        
        # Update item status to borrowed
        cursor.execute("UPDATE inventory_items SET status = 'borrowed' WHERE id = %s", (item_id,))
        
        # Insert into borrowed_items table
        cursor.execute("""
            INSERT INTO borrowed_items 
            (itemId, studentId, yearSection, course, borrowDate, dueDate, hoursToUse)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (item_id, student_id, year_section, course, borrow_date, due_date, hours_to_use))
        
        connection.commit()
        return jsonify({'success': True, 'message': 'Item borrowed successfully'})
        
    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})
    
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

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
    app.run(debug=True)