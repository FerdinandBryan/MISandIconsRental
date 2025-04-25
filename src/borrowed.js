    window.borrowSystem = (function() {
        // Private variables
        const API_URL = 'http://localhost:5000/api';
        let borrowedItems = [];
        
        // DOM Elements - to be initialized when DOM is ready
        let borrowModal;
        let borrowForm;
        let studentIdInput;
        let returnDateInput;
        let itemNameDisplay;
        let borrowedItemsTable;
        
        // Initialize the module
        function init() {
        console.log('Initializing borrow system...');
        
        // Find DOM elements
        borrowModal = document.getElementById('borrow-modal');
        borrowForm = document.getElementById('borrow-form');
        studentIdInput = document.getElementById('student-id');
        returnDateInput = document.getElementById('return-date');
        itemNameDisplay = document.getElementById('borrow-item-name');
        borrowedItemsTable = document.getElementById('borrowed-items-table');
        
        // Add event listeners
        if (borrowForm) {
            borrowForm.addEventListener('submit', handleBorrowSubmit);
        }
        
        document.querySelectorAll('.borrow-modal-close').forEach(button => {
            button.addEventListener('click', closeBorrowModal);
        });
        
        document.querySelectorAll('.cancel-borrow').forEach(button => {
            button.addEventListener('click', closeBorrowModal);
        });
        
        // Initialize return date with tomorrow's date
        if (returnDateInput) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            returnDateInput.min = tomorrow.toISOString().split('T')[0];
            returnDateInput.value = tomorrow.toISOString().split('T')[0];
        }
        
        console.log('Borrow system initialized');
        }
        
        // Open the borrow modal with item details
        function openBorrowModal(item) {
        if (!borrowModal || !itemNameDisplay) {
            console.error('Borrow modal elements not found');
            return;
        }
        
        // Store the item ID in the form
        if (borrowForm) {
            borrowForm.setAttribute('data-item-id', item.id);
        }
        
        // Set the item name in the modal
        itemNameDisplay.textContent = item.name;
        
        // Show the modal
        borrowModal.style.display = 'block';
        }
        
        // Close the borrow modal
        function closeBorrowModal() {
        if (borrowModal) {
            borrowModal.style.display = 'none';
        }
        
        // Reset form if it exists
        if (borrowForm) {
            borrowForm.reset();
        }
        }
        
        // Handle borrow form submission
        function handleBorrowSubmit(e) {
        e.preventDefault();
        
        if (!borrowForm) return;
        
        const itemId = borrowForm.getAttribute('data-item-id');
        const studentId = studentIdInput.value.trim();
        const returnDate = returnDateInput.value;
        
        // Validate form
        if (!studentId) {
            window.appCore.showToast('Please enter your student ID', 'error');
            return;
        }
        
        if (!returnDate) {
            window.appCore.showToast('Please select a return date', 'error');
            return;
        }
        
        // Create borrow request data
        const borrowData = {
            itemId: itemId,
            studentId: studentId,
            borrowDate: new Date().toISOString().split('T')[0],
            returnDate: returnDate
        };
        
        // Send borrow request to API
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
            window.appCore.showToast('Item borrowed successfully!');
            closeBorrowModal();
            
            // Refresh inventory data after successful borrow
            if (window.appCore.loadInventory) {
                window.appCore.loadInventory();
            }
            
            if (window.appCore.loadInventoryForStudent) {
                window.appCore.loadInventoryForStudent();
            }
            } else {
            window.appCore.showToast('Failed to borrow item: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error borrowing item:', error);
            window.appCore.showToast('Error borrowing item. Please try again.', 'error');
        });
        }
        
        // Fetch all borrowed items
        function fetchBorrowedItems() {
        return fetch(`${API_URL}/borrowed`)
            .then(response => response.json())
            .then(data => {
            borrowedItems = data;
            return data;
            })
            .catch(error => {
            console.error('Error fetching borrowed items:', error);
            window.appCore.showToast('Failed to load borrowed items', 'error');
            return [];
            });
        }
        
        // Render borrowed items table for admin view
        function renderBorrowedItemsTable(inventory) {
        if (!borrowedItemsTable) return;
        
        // Clear the table
        borrowedItemsTable.innerHTML = '';
        
        // Filter inventory for borrowed items
        const borrowedItems = inventory.filter(item => 
            item.status && item.status.toLowerCase() === 'borrowed'
        );
        
        if (borrowedItems.length === 0) {
            // Show message if no borrowed items
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="5" class="empty-table">No items currently borrowed</td>';
            borrowedItemsTable.appendChild(emptyRow);
            return;
        }
        
        // Add each borrowed item to the table
        borrowedItems.forEach(item => {
            const row = document.createElement('tr');
            
            // Use placeholder data since we don't have the actual borrower info
            // In a real implementation, this would come from the borrower records
            row.innerHTML = `
            <td>ITEM-${item.id}</td>
            <td>${item.name}</td>
            <td>STU-12345</td> <!-- Placeholder student ID -->
            <td>${new Date().toLocaleDateString()}</td> <!-- Placeholder borrow date -->
            <td>
                <button class="action-btn return-btn" data-id="${item.id}">
                <i class="fas fa-undo"></i> Return
                </button>
            </td>
            `;
            
            borrowedItemsTable.appendChild(row);
        });
        
        // Add event listeners to return buttons
        document.querySelectorAll('.return-btn').forEach(button => {
            button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            returnItem(itemId);
            });
        });
        }
        
        // Return an item
        function returnItem(itemId) {
        if (confirm('Mark this item as returned?')) {
            fetch(`${API_URL}/return/${itemId}`, {
            method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
            if (data.success) {
                window.appCore.showToast('Item returned successfully!');
                
                // Refresh inventory data
                if (window.appCore.loadInventory) {
                window.appCore.loadInventory();
                }
            } else {
                window.appCore.showToast('Failed to return item: ' + data.message, 'error');
            }
            })
            .catch(error => {
            console.error('Error returning item:', error);
            window.appCore.showToast('Error returning item. Please try again.', 'error');
            });
        }
        }
        
        // Initialize the module when DOM is ready
        document.addEventListener('DOMContentLoaded', init);
        
        // Public API
        return {
        openBorrowModal,
        closeBorrowModal,
        fetchBorrowedItems,
        renderBorrowedItemsTable,
        returnItem
        };
    })();