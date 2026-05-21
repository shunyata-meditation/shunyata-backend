/**
 * Shunyata Meditation API - Stats Dashboard
 * Comprehensive statistics and analytics for meditation sessions
 */

// Global state
let allSessions = [];
let filteredSessions = [];
let currentPage = 1;
const sessionsPerPage = 10;
let sortColumn = 'start_time';
let sortDirection = 'desc';

// Chart instances
let timelineChart = null;
let typeChart = null;
let durationChart = null;
let completionChart = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
});

/**
 * Check if user is authenticated
 */
function checkAuthentication() {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
        showAuthPrompt();
    } else {
        hideAuthPrompt();
        loadDashboard();
    }
}

/**
 * Show authentication prompt
 */
function showAuthPrompt() {
    document.getElementById('auth-prompt').style.display = 'flex';
    document.getElementById('dashboard-main').style.display = 'none';
}

/**
 * Hide authentication prompt
 */
function hideAuthPrompt() {
    document.getElementById('auth-prompt').style.display = 'none';
    document.getElementById('dashboard-main').style.display = 'block';
}

/**
 * Handle login form submission
 */
document.getElementById('login-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const response = await fetch('/api/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            hideAuthPrompt();
            loadDashboard();
        } else {
            errorDiv.textContent = 'Invalid credentials. Please try again.';
        }
    } catch (error) {
        errorDiv.textContent = 'Login failed. Please try again.';
        console.error('Login error:', error);
    }
});

/**
 * Handle logout
 */
document.getElementById('logout-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/';
});

/**
 * Load dashboard data
 */
async function loadDashboard() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('/api/meditations/sessions/', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            allSessions = await response.json();
            filteredSessions = [...allSessions];
            
            // Show logout button
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.style.display = 'inline-block';
            }
            
            // Hide register link
            const registerLink = document.getElementById('register-link');
            if (registerLink) {
                registerLink.style.display = 'none';
            }
            
            // Setup filters once (not in render cycle)
            setupFilters();
            
            // Apply initial filters to match UI ("Last 30 Days" is selected by default)
            applyFilters();
        } else if (response.status === 401) {
            // Token expired, show login
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            showAuthPrompt();
        } else {
            console.error('Failed to load sessions');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

/**
 * Render complete dashboard
 */
function renderDashboard() {
    if (allSessions.length === 0) {
        showEmptyState();
        return;
    }
    
    renderSummaryCards();
    renderCharts();
    renderSessionsTable();
}

/**
 * Show empty state when no sessions
 */
function showEmptyState() {
    const container = document.querySelector('.dashboard-container');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🧘</div>
            <h3>No Meditation Sessions Yet</h3>
            <p>Start your meditation journey by using the timer.</p>
            <a href="/timer" class="btn btn-primary">Start Meditating</a>
        </div>
    `;
}

/**
 * Calculate summary statistics
 */
function calculateStats() {
    const totalSessions = filteredSessions.length;
    
    // Calculate total time in seconds
    let totalSeconds = 0;
    filteredSessions.forEach(session => {
        const duration = parseDuration(session.duration);
        totalSeconds += duration;
    });
    
    const avgSeconds = totalSessions > 0 ? totalSeconds / totalSessions : 0;
    
    // Calculate streak
    const streak = calculateStreak(allSessions);
    const longestStreak = calculateLongestStreak(allSessions);
    
    return {
        totalSessions,
        totalTime: formatDuration(totalSeconds),
        avgDuration: formatDuration(avgSeconds),
        currentStreak: streak,
        longestStreak: longestStreak
    };
}

/**
 * Parse duration string to seconds
 */
function parseDuration(durationStr) {
    // Duration format: "HH:MM:SS" or "MM:SS" or similar
    const parts = durationStr.split(':');
    let seconds = 0;
    
    if (parts.length === 3) {
        seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    } else if (parts.length === 2) {
        seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else {
        seconds = parseInt(parts[0]);
    }
    
    return seconds;
}

/**
 * Format seconds to readable duration
 */
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

/**
 * Calculate current streak (consecutive days)
 */
function calculateStreak(sessions) {
    if (sessions.length === 0) return 0;
    
    const sortedSessions = [...sessions].sort((a, b) => 
        new Date(b.start_time) - new Date(a.start_time)
    );
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    for (let session of sortedSessions) {
        const sessionDate = new Date(session.start_time);
        sessionDate.setHours(0, 0, 0, 0);
        
        if (sessionDate.getTime() === currentDate.getTime()) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else if (sessionDate.getTime() < currentDate.getTime()) {
            break;
        }
    }
    
    return streak;
}

/**
 * Calculate longest streak
 */
function calculateLongestStreak(sessions) {
    if (sessions.length === 0) return 0;
    
    const dates = [...new Set(sessions.map(s => {
        const d = new Date(s.start_time);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }))].sort((a, b) => a - b);
    
    let maxStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < dates.length; i++) {
        const dayDiff = (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24);
        
        if (dayDiff === 1) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }
    
    return maxStreak;
}

/**
 * Render summary cards
 */
function renderSummaryCards() {
    const stats = calculateStats();
    
    document.getElementById('total-sessions').textContent = stats.totalSessions;
    document.getElementById('total-time').textContent = stats.totalTime;
    document.getElementById('avg-duration').textContent = stats.avgDuration;
    document.getElementById('current-streak').textContent = stats.currentStreak;
}

/**
 * Render all charts
 */
function renderCharts() {
    renderTimelineChart();
    renderTypeDistributionChart();
    renderDurationByTypeChart();
    renderCompletionRateChart();
}

/**
 * Render sessions timeline chart
 */
function renderTimelineChart() {
    const ctx = document.getElementById('timeline-chart');
    if (!ctx) return;
    
    // Get last 30 days
    const days = 30;
    const labels = [];
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        const count = filteredSessions.filter(session => {
            const sessionDate = new Date(session.start_time);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === date.getTime();
        }).length;
        
        data.push(count);
    }
    
    if (timelineChart) {
        timelineChart.destroy();
    }
    
    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sessions',
                data: data,
                borderColor: '#7a8b6e',
                backgroundColor: 'rgba(122, 139, 110, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Render meditation type distribution chart
 */
function renderTypeDistributionChart() {
    const ctx = document.getElementById('type-chart');
    if (!ctx) return;
    
    const typeCounts = {};
    filteredSessions.forEach(session => {
        typeCounts[session.meditation_type] = (typeCounts[session.meditation_type] || 0) + 1;
    });
    
    const labels = Object.keys(typeCounts).map(type => 
        type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    );
    const data = Object.values(typeCounts);
    
    if (typeChart) {
        typeChart.destroy();
    }
    
    typeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#7a8b6e',
                    '#a8b5a0',
                    '#6b8e6b',
                    '#8b7355',
                    '#d4cfc7',
                    '#5c5c5c'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

/**
 * Render average duration by type chart
 */
function renderDurationByTypeChart() {
    const ctx = document.getElementById('duration-chart');
    if (!ctx) return;
    
    const typeData = {};
    filteredSessions.forEach(session => {
        if (!typeData[session.meditation_type]) {
            typeData[session.meditation_type] = { total: 0, count: 0 };
        }
        typeData[session.meditation_type].total += parseDuration(session.duration);
        typeData[session.meditation_type].count++;
    });
    
    const labels = Object.keys(typeData).map(type => 
        type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    );
    const data = Object.values(typeData).map(d => Math.round(d.total / d.count / 60));
    
    if (durationChart) {
        durationChart.destroy();
    }
    
    durationChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Avg Minutes',
                data: data,
                backgroundColor: '#7a8b6e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Render completion rate chart
 */
function renderCompletionRateChart() {
    const ctx = document.getElementById('completion-chart');
    if (!ctx) return;
    
    // Get last 30 days completion rate
    const days = 30;
    const labels = [];
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        const daySessions = filteredSessions.filter(session => {
            const sessionDate = new Date(session.start_time);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === date.getTime();
        });
        
        const completionRate = daySessions.length > 0 
            ? (daySessions.filter(s => s.completed).length / daySessions.length) * 100 
            : 0;
        
        data.push(completionRate);
    }
    
    if (completionChart) {
        completionChart.destroy();
    }
    
    completionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Completion %',
                data: data,
                borderColor: '#6b8e6b',
                backgroundColor: 'rgba(107, 142, 107, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render sessions table
 */
function renderSessionsTable() {
    const tbody = document.getElementById('sessions-tbody');
    if (!tbody) return;
    
    // Sort sessions
    const sorted = [...filteredSessions].sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        
        if (sortColumn === 'start_time' || sortColumn === 'end_time') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        }
        
        if (sortDirection === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    // Paginate
    const start = (currentPage - 1) * sessionsPerPage;
    const end = start + sessionsPerPage;
    const paginated = sorted.slice(start, end);
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Create rows using DOM manipulation to prevent XSS
    paginated.forEach(session => {
        const tr = document.createElement('tr');
        
        // Date & Time column
        const tdDate = document.createElement('td');
        tdDate.textContent = new Date(session.start_time).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        tr.appendChild(tdDate);
        
        // Type column
        const tdType = document.createElement('td');
        const typeBadge = document.createElement('span');
        typeBadge.className = 'type-badge-table';
        typeBadge.textContent = session.meditation_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        tdType.appendChild(typeBadge);
        tr.appendChild(tdType);
        
        // Duration column
        const tdDuration = document.createElement('td');
        tdDuration.textContent = formatDuration(parseDuration(session.duration));
        tr.appendChild(tdDuration);
        
        // Status column
        const tdStatus = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge ${session.completed ? 'completed' : 'incomplete'}`;
        statusBadge.textContent = session.completed ? 'Completed' : 'Incomplete';
        tdStatus.appendChild(statusBadge);
        tr.appendChild(tdStatus);
        
        // Notes column (XSS-safe)
        const tdNotes = document.createElement('td');
        const notesSpan = document.createElement('span');
        notesSpan.className = 'session-notes';
        notesSpan.textContent = session.notes || '-';
        if (session.notes) {
            notesSpan.setAttribute('title', session.notes);
        }
        tdNotes.appendChild(notesSpan);
        tr.appendChild(tdNotes);
        
        tbody.appendChild(tr);
    });
    
    renderPagination();
}

/**
 * Render pagination controls
 */
function renderPagination() {
    const totalPages = Math.ceil(filteredSessions.length / sessionsPerPage);
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }
}

/**
 * Setup filters
 */
function setupFilters() {
    // Date range filter
    document.getElementById('date-range')?.addEventListener('change', applyFilters);
    
    // Type filter
    document.getElementById('type-filter')?.addEventListener('change', applyFilters);
    
    // Completion filter
    document.getElementById('completion-filter')?.addEventListener('change', applyFilters);
    
    // Custom date inputs
    document.getElementById('start-date')?.addEventListener('change', applyFilters);
    document.getElementById('end-date')?.addEventListener('change', applyFilters);
    
    // Show/hide custom date inputs
    document.getElementById('date-range')?.addEventListener('change', function(e) {
        const customDates = document.getElementById('custom-dates');
        if (customDates) {
            customDates.style.display = e.target.value === 'custom' ? 'flex' : 'none';
        }
    });
}

/**
 * Apply filters
 */
function applyFilters() {
    const dateRange = document.getElementById('date-range')?.value || 'all';
    const typeFilter = document.getElementById('type-filter')?.value || 'all';
    const completionFilter = document.getElementById('completion-filter')?.value || 'all';
    
    filteredSessions = allSessions.filter(session => {
        // Date filter
        if (dateRange !== 'all') {
            const sessionDate = new Date(session.start_time);
            const today = new Date();
            
            if (dateRange === '7') {
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                if (sessionDate < weekAgo) return false;
            } else if (dateRange === '30') {
                const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                if (sessionDate < monthAgo) return false;
            } else if (dateRange === '90') {
                const quarterAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                if (sessionDate < quarterAgo) return false;
            } else if (dateRange === 'custom') {
                const startDate = document.getElementById('start-date')?.value;
                const endDate = document.getElementById('end-date')?.value;
                
                if (startDate && sessionDate < new Date(startDate)) return false;
                if (endDate && sessionDate > new Date(endDate)) return false;
            }
        }
        
        // Type filter
        if (typeFilter !== 'all' && session.meditation_type !== typeFilter) {
            return false;
        }
        
        // Completion filter
        if (completionFilter === 'completed' && !session.completed) {
            return false;
        } else if (completionFilter === 'incomplete' && session.completed) {
            return false;
        }
        
        return true;
    });
    
    currentPage = 1;
    renderDashboard();
}

/**
 * Setup table sorting
 */
document.querySelectorAll('.sessions-table th.sortable').forEach(th => {
    th.addEventListener('click', function() {
        const column = this.dataset.column;
        
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = column;
            sortDirection = 'desc';
        }
        
        // Update UI
        document.querySelectorAll('.sessions-table th').forEach(h => {
            h.classList.remove('sort-asc', 'sort-desc');
        });
        
        this.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        
        renderSessionsTable();
    });
});

/**
 * Setup pagination
 */
document.getElementById('prev-page')?.addEventListener('click', function() {
    if (currentPage > 1) {
        currentPage--;
        renderSessionsTable();
    }
});

document.getElementById('next-page')?.addEventListener('click', function() {
    const totalPages = Math.ceil(filteredSessions.length / sessionsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderSessionsTable();
    }
});
