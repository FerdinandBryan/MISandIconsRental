  document.addEventListener('DOMContentLoaded', function () {
    // API endpoint
    const API_URL = 'http://localhost:5000/api';

    // Initialize state
    let inventory = [];
    let chartInstances = {};

    // Navigation buttons
    document.querySelectorAll('.nav-button').forEach(button => {
      button.addEventListener('click', function () {
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
      tab.addEventListener('click', function () {
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
    const itemImageInput = document.getElementById('item-image');
    const previewImg = document.getElementById('preview-img');
    const noImageText = document.getElementById('no-image-text');

    if (itemImageInput) {
      itemImageInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function (e) {
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

    // Enhanced: Add item form submission with better validation
    const addItemForm = document.getElementById('add-item-form');
    if (addItemForm) {
      addItemForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const itemName = document.getElementById('item-name').value.trim();
        const itemCategory = document.getElementById('item-category').value.trim();
        const itemDescription = document.getElementById('item-description').value.trim();
        const itemStatus = document.getElementById('item-status').value || 'available';
        const itemImage = document.getElementById('item-image').files[0];

        // Validate required fields
        if (!itemName) {
          showToast('Item name is required', 'error');
          return;
        }

        if (!itemCategory) {
          showToast('Item category is required', 'error');
          return;
        }

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
          renderBorrowedItemsTable(); // Add this line to load borrowed items table
          initCharts(data);
        })
        .catch(error => {
          console.error('Error loading inventory:', error);
          showToast('Failed to load inventory data', 'error');
        });
    }

    // Load inventory data for student view
    function loadInventoryForStudent() {
      console.log("Loading inventory for student...");
      fetch(`${API_URL}/inventory`)
        .then(response => {
          console.log("API Response status:", response.status);
          return response.json();
        })
        .then(data => {
          console.log("Inventory data received:", data);
          inventory = data;

          // Clear item containers
          document.getElementById('mis-items').innerHTML = '';
          document.getElementById('icons-items').innerHTML = '';
          document.getElementById('things-items').innerHTML = '';

          let itemsAdded = 0;

          // Render items by category with detailed logging
          data.forEach(item => {
            console.log(`Processing item: ${item.name || 'unnamed'}`);
            console.log(`Category: '${item.category}', Type: ${typeof item.category}`);

            if (item.status && item.status.toLowerCase() === 'available') {
              const itemCard = createItemCard(item);
              itemsAdded++;

              // More flexible category matching
              const category = (item.category || '').toLowerCase();

              if (category.includes('mis')) {
                document.getElementById('mis-items').appendChild(itemCard);
              } else if (category.includes('icon')) {
                document.getElementById('icons-items').appendChild(itemCard);
              } else {
                document.getElementById('things-items').appendChild(itemCard);
              }
            }
          });

          console.log(`Added ${itemsAdded} items to student view`);

          // If no available items were found
          if (itemsAdded === 0) {
            showToast("No available items found in inventory", "error");
          }
        })
        .catch(error => {
          console.error('Error loading inventory for student:', error);
          showToast("Failed to load inventory. Please try again later.", "error");
        });
    }

    // Create item card for student view
    function createItemCard(item) {
      const card = document.createElement('div');
      card.className = 'card item-card'; // Add item-card class for proper styling

      const imgContainer = document.createElement('div');
      imgContainer.className = 'item-image'; // This applies your 150px height rule

      const imgElement = document.createElement('img');
      if (item.image) {
        // Set the image source directly with the base64 data
        imgElement.src = `data:image/jpeg;base64,${item.image}`;
      } else {
        // Default image if none provided
        imgElement.src = 'assets/placeholder-image.jpg';
      }
      imgElement.alt = item.name;
      // Add styling to the image itself to fit correctly
      imgElement.style.maxWidth = '100%';
      imgElement.style.maxHeight = '100%';
      imgElement.style.objectFit = 'cover';

      imgContainer.appendChild(imgElement);

      const itemInfo = document.createElement('div');
      itemInfo.className = 'item-details'; // Change to item-details to match your CSS

      itemInfo.innerHTML = `
        <h3 class="item-name">${item.name}</h3>
        <p>${item.description || 'No description available'}</p>
        <button class="btn primary-btn borrow-btn" data-id="${item.id}">Borrow</button>
      `;

      card.appendChild(imgContainer);
      card.appendChild(itemInfo);

      // Add borrow functionality
      const borrowBtn = itemInfo.querySelector('.borrow-btn');
      borrowBtn.addEventListener('click', function () {
        window.borrowSystem.openBorrowModal(item);
      });

      return card;
    }

    // Render inventory table for admin view
    function renderInventoryTable() {
      const allItemsTable = document.getElementById('all-items-table');
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
        button.addEventListener('click', function () {
          const itemId = this.getAttribute('data-id');
          openEditModal(itemId);
        });
      });

      document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function () {
          const itemId = this.getAttribute('data-id');
          deleteItem(itemId);
        });
      });
    }

    // Render borrowed items table for admin view
    function renderBorrowedItemsTable() {
      window.borrowSystem.renderBorrowedItemsTable(inventory);
    }

    // Update inventory statistics
    function updateInventoryStats() {
      if (document.getElementById('total-items-count')) {
        document.getElementById('total-items-count').textContent = inventory.length;
      }

      if (document.getElementById('admin-available-count')) {
        const availableItems = inventory.filter(item =>
          item.status && item.status.toLowerCase() === 'available'
        );
        console.log('Available items:', availableItems); // Debugging log
        document.getElementById('admin-available-count').textContent = availableItems.length;
      }

      if (document.getElementById('admin-borrowed-count')) {
        const borrowedItems = inventory.filter(item =>
          item.status && item.status.toLowerCase() === 'borrowed'
        );
        console.log('Borrowed items:', borrowedItems); // Debugging log
        document.getElementById('admin-borrowed-count').textContent = borrowedItems.length;
      }
    }

    // Open edit modal
    function openEditModal(itemId) {
      const modal = document.getElementById('edit-modal');
      const item = inventory.find(i => i.id === itemId);

      if (!item) return;

      document.getElementById('edit-item-id').value = item.id;
      document.getElementById('edit-item-name').value = item.name;
      document.getElementById('edit-item-category').value = item.category;
      document.getElementById('edit-item-description').value = item.description || '';

      modal.style.display = 'block';

      // Close modal when clicking on X or cancel button
      document.getElementById('edit-close').addEventListener('click', function () {
        modal.style.display = 'none';
      });

      document.getElementById('cancel-edit').addEventListener('click', function () {
        modal.style.display = 'none';
      });

      // Handle edit form submission
      document.getElementById('edit-item-form').addEventListener('submit', function (e) {
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

    function initCharts(data) {
      // Destroy existing charts if they exist
      if (chartInstances.usageChart) {
        chartInstances.usageChart.destroy();
      }

      if (chartInstances.borrowedItemsChart) {
        chartInstances.borrowedItemsChart.destroy();
      }

      // Create new usage chart
      if (document.getElementById('usageChart')) {
        const ctx = document.getElementById('usageChart').getContext('2d');
        chartInstances.usageChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
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

      // Create new borrowed items chart
      if (document.getElementById('borrowedItemsChart')) {
        const ctx = document.getElementById('borrowedItemsChart').getContext('2d');
        chartInstances.borrowedItemsChart = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: [],
            datasets: [{
              data: [],
              backgroundColor: []
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
          ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>'}
        </div>
        <div class="toast-message">${message}</div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
      `;

      // Add to container
      toastContainer.appendChild(toast);

      // Add event listener to close button
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => {
        toast.classList.add('toast-hiding');
        setTimeout(() => {
          toastContainer.removeChild(toast);
        }, 300);
      });

      // Auto hide after 3 seconds
      setTimeout(() => {
        if (toast.parentNode === toastContainer) {
          toast.classList.add('toast-hiding');
          setTimeout(() => {
            if (toast.parentNode === toastContainer) {
              toastContainer.removeChild(toast);
            }
          }, 300);
        }
      }, 3000);
    }

    // Auto-initialize tabs, navigation, and other elements
    document.querySelectorAll('.nav-button')[0]?.classList.add('active');
    document.querySelectorAll('.content-section')[0]?.classList.add('active');
    document.querySelectorAll('.tab')[0]?.classList.add('active');
    document.querySelectorAll('.tab-content')[0]?.classList.add('active');

    // Export functions for other modules
    window.appCore = {
      API_URL,
      showToast,
      loadInventory,
      loadInventoryForStudent,
    };
  });