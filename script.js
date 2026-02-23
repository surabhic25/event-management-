// ============================================
// EVENT MANAGER - SCRIPT.JS
// ============================================

// Global Variables
let currentSection = 'dashboard';
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();
let myTasksCalendarMonth = new Date().getMonth();
let myTasksCalendarYear = new Date().getFullYear();
let selectedDate = null;
let currentUserRole = localStorage.getItem('eventManager_role') || 'admin';
let selectedLoginRole = 'admin';

// Data Storage Keys
const STORAGE_KEYS = {
    events: 'eventManager_events',
    members: 'eventManager_members',
    tasks: 'eventManager_tasks',
    files: 'eventManager_files',
    assignedTasks: 'eventManager_assignedTasks',
    settings: 'eventManager_settings',
    students: 'eventManager_students'
};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadData();
    renderCalendar();
    renderMyTasksCalendar();
    renderEvents();
    renderMembers();
    renderFiles();
    renderStudents();
    setupDashboardTabs();
    setupBudgetTabs();
});

// Initialize App
function initializeApp() {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('eventManager_loggedIn');
    if (isLoggedIn) {
        showApp();
        applyRoleBasedAccess();
    }
    // Load settings
    loadSettings();
}

// Setup Event Listeners
function setupEventListeners() {
    // Auth Form Submissions
    document.getElementById('login-form').addEventListener('submit', handleAdminLogin);
    document.getElementById('student-login-form').addEventListener('submit', handleStudentLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // Sidebar Navigation
    document.querySelectorAll('.menu-item[data-section]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            navigateToSection(section);
        });
    });

    // Dropdown Toggle
    document.querySelectorAll('.menu-item.has-dropdown > a').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            this.parentElement.classList.toggle('expanded');
        });
    });

// Tab Buttons
    document.querySelectorAll('.tasks-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            switchTab(this, tab, 'list-tab', 'calendar-tab');
            if (tab === 'calendar-tab') {
                renderMyTasksCalendar();
            }
        });
    });

    // Tasks Assigned Tabs
    document.querySelectorAll('.tasks-assigned-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            switchTab(this, tab, 'upcoming-tab', 'overdue-tab', 'completed-tab');
        });
    });

// Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal') || e.target.classList.contains('calendar-event-modal')) {
            closeAllModals();
        }
    });
}

// Auth Functions
function switchAuth(type) {
    const loginBox = document.querySelector('.login-box');
    const registerBox = document.querySelector('.register-box');
    
    if (type === 'register') {
        loginBox.style.display = 'none';
        registerBox.style.display = 'block';
    } else {
        loginBox.style.display = 'block';
        registerBox.style.display = 'none';
    }
}

function showLoginPage() {
    document.getElementById('login-page').classList.add('active');
    document.getElementById('register-page').classList.remove('active');
}

function showRegisterPage() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('register-page').classList.add('active');
}

function selectRole(role) {
    selectedLoginRole = role;
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.role-btn[data-role="${role}"]`).classList.add('active');
    
    if (role === 'admin') {
        document.querySelector('.admin-form').style.display = 'block';
        document.querySelector('.student-form').style.display = 'none';
    } else {
        document.querySelector('.admin-form').style.display = 'none';
        document.querySelector('.student-form').style.display = 'block';
    }
}

function handleAdminLogin(e) {
    e.preventDefault();
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    
    if (username && password) {
        localStorage.setItem('eventManager_loggedIn', 'true');
        localStorage.setItem('eventManager_role', 'admin');
        currentUserRole = 'admin';
        showApp();
        applyRoleBasedAccess();
    }
}

function handleStudentLogin(e) {
    e.preventDefault();
    const moodleId = document.getElementById('student-moodle-id').value;
    const email = document.getElementById('student-email').value;
    
    // Validate email format: moodleID@apsit.edu.in
    const expectedEmail = moodleId + '@apsit.edu.in';
    
    if (email.toLowerCase() !== expectedEmail.toLowerCase()) {
        alert('Error: Email must match Moodle ID. Expected: ' + expectedEmail);
        return;
    }
    
    localStorage.setItem('eventManager_loggedIn', 'true');
    localStorage.setItem('eventManager_role', 'student');
    currentUserRole = 'student';
    showApp();
    applyRoleBasedAccess();
}

function handleLogin(e) {
    e.preventDefault();
    // Simple validation - in production, verify credentials
    localStorage.setItem('eventManager_loggedIn', 'true');
    showApp();
    applyRoleBasedAccess();
}

function handleRegister(e) {
    e.preventDefault();
    // Simple registration - in production, save to database
    localStorage.setItem('eventManager_loggedIn', 'true');
    showApp();
}

function showApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
}

function logout() {
    localStorage.removeItem('eventManager_loggedIn');
    localStorage.removeItem('eventManager_role');
    currentUserRole = 'admin';
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
    showLoginPage();
    // Reset to admin role for login
    selectRole('admin');
}

// Role-based access control
function applyRoleBasedAccess() {
    if (currentUserRole === 'student') {
        // Hide admin-only elements
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
        
        // Hide budget section from sidebar
        const budgetMenuItem = document.querySelector('.menu-item[data-section="budget"]');
        if (budgetMenuItem) {
            budgetMenuItem.style.display = 'none';
        }
        
        // Hide settings from sidebar
        const settingsMenuItem = document.querySelector('.menu-item[data-section="settings"]');
        if (settingsMenuItem) {
            settingsMenuItem.style.display = 'none';
        }
        
        // Update profile name
        const profileName = document.querySelector('.profile-name');
        if (profileName) {
            profileName.textContent = 'Student';
        }
    } else {
        // Show admin-only elements
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = '';
        });
        
        // Show budget section from sidebar
        const budgetMenuItem = document.querySelector('.menu-item[data-section="budget"]');
        if (budgetMenuItem) {
            budgetMenuItem.style.display = '';
        }
        
        // Show settings from sidebar
        const settingsMenuItem = document.querySelector('.menu-item[data-section="settings"]');
        if (settingsMenuItem) {
            settingsMenuItem.style.display = '';
        }
        
        // Update profile name
        const profileName = document.querySelector('.profile-name');
        if (profileName) {
            profileName.textContent = 'Admin';
        }
    }
}

// Profile Dropdown Toggle
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const profile = document.querySelector('.navbar-profile');
    const dropdown = document.getElementById('profile-dropdown');
    if (profile && dropdown && !profile.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// Navigation Functions
function navigateToSection(sectionId) {
    // Update sidebar active state
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.menu-item[data-section="${sectionId}"]`).classList.add('active');

    // Show corresponding section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    const sectionMap = {
        'dashboard': 'dashboard',
        'my-tasks': 'my-tasks',
        'inbox': 'inbox',
        'goals': 'goals',
        'calendar': 'calendar-section',
        'events': 'events-section',
        'members': 'members-section',
        'tasks-assigned': 'tasks-assigned-section',
        'files': 'files-section',
        'settings': 'settings',
        'students': 'students',
        'budget': 'budget'
    };

    const targetSection = sectionMap[sectionId] || sectionId;
    document.getElementById(targetSection).classList.add('active');
    currentSection = sectionId;
}

// Tab Switching
function switchTab(btn, tabId, ...contentIds) {
    // Update button state
    btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Show corresponding content
    contentIds.forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
    document.getElementById(tabId + '-tab').classList.add('active');
}

// Calendar Functions
function renderCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;

    const title = document.getElementById('calendar-title');
    if (title) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
        title.textContent = `${months[currentMonth]} ${currentYear}`;
    }

    // Clear existing days (keep headers)
    const headers = calendarGrid.querySelectorAll('.calendar-day-header');
    calendarGrid.innerHTML = '';
    headers.forEach(h => calendarGrid.appendChild(h));

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const events = getStoredData(STORAGE_KEYS.events) || [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = daysInPrevMonth - i;
        calendarGrid.appendChild(day);
    }

    // Current month days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        
        if (currentYear === today.getFullYear() && 
            currentMonth === today.getMonth() && 
            i === today.getDate()) {
            day.classList.add('today');
        }

        // Check for events
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const hasEvent = events.some(e => e.date === dateStr);
        if (hasEvent) {
            day.classList.add('has-event');
        }

        day.textContent = i;
        day.addEventListener('click', () => openEventModal(dateStr));
        calendarGrid.appendChild(day);
    }

    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = i;
        calendarGrid.appendChild(day);
    }
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

// My Tasks Calendar Functions
function renderMyTasksCalendar() {
    const calendarTab = document.getElementById('calendar-tab');
    if (!calendarTab) return;

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

    let html = `
        <div class="calendar-header">
            <button class="btn btn-secondary" onclick="changeMyTasksMonth(-1)">
                <i class="fas fa-chevron-left"></i>
            </button>
            <h3 id="my-tasks-calendar-title">${months[myTasksCalendarMonth]} ${myTasksCalendarYear}</h3>
            <button class="btn btn-secondary" onclick="changeMyTasksMonth(1)">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="calendar-grid" id="my-tasks-calendar-grid">
            <div class="calendar-day-header">Sun</div>
            <div class="calendar-day-header">Mon</div>
            <div class="calendar-day-header">Tue</div>
            <div class="calendar-day-header">Wed</div>
            <div class="calendar-day-header">Thu</div>
            <div class="calendar-day-header">Fri</div>
            <div class="calendar-day-header">Sat</div>
    `;

    const firstDay = new Date(myTasksCalendarYear, myTasksCalendarMonth, 1).getDay();
    const daysInMonth = new Date(myTasksCalendarYear, myTasksCalendarMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(myTasksCalendarYear, myTasksCalendarMonth, 0).getDate();

    const events = getStoredData(STORAGE_KEYS.events) || [];
    const today = new Date();

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += `<div class="calendar-day other-month">${day}</div>`;
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const isToday = myTasksCalendarYear === today.getFullYear() && 
                        myTasksCalendarMonth === today.getMonth() && 
                        i === today.getDate();
        
        const dateStr = `${myTasksCalendarYear}-${String(myTasksCalendarMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const hasEvent = events.some(e => e.date === dateStr);
        const isSelected = selectedDate === dateStr;

        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (hasEvent) classes += ' has-event';
        if (isSelected) classes += ' selected';

        html += `<div class="${classes}" onclick="selectDate('${dateStr}')">${i}</div>`;
    }

    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
        html += `<div class="calendar-day other-month">${i}</div>`;
    }

    html += '</div>';
    calendarTab.innerHTML = html;
}

function changeMyTasksMonth(delta) {
    myTasksCalendarMonth += delta;
    if (myTasksCalendarMonth > 11) {
        myTasksCalendarMonth = 0;
        myTasksCalendarYear++;
    } else if (myTasksCalendarMonth < 0) {
        myTasksCalendarMonth = 11;
        myTasksCalendarYear--;
    }
    renderMyTasksCalendar();
}

function selectDate(dateStr) {
    selectedDate = dateStr;
    renderMyTasksCalendar();
    openCalendarEventModal(dateStr);
}

function openCalendarEventModal(dateStr) {
    // Check if modal exists, create if not
    let modal = document.getElementById('calendar-event-modal');
    if (!modal) {
        const modalHtml = `
            <div id="calendar-event-modal" class="calendar-event-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add Event <span class="date-display" id="modal-date-display"></span></h3>
                        <span class="modal-close" onclick="closeCalendarEventModal()">&times;</span>
                    </div>
                    <form id="calendar-event-form" onsubmit="saveCalendarEvent(event)">
                        <div class="form-group">
                            <label>Event Title</label>
                            <input type="text" id="calendar-event-title" placeholder="Enter event title" required>
                        </div>
                        <div class="form-group">
                            <label>Time</label>
                            <input type="time" id="calendar-event-time">
                        </div>
                        <div class="form-group">
                            <label>Google Drive Link (Optional)</label>
                            <input type="url" id="calendar-event-link" placeholder="https://drive.google.com/...">
                        </div>
                        <button type="submit" class="btn btn-primary">Save Event</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('calendar-event-modal');
    }

    const dateDisplay = document.getElementById('modal-date-display');
    const formattedDate = new Date(dateStr).toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
    dateDisplay.textContent = `(${formattedDate})`;
    
    document.getElementById('calendar-event-date').value = dateStr;
    document.getElementById('calendar-event-title').value = '';
    document.getElementById('calendar-event-time').value = '';
    document.getElementById('calendar-event-link').value = '';
    
    // Add hidden date input
    let dateInput = document.getElementById('calendar-event-date');
    if (!dateInput) {
        dateInput = document.createElement('input');
        dateInput.type = 'hidden';
        dateInput.id = 'calendar-event-date';
        document.getElementById('calendar-event-form').insertBefore(dateInput, document.getElementById('calendar-event-form').firstChild);
    }
    dateInput.value = dateStr;

    modal.classList.add('active');
}

function closeCalendarEventModal() {
    document.getElementById('calendar-event-modal').classList.remove('active');
}

function saveCalendarEvent(e) {
    e.preventDefault();
    
    const event = {
        id: Date.now(),
        title: document.getElementById('calendar-event-title').value,
        date: document.getElementById('calendar-event-date').value,
        time: document.getElementById('calendar-event-time').value,
        link: document.getElementById('calendar-event-link').value
    };

    const events = getStoredData(STORAGE_KEYS.events) || [];
    events.push(event);
    localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events));

    closeCalendarEventModal();
    renderMyTasksCalendar();
    renderCalendar();
    renderCalCalendar();
    renderEvents();
}

// Calendar Section Functions
function renderCalCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;

    const title = document.getElementById('cal-title');
    if (title) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
        title.textContent = `${months[calMonth]} ${calYear}`;
    }

    // Clear existing days (keep headers)
    const headers = calendarGrid.querySelectorAll('.calendar-day-header');
    calendarGrid.innerHTML = '';
    headers.forEach(h => calendarGrid.appendChild(h));

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    const events = getStoredData(STORAGE_KEYS.events) || [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = daysInPrevMonth - i;
        calendarGrid.appendChild(day);
    }

    // Current month days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        
        if (calYear === today.getFullYear() && 
            calMonth === today.getMonth() && 
            i === today.getDate()) {
            day.classList.add('today');
        }

        // Check for events
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayEvents = events.filter(e => e.date === dateStr);
        if (dayEvents.length > 0) {
            day.classList.add('has-event');
            day.title = dayEvents.map(e => e.title).join(', ');
        }

        day.textContent = i;
        day.addEventListener('click', () => showDateEvents(dateStr));
        calendarGrid.appendChild(day);
    }

    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = 42 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = i;
        calendarGrid.appendChild(day);
    }
}

function changeCalMonth(delta) {
    calMonth += delta;
    if (calMonth > 11) {
        calMonth = 0;
        calYear++;
    } else if (calMonth < 0) {
        calMonth = 11;
        calYear--;
    }
    renderCalCalendar();
}

function showDateEvents(dateStr) {
    const events = getStoredData(STORAGE_KEYS.events) || [];
    const dayEvents = events.filter(e => e.date === dateStr);
    
    if (dayEvents.length > 0) {
        alert(`Events on ${dateStr}:\n${dayEvents.map(e => `- ${e.title} (${e.time})`).join('\n')}`);
    }
}

// Event Modal Functions
function openEventModal(date = null) {
    const modal = document.getElementById('event-modal');
    modal.classList.add('active');
    
    if (date) {
        document.getElementById('event-date').value = date;
    } else {
        document.getElementById('event-date').value = '';
    }
    document.getElementById('event-title').value = '';
    document.getElementById('event-time').value = '';
    document.getElementById('event-link').value = '';
}

function closeEventModal() {
    document.getElementById('event-modal').classList.remove('active');
}

function saveEvent(e) {
    e.preventDefault();
    
    const event = {
        id: Date.now(),
        title: document.getElementById('event-title').value,
        date: document.getElementById('event-date').value,
        time: document.getElementById('event-time').value,
        link: document.getElementById('event-link').value
    };

    const events = getStoredData(STORAGE_KEYS.events) || [];
    events.push(event);
    localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events));

    closeEventModal();
    renderCalendar();
    renderCalCalendar();
    renderEvents();
}

// Events Section Functions
function renderEvents() {
    const eventsGrid = document.getElementById('events-grid');
    if (!eventsGrid) return;

    const events = getStoredData(STORAGE_KEYS.events) || [];
    
    if (events.length === 0) {
        eventsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No events yet. Click "New Event" to add one.</p>';
        return;
    }

    eventsGrid.innerHTML = events.map(event => {
        const date = new Date(event.date);
        const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
        const day = date.getDate();
        
        return `
            <div class="event-card">
                <div class="event-date-badge">
                    <span class="month">${month}</span>
                    <span class="day">${day}</span>
                </div>
                <div class="event-details">
                    <h3>${event.title}</h3>
                    <p><i class="fas fa-clock"></i> ${event.time || 'All day'}</p>
                    ${event.link ? `<a href="${event.link}" target="_blank" class="event-link"><i class="fas fa-link"></i> View Details</a>` : ''}
                    <button class="btn btn-secondary" style="margin-top: 10px; padding: 8px 16px;" onclick="deleteEvent(${event.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function deleteEvent(id) {
    if (confirm('Are you sure you want to delete this event?')) {
        let events = getStoredData(STORAGE_KEYS.events) || [];
        events = events.filter(e => e.id !== id);
        localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events));
        renderCalendar();
        renderCalCalendar();
        renderEvents();
    }
}

// Member Modal Functions
function openMemberModal() {
    const modal = document.getElementById('member-modal');
    modal.classList.add('active');
    document.getElementById('member-name').value = '';
    document.getElementById('member-role').value = '';
}

function closeMemberModal() {
    document.getElementById('member-modal').classList.remove('active');
}

function saveMember(e) {
    e.preventDefault();
    
    const member = {
        id: Date.now(),
        name: document.getElementById('member-name').value,
        role: document.getElementById('member-role').value
    };

    const members = getStoredData(STORAGE_KEYS.members) || [];
    members.push(member);
    localStorage.setItem(STORAGE_KEYS.members, JSON.stringify(members));

    closeMemberModal();
    renderMembers();
    updateMemberSelect();
}

// Members Section Functions
function renderMembers() {
    const membersGrid = document.getElementById('members-grid');
    if (!membersGrid) return;

    const members = getStoredData(STORAGE_KEYS.members) || [];
    
    if (members.length === 0) {
        membersGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No members yet. Click "Add Member" to add one.</p>';
        return;
    }

    membersGrid.innerHTML = members.map(member => `
        <div class="member-card">
            <div class="member-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="member-info">
                <h3>${member.name}</h3>
                <p>${member.role}</p>
            </div>
        </div>
    `).join('');
}

// Assign Task Modal Functions
function openAssignTaskModal() {
    const modal = document.getElementById('assign-task-modal');
    modal.classList.add('active');
    updateMemberSelect();
    document.getElementById('assigned-task-title').value = '';
    document.getElementById('assigned-task-date').value = '';
}

function closeAssignTaskModal() {
    document.getElementById('assign-task-modal').classList.remove('active');
}

function updateMemberSelect() {
    const select = document.getElementById('assigned-task-member');
    const members = getStoredData(STORAGE_KEYS.members) || [];
    
    select.innerHTML = '<option value="">Select member</option>';
    members.forEach(member => {
        select.innerHTML += `<option value="${member.id}">${member.name}</option>`;
    });
}

function saveAssignedTask(e) {
    e.preventDefault();
    
    const members = getStoredData(STORAGE_KEYS.members) || [];
    const memberId = document.getElementById('assigned-task-member').value;
    const member = members.find(m => m.id == memberId);

    const task = {
        id: Date.now(),
        title: document.getElementById('assigned-task-title').value,
        assignee: member ? member.name : 'Unknown',
        dueDate: document.getElementById('assigned-task-date').value,
        status: 'upcoming',
        completed: false
    };

    const tasks = getStoredData(STORAGE_KEYS.assignedTasks) || [];
    tasks.push(task);
    localStorage.setItem(STORAGE_KEYS.assignedTasks, JSON.stringify(tasks));

    closeAssignTaskModal();
    renderAssignedTasks();
}

function renderAssignedTasks() {
    // Render tasks in upcoming, overdue, and completed tabs
    const tasks = getStoredData(STORAGE_KEYS.assignedTasks) || [];
    const today = new Date().toISOString().split('T')[0];

    const upcomingTasks = tasks.filter(t => !t.completed && t.dueDate >= today);
    const overdueTasks = tasks.filter(t => !t.completed && t.dueDate < today);
    const completedTasks = tasks.filter(t => t.completed);

    renderTaskList('upcoming', upcomingTasks);
    renderTaskList('overdue', overdueTasks);
    renderTaskList('completed', completedTasks);
}

function renderTaskList(type, tasks) {
    const container = document.getElementById(`${type}-tab`);
    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">No ${type} tasks.</p>`;
        return;
    }

    container.innerHTML = `
        <ul class="task-items">
            ${tasks.map(task => `
                <li class="task-item ${task.completed ? 'completed' : ''}">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleAssignedTask(${task.id})">
                    <span class="task-title">${task.title}</span>
                    <span class="task-assignee">${task.assignee}</span>
                    <span class="task-date ${type === 'overdue' ? 'overdue' : ''}">${task.dueDate}</span>
                </li>
            `).join('')}
        </ul>
    `;
}

function toggleAssignedTask(id) {
    let tasks = getStoredData(STORAGE_KEYS.assignedTasks) || [];
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        localStorage.setItem(STORAGE_KEYS.assignedTasks, JSON.stringify(tasks));
        renderAssignedTasks();
    }
}

// File Modal Functions
function openFileModal() {
    const modal = document.getElementById('file-modal');
    modal.classList.add('active');
    document.getElementById('file-name').value = '';
    document.getElementById('file-link').value = '';
}

function closeFileModal() {
    document.getElementById('file-modal').classList.remove('active');
}

function saveFile(e) {
    e.preventDefault();
    
    const file = {
        id: Date.now(),
        name: document.getElementById('file-name').value,
        link: document.getElementById('file-link').value
    };

    const files = getStoredData(STORAGE_KEYS.files) || [];
    files.push(file);
    localStorage.setItem(STORAGE_KEYS.files, JSON.stringify(files));

    closeFileModal();
    renderFiles();
}

// Files Section Functions
function renderFiles() {
    const filesList = document.getElementById('files-list');
    if (!filesList) return;

    const files = getStoredData(STORAGE_KEYS.files) || [];
    
    if (files.length === 0) {
        filesList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No files yet. Click "Add File Link" to add one.</p>';
        return;
    }

    filesList.innerHTML = files.map(file => `
        <div class="file-item">
            <div class="file-icon">
                <i class="fas fa-file-alt"></i>
            </div>
            <div class="file-info">
                <h4>${file.name}</h4>
                <a href="${file.link}" target="_blank" class="file-link">
                    <i class="fas fa-external-link-alt"></i> Open in Drive
                </a>
            </div>
        </div>
    `).join('');
}

// Utility Functions
function getStoredData(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch (e) {
        return null;
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal, .calendar-event-modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

function toggleTask(checkbox) {
    const taskItem = checkbox.closest('.task-item');
    if (checkbox.checked) {
        taskItem.classList.add('completed');
    } else {
        taskItem.classList.remove('completed');
    }
}

function loadData() {
    renderAssignedTasks();
}

// Initialize calendar section when navigating to it
const originalNavigateToSection = navigateToSection;
navigateToSection = function(sectionId) {
    originalNavigateToSection(sectionId);
    if (sectionId === 'calendar') {
        renderCalCalendar();
    }
};

// Dashboard Tabs Setup
function setupDashboardTabs() {
    // Tasks Assigned tabs in dashboard
    const dashboardTabs = document.querySelectorAll('.tasks-assigned-card .tab-link');
    dashboardTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Update active state
            dashboardTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content (for now just console log)
            console.log('Switched to:', tabName);
        });
    });
    
    // Budget tabs in dashboard
    const budgetTabs = document.querySelectorAll('.budget-card .tab-link');
    budgetTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const budgetType = this.getAttribute('data-budget');
            
            // Update active state
            budgetTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update budget display based on selection
            updateBudgetDisplay(budgetType);
        });
    });

    // Settings tabs
    const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
    settingsTabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-settings-tab');
            
            // Update button active state
            settingsTabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.settings-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName + '-settings-tab').classList.add('active');
        });
    });
}

// Update Budget Display
function updateBudgetDisplay(type) {
    const budgetAmount = document.querySelector('.budget-amount .amount');
    if (!budgetAmount) return;
    
    const budgets = {
        weekly: '$3,200',
        monthly: '$12,500',
        annually: '$150,000'
    };
    
    budgetAmount.textContent = budgets[type] || '$12,500';
}

// ============================================
// SETTINGS FUNCTIONS
// ============================================

// Load settings from localStorage
function loadSettings() {
    const settings = getStoredData(STORAGE_KEYS.settings);
    if (settings) {
        // Load profile settings
        if (settings.name) document.getElementById('settings-name').value = settings.name;
        if (settings.email) document.getElementById('settings-email').value = settings.email;
        if (settings.phone) document.getElementById('settings-phone').value = settings.phone;
        if (settings.moodleId) document.getElementById('settings-moodle-id').value = settings.moodleId;
        
        // Load preferences
        if (settings.notifications !== undefined) {
            document.getElementById('notifications-toggle').checked = settings.notifications;
        }
    }
}

// Save profile settings
function saveProfileSettings(e) {
    e.preventDefault();
    
    const settings = getStoredData(STORAGE_KEYS.settings) || {};
    settings.name = document.getElementById('settings-name').value;
    settings.email = document.getElementById('settings-email').value;
    settings.phone = document.getElementById('settings-phone').value;
    settings.moodleId = document.getElementById('settings-moodle-id').value;
    
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    alert('Profile settings saved successfully!');
}

// Update password
function updatePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Please fill in all password fields');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    // In a real app, verify current password against server
    // For this demo, we just show success
    alert('Password updated successfully!');
    
    // Clear password fields
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
}

// Save preferences
function savePreferences() {
    const settings = getStoredData(STORAGE_KEYS.settings) || {};
    settings.notifications = document.getElementById('notifications-toggle').checked;
    
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

// ============================================
// STUDENTS FUNCTIONS
// ============================================

function openStudentModal() {
    const modal = document.getElementById('student-modal');
    modal.classList.add('active');
    document.getElementById('student-name').value = '';
    document.getElementById('student-moodle-id').value = '';
    document.getElementById('student-email').value = '';
}

function closeStudentModal() {
    document.getElementById('student-modal').classList.remove('active');
}

function saveStudent(e) {
    e.preventDefault();
    
    const student = {
        id: Date.now(),
        name: document.getElementById('student-name').value,
        moodleId: document.getElementById('student-moodle-id').value,
        email: document.getElementById('student-email').value
    };

    const students = getStoredData(STORAGE_KEYS.students) || [];
    students.push(student);
    localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(students));

    closeStudentModal();
    renderStudents();
}

function renderStudents() {
    const studentsGrid = document.getElementById('students-grid');
    if (!studentsGrid) return;

    const students = getStoredData(STORAGE_KEYS.students) || [];
    
    if (students.length === 0) {
        studentsGrid.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No students added yet. Click "Add Student" to add one.</p>';
        return;
    }

    const isAdmin = currentUserRole === 'admin';

    studentsGrid.innerHTML = students.map(student => `
        <div class="student-card">
            <div class="student-avatar">
                <i class="fas fa-user-graduate"></i>
            </div>
            <div class="student-info">
                <h3>${student.name}</h3>
                <p><i class="fas fa-id-card"></i> Moodle ID: ${student.moodleId}</p>
                <p><i class="fas fa-envelope"></i> ${student.email}</p>
            </div>
            ${isAdmin ? `<button class="btn btn-secondary" onclick="deleteStudent(${student.id})">Remove</button>` : ''}
        </div>
    `).join('');
}

function deleteStudent(id) {
    if (confirm('Are you sure you want to remove this student?')) {
        let students = getStoredData(STORAGE_KEYS.students) || [];
        students = students.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(students));
        renderStudents();
    }
}

// ============================================
// BUDGET TABS FUNCTIONS
// ============================================

function setupBudgetTabs() {
    const budgetTabBtns = document.querySelectorAll('.budget-tab-btn');
    budgetTabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-budget-tab');
            
            // Update button active state
            budgetTabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.budget-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName + '-budget-tab').classList.add('active');
        });
    });
}
