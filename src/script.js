// Fetch inventory items
fetch('/api/inventory')
    .then(response => response.json())
    .then(data => {
        // Handle the inventory items data
        console.log(data);
        dataStore.inventoryItems = data;
        UI.loadStudentDashboard();
        UI.loadAdminDashboard();
    })
    .catch(error => console.error('Error fetching inventory:', error));

// Add a new item to the inventory
function addItem(name, category, description, imageFile) {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('description', description);
    if (imageFile) {
        formData.append('image', imageFile);
    }

    fetch('/api/inventory', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                dataStore.inventoryItems.push(data.item);
                dataStore.saveData();
                UI.loadAdminDashboard();
                UI.showToast('Item added successfully!', 'success');
            } else {
                console.error('Error adding item:', data.message);
                UI.showToast('Error adding item', 'error');
            }
        })
        .catch(error => console.error('Error adding item:', error));
}

// Borrow an item
function borrowItem(itemId, studentId, borrowTime, returnTime) {
    fetch('/api/borrow', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            itemId: itemId,
            studentId: studentId,
            borrowTime: borrowTime,
            returnTime: returnTime
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const item = dataStore.inventoryItems.find(item => item.id === itemId);
                if (item) {
                    item.status = 'borrowed';
                    dataStore.borrowedItems.push({
                        itemId: itemId,
                        studentId: studentId,
                        borrowDate: borrowTime,
                        dueDate: returnTime
                    });
                    dataStore.saveData();
                    UI.loadStudentDashboard();
                    UI.showToast('Item borrowed successfully!', 'success');
                }
            } else {
                console.error('Error borrowing item:', data.message);
                UI.showToast('Error borrowing item', 'error');
            }
        })
        .catch(error => console.error('Error borrowing item:', error));
}

const dataStore = {
    inventoryItems: [],
    borrowedItems: [],
    students: [],
    
    init() {
        // Load data from localStorage
        this.loadData();
        
        // If no items in storage, initialize with sample data
        if (this.inventoryItems.length === 0) {
            this.initializeSampleData();
        }
        
        // Fetch initial data from backend
        this.fetchInventoryItems();
    },
    
    loadData() {
        const savedItems = localStorage.getItem('inventoryItems');
        const savedBorrowed = localStorage.getItem('borrowedItems');
        const savedStudents = localStorage.getItem('students');
        
        if (savedItems) this.inventoryItems = JSON.parse(savedItems);
        if (savedBorrowed) this.borrowedItems = JSON.parse(savedBorrowed);
        if (savedStudents) this.students = JSON.parse(savedStudents);
    },
    
    saveData() {
        localStorage.setItem('inventoryItems', JSON.stringify(this.inventoryItems));
        localStorage.setItem('borrowedItems', JSON.stringify(this.borrowedItems));
        localStorage.setItem('students', JSON.stringify(this.students));
    },
    
    initializeSampleData() {
        // Sample inventory items and other initialization code
        // ...
    },
    
    fetchInventoryItems() {
        fetch('/api/inventory')
            .then(response => response.json())
            .then(data => {
                this.inventoryItems = data;
                this.saveData();
                UI.loadStudentDashboard();
                UI.loadAdminDashboard();
            })
            .catch(error => console.error('Error fetching inventory:', error));
    },

    addItem(name, category, description, imageFile) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('category', category);
        formData.append('description', description);
        formData.append('image', imageFile);

        fetch('/api/inventory', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                this.inventoryItems.push(data.item);
                this.saveData();
                UI.loadAdminDashboard();
                UI.showToast('Item added successfully!', 'success');
            })
            .catch(error => console.error('Error adding item:', error));
    },

    borrowItem(itemId, studentId, borrowTime, returnTime) {
        fetch('/api/borrow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                itemId: itemId,
                studentId: studentId,
                borrowTime: borrowTime,
                returnTime: returnTime
            })
        })
            .then(response => response.json())
            .then(data => {
                const item = this.inventoryItems.find(item => item.id === itemId);
                if (item) {
                    item.status = 'borrowed';
                    this.borrowedItems.push({
                        itemId: itemId,
                        studentId: studentId,
                        borrowDate: borrowTime,
                        dueDate: returnTime
                    });
                    this.saveData();
                    UI.loadStudentDashboard();
                    UI.showToast('Item borrowed successfully!', 'success');
                }
            })
            .catch(error => console.error('Error borrowing item:', error));
    },

    getAvailableItems() {
        return this.inventoryItems.filter(item => item.status === 'available');
    },
    
    getItemsByCategory(category) {
        return this.inventoryItems.filter(item => item.category === category);
    },
    
    findItem(id) {
        return this.inventoryItems.find(item => item.id === id);
    },
    
    returnItem(id) {
        const itemIndex = this.inventoryItems.findIndex(item => item.id === id);
        if (itemIndex !== -1) {
            this.inventoryItems[itemIndex].status = 'available';
            this.saveData();
            return true;
        }
        return false;
    }
};

// UI Controller - Handles user interface interactions
const UI = {
    elements: {},
    currentUser: null,
    
    // Enhanced initialization function
    init() {
        console.log("UI initialization started"); // Debug log
        
        // Get all DOM elements
        this.getElements();
        
        // Setup necessary event listeners
        this.setupEventListeners();
        
        // Make sure we start at the login screen with no interfaces visible
        this.showLoginScreen();
        
        console.log("UI initialization completed"); // Debug log
    },
    
    // Reset and show only the login screen
    showLoginScreen() {
        // Hide all interfaces
        if (this.elements.studentInterface) {
            this.elements.studentInterface.classList.add('hidden');
        }
        if (this.elements.adminInterface) {
            this.elements.adminInterface.classList.add('hidden');
        }
        
        // Show login screen
        if (this.elements.loginScreen) {
            this.elements.loginScreen.classList.remove('hidden');
        }
        
        // Reset user type dropdown to default
        if (this.elements.userType) {
            this.elements.userType.selectedIndex = 0;
        }
        
        // Reset password field
        if (this.elements.adminPassword) {
            this.elements.adminPassword.value = '';
        }
        
        // Hide password container and error message
        if (this.elements.adminPasswordContainer) {
            this.elements.adminPasswordContainer.style.display = 'none';
        }
        if (this.elements.passwordError) {
            this.elements.passwordError.style.display = 'none';
        }
        
        // Reset current user
        this.currentUser = null;
    },
    
    // Get all necessary DOM elements
    getElements() {
        console.log("Getting DOM elements"); // Debug log
        
        // Screens
        this.elements.loginScreen = document.getElementById('login-screen');
        this.elements.studentInterface = document.getElementById('student-interface');
        this.elements.adminInterface = document.getElementById('admin-interface');
        
        // Login elements
        this.elements.userType = document.getElementById('user-type');
        this.elements.loginBtn = document.getElementById('login-btn');
        
        // Add new password elements
        this.elements.adminPasswordContainer = document.getElementById('admin-password-container');
        this.elements.adminPassword = document.getElementById('admin-password');
        this.elements.passwordError = document.getElementById('password-error');
        
        // Student interface elements
        this.elements.availableItemsCount = document.getElementById('available-items-count');
        this.elements.borrowedItemsCount = document.getElementById('borrowed-items-count');
        this.elements.misItems = document.getElementById('mis-items');
        this.elements.iconsItems = document.getElementById('icons-items');
        this.elements.thingsItems = document.getElementById('things-items');
        this.elements.borrowedItemsList = document.getElementById('borrowed-items-list');
        this.elements.studentLogout = document.getElementById('student-logout');
        
        // Admin 
        this.elements.adminLogout = document.getElementById('admin-logout');
        this.elements.totalItemsCount = document.getElementById('total-items-count');
        this.elements.adminAvailableCount = document.getElementById('admin-available-count');
        this.elements.adminBorrowedCount = document.getElementById('admin-borrowed-count');
        this.elements.studentsCount = document.getElementById('students-count');
        
        // Modal 
        this.elements.borrowModal = document.getElementById('borrow-modal');
        this.elements.modalItemName = document.getElementById('modal-item-name');
        this.elements.itemId = document.getElementById('item-id');
        
        // Toast 
        this.elements.toast = document.getElementById('toast');
        this.elements.toastMessage = document.getElementById('toast-message');
        
        // for debugging
        this.elements.manageItemsSection = document.getElementById('manage-items-section');
        console.log("Manage Items Section found:", this.elements.manageItemsSection); // Debug log
        
        // for debugging
        this.elements.addItemForm = document.getElementById('add-item-form');
        console.log("Add Item Form found:", this.elements.addItemForm); // Debug log
    },
    
    // Setup event listeners
    setupEventListeners() {
        console.log("Setting up event listeners"); // Debug log
        
        // Add event listener for user type change
        if (this.elements.userType) {
            this.elements.userType.addEventListener('change', () => {
                const userType = this.elements.userType.value;
                // Show password field only for admin
                if (userType === 'admin') {
                    this.elements.adminPasswordContainer.style.display = 'block';
                } else {
                    this.elements.adminPasswordContainer.style.display = 'none';
                    // Clear any previous error messages
                    this.elements.passwordError.style.display = 'none';
                }
            });
        }
        
        const modalCloseButton = document.getElementById('close-borrow-modal');
        if (modalCloseButton) {
            modalCloseButton.addEventListener('click', () => {
                this.hideBorrowModal();
            });
        }

        const borrowForm = document.getElementById('borrow-form');
        if (borrowForm) { 
            borrowForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Get form data
                const itemId = document.getElementById('item-id').value;
                const timeToUse = document.getElementById('time-to-use').value;
                
                // Calculate due date (current time + hours to use)
                const now = new Date();
                const dueDate = new Date(now.getTime() + (timeToUse * 60 * 60 * 1000));
                
                // Process borrowing
                const success = dataStore.borrowItem(itemId, this.currentUser.id, now.toISOString(), dueDate.toISOString());
                if (success) {
                    // Hide modal on success
                    this.hideBorrowModal();
                }
            });
        }

        // Image preview functionality
        const itemImageElement = document.getElementById('item-image');
        if (itemImageElement) {
            itemImageElement.addEventListener('change', function(event) {
                console.log("Item image input changed"); // Debug log
                const file = event.target.files[0];
                const previewImg = document.getElementById('preview-img');
                const noImageText = document.getElementById('no-image-text');
                
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        previewImg.src = e.target.result;
                        previewImg.style.display = 'block';
                        noImageText.style.display = 'none';
                    }
                    reader.readAsDataURL(file);
                } else {
                    previewImg.style.display = 'none';
                    noImageText.style.display = 'block';
                }
            });
        } else {
            console.log("WARNING: item-image element not found"); // Debug log
        }
        
        // Update login button handler
        if (this.elements.loginBtn) {
            this.elements.loginBtn.addEventListener('click', () => {
                const userType = this.elements.userType.value;
                
                // If admin is selected, verify password
                if (userType === 'admin') {
                    const password = this.elements.adminPassword.value;
                    const correctPassword = 'admin123'; 
                    
                    if (password === correctPassword) {
                        // Hide error message if previously shown
                        this.elements.passwordError.style.display = 'none';
                        // Proceed with login
                        this.login(userType);
                    } else {
                        // Show error message
                        this.elements.passwordError.style.display = 'block';
                        // Don't proceed with login
                        return;
                    }
                } else {
                    // For student login, no password required
                    this.login(userType);
                }
            });
        }
        
        // Student logout button handler
        if (this.elements.studentLogout) {
            this.elements.studentLogout.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Admin logout button handler
        if (this.elements.adminLogout) {
            this.elements.adminLogout.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
        
        // Setup additional event listeners needed for your application
        // ...
        
        // Setup student navigation
        this.setupStudentNavigation();
        
        // Setup admin navigation if admin interface exists
        if (this.elements.adminInterface) {
            this.setupAdminNavigation();
        }
        
        // Setup tab navigation
        this.setupTabNavigation();
        
        // Add form submission handler for add-item-form
        const addItemForm = document.getElementById('add-item-form');
        if (addItemForm) {
            console.log("Setting up add-item-form submit handler"); // Debug log
            addItemForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log("Add item form submitted"); // Debug log
                
                // Get form values
                const name = document.getElementById('item-name').value;
                const category = document.getElementById('item-category').value;
                const description = document.getElementById('item-description').value;
                const imageFile = document.getElementById('item-image').files[0];
                
                // Add item logic
                dataStore.addItem(name, category, description, imageFile);
            });
        } else {
            console.log("WARNING: add-item-form not found"); // Debug log
        }
    },

    setupStudentNavigation() {
        console.log("Setting up student navigation"); // Debug log
        const navButtons = document.querySelectorAll('#student-interface .nav-button:not(.logout-btn)');
        console.log("Found student nav buttons:", navButtons.length);
        
        navButtons.forEach(button => {
            const sectionName = button.getAttribute('data-section');
            console.log("Nav button for section:", sectionName); // Debug log
            
            button.addEventListener('click', () => {
                console.log("Student nav button clicked:", sectionName); // Debug log
                
                // Remove active class from all buttons
                navButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Show the corresponding section
                const sections = document.querySelectorAll('#student-interface .content-section');
                sections.forEach(section => {
                    section.classList.remove('active');
                });
                
                const targetSection = document.getElementById(sectionName + '-section');
                if (targetSection) {
                    targetSection.classList.add('active');
                    
                    // Load items for the section if it's one of the equipment sections
                    if (sectionName === 'mis-equipment') {
                        this.updateCategoryItems('MIS', this.elements.misItems);
                    } else if (sectionName === 'icons-equipment') {
                        this.updateCategoryItems('ICON', this.elements.iconsItems);
                    } else if (sectionName === 'other-equipment') {
                        this.updateCategoryItems('THING', this.elements.thingsItems);
                    }
                }
            });
        });
    },
    
    // Setup admin navigation
    setupAdminNavigation() {
        console.log("Setting up admin navigation"); // Debug log
        const navButtons = document.querySelectorAll('#admin-interface .nav-button');
        console.log("Found admin nav buttons:", navButtons.length); // Debug log
        
        navButtons.forEach(button => {
            const sectionName = button.getAttribute('data-section');
            console.log("Nav button for section:", sectionName); // Debug log
            
            button.addEventListener('click', () => {
                console.log("Nav button clicked:", sectionName); // Debug log
                
                // Remove active class from all buttons
                navButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Show the corresponding section
                const sections = document.querySelectorAll('#admin-interface .content-section');
                sections.forEach(section => {
                    section.classList.remove('active');
                    console.log("Removed active from section:", section.id); // Debug log
                });
                
                const targetSection = document.getElementById(sectionName + '-section');
                if (targetSection) {
                    targetSection.classList.add('active');
                    console.log("Added active to section:", targetSection.id); // Debug log
                    
                    // Debug - check if this is the manage items section
                    if (sectionName === 'manage-items') {
                        console.log("Manage items section activated");
                        console.log("Add item form in this section:", !!targetSection.querySelector('#add-item-form'));
                    }
                } else {
                    console.log("WARNING: Target section not found:", sectionName + '-section'); // Debug log
                }
            });
        });
        
        // Debug: Add special handler for Manage button
        const manageButton = document.querySelector('[data-section="manage-items"]');
        if (manageButton) {
            console.log("Found manage-items button"); // Debug log
        } else {
            console.log("WARNING: manage-items button not found"); // Debug log
        }
    },
    
    // Setup tab navigation
    setupTabNavigation() {
        console.log("Setting up tab navigation"); // Debug log
        // For manage items tabs
        const tabButtons = document.querySelectorAll('.dashboard-card .tab');
        console.log("Found tab buttons:", tabButtons.length); // Debug log
        
        tabButtons.forEach(button => {
            const targetTabId = button.getAttribute('data-tab-content');
            console.log("Tab button for content:", targetTabId); // Debug log
            
            button.addEventListener('click', () => {
                console.log("Tab button clicked:", targetTabId); // Debug log
                
                const tabContainer = button.closest('.dashboard-card');
                const allTabs = tabContainer.querySelectorAll('.tab');
                const allTabContents = tabContainer.querySelectorAll('.tab-content');
                
                // Remove active class from all tabs in this container
                allTabs.forEach(tab => tab.classList.remove('active'));
                allTabContents.forEach(content => {
                    content.classList.remove('active');
                    console.log("Removed active from tab content:", content.id); // Debug log
                });
                
                // Add active class to clicked tab and its content
                button.classList.add('active');
                const targetContent = tabContainer.querySelector(`#${targetTabId}`);
                if (targetContent) {
                    targetContent.classList.add('active');
                    console.log("Added active to tab content:", targetContent.id); // Debug log
                } else {
                    console.log("WARNING: Target tab content not found:", targetTabId); // Debug log
                }
            });
        });
    },
    
    // Load student dashboard data
    loadStudentDashboard() {
        console.log("Loading student dashboard...");
        
        // Available items count
        const availableItems = dataStore.getAvailableItems();
        if (this.elements.availableItemsCount) {
            this.elements.availableItemsCount.textContent = availableItems.length;
        }
        
        // Update category-specific item lists
        this.updateCategoryItems('MIS', this.elements.misItems);
        this.updateCategoryItems('ICON', this.elements.iconsItems);
        this.updateCategoryItems('THING', this.elements.thingsItems);
        
        if (this.elements.borrowedItemsCount) {
            this.elements.borrowedItemsCount.textContent = dataStore.borrowedItems.length;
        }
        
        if (this.elements.borrowedItemsList) {
            this.renderBorrowedItems();
        }
    },
    
    updateCategoryItems(category, container) {
        if (!container) return;
        
        // Clear existing items
        container.innerHTML = '';
        
        // Get items for this category
        const items = dataStore.getItemsByCategory(category).filter(item => item.status === 'available');
        
        // Create and append item cards
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            
            // Create card content
            card.innerHTML = `
                <div class="item-image">
                    <img src="${item.imageUrl || 'assets/images/no-image.png'}" alt="${item.name}">
                </div>
                <div class="item-details">
                    <h3>${item.name}</h3>
                    <p>${item.description}</p>
                    <button class="borrow-btn" data-id="${item.id}">Borrow</button>
                </div>
            `;
            
            // Add event listener to borrow button
            const borrowBtn = card.querySelector('.borrow-btn');
            borrowBtn.addEventListener('click', () => {
                this.showBorrowModal(item);
            });
            
            container.appendChild(card);
        });
    },
    
    // Render borrowed items list
    renderBorrowedItems() {
        if (!this.elements.borrowedItemsList) return;
        
        // Clear existing list
        this.elements.borrowedItemsList.innerHTML = '';
        
        // Get borrowed items for current user
        const borrowedItems = dataStore.borrowedItems.filter(item => 
            item.studentId === this.currentUser.id);
        
        if (borrowedItems.length === 0) {
            this.elements.borrowedItemsList.innerHTML = '<p class="empty-message">No items borrowed yet.</p>';
            return;
        }
        
        // Create and append borrowed item entries
        borrowedItems.forEach(borrowedItem => {
            const item = dataStore.findItem(borrowedItem.itemId);
            if (!item) return;
            
            const listItem = document.createElement('div');
            listItem.className = 'borrowed-item';
            
            listItem.innerHTML = `
                <div class="item-image">
                    <img src="${item.imageUrl || 'assets/images/no-image.png'}" alt="${item.name}">
                </div>
                <div class="item-details">
                    <h3>${item.name}</h3>
                    <p>Borrowed on: ${new Date(borrowedItem.borrowDate).toLocaleDateString()}</p>
                    <p>Due on: ${new Date(borrowedItem.dueDate).toLocaleDateString()}</p>
                    <button class="return-btn" data-id="${item.id}">Return</button>
                </div>
            `;
            
            // Add event listener to return button
            const returnBtn = listItem.querySelector('.return-btn');
            returnBtn.addEventListener('click', () => {
                this.returnItem(item.id);
            });
            
            this.elements.borrowedItemsList.appendChild(listItem);
        });
    },
    
    // Show borrow modal for an item
    showBorrowModal(item) {
        if (!this.elements.borrowModal || !this.elements.modalItemName || !this.elements.itemId) {
            console.log("Borrow modal elements not found"); // Debug log
            return;
        }
        
        // Set modal data
        this.elements.modalItemName.textContent = item.name;
        this.elements.itemId.value = item.id;
        
        // Show modal
        this.elements.borrowModal.classList.remove('hidden');
        console.log("Borrow modal shown for item:", item.name); // Debug log
    },
    
    // Hide borrow modal
    hideBorrowModal() {
        if (!this.elements.borrowModal) return;
        this.elements.borrowModal.classList.add('hidden');
    },
    
    // Process item borrowing
    borrowItem(itemId, dueDate) {
        // Find the item
        const item = dataStore.findItem(itemId);
        if (!item || item.status !== 'available') {
            this.showToast("Item is not available for borrowing", "error");
            return false;
        }
        
        // Update item status
        item.status = 'borrowed';
        
        // Add to borrowed items
        const borrowedItem = {
            itemId: itemId,
            studentId: this.currentUser.id,
            borrowDate: new Date().toISOString(),
            dueDate: dueDate
        };
        
        dataStore.borrowedItems.push(borrowedItem);
        dataStore.saveData();
        
        // Update UI
        this.loadStudentDashboard();
        this.showToast("Item borrowed successfully!", "success");
        
        return true;
    },
    
    // Process item return
    returnItem(itemId) {
        // Update item status
        const success = dataStore.returnItem(itemId);
        
        if (success) {
            // Remove from borrowed items
            const index = dataStore.borrowedItems.findIndex(item => 
                item.itemId === itemId && item.studentId === this.currentUser.id);
                
            if (index !== -1) {
                dataStore.borrowedItems.splice(index, 1);
                dataStore.saveData();
            }
            
            // Update UI
            this.loadStudentDashboard();
            this.showToast("Item returned successfully!", "success");
        } else {
            this.showToast("Failed to return item", "error");
        }
    },
    
    // Load admin dashboard data
    loadAdminDashboard() {
        console.log("Loading admin dashboard..."); // Debug log
        
        // Update summary counts
        if (this.elements.totalItemsCount) {
            this.elements.totalItemsCount.textContent = dataStore.inventoryItems.length;
        }
        
        const availableItems = dataStore.getAvailableItems();
        if (this.elements.adminAvailableCount) {
            this.elements.adminAvailableCount.textContent = availableItems.length;
        }
        
        if (this.elements.adminBorrowedCount) {
            this.elements.adminBorrowedCount.textContent = 
                dataStore.inventoryItems.length - availableItems.length;
        }
        
        if (this.elements.studentsCount) {
            this.elements.studentsCount.textContent = dataStore.students.length;
        }
        
        // Load inventory items table
        this.loadInventoryTable();
        
        // Load borrowed items table
        this.loadBorrowedItemsTable();
        
        // Load students table
        this.loadStudentsTable();
    },
    
    // Load inventory items table
    loadInventoryTable() {
        const inventoryTable = document.getElementById('inventory-table-body');
        if (!inventoryTable) {
            console.log("WARNING: inventory-table-body not found"); // Debug log
            return;
        }
        
        // Clear existing rows
        inventoryTable.innerHTML = '';
        
        // Create and append inventory rows
        dataStore.inventoryItems.forEach((item, index) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.status}</td>
                <td>
                    <button class="edit-btn" data-id="${item.id}">Edit</button>
                    <button class="delete-btn" data-id="${item.id}">Delete</button>
                </td>
            `;
            
            // Add event listeners to buttons
            const editBtn = row.querySelector('.edit-btn');
            editBtn.addEventListener('click', () => {
                this.showEditItemForm(item.id);
            });
            
            const deleteBtn = row.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                this.deleteItem(item.id);
            });
            
            inventoryTable.appendChild(row);
        });
    },
    
    // Load borrowed items table
    loadBorrowedItemsTable() {
        const borrowedTable = document.getElementById('borrowed-table-body');
        if (!borrowedTable) {
            console.log("WARNING: borrowed-table-body not found"); // Debug log
            return;
        }
        
        // Clear existing rows
        borrowedTable.innerHTML = '';
        
        // Create and append borrowed items rows
        dataStore.borrowedItems.forEach((borrowedItem, index) => {
            const item = dataStore.findItem(borrowedItem.itemId);
            if (!item) return;
            
            // Find student name
            const student = dataStore.students.find(s => s.id === borrowedItem.studentId);
            const studentName = student ? student.name : 'Unknown';
            
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${studentName}</td>
                <td>${new Date(borrowedItem.borrowDate).toLocaleDateString()}</td>
                <td>${new Date(borrowedItem.dueDate).toLocaleDateString()}</td>
                <td>
                    <button class="return-admin-btn" data-id="${item.id}">Return</button>
                </td>
            `;
            
            // Add event listener to return button
            const returnBtn = row.querySelector('.return-admin-btn');
            returnBtn.addEventListener('click', () => {
                this.adminReturnItem(item.id, borrowedItem.studentId);
            });
            
            borrowedTable.appendChild(row);
        });
    },
    
    // Load students table
    loadStudentsTable() {
        const studentsTable = document.getElementById('students-table-body');
        if (!studentsTable) {
            console.log("WARNING: students-table-body not found"); // Debug log
            return;
        }
        
        // Clear existing rows
        studentsTable.innerHTML = '';
        
        // Create and append student rows
        dataStore.students.forEach((student, index) => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>
                    <button class="edit-student-btn" data-id="${student.id}">Edit</button>
                    <button class="delete-student-btn" data-id="${student.id}">Delete</button>
                </td>
            `;
            
            // Add event listeners to buttons
            const editBtn = row.querySelector('.edit-student-btn');
            editBtn.addEventListener('click', () => {
                this.showEditStudentForm(student.id);
            });
            
            const deleteBtn = row.querySelector('.delete-student-btn');
            deleteBtn.addEventListener('click', () => {
                this.deleteStudent(student.id);
            });
            
            studentsTable.appendChild(row);
        });
    },
    
    // Show toast notification
    showToast(message, type = 'info') {
        if (!this.elements.toast || !this.elements.toastMessage) return;
        
        // Set message and type
        this.elements.toastMessage.textContent = message;
        this.elements.toast.className = `toast ${type}`;
        
        // Show toast
        this.elements.toast.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            this.elements.toast.classList.remove('show');
        }, 3000);
    },
    
    // Login function
    login(userType) {
        console.log(`Logging in as ${userType}`); // Debug log
        
        // Hide login screen
        this.elements.loginScreen.classList.add('hidden');
        
        if (userType === 'student') {
            // For simplicity, create a default student user if none exists
            if (dataStore.students.length === 0) {
                const defaultStudent = {
                    id: 'S001',
                    name: 'Default Student',
                    email: 'student@example.com'
                };
                dataStore.students.push(defaultStudent);
                dataStore.saveData();
            }
            
            // Set current user to first student
            this.currentUser = dataStore.students[0];
            
            // Show student interface
            this.elements.studentInterface.classList.remove('hidden');
            
            // Load student dashboard data
            this.loadStudentDashboard();
        } else if (userType === 'admin') {
            // Show admin interface
            this.elements.adminInterface.classList.remove('hidden');
            
            // Set admin as current user
            this.currentUser = { id: 'admin', name: 'Administrator' };
            
            // Load admin dashboard data
            this.loadAdminDashboard();
            
            // Set Dashboard section as active by default
            const dashboardButton = document.querySelector('[data-section="dashboard"]');
            if (dashboardButton) {
                dashboardButton.click();
            }
        }
    },
    
    // Logout function
    logout() {
        console.log("Logging out"); // Debug log
        this.showLoginScreen();
    }
};

// Initialize application
function initApp() {
    console.log("Initializing application"); // Debug log
    
    // Initialize data store
    dataStore.init();
    
    // Initialize UI
    UI.init();
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);