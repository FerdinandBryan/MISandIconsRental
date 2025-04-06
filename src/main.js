// main.js - MIS and ICONS Rental System

document.addEventListener('DOMContentLoaded', function() {
    // API endpoint
    const API_URL = 'http://localhost:5000/api';
    
    // Common DOM elements
    const loginScreen = document.getElementById('login-screen');
    const studentInterface = document.getElementById('student-interface');
    const adminInterface = document.getElementById('admin-interface');
    const userTypeSelect = document.getElementById('user-type');
    const adminPasswordContainer = document.getElementById('admin-password-container');
    const adminPassword = document.getElementById('admin-password');
    const passwordError = document.getElementById('password-error');
    const loginBtn = document.getElementById('login-btn');
    
    // Admin elements
    const addItemForm = document.getElementById('add-item-form');
    const itemImageInput = document.getElementById('item-image');
    const previewImg = document.getElementById('preview-img');
    const noImageText = document.getElementById('no-image-text');
    const allItemsTable = document.getElementById('all-items-table');
    
    // Toast notification
    const toast = document.getElementById('toast');
    const toastClose = document.querySelector('.toast-close');
    
    // Initialize state
    let inventory = [];
    
    // Show/hide admin password field based on user type selection
    userTypeSelect.addEventListener('change', function() {
        if (this.value === 'admin') {
            adminPasswordContainer.style.display = 'block';
        } else {
            adminPasswordContainer.style.display = 'none';
            passwordError.style.display = 'none';
        }
    });
    
    // Login functionality
    loginBtn.addEventListener('click', function() {
        const userType = userTypeSelect.value;
        
        if (userType === 'admin') {
            // Simple password validation - in production, use proper authentication
            if (adminPassword.value === 'admin123') { // Example password
                loginScreen.classList.add('hidden');
                adminInterface.classList.remove('hidden');
                loadInventory(); // Load inventory data for admin
            } else {
                passwordError.style.display = 'block';
            }
        } else {
            // Student login
            loginScreen.classList.add('hidden');
            studentInterface.classList.remove('hidden');
            loadInventoryForStudent();
        }
    });
    
    // Logout buttons
    document.getElementById('student-logout').addEventListener('click', function() {
        studentInterface.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    });
    
    document.getElementById('admin-logout').addEventListener('click', function() {
        adminInterface.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    });
    
    // Navigation buttons
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-section');
            
            // Skip for logout buttons
            if (!targetSection) return;
            
            // Remove active class from all buttons and sections
            document.querySelectorAll('.nav-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Add active class to clicked button and target section
            this.classList.add('active');
            document.getElementById(`${targetSection}-section`).classList.add('active');
        });
    });
    
    // Tab functionality
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const targetContent = this.getAttribute('data-tab-content');
            
            // Remove active class from all tabs and content
            document.querySelectorAll('.tab').forEach(t => {
                t.classList.remove('active');
            });
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to clicked tab and target content
            this.classList.add('active');
            document.getElementById(targetContent).classList.add('active');
        });
    });
    
    // Image preview for add item form
    if (itemImageInput) {
        itemImageInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                    noImageText.style.display = 'none';
                };
                reader.readAsDataURL(file);
            } else {
                previewImg.style.display = 'none';
                noImageText.style.display = 'block';
            }
        });
    }
    
    // Add item form submission
    if (addItemForm) {
        addItemForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const itemName = document.getElementById('item-name').value;
            const itemCategory = document.getElementById('item-category').value;
            const itemDescription = document.getElementById('item-description').value;
            const itemStatus = document.getElementById('item-status').value || 'available';
            const itemImage = document.getElementById('item-image').files[0];
            
            // Different approach for items with no image
            if (!itemImage) {
                // Use JSON for non-file data
                const itemData = {
                    name: itemName,
                    category: itemCategory,
                    description: itemDescription,
                    status: itemStatus
                };
                
                fetch(`${API_URL}/inventory`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(itemData)
                })
                .then(handleResponse)
                .catch(handleError);
            } else {
                // Use FormData for file uploads
                const formData = new FormData();
                formData.append('name', itemName);
                formData.append('category', itemCategory);
                formData.append('description', itemDescription);
                formData.append('status', itemStatus);
                formData.append('image', itemImage);
                
                fetch(`${API_URL}/inventory`, {
                    method: 'POST',
                    // No Content-Type header for FormData
                    body: formData
                })
                .then(handleResponse)
                .catch(handleError);
            }
            
            function handleResponse(response) {
                console.log('Response status:', response.status);
                return response.json().then(data => {
                    console.log('Server response data:', data);
                    
                    if (data.success) {
                        showToast('Item added successfully!');
                        addItemForm.reset();
                        if (previewImg) {
                            previewImg.style.display = 'none';
                        }
                        if (noImageText) {
                            noImageText.style.display = 'block';
                        }
                        loadInventory();
                    } else {
                        showToast('Failed to add item: ' + (data.message || 'Unknown error'), 'error');
                    }
                });
            }
            
            function handleError(error) {
                console.error('Error adding item:', error);
                showToast('Error adding item. Please try again.', 'error');
            }
        });
    }

    // Load inventory data for admin dashboard
    function loadInventory() {
    fetch(`${API_URL}/inventory`, {
        method: 'GET'
        
    })
    .then(response => response.json())
    .then(data => {
        console.log('Inventory data received:', data);
        inventory = data;
        updateInventoryStats();
        renderInventoryTable();
        initCharts(data);
    })
    .catch(error => {
        console.error('Error loading inventory:', error);
        showToast('Failed to load inventory data', 'error');
    });
 }
    
    // Load inventory data for student view
    function loadInventoryForStudent() {
        fetch(`${API_URL}/inventory`)
            .then(response => response.json())
            .then(data => {
                inventory = data;
                
                // Clear item containers
                document.getElementById('mis-items').innerHTML = '';
                document.getElementById('icons-items').innerHTML = '';
                document.getElementById('things-items').innerHTML = '';
                
                // Render items by category
                data.forEach(item => {
                    if (item.status === 'available') {
                        const itemCard = createItemCard(item);
                        
                        if (item.category === 'MIS') {
                            document.getElementById('mis-items').appendChild(itemCard);
                        } else if (item.category === 'ICON') {
                            document.getElementById('icons-items').appendChild(itemCard);
                        } else {
                            document.getElementById('things-items').appendChild(itemCard);
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error loading inventory for student:', error);
            });
    }
    
    // Create item card for student view
    function createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'card';
        
        const imgElement = document.createElement('img');
        if (item.image) {
            // If we have an image in the database, convert it to a viewable format
            const base64Image = btoa(String.fromCharCode.apply(null, new Uint8Array(item.image.data || [])));
            imgElement.src = 'data:image/jpeg;base64,' + base64Image;
        } else {
            // Default image if none provided
            imgElement.src = 'placeholder-image.jpg';
        }
        imgElement.alt = item.name;
        
        const itemInfo = document.createElement('div');
        itemInfo.className = 'item-info';
        itemInfo.innerHTML = `
            <h3>${item.name}</h3>
            <p>${item.description || 'No description available'}</p>
            <button class="btn borrow-btn" data-id="${item.id}">Borrow</button>
        `;
        
        card.appendChild(imgElement);
        card.appendChild(itemInfo);
        
        // Add borrow functionality
        const borrowBtn = itemInfo.querySelector('.borrow-btn');
        borrowBtn.addEventListener('click', function() {
            openBorrowModal(item);
        });
        
        return card;
    }
    
    // Render inventory table for admin view
    function renderInventoryTable() {
        if (!allItemsTable) return;
        
        allItemsTable.innerHTML = '';
        
        inventory.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>ITEM-${item.id}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td><span class="status-badge ${item.status}">${item.status}</span></td>
                <td>
                    <button class="action-btn edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            
            allItemsTable.appendChild(row);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                openEditModal(itemId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                deleteItem(itemId);
            });
        });
    }
    
    // Update inventory statistics
    function updateInventoryStats() {
        if (document.getElementById('total-items-count')) {
            document.getElementById('total-items-count').textContent = inventory.length;
        }
        
        if (document.getElementById('admin-available-count')) {
            const availableItems = inventory.filter(item => item.status === 'available').length;
            document.getElementById('admin-available-count').textContent = availableItems;
        }
        
        if (document.getElementById('admin-borrowed-count')) {
            const borrowedItems = inventory.filter(item => item.status === 'borrowed').length;
            document.getElementById('admin-borrowed-count').textContent = borrowedItems;
        }
    }
    
    // Open borrow modal
    function openBorrowModal(item) {
        const modal = document.getElementById('borrow-modal');
        const modalItemName = document.getElementById('modal-item-name');
        const itemIdField = document.getElementById('item-id');
        
        modalItemName.textContent = `Item: ${item.name} (ITEM-${item.id})`;
        itemIdField.value = item.id;
        
        modal.style.display = 'block';
        
        // Close modal when clicking on X or cancel button
        document.querySelector('#borrow-modal .close').addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        document.getElementById('cancel-borrow').addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        // Handle borrow form submission
        document.getElementById('borrow-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const borrowData = {
                itemId: itemIdField.value,
                studentId: document.getElementById('student-number').value,
                borrowTime: new Date().toISOString(),
                returnTime: addHours(new Date(), parseInt(document.getElementById('time-to-use').value)).toISOString()
            };
            
            fetch(`${API_URL}/borrow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(borrowData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    modal.style.display = 'none';
                    showToast('Item borrowed successfully!');
                    loadInventoryForStudent(); // Reload inventory
                } else {
                    showToast('Failed to borrow item: ' + data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error borrowing item:', error);
                showToast('Error borrowing item. Please try again.', 'error');
            });
        });
    }
    
    // Open edit modal
    function openEditModal(itemId) {
        const modal = document.getElementById('edit-modal');
        const item = inventory.find(i => i.id == itemId);
        
        if (!item) return;
        
        document.getElementById('edit-item-id').value = item.id;
        document.getElementById('edit-item-name').value = item.name;
        document.getElementById('edit-item-category').value = item.category;
        document.getElementById('edit-item-description').value = item.description || '';
        
        modal.style.display = 'block';
        
        // Close modal when clicking on X or cancel button
        document.getElementById('edit-close').addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        document.getElementById('cancel-edit').addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        // Handle edit form submission
        document.getElementById('edit-item-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const updatedItem = {
                id: document.getElementById('edit-item-id').value,
                name: document.getElementById('edit-item-name').value,
                category: document.getElementById('edit-item-category').value,
                description: document.getElementById('edit-item-description').value
            };
            
            // TODO: Implement API endpoint for updating items
            // For now, just show success message and update UI
            showToast('Item updated successfully!');
            modal.style.display = 'none';
            loadInventory(); // Reload inventory
        });
    }
    
    // Delete item
    function deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this item?')) {
            fetch(`${API_URL}/inventory/${itemId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('Item deleted successfully!');
                    loadInventory(); // Reload inventory
                } else {
                    showToast('Failed to delete item: ' + data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error deleting item:', error);
                showToast('Error deleting item. Please try again.', 'error');
            });
        }
    }
    
    // Initialize charts for admin dashboard
    function initCharts(data) {
        // Example charts - these would need to be customized based on actual data
        if (document.getElementById('usageChart')) {
            const ctx = document.getElementById('usageChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Items Borrowed',
                        data: [12, 19, 3, 5, 2, 3],
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: 'Monthly Usage Trends'
                        }
                    }
                }
            });
        }
        
        if (document.getElementById('borrowedItemsChart')) {
            const ctx = document.getElementById('borrowedItemsChart').getContext('2d');
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right',
                        },
                        title: {
                            display: true,
                            text: 'Most Borrowed Items'
                        }
                    }
                }
            });
        }
        
        // Initialize other charts as needed
    }
    
    // Helper function to add hours to a date
    function addHours(date, hours) {
        return new Date(date.getTime() + hours * 60 * 60 * 1000);
    }
    
    // Show toast notification
    function showToast(message, type = 'success') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                ${type === 'success' ? 
                    '<i class="fas fa-check-circle"></i>' : 
                    '<i class="fas fa-exclamation-circle"></i>'}
            </div>
            <div class="toast-message">${message}</div>
            <button class="toast-close">&times;</button>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Add animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Set timeout to remove toast
        const timeout = setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', function() {
                toast.remove();
            });
        }, 3000);
        
        // Close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(timeout);
            toast.classList.remove('show');
            toast.addEventListener('transitionend', function() {
                toast.remove();
            });
        });
    }
});