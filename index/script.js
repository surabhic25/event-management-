// ============================================
// EVENT MANAGER - SCRIPT.JS (Supabase Edition)
// ============================================

// Global Variables
let currentSection = 'dashboard';
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();
let myTasksCalendarMonth = new Date().getMonth();
let myTasksCalendarYear = new Date().getFullYear();
let selectedDate = null;
let currentUserRole = 'admin';    // 'admin' | 'student'
let currentUser = null;           // Supabase auth user object
let selectedLoginRole = 'admin';

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async function () {
    await initializeApp();
    setupEventListeners();
    setupDashboardTabs();
    setupBudgetTabs();
});

async function initializeApp() {
    // Check active Supabase auth session (admin)
    const { data: { session } } = await db.auth.getSession();

    if (session) {
        currentUser = session.user;
        await resolveRole(session.user.id);
        showApp();
        applyRoleBasedAccess();
        await loadAllData();
        return;
    }

    // Check student pseudo-session (stored in sessionStorage)
    const studentSession = sessionStorage.getItem('student_session');
    if (studentSession) {
        const parsed = JSON.parse(studentSession);
        currentUserRole = 'student';
        currentUser = { id: parsed.id, email: parsed.email };
        document.querySelector('.profile-name').textContent = parsed.name || 'Student';
        showApp();
        applyRoleBasedAccess();
        await loadAllData();
        return;
    }

    // No session — stay on auth screen
    loadSettings();
}

// Resolve role from profiles table for authenticated admin users
async function resolveRole(userId) {
    const { data, error } = await db
        .from('profiles')
        .select('role, name')
        .eq('id', userId)
        .single();

    if (data) {
        currentUserRole = data.role || 'admin';
        const profileName = document.querySelector('.profile-name');
        if (profileName) profileName.textContent = data.name || (data.role === 'admin' ? 'Admin' : 'Student');
    }
}

async function loadAllData() {
    await Promise.all([
        renderEvents(),
        renderMembers(),
        renderFiles(),
        renderStudents(),
        renderAssignedTasks(),
        renderDashboardEvents(),
        renderDashboardTasks(),
        renderDashboardMembers(),
    ]);
    renderCalCalendar();
    renderMyTasksCalendar();
    loadSettings();
}

// ============================================
// DASHBOARD EVENTS
// ============================================
async function renderDashboardEvents() {
    const eventsCard = document.querySelector('.events-card');
    if (!eventsCard) return;

    // Fetch upcoming events from Supabase
    const { data: events, error } = await db
        .from('events')
        .select('*')
        .order('date', { ascending: true })
        .limit(5);

    if (error) {
        console.error('Error loading dashboard events:', error);
        return;
    }

    // Find the event-items container
    let eventItemsContainer = eventsCard.querySelector('.event-items');
    
    if (!eventItemsContainer) {
        // Create container if it doesn't exist
        const existingEventItem = eventsCard.querySelector('.event-item');
        if (existingEventItem) {
            eventItemsContainer = document.createElement('div');
            eventItemsContainer.className = 'event-items';
            existingEventItem.replaceWith(eventItemsContainer);
        }
    }

    if (eventItemsContainer && events && events.length > 0) {
        eventItemsContainer.innerHTML = events.map(event => {
            const date = new Date(event.date + 'T00:00:00');
            const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
            const day = date.getDate();
            return `
                <div class="event-item">
                    <div class="event-icon">
                        <i class="fas fa-calendar"></i>
                    </div>
                    <div class="event-info" style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span class="event-text">${event.title}</span>
                            <span class="event-date" style="font-size: 12px; color: var(--text-secondary); display: block;">${month} ${day} ${event.time || ''}</span>
                        </div>
                        ${currentUserRole === 'admin' ? `<button class="btn-delete-event" onclick="deleteEvent(${event.id})" style="background: none; border: none; color: var(--danger); cursor: pointer; padding: 5px;"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } else if (eventItemsContainer) {
        eventItemsContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No events yet.</p>';
    }
}

// ============================================
// DASHBOARD TASKS
// ============================================
function openAddTaskModal() {
    document.getElementById('add-task-modal').classList.add('active');
    document.getElementById('dashboard-task-title').value = '';
}

function closeAddTaskModal() {
    document.getElementById('add-task-modal').classList.remove('active');
}

async function saveDashboardTask(e) {
    e.preventDefault();
    const title = document.getElementById('dashboard-task-title').value;
    
    const { error } = await db.from('dashboard_tasks').insert({ title: title });
    if (error) { showToast('Error saving task: ' + error.message, 'error'); return; }
    
    showToast('Task added!', 'success');
    closeAddTaskModal();
    await renderDashboardTasks();
}

async function renderDashboardTasks() {
    const tasksList = document.getElementById('dashboard-tasks-list');
    if (!tasksList) return;

    const { data: tasks, error } = await db.from('dashboard_tasks').select('*').order('created_at', { ascending: false });

    if (error) { tasksList.innerHTML = '<p style="color: red;">Error loading tasks.</p>'; return; }
    if (!tasks || tasks.length === 0) {
        tasksList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No tasks yet.</p>';
        return;
    }

    tasksList.innerHTML = tasks.map(task => `
        <div class="task-check-item">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleDashboardTask(${task.id}, this.checked)">
            <span style="${task.completed ? 'text-decoration: line-through; color: var(--text-light);' : ''}">${task.title}</span>
            <button class="btn-delete-task" onclick="deleteDashboardTask(${task.id})" style="background: none; border: none; color: var(--danger); cursor: pointer; margin-left: auto; padding: 5px;"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

async function toggleDashboardTask(id, completed) {
    const { error } = await db.from('dashboard_tasks').update({ completed: completed }).eq('id', id);
    if (error) { showToast('Error updating task.', 'error'); return; }
    await renderDashboardTasks();
}

async function deleteDashboardTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    const { error } = await db.from('dashboard_tasks').delete().eq('id', id);
    if (error) { showToast('Error deleting task.', 'error'); return; }
    showToast('Task deleted.', 'success');
    await renderDashboardTasks();
}

async function deleteAllDashboardTasks() {
    if (!confirm('Are you sure you want to delete ALL tasks? This action cannot be undone.')) return;
    const { error } = await db.from('dashboard_tasks').delete().neq('id', 0);
    if (error) { showToast('Error deleting tasks.', 'error'); return; }
    showToast('All tasks deleted.', 'success');
    await renderDashboardTasks();
}

// ============================================
// DASHBOARD MEMBERS
// ============================================
async function renderDashboardMembers() {
    const membersList = document.getElementById('dashboard-members-list');
    if (!membersList) return;

    const { data: members, error } = await db.from('members').select('*').order('name');

    if (error) { membersList.innerHTML = '<p style="color: red;">Error loading members.</p>'; return; }
    if (!members || members.length === 0) {
        membersList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No members yet.</p>';
        return;
    }

    membersList.innerHTML = members.map(m => `
        <div class="member-item">
            <div class="member-avatar color-${Math.floor(Math.random() * 4) + 1}">${m.name.charAt(0).toUpperCase()}</div>
            <span class="member-name">${m.name}</span>
            ${currentUserRole === 'admin' ? `<button class="btn-delete-member" onclick="deleteMember(${m.id})" style="background: none; border: none; color: var(--danger); cursor: pointer; margin-left: auto; padding: 5px;"><i class="fas fa-trash"></i></button>` : ''}
        </div>
    `).join('');
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleAdminLogin);
    document.getElementById('student-login-form').addEventListener('submit', handleStudentLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    document.querySelectorAll('.menu-item[data-section]').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            navigateToSection(this.getAttribute('data-section'));
        });
    });

    document.querySelectorAll('.tasks-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const tab = this.getAttribute('data-tab');
            switchTab(this, tab, 'list-tab', 'calendar-tab');
            if (tab === 'calendar') renderMyTasksCalendar();
        });
    });

    document.querySelectorAll('.tasks-assigned-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const tab = this.getAttribute('data-tab');
            switchTab(this, tab, 'upcoming-tab', 'overdue-tab', 'completed-tab');
        });
    });

    window.addEventListener('click', function (e) {
        if (e.target.classList.contains('modal') || e.target.classList.contains('calendar-event-modal')) {
            closeAllModals();
        }
    });
}

// ============================================
// AUTH
// ============================================
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
    document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.role-btn[data-role="${role}"]`).classList.add('active');

    if (role === 'admin') {
        document.querySelector('.admin-form').style.display = 'block';
        document.querySelector('.student-form').style.display = 'none';
    } else {
        document.querySelector('.admin-form').style.display = 'none';
        document.querySelector('.student-form').style.display = 'block';
    }
}

// Admin Login → Supabase Auth
async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;

    showToast('Signing in…', 'info');

    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
        showToast('Login failed: ' + error.message, 'error');
        return;
    }

    currentUser = data.user;
    await resolveRole(data.user.id);
    showApp();
    applyRoleBasedAccess();
    await loadAllData();
    showToast('Welcome back!', 'success');
}

// Student Login → validate against students table (no Supabase Auth required)
async function handleStudentLogin(e) {
    e.preventDefault();
    const moodleId = document.getElementById('student-moodle-id').value.trim();
    const email = document.getElementById('student-email').value.trim().toLowerCase();

    const expectedEmail = moodleId + '@apsit.edu.in';
    if (email !== expectedEmail.toLowerCase()) {
        showToast('Email must match Moodle ID. Expected: ' + expectedEmail, 'error');
        return;
    }

    showToast('Verifying student…', 'info');

    const { data, error } = await db
        .from('students')
        .select('id, name, moodle_id, email')
        .eq('moodle_id', moodleId)
        .eq('email', email)
        .single();

    if (error || !data) {
        showToast('Student not found. Please contact admin.', 'error');
        return;
    }

    // Store student pseudo-session
    sessionStorage.setItem('student_session', JSON.stringify({ id: data.id, name: data.name, email: data.email }));
    currentUserRole = 'student';
    currentUser = { id: data.id, email: data.email };

    showApp();
    applyRoleBasedAccess();
    document.querySelector('.profile-name').textContent = data.name || 'Student';
    await loadAllData();
    showToast('Welcome, ' + data.name + '!', 'success');
}

// Registration (creates admin account via Supabase Auth)
async function handleRegister(e) {
    e.preventDefault();
    const name = e.target.querySelector('input[type="text"]').value.trim();
    const email = e.target.querySelector('input[type="email"]').value.trim();
    const password = e.target.querySelector('input[type="password"]').value;

    showToast('Creating account…', 'info');

    const { data, error } = await db.auth.signUp({ email, password, options: { data: { name } } });
    if (error) {
        showToast('Registration failed: ' + error.message, 'error');
        return;
    }

    // Insert profile row (role defaults to 'student'; admin must set manually)
    if (data.user) {
        await db.from('profiles').insert({ id: data.user.id, role: 'student', name });
    }

    showToast('Account created! Please check your email to confirm.', 'success');
    showLoginPage();
}

async function logout() {
    // Sign out of Supabase (admin)
    await db.auth.signOut();
    // Clear student pseudo-session
    sessionStorage.removeItem('student_session');
    currentUser = null;
    currentUserRole = 'admin';
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
    showLoginPage();
    selectRole('admin');
}

function showApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
}

// Role-based access control (UI only — DB is protected by RLS)
function applyRoleBasedAccess() {
    if (currentUserRole === 'student') {
        // Hide admin-only elements
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        
        // Hide budget menu item
        const budget = document.querySelector('.menu-item[data-section="budget"]');
        if (budget) budget.style.display = 'none';
        
        // Hide settings menu item
        const settings = document.querySelector('.menu-item[data-section="settings"]');
        if (settings) settings.style.display = 'none';
        
        // Hide add buttons in dashboard for students
        const btnNewEvent = document.querySelector('.events-card .btn-new-event');
        if (btnNewEvent) btnNewEvent.style.display = 'none';
        
        const btnAddTask = document.querySelector('.my-tasks-card .btn-add-task');
        if (btnAddTask) btnAddTask.style.display = 'none';
        
        const btnAssignTask = document.querySelector('.tasks-assigned-card .btn-assign-task');
        if (btnAssignTask) btnAssignTask.style.display = 'none';
        
        const btnAddMember = document.querySelector('.members-card .btn-add-member');
        if (btnAddMember) btnAddMember.style.display = 'none';
        
        // Keep the Add link button for files (don't hide for students)
        // const btnAddLink = document.querySelector('.files-card .btn-add-link');
        // if (btnAddLink) btnAddLink.style.display = 'none';
        
        // Hide Budget card in dashboard
        const budgetCard = document.querySelector('.budget-card');
        if (budgetCard) budgetCard.style.display = 'none';
        
        const profileName = document.querySelector('.profile-name');
        if (profileName) profileName.textContent = 'Student';
    } else {
        // Show all elements for admin
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
        
        const budget = document.querySelector('.menu-item[data-section="budget"]');
        if (budget) budget.style.display = '';
        
        const settings = document.querySelector('.menu-item[data-section="settings"]');
        if (settings) settings.style.display = '';
        
        // Show add buttons for admin
        const btnNewEvent = document.querySelector('.events-card .btn-new-event');
        if (btnNewEvent) btnNewEvent.style.display = '';
        
        const btnAddTask = document.querySelector('.my-tasks-card .btn-add-task');
        if (btnAddTask) btnAddTask.style.display = '';
        
        const btnAssignTask = document.querySelector('.tasks-assigned-card .btn-assign-task');
        if (btnAssignTask) btnAssignTask.style.display = '';
        
        const btnAddMember = document.querySelector('.members-card .btn-add-member');
        if (btnAddMember) btnAddMember.style.display = '';
        
        // Show Budget card for admin
        const budgetCard = document.querySelector('.budget-card');
        if (budgetCard) budgetCard.style.display = '';
        
        const profileName = document.querySelector('.profile-name');
        if (profileName) profileName.textContent = 'Admin';
    }
}

// ============================================
// PROFILE DROPDOWN
// ============================================
function toggleProfileDropdown() {
    document.getElementById('profile-dropdown').classList.toggle('active');
}

document.addEventListener('click', function (e) {
    const profile = document.querySelector('.navbar-profile');
    const dropdown = document.getElementById('profile-dropdown');
    if (profile && dropdown && !profile.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// ============================================
// NAVIGATION
// ============================================
function navigateToSection(sectionId) {
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    const menuItem = document.querySelector(`.menu-item[data-section="${sectionId}"]`);
    if (menuItem) menuItem.classList.add('active');

    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

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

    const targetId = sectionMap[sectionId] || sectionId;
    const target = document.getElementById(targetId);
    if (target) target.classList.add('active');
    currentSection = sectionId;

    if (sectionId === 'calendar') renderCalCalendar();
    if (sectionId === 'dashboard') {
        renderDashboardEvents();
        renderDashboardTasks();
        renderDashboardMembers();
    }
}

// ============================================
// TAB SWITCHING
// ============================================
function switchTab(btn, tabId, ...contentIds) {
    btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    contentIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    const target = document.getElementById(tabId + '-tab');
    if (target) target.classList.add('active');
}

// ============================================
// CALENDAR (My Tasks)
// ============================================
async function renderMyTasksCalendar() {
    const calendarTab = document.getElementById('calendar-tab');
    if (!calendarTab) return;

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    let html = `
        <div class="calendar-header">
            <button class="btn btn-secondary" onclick="changeMyTasksMonth(-1)"><i class="fas fa-chevron-left"></i></button>
            <h3>${months[myTasksCalendarMonth]} ${myTasksCalendarYear}</h3>
            <button class="btn btn-secondary" onclick="changeMyTasksMonth(1)"><i class="fas fa-chevron-right"></i></button>
        </div>
        <div class="calendar-grid">
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

    // Fetch events for this month
    const monthStart = `${myTasksCalendarYear}-${String(myTasksCalendarMonth + 1).padStart(2, '0')}-01`;
    const monthEnd = `${myTasksCalendarYear}-${String(myTasksCalendarMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const { data: events } = await db.from('events').select('date').gte('date', monthStart).lte('date', monthEnd);
    const eventDates = new Set((events || []).map(e => e.date));

    const today = new Date();
    for (let i = firstDay - 1; i >= 0; i--) html += `<div class="calendar-day other-month">${daysInPrevMonth - i}</div>`;

    for (let i = 1; i <= daysInMonth; i++) {
        const isToday = myTasksCalendarYear === today.getFullYear() && myTasksCalendarMonth === today.getMonth() && i === today.getDate();
        const dateStr = `${myTasksCalendarYear}-${String(myTasksCalendarMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const hasEvent = eventDates.has(dateStr);
        const isSelected = selectedDate === dateStr;
        let classes = 'calendar-day' + (isToday ? ' today' : '') + (hasEvent ? ' has-event' : '') + (isSelected ? ' selected' : '');
        html += `<div class="${classes}" onclick="selectDate('${dateStr}')">${i}</div>`;
    }

    const totalCells = firstDay + daysInMonth;
    for (let i = 1; i <= 42 - totalCells; i++) html += `<div class="calendar-day other-month">${i}</div>`;
    html += '</div>';
    calendarTab.innerHTML = html;
}

function changeMyTasksMonth(delta) {
    myTasksCalendarMonth += delta;
    if (myTasksCalendarMonth > 11) { myTasksCalendarMonth = 0; myTasksCalendarYear++; }
    else if (myTasksCalendarMonth < 0) { myTasksCalendarMonth = 11; myTasksCalendarYear--; }
    renderMyTasksCalendar();
}

function selectDate(dateStr) {
    selectedDate = dateStr;
    renderMyTasksCalendar();
    openCalendarEventModal(dateStr);
}

function openCalendarEventModal(dateStr) {
    let modal = document.getElementById('calendar-event-modal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="calendar-event-modal" class="calendar-event-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add Event <span id="modal-date-display"></span></h3>
                        <span class="modal-close" onclick="closeCalendarEventModal()">&times;</span>
                    </div>
                    <form id="calendar-event-form" onsubmit="saveCalendarEvent(event)">
                        <input type="hidden" id="calendar-event-date">
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
        `);
        modal = document.getElementById('calendar-event-modal');
    }

    const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    document.getElementById('modal-date-display').textContent = `(${formattedDate})`;
    document.getElementById('calendar-event-date').value = dateStr;
    document.getElementById('calendar-event-title').value = '';
    document.getElementById('calendar-event-time').value = '';
    document.getElementById('calendar-event-link').value = '';
    modal.classList.add('active');
}

function closeCalendarEventModal() {
    const m = document.getElementById('calendar-event-modal');
    if (m) m.classList.remove('active');
}

async function saveCalendarEvent(e) {
    e.preventDefault();
    const payload = {
        title: document.getElementById('calendar-event-title').value,
        date: document.getElementById('calendar-event-date').value,
        time: document.getElementById('calendar-event-time').value,
        link: document.getElementById('calendar-event-link').value || null,
        created_by: currentUser?.id || null
    };

    const { error } = await db.from('events').insert(payload);
    if (error) { showToast('Error saving event: ' + error.message, 'error'); return; }

    showToast('Event saved!', 'success');
    closeCalendarEventModal();
    await renderMyTasksCalendar();
    renderCalCalendar();
    await renderEvents();
    await renderDashboardEvents();
}

// ============================================
// CALENDAR SECTION
// ============================================
async function renderCalCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;

    const title = document.getElementById('cal-title');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (title) title.textContent = `${months[calMonth]} ${calYear}`;

    const headers = [...calendarGrid.querySelectorAll('.calendar-day-header')];
    calendarGrid.innerHTML = '';
    headers.forEach(h => calendarGrid.appendChild(h));

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    const monthStart = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
    const monthEnd = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const { data: events } = await db.from('events').select('date, title, time').gte('date', monthStart).lte('date', monthEnd);

    const eventMap = {};
    (events || []).forEach(ev => {
        if (!eventMap[ev.date]) eventMap[ev.date] = [];
        eventMap[ev.date].push(ev);
    });

    const today = new Date();

    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = daysInPrevMonth - i;
        calendarGrid.appendChild(day);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        if (calYear === today.getFullYear() && calMonth === today.getMonth() && i === today.getDate()) {
            day.classList.add('today');
        }
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // Build day content
        let dayContent = `<span class="day-number">${i}</span>`;
        
        if (eventMap[dateStr] && eventMap[dateStr].length > 0) {
            day.classList.add('has-event');
            // Show events below the date like Google Calendar
            const eventsHtml = eventMap[dateStr].slice(0, 2).map(ev => 
                `<div class="calendar-event-pill" title="${ev.title}">${ev.title}</div>`
            ).join('');
            const moreCount = eventMap[dateStr].length > 2 ? `<div class="calendar-event-more">+${eventMap[dateStr].length - 2} more</div>` : '';
            dayContent += `<div class="calendar-events-container">${eventsHtml}${moreCount}</div>`;
        }
        
        day.innerHTML = dayContent;
        day.addEventListener('click', () => showDateEvents(dateStr, eventMap[dateStr] || []));
        calendarGrid.appendChild(day);
    }

    const totalCells = firstDay + daysInMonth;
    for (let i = 1; i <= 42 - totalCells; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = i;
        calendarGrid.appendChild(day);
    }
}

function changeCalMonth(delta) {
    calMonth += delta;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    else if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalCalendar();
}

function showDateEvents(dateStr, dayEvents) {
    if (dayEvents.length > 0) {
        alert(`Events on ${dateStr}:\n${dayEvents.map(e => `- ${e.title} (${e.time || 'All day'})`).join('\n')}`);
    }
}

// ============================================
// EVENTS
// ============================================
function openEventModal(date = null) {
    const modal = document.getElementById('event-modal');
    modal.classList.add('active');
    document.getElementById('event-date').value = date || '';
    document.getElementById('event-title').value = '';
    document.getElementById('event-time').value = '';
    document.getElementById('event-link').value = '';
}

function closeEventModal() {
    document.getElementById('event-modal').classList.remove('active');
}

async function saveEvent(e) {
    e.preventDefault();
    const payload = {
        title: document.getElementById('event-title').value,
        date: document.getElementById('event-date').value,
        time: document.getElementById('event-time').value,
        link: document.getElementById('event-link').value || null,
        created_by: currentUser?.id || null
    };

    const { error } = await db.from('events').insert(payload);
    if (error) { showToast('Error saving event: ' + error.message, 'error'); return; }

    showToast('Event created!', 'success');
    closeEventModal();
    renderCalCalendar();
    await renderEvents();
    await renderDashboardEvents();
}

async function renderEvents() {
    const eventsGrid = document.getElementById('events-grid');
    if (!eventsGrid) return;

    const { data: events, error } = await db.from('events').select('*').order('date', { ascending: true });

    if (error) { eventsGrid.innerHTML = '<p style="color:red">Error loading events.</p>'; return; }
    if (!events || events.length === 0) {
        eventsGrid.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">No events yet. Click "New Event" to add one.</p>';
        document.getElementById('delete-all-events-btn').style.display = 'none';
        return;
    }

    // Show delete all button for admin
    if (currentUserRole === 'admin') {
        document.getElementById('delete-all-events-btn').style.display = 'inline-flex';
    }

    eventsGrid.innerHTML = events.map(event => {
        const date = new Date(event.date + 'T00:00:00');
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
                    ${currentUserRole === 'admin' ? `<button class="btn btn-secondary" style="margin-top:10px;padding:8px 16px;" onclick="deleteEvent(${event.id})">Delete</button>` : ''}
                </div>
            </div>`;
    }).join('');
}

async function deleteEvent(id) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    const { error } = await db.from('events').delete().eq('id', id);
    if (error) { showToast('Error deleting event: ' + error.message, 'error'); return; }
    showToast('Event deleted.', 'success');
    renderCalCalendar();
    await renderEvents();
    await renderDashboardEvents();
}

async function deleteAllEvents() {
    if (!confirm('Are you sure you want to delete ALL events? This action cannot be undone.')) return;
    const { error } = await db.from('events').delete().neq('id', 0);
    if (error) { showToast('Error deleting events: ' + error.message, 'error'); return; }
    showToast('All events deleted.', 'success');
    renderCalCalendar();
    await renderEvents();
    await renderDashboardEvents();
}

// ============================================
// MEMBERS
// ============================================
function openMemberModal() {
    document.getElementById('member-modal').classList.add('active');
    document.getElementById('member-name').value = '';
    document.getElementById('member-role').value = '';
}

function closeMemberModal() {
    document.getElementById('member-modal').classList.remove('active');
}

async function saveMember(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('member-name').value,
        role: document.getElementById('member-role').value
    };

    const { error } = await db.from('members').insert(payload);
    if (error) { showToast('Error saving member: ' + error.message, 'error'); return; }

    showToast('Member added!', 'success');
    closeMemberModal();
    await renderMembers();
    await renderDashboardMembers();
    await updateMemberSelect();
}

async function renderMembers() {
    const membersGrid = document.getElementById('members-grid');
    if (!membersGrid) return;

    const { data: members, error } = await db.from('members').select('*').order('name');

    if (error) { membersGrid.innerHTML = '<p style="color:red">Error loading members.</p>'; return; }
    if (!members || members.length === 0) {
        membersGrid.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">No members yet. Click "Add Member" to add one.</p>';
        return;
    }

    const isAdmin = currentUserRole === 'admin';
    membersGrid.innerHTML = members.map(m => `
        <div class="member-card">
            <div class="member-avatar"><i class="fas fa-user"></i></div>
            <div class="member-info">
                <h3>${m.name}</h3>
                <p>${m.role || ''}</p>
            </div>
            ${isAdmin ? `<button class="btn btn-secondary" onclick="deleteMember(${m.id})" style="margin-left:auto">Remove</button>` : ''}
        </div>`).join('');
}

async function deleteMember(id) {
    if (!confirm('Are you sure you want to delete this member?')) return;
    const { error } = await db.from('members').delete().eq('id', id);
    if (error) { showToast('Error deleting member: ' + error.message, 'error'); return; }
    showToast('Member deleted.', 'success');
    await renderMembers();
    await renderDashboardMembers();
    await updateMemberSelect();
}

// ============================================
// ASSIGN TASKS
// ============================================
function openAssignTaskModal() {
    document.getElementById('assign-task-modal').classList.add('active');
    document.getElementById('assigned-task-title').value = '';
    document.getElementById('assigned-task-date').value = '';
    updateMemberSelect();
}

function closeAssignTaskModal() {
    document.getElementById('assign-task-modal').classList.remove('active');
}

async function updateMemberSelect() {
    const select = document.getElementById('assigned-task-member');
    if (!select) return;
    const { data: members } = await db.from('members').select('id, name').order('name');
    select.innerHTML = '<option value="">Select member</option>';
    (members || []).forEach(m => {
        select.innerHTML += `<option value="${m.name}">${m.name}</option>`;
    });
}

async function saveAssignedTask(e) {
    e.preventDefault();
    const dueDateValue = document.getElementById('assigned-task-date').value;
    const payload = {
        title: document.getElementById('assigned-task-title').value,
        assignee: document.getElementById('assigned-task-member').value,
        due_date: dueDateValue || null,
        completed: false
    };

    const { error } = await db.from('assigned_tasks').insert(payload);
    if (error) {
        showToast('Error saving task: ' + error.message, 'error');
        console.error('Assigned task insert error:', error);
        return;
    }

    showToast('Task assigned!', 'success');
    closeAssignTaskModal();
    await renderAssignedTasks();
}

async function renderAssignedTasks() {
    const { data: tasks, error } = await db.from('assigned_tasks').select('*').order('due_date');
    if (error) return;

    const today = new Date().toISOString().split('T')[0];
    const upcoming = (tasks || []).filter(t => !t.completed && t.due_date >= today);
    const overdue = (tasks || []).filter(t => !t.completed && t.due_date < today);
    const completed = (tasks || []).filter(t => t.completed);

    renderTaskList('upcoming', upcoming);
    renderTaskList('overdue', overdue);
    renderTaskList('completed', completed);
}

function renderTaskList(type, tasks) {
    const container = document.getElementById(`${type}-tab`);
    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-secondary)">No ${type} tasks.</p>`;
        return;
    }

    container.innerHTML = `
        <ul class="task-items">
            ${tasks.map(task => `
                <li class="task-item ${task.completed ? 'completed' : ''}">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleAssignedTask(${task.id})">
                    <span class="task-title">${task.title}</span>
                    <span class="task-assignee">${task.assignee}</span>
                    <span class="task-date ${type === 'overdue' ? 'overdue' : ''}">${task.due_date || ''}</span>
                    ${currentUserRole === 'admin' ? `<button class="btn-delete-assigned-task" onclick="deleteAssignedTask(${task.id})" style="background: none; border: none; color: var(--danger); cursor: pointer; padding: 5px; margin-left: 10px;"><i class="fas fa-trash"></i></button>` : ''}
                </li>`).join('')}
        </ul>
        ${currentUserRole === 'admin' && tasks.length > 0 ? `<button class="btn-delete-all-tasks" onclick="deleteAllAssignedTasks('${type}')" style="background: var(--danger); color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; margin-top: 10px;">Delete All ${type.charAt(0).toUpperCase() + type.slice(1)} Tasks</button>` : ''}`;
}

async function toggleAssignedTask(id) {
    const { data: task } = await db.from('assigned_tasks').select('completed').eq('id', id).single();
    if (!task) return;
    const { error } = await db.from('assigned_tasks').update({ completed: !task.completed }).eq('id', id);
    if (error) { showToast('Error updating task.', 'error'); return; }
    await renderAssignedTasks();
}

async function deleteAssignedTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    const { error } = await db.from('assigned_tasks').delete().eq('id', id);
    if (error) { showToast('Error deleting task: ' + error.message, 'error'); return; }
    showToast('Task deleted.', 'success');
    await renderAssignedTasks();
}

async function deleteAllAssignedTasks(type) {
    if (!confirm(`Are you sure you want to delete ALL ${type} tasks? This action cannot be undone.`)) return;
    const today = new Date().toISOString().split('T')[0];
    let query = db.from('assigned_tasks').delete();
    
    if (type === 'upcoming') {
        query = query.eq('completed', false).gte('due_date', today);
    } else if (type === 'overdue') {
        query = query.eq('completed', false).lt('due_date', today);
    } else if (type === 'completed') {
        query = query.eq('completed', true);
    }
    
    const { error } = await query;
    if (error) { showToast('Error deleting tasks: ' + error.message, 'error'); return; }
    showToast('All ' + type + ' tasks deleted.', 'success');
    await renderAssignedTasks();
}

// ============================================
// FILES
// ============================================
function openFileModal() {
    document.getElementById('file-modal').classList.add('active');
    document.getElementById('file-name').value = '';
    document.getElementById('file-link').value = '';
}

function closeFileModal() {
    document.getElementById('file-modal').classList.remove('active');
}

async function saveFile(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('file-name').value,
        link: document.getElementById('file-link').value
    };

    const { error } = await db.from('files').insert(payload);
    if (error) { showToast('Error saving file: ' + error.message, 'error'); return; }

    showToast('File link added!', 'success');
    closeFileModal();
    await renderFiles();
}

async function renderFiles() {
    const filesList = document.getElementById('files-list');
    if (!filesList) return;

    const { data: files, error } = await db.from('files').select('*').order('name');

    if (error) { filesList.innerHTML = '<p style="color:red">Error loading files.</p>'; return; }
    if (!files || files.length === 0) {
        filesList.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">No files yet. Click "Add File Link" to add one.</p>';
        document.getElementById('delete-all-files-btn').style.display = 'none';
        return;
    }

    // Show delete all button for admin
    if (currentUserRole === 'admin') {
        document.getElementById('delete-all-files-btn').style.display = 'inline-flex';
    }

    filesList.innerHTML = files.map(file => `
        <div class="file-item">
            <div class="file-icon"><i class="fas fa-file-alt"></i></div>
            <div class="file-info">
                <h4>${file.name}</h4>
                <a href="${file.link}" target="_blank" class="file-link">
                    <i class="fas fa-external-link-alt"></i> Open in Drive
                </a>
            </div>
            ${currentUserRole === 'admin' ? `<button class="btn btn-secondary" onclick="deleteFile(${file.id})" style="margin-left:auto">Remove</button>` : ''}
        </div>`).join('');
}

async function deleteFile(id) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    const { error } = await db.from('files').delete().eq('id', id);
    if (error) { showToast('Error deleting file.', 'error'); return; }
    showToast('File removed.', 'success');
    await renderFiles();
}

async function deleteAllFiles() {
    if (!confirm('Are you sure you want to delete ALL files? This action cannot be undone.')) return;
    const { error } = await db.from('files').delete().neq('id', 0);
    if (error) { showToast('Error deleting files.', 'error'); return; }
    showToast('All files deleted.', 'success');
    await renderFiles();
}

// ============================================
// STUDENTS
// ============================================
function openStudentModal() {
    document.getElementById('student-modal').classList.add('active');
    document.getElementById('student-name').value = '';
    // Reset the shared student-moodle-id and student-email fields for the modal form
    // (they share IDs with the login form — use data from the modal form specifically)
    const modal = document.getElementById('student-modal');
    modal.querySelector('[name="student-modal-moodle-id"]') && (modal.querySelector('[name="student-modal-moodle-id"]').value = '');
}

function closeStudentModal() {
    document.getElementById('student-modal').classList.remove('active');
}

async function saveStudent(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
        name: document.getElementById('student-name').value,
        moodle_id: form.querySelector('[name="student-modal-moodle-id"]').value,
        email: form.querySelector('[name="student-modal-email"]').value
    };

    const { error } = await db.from('students').insert(payload);
    if (error) { showToast('Error saving student: ' + error.message, 'error'); return; }

    showToast('Student added!', 'success');
    closeStudentModal();
    await renderStudents();
}

async function renderStudents() {
    const studentsGrid = document.getElementById('students-grid');
    if (!studentsGrid) return;

    const { data: students, error } = await db.from('students').select('*').order('name');

    if (error) { studentsGrid.innerHTML = '<p style="color:red">Error loading students.</p>'; return; }
    if (!students || students.length === 0) {
        studentsGrid.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">No students added yet. Click "Add Student" to add one.</p>';
        document.getElementById('delete-all-students-btn').style.display = 'none';
        return;
    }

    // Show delete all button for admin
    if (currentUserRole === 'admin') {
        document.getElementById('delete-all-students-btn').style.display = 'inline-flex';
    }

    const isAdmin = currentUserRole === 'admin';
    studentsGrid.innerHTML = students.map(s => `
        <div class="student-card">
            <div class="student-avatar"><i class="fas fa-user-graduate"></i></div>
            <div class="student-info">
                <h3>${s.name}</h3>
                <p><i class="fas fa-id-card"></i> Moodle ID: ${s.moodle_id}</p>
                <p><i class="fas fa-envelope"></i> ${s.email}</p>
            </div>
            ${isAdmin ? `<button class="btn btn-secondary" onclick="deleteStudent(${s.id})">Remove</button>` : ''}
        </div>`).join('');
}

async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    const { error } = await db.from('students').delete().eq('id', id);
    if (error) { showToast('Error removing student.', 'error'); return; }
    showToast('Student removed.', 'success');
    await renderStudents();
}

async function deleteAllStudents() {
    if (!confirm('Are you sure you want to delete ALL students? This action cannot be undone.')) return;
    const { error } = await db.from('students').delete().neq('id', 0);
    if (error) { showToast('Error deleting students.', 'error'); return; }
    showToast('All students deleted.', 'success');
    await renderStudents();
}

// ============================================
// SETTINGS / PROFILE
// ============================================
async function loadSettings() {
    if (!currentUser) return;

    // For Supabase-authenticated users (admins), load from profiles table
    if (currentUserRole === 'admin' && currentUser.id && typeof currentUser.id === 'string' && currentUser.id.includes('-')) {
        const { data } = await db.from('profiles').select('name, phone, moodle_id').eq('id', currentUser.id).single();
        if (data) {
            if (data.name && document.getElementById('settings-name')) document.getElementById('settings-name').value = data.name;
            if (data.phone && document.getElementById('settings-phone')) document.getElementById('settings-phone').value = data.phone;
            if (data.moodle_id && document.getElementById('settings-moodle-id')) document.getElementById('settings-moodle-id').value = data.moodle_id;
        }
        // Populate email from auth user
        if (document.getElementById('settings-email') && currentUser.email) {
            document.getElementById('settings-email').value = currentUser.email;
        }
    }

    // Role display badge
    const roleDisplay = document.querySelector('.role-display .role-badge');
    if (roleDisplay) roleDisplay.textContent = currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1);
}

async function saveProfileSettings(e) {
    e.preventDefault();
    if (!currentUser) return;

    const updates = {
        name: document.getElementById('settings-name').value,
        phone: document.getElementById('settings-phone').value,
        moodle_id: document.getElementById('settings-moodle-id').value || null
    };

    const { error } = await db.from('profiles').update(updates).eq('id', currentUser.id);
    if (error) { showToast('Error saving profile: ' + error.message, 'error'); return; }

    showToast('Profile saved!', 'success');
    document.querySelector('.profile-name').textContent = updates.name || 'Admin';
}

async function updatePassword(e) {
    e.preventDefault();
    const currentPwd = document.getElementById('current-password').value;
    const newPwd = document.getElementById('new-password').value;
    const confirmPwd = document.getElementById('confirm-password').value;

    if (!currentPwd || !newPwd || !confirmPwd) { showToast('Please fill in all password fields', 'error'); return; }
    if (newPwd !== confirmPwd) { showToast('New passwords do not match', 'error'); return; }
    if (newPwd.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }

    const { error } = await db.auth.updateUser({ password: newPwd });
    if (error) { showToast('Error updating password: ' + error.message, 'error'); return; }

    showToast('Password updated successfully!', 'success');
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
}

function savePreferences() {
    // Preferences are UI-only for now (no DB column needed)
    showToast('Preferences saved!', 'success');
}

// ============================================
// GENERAL TASK FUNCTIONS (My Tasks section)
// ============================================
function toggleTask(checkbox) {
    const taskItem = checkbox.closest('.task-item');
    if (checkbox.checked) taskItem.classList.add('completed');
    else taskItem.classList.remove('completed');
}

// ============================================
// MODAL HELPERS
// ============================================
function closeAllModals() {
    document.querySelectorAll('.modal, .calendar-event-modal').forEach(m => m.classList.remove('active'));
}

// ============================================
// DASHBOARD TABS
// ============================================
function setupDashboardTabs() {
    // Tasks Assigned tabs in dashboard
    document.querySelectorAll('.tasks-assigned-card .tab-link').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.tasks-assigned-card .tab-link').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Budget tabs in dashboard
    document.querySelectorAll('.budget-card .tab-link').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.budget-card .tab-link').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            updateBudgetDisplay(this.getAttribute('data-budget'));
        });
    });

    // Settings tabs
    const settingsBtns = document.querySelectorAll('.settings-tab-btn');
    settingsBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const tabName = this.getAttribute('data-settings-tab');
            settingsBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
            const target = document.getElementById(tabName + '-settings-tab');
            if (target) target.classList.add('active');
        });
    });
}

function updateBudgetDisplay(type) {
    const budgetAmount = document.querySelector('.budget-amount .amount');
    if (!budgetAmount) return;
    const budgets = { weekly: '$3,200', monthly: '$12,500', annually: '$150,000' };
    budgetAmount.textContent = budgets[type] || '$12,500';
}

// ============================================
// BUDGET TABS
// ============================================
function setupBudgetTabs() {
    const budgetTabBtns = document.querySelectorAll('.budget-tab-btn');
    budgetTabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const tabName = this.getAttribute('data-budget-tab');
            budgetTabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.budget-tab-content').forEach(c => c.classList.remove('active'));
            const target = document.getElementById(tabName + '-budget-tab');
            if (target) target.classList.add('active');
        });
    });
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed; bottom: 24px; right: 24px; z-index: 9999;
            display: flex; flex-direction: column; gap: 10px; pointer-events: none;`;
        document.body.appendChild(container);
    }

    const colors = { success: '#14b8a6', error: '#ef4444', info: '#6366f1' };
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${colors[type] || colors.info}; color: #fff;
        padding: 12px 20px; border-radius: 10px; font-size: 14px;
        display: flex; align-items: center; gap: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        pointer-events: all; transition: opacity 0.4s; opacity: 0;`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}
