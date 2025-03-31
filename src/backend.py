from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Sample data
inventory_items = []
borrowed_items = []

# Helper function to generate unique IDs
def generate_id():
    return str(uuid.uuid4())

# Route to fetch all inventory items
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    print("Received request for inventory")
    return jsonify(inventory_items)

# Route to add a new item to the inventory
@app.route('/api/inventory', methods=['POST'])
def add_inventory_item():
    data = request.form
    item = {
        'id': generate_id(),
        'name': data.get('name'),
        'category': data.get('category'),
        'description': data.get('description'),
        'status': 'available',
        'imageUrl': request.files['image'].filename if 'image' in request.files else None
    }
    inventory_items.append(item)
    return jsonify({'success': True, 'item': item})

# Route to borrow an item
@app.route('/api/borrow', methods=['POST'])
def borrow_item():
    data = request.json
    item_id = data.get('itemId')
    student_id = data.get('studentId')
    borrow_time = data.get('borrowTime')
    return_time = data.get('returnTime')

    item = next((item for item in inventory_items if item['id'] == item_id), None)
    if not item or item['status'] != 'available':
        return jsonify({'success': False, 'message': 'Item not available or does not exist'})

    item['status'] = 'borrowed'
    borrowed_items.append({
        'itemId': item_id,
        'studentId': student_id,
        'borrowDate': borrow_time,
        'dueDate': return_time
    })

    return jsonify({'success': True})

# Route to delete an item from the inventory
@app.route('/api/inventory/<item_id>', methods=['DELETE'])
def delete_inventory_item(item_id):
    global inventory_items
    item = next((item for item in inventory_items if item['id'] == item_id), None)
    if not item:
        return jsonify({'success': False, 'message': 'Item not found'})

    inventory_items = [item for item in inventory_items if item['id'] != item_id]
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True)