document.addEventListener('DOMContentLoaded', function () {
    // API URL will be referenced from appCore
    let borrowedItems = [];
    let currentStudentId = null;
  
    // Open borrow modal function
    function openBorrowModal(item) {
      const modal = document.getElementById('borrow-modal');
      if (!modal) return;
  
      // Set the item info in the modal
      document.getElementById('borrow-item-id').value = item.id;
      document.getElementById('borrow-item-name').textContent = item.name;
      document.getElementById('borrow-item-category').textContent = item.category || 'N/A';
      
      // Display the item image if available
      const itemImage = document.getElementById('borrow-item-image');
      if (itemImage) {
        if (item.image) {
          itemImage.src = `data:image/jpeg;base64,${item.image}`;
          itemImage.style.display = 'block';
        } else {
          itemImage.src = 'assets/placeholder-image.jpg';
          itemImage.style.display = 'block';
        }
      }
      
      // Show the modal
      modal.style.display = 'block';
  
      // Close modal when clicking on X or cancel button
      document.querySelector('#borrow-modal .close').addEventListener('click', function () {
        modal.style.display = 'none';
      });
  
      document.getElementById('cancel-borrow').addEventListener('click', function () {
        modal.style.display = 'none';
      });
  
      // Handle borrow form submission
      document.getElementById('borrow-form').addEventListener('submit', function (e) {
        e.preventDefault();
  
        const studentId = document.getElementById('student-id').value.trim();
        const studentName = document.getElementById('student-name').value.trim();
        const returnDate = document.getElementById('return-date').value;
  
        // Validate fields
        if (!studentId) {
          window.appCore.showToast('Student ID is required', 'error');
          return;
        }
  
        if (!studentName) {
          window.appCore.showToast('Student name is required', 'error');
          return;
        }
  
        if (!returnDate) {
          window.appCore.showToast('Return date is required', 'error');
          return;
        }
  
        // Prepare borrow data
        const borrowData = {
          itemId: item.id,
          studentId: studentId,
          studentName: studentName,
          borrowDate: new Date().toISOString().split('T')[0], // Today's date
          returnDate: returnDate
        };
  
        // Send borrow request to API
        fetch(`${window.appCore.API_URL}/borrow`, {
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
              modal.style.display = 'none';
              // Reload inventory to update UI
              window.appCore.loadInventory();
              // Also reload student view if we're in that section
              window.appCore.loadInventoryForStudent();
            } else {
              window.appCore.showToast('Failed to borrow item: ' + data.message, 'error');
            }
          })
          .catch(error => {
            console.error('Error borrowing item:', error);
            window.appCore.showToast('Error borrowing item. Please try again.', 'error');
          });
      });
    }
  
    // Function to render borrowed items table for admin view
    function renderBorrowedItemsTable(inventory) {
      const borrowedItemsTable = document.getElementById('borrowed-items-table');
      if (!borrowedItemsTable) return;
  
      borrowedItemsTable.innerHTML = '';
  
      // Filter borrowed items
      const borrowedItems = inventory.filter(item => 
        item.status && item.status.toLowerCase() === 'borrowed'
      );
  
      if (borrowedItems.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" class="no-items">No borrowed items</td>';
        borrowedItemsTable.appendChild(row);
        return;
      }
  
      borrowedItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>ITEM-${item.id}</td>
          <td>${item.name}</td>
          <td>${item.borrower?.studentName || 'Unknown'}</td>
          <td>${item.borrower?.studentId || 'Unknown'}</td>
          <td>${formatDate(item.borrower?.borrowDate)}</td>
          <td>${formatDate(item.borrower?.returnDate)}</td>
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
        button.addEventListener('click', function () {
          const itemId = this.getAttribute('data-id');
          returnItem(itemId);
        });
      });
    }
  
    // Format date for display
    function formatDate(dateString) {
      if (!dateString) return 'N/A';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  
    // Return an item
    function returnItem(itemId) {
      if (confirm('Are you sure you want to mark this item as returned?')) {
        fetch(`${window.appCore.API_URL}/return/${itemId}`, {
          method: 'POST'
        })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              window.appCore.showToast('Item returned successfully!');
              // Reload inventory
              window.appCore.loadInventory();
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
  
    // Load student borrow history
    function loadStudentBorrowHistory(studentId) {
      currentStudentId = studentId;
      
      fetch(`${window.appCore.API_URL}/borrowHistory/${studentId}`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            borrowedItems = data.items || [];
            renderStudentBorrowHistory();
          } else {
            window.appCore.showToast('Failed to load borrow history: ' + data.message, 'error');
          }
        })
        .catch(error => {
          console.error('Error loading borrow history:', error);
          window.appCore.showToast('Error loading borrow history. Please try again.', 'error');
        });
    }
  
    // Render student borrow history
    function renderStudentBorrowHistory() {
      const historyTable = document.getElementById('borrow-history-table');
      if (!historyTable) return;
  
      historyTable.innerHTML = '';
  
      if (borrowedItems.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" class="no-items">No borrow history found</td>';
        historyTable.appendChild(row);
        return;
      }
  
      borrowedItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.name}</td>
          <td>${formatDate(item.borrowDate)}</td>
          <td>${formatDate(item.returnDate)}</td>
          <td>${item.returned ? 'Returned' : 'Borrowed'}</td>
          <td>${item.returned ? formatDate(item.actualReturnDate) : 'N/A'}</td>
        `;
  
        historyTable.appendChild(row);
      });
    }
  
    // Export functions for use in other modules
    window.borrowSystem = {
      openBorrowModal,
      renderBorrowedItemsTable,
      loadStudentBorrowHistory,
      returnItem
    };
  });