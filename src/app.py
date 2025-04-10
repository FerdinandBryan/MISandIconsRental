from flask import Flask, make_response, request, jsonify, send_from_directory
from flask_cors import CORS,cross_origin
import os
import datetime
import uuid
import mysql.connector
import base64
from mysql.connector import Error
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import re
import traceback

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
    
# Route to host static front-end
@app.route('/')
def serve_html():
    return send_from_directory('static','main_index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static',path)


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

# Add this new route to your Flask application

@app.route('/api/login', methods=['POST'])
def student_login():
    try:
        data = request.json
        student_id = data.get('studentid')
        student_name = data.get('name')
        student_email = data.get('email')
        course = data.get('course', 'Unspecified')  # Default course if not provided

        # Validate input
        if not all([student_id, student_name, student_email]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        connection = get_db_connection()
        if connection is None:
            return jsonify({'success': False, 'message': 'Failed to connect to database'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Check if student already exists
        cursor.execute("""
            SELECT * FROM students 
            WHERE studentid = %s
        """, (student_id,))
        
        student = cursor.fetchone()
        
        if student:
            # Update existing student details
            cursor.execute("""
                UPDATE students 
                SET name = %s, email = %s, course = %s, last_login = NOW()
                WHERE studentid = %s
            """, (student_name, student_email, course, student_id))
            connection.commit()
        else:
            # Insert a new student
            new_id = generate_id()
            cursor.execute("""
            INSERT INTO students (studentid, name, email, course, registration_date, last_login)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
            """, (student_id, student_name, student_email, course))
            connection.commit()

            new_id = cursor.lastrowid
            
            # Fetch newly created student record
            cursor.execute("SELECT * FROM students WHERE id = %s", (new_id,))
            student = cursor.fetchone()
        
        cursor.close()
        connection.close()

        # Return the student details
        return jsonify({
            'success': True, 
            'message': 'Login successful',
            'student': {
                'id': student['id'],
                'studentId': student['studentid'],
                'name': student['name'],
                'email': student['email'],
                'course': student['course'],
                'registrationDate': student['registration_date'].isoformat() if student.get('registration_date') else None,
                'lastLogin': student['last_login'].isoformat() if student.get('last_login') else None
            }
        })
        
    except Exception as e:
        print(f"Error during login: {str(e)}")
        print(traceback.format_exc())  # This will show the full stack trace
        return jsonify({'success': False, 'message': f'Login failed: {str(e)}'})

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
    print('Received borrow request:', data)  # Debugging log

    item_id = data.get('itemId')
    student_id_number = data.get('studentId')  # This is the student ID number, not UUID
    year_section = data.get('yearSection')
    course = data.get('course')
    hours_to_use = data.get('hoursToUse')
    borrow_date_str = data.get('borrowDate')
    
    # Convert ISO date string to MySQL compatible format
    try:
        # Parse the ISO format date
        from datetime import datetime
        parsed_date = datetime.fromisoformat(borrow_date_str.replace('Z', '+00:00'))
        # Format it in a way MySQL accepts
        borrow_date = parsed_date.strftime('%Y-%m-%d %H:%M:%S')
        print('Parsed borrow date:', borrow_date)  # Debug log
    except Exception as e:
        print('Date parsing error:', e)  # Debug log
        return jsonify({'success': False, 'message': f'Invalid date format: {str(e)}'})

    if not all([item_id, student_id_number, year_section, course, hours_to_use, borrow_date]):
        return jsonify({'success': False, 'message': 'Missing required fields'})

    connection = get_db_connection()
    if connection is None:
        return jsonify({'success': False, 'message': 'Failed to connect to database'})

    try:

        cursor = connection.cursor(dictionary=True)

        # Check item availability
        cursor.execute("SELECT * FROM inventory_items WHERE id = %s", (item_id,))
        item = cursor.fetchone()
        print(f"ITEM DATA: id={item['id']}, name={item['name']}, status='{item['status']}', type={type(item['status'])}")

        if not item:
            return jsonify({'success': False, 'message': 'Item does not exist'})
        
        if item['status'].lower() != 'available':
            return jsonify({'success': False, 'message': 'Item is not available for borrowing'})

        # Find student by student ID number
        cursor.execute("SELECT * FROM students WHERE studentid = %s", (student_id_number,))
        student = cursor.fetchone()
        print('Fetched student:', student)  # Debugging log

        if not student:
            return jsonify({'success': False, 'message': 'Student not found. Please check your student ID.'})

        # Update item status to borrowed
        cursor.execute("UPDATE inventory_items SET status = 'borrowed' WHERE id = %s", (item_id,))

        # Record the borrowing transaction using the correct column names
        cursor.execute("""
            INSERT INTO borrowed_items 
            (itemId, studentId, y_s, course, borrowDate, borrowDurationHours)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (item_id, student['id'], year_section, course, borrow_date, hours_to_use))
        
        # The dueDate will be set automatically by the MySQL trigger

        connection.commit()
        
        # Retrieve the calculated due date to return to the client
        cursor.execute("""
            SELECT dueDate FROM borrowed_items 
            WHERE itemId = %s AND studentId = %s 
            ORDER BY id DESC LIMIT 1
        """, (item_id, student['id']))
        
        due_date_result = cursor.fetchone()
        calculated_due_date = due_date_result['dueDate'] if due_date_result else None
        
        print('Item borrowed successfully, due date:', calculated_due_date)  # Debugging log
        
        return jsonify({
            'success': True, 
            'message': 'Item borrowed successfully',
            'borrowDetails': {
                'itemName': item['name'],
                'dueDate': calculated_due_date.isoformat() if calculated_due_date else None
            }
        })

    except Exception as e:
        connection.rollback()
        print('Error:', e)  # Debugging log
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

    finally:
        if connection.is_connected():
            cursor.close()

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


def validate_student_id(student_id):
    pattern = r'^\d{4}-\d{4}$'  # Match format 0000-0000
    return re.match(pattern, student_id) is not None

# Route to add a new student
@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.json
    print("Received data:", data)  # Debugging
    # Validate input
    student_id = data.get('studentid')
    if not student_id or not validate_student_id(student_id):
        print("Invalid student ID:", student_id)  # Debugging
        return jsonify({'success': False, 'message': 'Invalid Student ID'}), 400

    student = {
        'studentid': data.get('studentid'),
        'name': data.get('name'),
        'email': data.get('email')
    }

    connection = get_db_connection()
    if connection is None:
        return jsonify({'success': False, 'message': 'Failed to connect to database'}), 500

    try:
        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO students (studentid, name, email)
            VALUES (%s, %s, %s)
        """, (student['studentid'], student['name'], student['email']))
        connection.commit()
        return jsonify({'success': True, 'student': student}), 201
    except mysql.connector.Error as e:
        print(f"MySQL error: {e}")
        return jsonify({'success': False, 'message': 'Database error'}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'success': False, 'message': 'An unexpected error occurred'}), 500
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

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
                image LONGTEXT
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

