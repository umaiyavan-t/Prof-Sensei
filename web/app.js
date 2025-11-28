// Global State
let currentUser = null;
let selectedMode = null;
let chatHistory = [];
let flashcards = [];
let currentCardIndex = 0;
let isFlipped = false;

const API_BASE = 'http://localhost:8080/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    initializeModeButtons();
    
    // Enter key to submit
    document.getElementById('topic-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') generateContent();
    });
});

// Auth Functions
function initializeAuth() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        await login(username, password);
    });
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        await register(name, username, password);
        
    });
}

function switchTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        tabs[0].classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
    
    hideMessage();
}

async function register(name, username, password) {
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Account created! Logging you in...', 'success');
            setTimeout(() => {
                currentUser = data;
                startApp();
            }, 1000);
        } else {
            showMessage(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage('Connection error. Please try again.', 'error');
    }
}

async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data;
            showMessage('Login successful!', 'success');
            setTimeout(startApp, 500);
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Connection error. Please try again.', 'error');
    }
}

async function handleLogin(event) {
    event && event.preventDefault && event.preventDefault();

    const usernameEl = document.querySelector("#username");
    const passwordEl = document.querySelector("#password");
    const errorEl = document.querySelector("#login-error");

    const username = usernameEl ? usernameEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value : "";

    if (!username || !password) {
        if (errorEl) errorEl.textContent = "Enter username and password";
        return;
    }

    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        // Expect JSON like: { success: true, user: {...}, token: "..." }
        const data = await res.json().catch(() => ({}));

        if (res.ok && data && data.success) {
            if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
            if (data.token) localStorage.setItem("token", data.token);

            // Redirect to the main page per README
            window.location.href = "/index.html";
            return;
        }

        const msg = (data && data.message) || "Login failed";
        if (errorEl) errorEl.textContent = msg;
    } catch (err) {
        console.error("Login error:", err);
        if (errorEl) errorEl.textContent = "Network error";
    }
}

function startApp() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    document.getElementById('user-name').textContent = `Welcome, ${currentUser.name}!`;
    loadHistory();
}

function logout() {
    currentUser = null;
    chatHistory = [];
    document.getElementById('app-screen').classList.remove('active');
    document.getElementById('auth-screen').classList.add('active');
    document.getElementById('chat-container').innerHTML = '<div class="welcome-message"><h2>Welcome to Sensei Vaathi! 👋</h2><p>Choose a learning mode from the sidebar and enter a topic to get started.</p></div>';
}

function showMessage(text, type) {
    const msg = document.getElementById('auth-message');
    msg.textContent = text;
    msg.className = `message ${type}`;
}

function hideMessage() {
    document.getElementById('auth-message').className = 'message';
}

// Mode Selection
function initializeModeButtons() {
    const buttons = document.querySelectorAll('.mode-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedMode = btn.getAttribute('data-mode');
        });
    });
}

// Content Generation
async function generateContent() {
    if (!selectedMode) {
        alert('Please select a learning mode first!');
        return;
    }
    
    const topic = document.getElementById('topic-input').value.trim();
    if (!topic) {
        alert('Please enter a topic!');
        return;
    }
    
    // Clear welcome message
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) welcomeMsg.remove();
    
    // Show loading
    const chatContainer = document.getElementById('chat-container');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message-bubble loading';
    loadingDiv.innerHTML = '<p>Generating content</p>';
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                topic: topic,
                mode: selectedMode
            })
        });
        
        const data = await response.json();
        loadingDiv.remove();
        
        displayMessage(data);
        chatHistory.push(data);
        
        // Clear input
        document.getElementById('topic-input').value = '';
        
    } catch (error) {
        loadingDiv.remove();
        alert('Error generating content. Please check your API key and try again.');
    }
}

function displayMessage(message) {
    const chatContainer = document.getElementById('chat-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-bubble';
    
    const modeEmoji = {
        'lesson': '🧩',
        'flashcards': '🧠',
        'quiz': '🧮',
        'notes': '📝'
    };
    
    let actionsHTML = '';
    if (message.mode === 'flashcards') {
        actionsHTML = '<div class="message-actions"><button class="btn btn-primary" onclick="startFlashcardReview()">📚 Review Cards</button></div>';
    }
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-mode">${modeEmoji[message.mode]} ${message.mode.toUpperCase()}</span>
            <span class="message-topic">${message.topic}</span>
        </div>
        <div class="message-content">${formatContent(message.content)}</div>
        ${actionsHTML}
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatContent(content) {
    // Format bullet points
    content = content.replace(/^[•\-\*]\s/gm, '• ');
    
    // Format numbered lists
    content = content.replace(/^(\d+)\.\s/gm, '<strong>$1.</strong> ');
    
    // Format bold text
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Format headers
    content = content.replace(/^## (.*?)$/gm, '<h3>$1</h3>');
    
    // Convert newlines to <br> but preserve paragraph structure
    content = content.replace(/\n\n/g, '</p><p>');
    content = '<p>' + content + '</p>';
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

// History
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE}/history?userId=${currentUser.id}`);
        chatHistory = await response.json();
        
        chatHistory.forEach(msg => displayMessage(msg));
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function viewHistory() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.innerHTML = '';
    
    if (chatHistory.length === 0) {
        chatContainer.innerHTML = '<div class="welcome-message"><h2>No History Yet</h2><p>Start learning to build your history!</p></div>';
    } else {
        chatHistory.forEach(msg => displayMessage(msg));
    }
}

function clearChat() {
    if (confirm('Are you sure you want to clear the current chat display? (History will be preserved)')) {
        document.getElementById('chat-container').innerHTML = '<div class="welcome-message"><h2>Chat Cleared</h2><p>Enter a new topic to continue learning!</p></div>';
    }
}

// Dashboard
async function showDashboard() {
    try {
        const response = await fetch(`${API_BASE}/progress?userId=${currentUser.id}`);
        const userData = await response.json();
        
        document.getElementById('stat-sessions').textContent = userData.totalSessions;
        document.getElementById('stat-cards').textContent = userData.masteredCards;
        
        const memberDate = new Date(userData.createdAt);
        document.getElementById('stat-member').textContent = memberDate.toLocaleDateString();
        
        document.getElementById('dashboard-modal').classList.add('active');
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function closeDashboard() {
    document.getElementById('dashboard-modal').classList.remove('active');
}

// Flashcards
function startFlashcardReview() {
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (!lastMessage || lastMessage.mode !== 'flashcards') {
        alert('No flashcards found in recent messages!');
        return;
    }
    
    parseFlashcards(lastMessage.content);
    
    if (flashcards.length === 0) {
        alert('Could not parse flashcards from content!');
        return;
    }
    
    currentCardIndex = 0;
    isFlipped = false;
    showCard();
    document.getElementById('flashcard-modal').classList.add('active');
}

function parseFlashcards(content) {
    flashcards = [];
    const lines = content.split('\n');
    let currentQ = '';
    let currentA = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('Q:') || line.startsWith('**Q:')) {
            if (currentQ && currentA) {
                flashcards.push({ q: currentQ, a: currentA });
            }
            currentQ = line.replace(/\*?\*?Q:\*?\*?/, '').trim();
            currentA = '';
        } else if (line.startsWith('A:') || line.startsWith('**A:')) {
            currentA = line.replace(/\*?\*?A:\*?\*?/, '').trim();
        } else if (currentA && line) {
            currentA += ' ' + line;
        } else if (currentQ && !currentA && line) {
            currentQ += ' ' + line;
        }
    }
    
    if (currentQ && currentA) {
        flashcards.push({ q: currentQ, a: currentA });
    }
}

function showCard() {
    if (flashcards.length === 0) return;
    
    const card = flashcards[currentCardIndex];
    const flashcardEl = document.getElementById('flashcard');
    const textEl = document.getElementById('flashcard-text');
    
    if (isFlipped) {
        textEl.innerHTML = `<strong>Answer:</strong><br><br>${card.a}`;
        flashcardEl.classList.add('flipped');
    } else {
        textEl.innerHTML = `<strong>Question:</strong><br><br>${card.q}`;
        flashcardEl.classList.remove('flipped');
    }
    
    document.getElementById('card-counter').textContent = `${currentCardIndex + 1} / ${flashcards.length}`;
}

function flipCard() {
    isFlipped = !isFlipped;
    showCard();
}

function nextCard() {
    if (currentCardIndex < flashcards.length - 1) {
        currentCardIndex++;
        isFlipped = false;
        showCard();
    }
}

function prevCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        isFlipped = false;
        showCard();
    }
}

async function markMastered() {
    try {
        await fetch(`${API_BASE}/flashcard-review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                cardsReviewed: 1
            })
        });
        
        currentUser.masteredCards++;
        alert('Card marked as mastered! 🎉');
    } catch (error) {
        console.error('Error updating progress:', error);
    }
}

function closeFlashcards() {
    document.getElementById('flashcard-modal').classList.remove('active');
}

// Export
function exportChat() {
    if (chatHistory.length === 0) {
        alert('No content to export!');
        return;
    }
    
    let docContent = `Sensei Vaathi - Learning Session\n`;
    docContent += `User: ${currentUser.name}\n`;
    docContent += `Date: ${new Date().toLocaleDateString()}\n`;
    docContent += `\n${'='.repeat(50)}\n\n`;
    
    chatHistory.forEach((msg, idx) => {
        docContent += `${idx + 1}. ${msg.mode.toUpperCase()} - ${msg.topic}\n`;
        docContent += `${'-'.repeat(50)}\n`;
        docContent += msg.content.replace(/<[^>]*>/g, '') + '\n\n';
    });
    
    // Create blob and download
    const blob = new Blob([docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensei-vaathi-${Date.now()}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Chat exported successfully! 📤');
}