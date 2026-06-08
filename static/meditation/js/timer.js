/**
 * Shunyata Meditation Timer
 * Integrates with the meditation session API
 */

class MeditationTimer {
    constructor() {
        this.timerInterval = null;
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = null;
        this.endTime = null;
        this.selectedType = 'mindfulness';
        this.selectedDuration = 10;
        this.accessToken = localStorage.getItem('access_token');
        this.refreshToken = localStorage.getItem('refresh_token');
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkAuthentication();
    }

    initializeElements() {
        this.authPrompt = document.getElementById('auth-prompt');
        this.timerMain = document.getElementById('timer-main');
        this.timerDisplay = document.getElementById('timer-display');
        this.timerStatus = document.getElementById('timer-status');
        this.progressCircle = document.getElementById('progress-circle');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resumeBtn = document.getElementById('resume-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.sessionComplete = document.getElementById('session-complete');
        this.bellSound = document.getElementById('bell-sound');
        this.loginForm = document.getElementById('login-form');
        this.logoutBtn = document.getElementById('logout-btn');
        this.registerLink = document.getElementById('register-link');
    }

    attachEventListeners() {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.logoutBtn.addEventListener('click', (e) => this.handleLogout(e));
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.pauseBtn.addEventListener('click', () => this.pauseTimer());
        this.resumeBtn.addEventListener('click', () => this.resumeTimer());
        this.stopBtn.addEventListener('click', () => this.stopTimer());
        
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectType(e));
        });
        
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectDuration(e));
        });
        
        document.getElementById('save-session-btn').addEventListener('click', () => this.saveSession());
        document.getElementById('new-session-btn').addEventListener('click', () => this.resetTimer());
    }

    async checkAuthentication() {
        if (this.accessToken) {
            const isValid = await this.validateToken();
            if (isValid) {
                this.showTimerInterface();
                this.loadRecentSessions();
            } else {
                this.showAuthPrompt();
            }
        } else {
            this.showAuthPrompt();
        }
    }

    async validateToken() {
        try {
            const response = await fetch('/api/meditations/sessions/', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            if (response.status === 401) {
                const refreshed = await this.refreshAccessToken();
                return refreshed;
            }
            
            return response.ok;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    async refreshAccessToken() {
        if (!this.refreshToken) return false;
        
        try {
            const response = await fetch('/api/auth/refresh/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh: this.refreshToken
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.accessToken = data.access;
                localStorage.setItem('access_token', data.access);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        
        try {
            const response = await fetch('/api/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.accessToken = data.access;
                this.refreshToken = data.refresh;
                localStorage.setItem('access_token', data.access);
                localStorage.setItem('refresh_token', data.refresh);
                this.showTimerInterface();
                this.loadRecentSessions();
            } else {
                const error = await response.json();
                errorDiv.textContent = error.detail || 'Invalid credentials';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = 'Login failed. Please try again.';
            errorDiv.style.display = 'block';
        }
    }

    handleLogout(e) {
        e.preventDefault();
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        this.showAuthPrompt();
    }

    showAuthPrompt() {
        this.authPrompt.style.display = 'flex';
        this.timerMain.style.display = 'none';
        this.logoutBtn.style.display = 'none';
        this.registerLink.style.display = 'inline';
    }

    showTimerInterface() {
        this.authPrompt.style.display = 'none';
        this.timerMain.style.display = 'block';
        this.logoutBtn.style.display = 'inline';
        this.registerLink.style.display = 'none';
    }

    selectType(e) {
        document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.selectedType = e.currentTarget.dataset.type;
    }

    selectDuration(e) {
        document.querySelectorAll('.duration-btn').forEach(btn => btn.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        const minutes = e.currentTarget.dataset.minutes;
        const customDurationDiv = document.getElementById('custom-duration');
        
        if (minutes === 'custom') {
            customDurationDiv.style.display = 'block';
            const customInput = document.getElementById('custom-minutes');
            this.selectedDuration = parseInt(customInput.value) || 10;
        } else {
            customDurationDiv.style.display = 'none';
            this.selectedDuration = parseInt(minutes);
        }
    }

    startTimer() {
        const customInput = document.getElementById('custom-minutes');
        if (document.querySelector('.duration-btn[data-minutes="custom"]').classList.contains('active')) {
            this.selectedDuration = parseInt(customInput.value) || 10;
        }
        
        this.totalSeconds = this.selectedDuration * 60;
        this.remainingSeconds = this.totalSeconds;
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = new Date();
        
        this.bellSound.play().catch(e => console.log('Start bell sound failed:', e));
        
        this.updateDisplay();
        this.updateProgress();
        this.timerStatus.textContent = 'Meditating...';
        
        this.startBtn.style.display = 'none';
        this.pauseBtn.style.display = 'inline-flex';
        this.stopBtn.style.display = 'inline-flex';
        
        document.querySelectorAll('.type-btn, .duration-btn').forEach(btn => {
            btn.disabled = true;
        });
        
        this.timerInterval = setInterval(() => {
            this.remainingSeconds--;
            this.updateDisplay();
            this.updateProgress();
            
            if (this.remainingSeconds <= 0) {
                this.completeSession();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isPaused = true;
        clearInterval(this.timerInterval);
        this.timerStatus.textContent = 'Paused';
        this.pauseBtn.style.display = 'none';
        this.resumeBtn.style.display = 'inline-flex';
    }

    resumeTimer() {
        this.isPaused = false;
        this.timerStatus.textContent = 'Meditating...';
        this.resumeBtn.style.display = 'none';
        this.pauseBtn.style.display = 'inline-flex';
        
        this.timerInterval = setInterval(() => {
            this.remainingSeconds--;
            this.updateDisplay();
            this.updateProgress();
            
            if (this.remainingSeconds <= 0) {
                this.completeSession();
            }
        }, 1000);
    }

    stopTimer() {
        if (confirm('Are you sure you want to stop this session?')) {
            clearInterval(this.timerInterval);
            this.endTime = new Date();
            this.showCompletionScreen(false);
        }
    }

    completeSession() {
        clearInterval(this.timerInterval);
        this.endTime = new Date();
        this.bellSound.play().catch(e => console.log('Bell sound failed:', e));
        this.showCompletionScreen(true);
    }

    showCompletionScreen(completed) {
        this.isRunning = false;
        this.timerStatus.textContent = completed ? 'Complete!' : 'Stopped';
        
        const actualDuration = Math.floor((this.endTime - this.startTime) / 1000);
        const minutes = Math.floor(actualDuration / 60);
        const seconds = actualDuration % 60;
        
        document.getElementById('summary-duration').textContent = 
            `${minutes}m ${seconds}s`;
        document.getElementById('summary-type').textContent = 
            this.selectedType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        this.sessionComplete.style.display = 'flex';
        this.pauseBtn.style.display = 'none';
        this.resumeBtn.style.display = 'none';
        this.stopBtn.style.display = 'none';
    }

    async saveSession() {
        const notes = document.getElementById('session-notes').value;
        const saveStatus = document.getElementById('save-status');
        const saveBtn = document.getElementById('save-session-btn');
        
        saveBtn.disabled = true;
        saveStatus.textContent = 'Saving...';
        saveStatus.className = 'save-status';
        
        const duration = Math.floor((this.endTime - this.startTime) / 1000);
        
        const sessionData = {
            meditation_type: this.selectedType,
            start_time: this.startTime.toISOString(),
            end_time: this.endTime.toISOString(),
            duration: `00:${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`,
            completed: this.remainingSeconds <= 0,
            notes: notes
        };
        
        try {
            const response = await fetch('/api/meditations/sessions/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify(sessionData)
            });
            
            if (response.ok) {
                saveStatus.textContent = '✓ Session saved successfully!';
                saveStatus.className = 'save-status success';
                setTimeout(() => {
                    this.resetTimer();
                    this.loadRecentSessions();
                }, 1500);
            } else {
                if (response.status === 401) {
                    const refreshed = await this.refreshAccessToken();
                    if (refreshed) {
                        return this.saveSession();
                    }
                }
                throw new Error('Failed to save session');
            }
        } catch (error) {
            saveStatus.textContent = '✗ Failed to save session';
            saveStatus.className = 'save-status error';
            saveBtn.disabled = false;
        }
    }

    resetTimer() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        this.isPaused = false;
        this.remainingSeconds = 0;
        this.totalSeconds = 0;
        
        this.timerDisplay.textContent = '00:00';
        this.timerStatus.textContent = 'Ready';
        this.updateProgress();
        
        this.sessionComplete.style.display = 'none';
        this.startBtn.style.display = 'inline-flex';
        this.pauseBtn.style.display = 'none';
        this.resumeBtn.style.display = 'none';
        this.stopBtn.style.display = 'none';
        
        document.querySelectorAll('.type-btn, .duration-btn').forEach(btn => {
            btn.disabled = false;
        });
        
        document.getElementById('session-notes').value = '';
    }

    updateDisplay() {
        const minutes = Math.floor(this.remainingSeconds / 60);
        const seconds = this.remainingSeconds % 60;
        this.timerDisplay.textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    updateProgress() {
        const progress = this.totalSeconds > 0 
            ? ((this.totalSeconds - this.remainingSeconds) / this.totalSeconds) * 100 
            : 0;
        
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - (progress / 100) * circumference;
        this.progressCircle.style.strokeDashoffset = offset;
    }

    async loadRecentSessions() {
        const sessionsList = document.getElementById('sessions-list');
        
        try {
            const response = await fetch('/api/meditations/sessions/', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            if (response.ok) {
                const sessions = await response.json();
                this.displaySessions(sessions.slice(0, 5));
            } else {
                if (response.status === 401) {
                    const refreshed = await this.refreshAccessToken();
                    if (refreshed) {
                        return this.loadRecentSessions();
                    }
                }
                sessionsList.innerHTML = '<p class="error-message">Failed to load sessions</p>';
            }
        } catch (error) {
            sessionsList.innerHTML = '<p class="error-message">Failed to load sessions</p>';
        }
    }

    displaySessions(sessions) {
        const sessionsList = document.getElementById('sessions-list');
        
        if (sessions.length === 0) {
            sessionsList.innerHTML = '<p class="empty-message">No sessions yet. Start your first meditation!</p>';
            return;
        }
        
        sessionsList.innerHTML = sessions.map(session => {
            const startDate = new Date(session.start_time);
            const duration = session.duration;
            const type = session.meditation_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            return `
                <div class="session-item">
                    <div class="session-icon">${this.getTypeEmoji(session.meditation_type)}</div>
                    <div class="session-info">
                        <div class="session-type">${type}</div>
                        <div class="session-meta">
                            <span>${this.formatDate(startDate)}</span>
                            <span>•</span>
                            <span>${this.formatDuration(duration)}</span>
                            ${session.completed ? '<span class="completed-badge">✓</span>' : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getTypeEmoji(type) {
        const emojis = {
            'mindfulness': '🧠',
            'breathing': '🫁',
            'body_scan': '🧘‍♀️',
            'loving_kindness': '💚',
            'walking': '🚶',
            'other': '✨'
        };
        return emojis[type] || '✨';
    }

    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    formatDuration(duration) {
        const parts = duration.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parseInt(parts[2]);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MeditationTimer();
});
