

document.addEventListener('DOMContentLoaded', function () {
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
  const studentDetailsContainer = document.getElementById('student-details-container');
  const studentIdInput = document.getElementById('student-id');
  const studentNameInput = document.getElementById('student-name');
  const studentEmailInput = document.getElementById('student-email');

  // Admin elements
  const addItemForm = document.getElementById('add-item-form');
  const itemImageInput = document.getElementById('item-image');
  const previewImg = document.getElementById('preview-img');
  const noImageText = document.getElementById('no-image-text');
  const allItemsTable = document.getElementById('all-items-table');

  // Borrow modal elements
  const borrowModal = document.getElementById('borrow-modal');
  const borrowForm = document.getElementById('borrow-form');
  const confirmBorrowButton = document.getElementById('confirm-borrow');
  const modalItemName = document.getElementById('modal-item-name');
  const itemIdField = document.getElementById('item-id');
  const studentNumberInput = document.getElementById('student-number');
  const yearSectionInput = document.getElementById('year-section');
  const courseInput = document.getElementById('course');
  const timeToUseInput = document.getElementById('time-to-use');

  // Toast notification
  const toast = document.getElementById('toast');
  const toastClose = document.querySelector('.toast-close');

  // Initialize state
  let inventory = [];

  if (userTypeSelect && userTypeSelect.parentElement) {
    userTypeSelect.parentElement.style.display = 'block'; // Make it visible
  }

  // Initially hide admin password field and show student details
  adminPasswordContainer.style.display = 'none';
  passwordError.style.display = 'none';
  studentDetailsContainer.style.display = 'block';

  // Show/hide admin password field and student details based on user type selection
  userTypeSelect.addEventListener('change', function () {
    if (this.value === 'admin') {
      adminPasswordContainer.style.display = 'block';
      studentDetailsContainer.style.display = 'none';
    } else {
      adminPasswordContainer.style.display = 'none';
      passwordError.style.display = 'none';
      studentDetailsContainer.style.display = 'block';
    }
    validateLoginForm();
  });

  // Enhanced: Enable/disable login button based on input fields with more detailed validation
  function validateLoginForm() {
    const userType = userTypeSelect.value;
    if (userType === 'admin') {
      const isPasswordValid = adminPassword.value.trim() !== '';
      loginBtn.disabled = !isPasswordValid;

      // Show inline validation message
      if (!isPasswordValid && adminPassword.value !== '') {
        passwordError.textContent = 'Password is required';
        passwordError.style.display = 'block';
      } else {
        passwordError.style.display = 'none';
      }
    } else {
      const isStudentIdValid = studentIdInput.value.trim() !== '';
      const isNameValid = studentNameInput.value.trim() !== '';
      const isEmailValid = studentEmailInput.value.trim() !== '';

      loginBtn.disabled = !isStudentIdValid || !isNameValid || !isEmailValid;

      // Add validation messages to each field if needed
      if (studentIdInput.classList.contains('touched') && !isStudentIdValid) {
        studentIdInput.classList.add('invalid');
      } else {
        studentIdInput.classList.remove('invalid');
      }

      if (studentNameInput.classList.contains('touched') && !isNameValid) {
        studentNameInput.classList.add('invalid');
      } else {
        studentNameInput.classList.remove('invalid');
      }

      if (studentEmailInput.classList.contains('touched') && !isEmailValid) {
        studentEmailInput.classList.add('invalid');
      } else {
        studentEmailInput.classList.remove('invalid');
      }
    }
  }

  // Mark fields as touched when they lose focus
  adminPassword.addEventListener('blur', function () {
    this.classList.add('touched');
    validateLoginForm();
  });

  studentIdInput.addEventListener('blur', function () {
    this.classList.add('touched');
    validateLoginForm();
  });

  studentNameInput.addEventListener('blur', function () {
    this.classList.add('touched');
    validateLoginForm();
  });

  studentEmailInput.addEventListener('blur', function () {
    this.classList.add('touched');
    validateLoginForm();
  });

  // Add event listeners to input fields to validate form
  adminPassword.addEventListener('input', validateLoginForm);
  studentIdInput.addEventListener('input', validateLoginForm);
  studentNameInput.addEventListener('input', validateLoginForm);
  studentEmailInput.addEventListener('input', validateLoginForm);

  // Enhanced: Login functionality with better error handling
  loginBtn.addEventListener('click', function () {
    const userType = userTypeSelect.value;

    if (userType === 'admin') {
      // Admin login logic with validation
      if (!adminPassword.value.trim()) {
        passwordError.style.display = 'block';
        passwordError.textContent = 'Password is required';
        showToast('Please enter admin password', 'error');
        return;
      }

      if (adminPassword.value === 'admin123') { // Example password
        loginScreen.classList.add('hidden');
        adminInterface.classList.remove('hidden');
        loadInventory(); // Load inventory data for admin
        showToast('Admin login successful!');
      } else {
        passwordError.style.display = 'block';
        passwordError.textContent = 'Invalid password';
        showToast('Invalid admin password!', 'error');
      }
    } else {
      // Student login logic with enhanced validation
      const studentId = studentIdInput.value.trim();
      const studentName = studentNameInput.value.trim();
      const studentEmail = studentEmailInput.value.trim();
      let hasError = false;
      let errorMessage = 'Please enter ';
      let errorFields = [];

      // Validate each field and collect error messages
      if (!studentId) {
        studentIdInput.classList.add('invalid');
        errorFields.push('Student ID');
        hasError = true;
      }

      if (!studentName) {
        studentNameInput.classList.add('invalid');
        errorFields.push('Name');
        hasError = true;
      }

      if (!studentEmail) {
        studentEmailInput.classList.add('invalid');
        errorFields.push('Email');
        hasError = true;
      } else if (!validateEmail(studentEmail)) {
        studentEmailInput.classList.add('invalid');
        showToast('Please enter a valid email address', 'error');
        return;
      }

      // Build error message if there are missing fields
      if (hasError) {
        errorMessage += errorFields.join(', ');
        showToast(errorMessage, 'error');
        return;
      }

      // Save student data to database
      saveStudentData({
        studentId: studentId,
        name: studentName,
        email: studentEmail,
        loginTime: new Date().toISOString()
      });
    }
  });

  // Remove the duplicate function and fix the original saveStudentData function
  function saveStudentData(studentData) {
    console.log('Saving student data:', studentData);

    // Prepare login data
    const loginData = {
      studentid: studentData.studentId,
      name: studentData.name,
      email: studentData.email
    };

    // Send login request to API
    fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    })
      .then(response => {
        console.log("API Response status:", response.status);

        // Check if the response is OK
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || `Server returned ${response.status}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log("Login response:", data);

        if (data.success) {
          // Save student info to local storage
          localStorage.setItem('studentInfo', JSON.stringify(data.student));

          // Hide login screen and show student interface
          loginScreen.classList.add('hidden');
          studentInterface.classList.remove('hidden');

          // Load inventory data for student view
          loadInventoryForStudent();

          showToast(`Welcome ${data.student.name}!`);
        } else {
          showToast(data.message || 'Login failed', 'error');
        }
      })
      .catch(error => {
        console.error('Login error:', error);

        // If the API is not available, show an appropriate message
        if (error.message && error.message.includes('Failed to fetch')) {
          showToast('Could not connect to the server. Please check your network connection.', 'error');
        } else {
          showToast(`Login failed: ${error.message || 'Please try again.'}`, 'error');
        }
      });
  }

  // Email validation helper function
  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }


  // Logout buttons
  document.getElementById('student-logout').addEventListener('click', function () {
    studentInterface.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  });

  document.getElementById('admin-logout').addEventListener('click', function () {
    adminInterface.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  });

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

  // Open borrow modal
  function openBorrowModal(item) {
    const modal = document.getElementById('borrow-modal');
    const modalItemName = document.getElementById('modal-item-name');
    const itemIdField = document.getElementById('item-id');
    const borrowForm = document.getElementById('borrow-form');

    // Reset the form
    borrowForm.reset();

    // Prevent the form from submitting normally
    borrowForm.onsubmit = function (e) {
      e.preventDefault();
      return false;
    };

    // Set up the modal with item information
    modalItemName.textContent = `Item: ${item.name} (ITEM-${item.id})`;
    itemIdField.value = item.id;
    modal.classList.add('active');

    // Set up event listeners
    const closeButton = document.querySelector('#borrow-modal .close');
    const cancelButton = document.getElementById('cancel-borrow');
    const confirmBorrowButton = document.querySelector('#borrow-form button[type="submit"]');

    // Remove any existing click handlers by cloning and replacing buttons
    const newCloseButton = closeButton.cloneNode(true);
    closeButton.parentNode.replaceChild(newCloseButton, closeButton);

    const newCancelButton = cancelButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

    const newConfirmButton = confirmBorrowButton.cloneNode(true);
    confirmBorrowButton.parentNode.replaceChild(newConfirmButton, confirmBorrowButton);

    // Define close modal function
    const closeModal = () => {
      modal.classList.remove('active');
    };

    // Add event listeners to the new buttons
    newCloseButton.addEventListener('click', closeModal);
    newCancelButton.addEventListener('click', closeModal);

    // Add event listener for the confirm borrow button with explicit preventDefault
    newConfirmButton.addEventListener('click', function (e) {
      // Prevent default form submission
      e.preventDefault();

      // Log the beginning of the process for debugging
      console.log('Submit button clicked');

      // Validate required fields
      const studentId = document.getElementById('student-number').value.trim();
      const yearSection = document.getElementById('year-section').value.trim();
      const course = document.getElementById('course').value.trim();
      const timeToUse = document.getElementById('time-to-use').value.trim();

      console.log('Form values:', { studentId, yearSection, course, timeToUse });

      if (!studentId || !yearSection || !course || !timeToUse) {
        showToast('Please fill in all required fields', 'error');
        return false;
      }

      // Calculate borrow date
      const hoursToUse = parseInt(timeToUse);
      const borrowDate = new Date();

      // Prepare the data for the API - ensure field names match backend expectations
      const borrowData = {
        itemId: item.id,
        studentId: studentId,
        yearSection: yearSection,
        course: course,
        hoursToUse: hoursToUse,
        borrowDate: borrowDate.toISOString()
      };

      // Determine the correct API endpoint
      
      const apiEndpoint = API_URL.endsWith('/api') ? `${API_URL}/borrow` : `${API_URL}/api/borrow`;

      console.log('Sending borrow request with data:', borrowData);
      console.log('API URL:', apiEndpoint);

      // Send the borrow request to the API
      fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'  // Explicitly request JSON response
        },
        body: JSON.stringify(borrowData)
      })
        .then(response => {
          console.log('Response status:', response.status);

          // Check content type before trying to parse as JSON
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return response.json().then(data => {
              if (!response.ok) {
                throw new Error(data.message || `Server returned ${response.status}`);
              }
              return data;
            });
          } else {
            // Handle HTML response by showing a more useful error
            return response.text().then(text => {
              console.error('Received non-JSON response:', text.substring(0, 150));
              throw new Error(`Server returned HTML instead of JSON. Check API endpoint path.`);
            });
          }
        })
        .then(data => {
          console.log('Response data:', data);
          if (data.success) {
            closeModal();

            // Display due date information if available
            let successMessage = 'Item borrowed successfully!';
            if (data.borrowDetails && data.borrowDetails.dueDate) {
              const dueDate = new Date(data.borrowDetails.dueDate);
              successMessage += ` Due date: ${dueDate.toLocaleString()}`;
            }

            showToast(successMessage);
            loadInventoryForStudent(); // Reload the inventory to reflect changes
          } else {
            showToast('Failed to borrow item: ' + (data.message || 'Unknown error'), 'error');
          }
        })
        .catch(error => {
          console.error('Error borrowing item:', error);
          showToast(`Error borrowing item: ${error.message || 'Network error'}`, 'error');
        });

      // Return false to prevent form submission
      return false;
    });
  }

  // Helper function to add hours to a date (kept for reference, not used in updated code)
  function addHours(date, hours) {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
  }

  // Also make sure the borrow form has the correct event handler
  document.addEventListener('DOMContentLoaded', function () {
    const borrowForm = document.getElementById('borrow-form');
    if (borrowForm) {
      borrowForm.addEventListener('submit', function (e) {
        e.preventDefault();
        return false;
      });
    }
  });

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

  let chartInstances = {};

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

  // Close function for toasts
  toastClose.addEventListener('click', function () {
    toast.classList.add('hidden');
  });

  // Auto-initialize tabs, navigation, and other elements
  document.querySelectorAll('.nav-button')[0]?.classList.add('active');
  document.querySelectorAll('.content-section')[0]?.classList.add('active');
  document.querySelectorAll('.tab')[0]?.classList.add('active');
  document.querySelectorAll('.tab-content')[0]?.classList.add('active');

  // Initialize on page load
  validateLoginForm();
});