// Admin DOM Elements
const adminLoader = document.getElementById('adminLoader');
const adminContent = document.querySelector('.admin-container');
const loginModal = document.getElementById('loginModal');
const adminEmail = document.getElementById('adminEmail');
const adminPassword = document.getElementById('adminPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const startSessionBtn = document.getElementById('startSessionBtn');
const endSessionBtn = document.getElementById('endSessionBtn');
const requiredContacts = document.getElementById('requiredContacts');
const currentSessionInfo = document.getElementById('currentSessionInfo');
const participantsBody = document.getElementById('participantsBody');
const participantCount = document.getElementById('participantCount');
const historyBody = document.getElementById('historyBody');

// Firebase instances
const auth = firebase.auth();
const db = firebase.firestore();

// Admin state
let currentSessionRef = null;
let participantsRef = null;
let unsubscribeParticipants = null;
let unsubscribeHistory = null;

// Initialize Admin
function initAdmin() {
    console.log('Admin JS loaded');
    
    // Show loader for minimum 1.5 seconds
    setTimeout(() => {
        checkAuthState();
    }, 1500);
    
    // Event Listeners
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    startSessionBtn.addEventListener('click', startSession);
    endSessionBtn.addEventListener('click', endSession);
    
    // Enter key for login
    adminPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
}

function checkAuthState() {
    console.log('Checking auth state...');
    
    auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'No user');
        
        if (user) {
            // User is signed in
            loginModal.classList.add('hidden');
            adminLoader.classList.add('hidden');
            adminContent.classList.remove('hidden');
            loadAdminData();
        } else {
            // No user signed in
            console.log('Showing login modal');
            adminLoader.classList.add('hidden');
            loginModal.classList.remove('hidden');
        }
    }, (error) => {
        console.error('Auth state error:', error);
        adminLoader.classList.add('hidden');
        loginModal.classList.remove('hidden');
    });
}

async function handleLogin() {
    const email = adminEmail.value.trim();
    const password = adminPassword.value.trim();
    
    console.log('Login attempt for:', email);
    
    if (!email || !password) {
        showLoginError('Please enter email and password');
        return;
    }
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Login successful:', userCredential.user.email);
        loginError.style.display = 'none';
        adminEmail.value = '';
        adminPassword.value = '';
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('Invalid email or password');
    }
}

function showLoginError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

async function handleLogout() {
    try {
        await auth.signOut();
        console.log('Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function loadAdminData() {
    console.log('Loading admin data...');
    
    // Load current session
    db.collection('sessions').where('isActive', '==', true)
        .onSnapshot((snapshot) => {
            console.log('Active sessions:', snapshot.size);
            
            if (!snapshot.empty) {
                const sessionDoc = snapshot.docs[0];
                const session = { id: sessionDoc.id, ...sessionDoc.data() };
                currentSessionRef = db.collection('sessions').doc(session.id);
                participantsRef = currentSessionRef.collection('participants');
                
                updateCurrentSessionInfo(session);
                loadParticipants(session.id);
                startSessionBtn.disabled = true;
                endSessionBtn.disabled = false;
            } else {
                console.log('No active sessions');
                currentSessionInfo.innerHTML = '<p>No active session</p>';
                participantsBody.innerHTML = '<tr><td colspan="4">No participants</td></tr>';
                participantCount.textContent = '(0)';
                startSessionBtn.disabled = false;
                endSessionBtn.disabled = true;
                currentSessionRef = null;
                
                // Stop listening to participants if no active session
                if (unsubscribeParticipants) {
                    unsubscribeParticipants();
                    unsubscribeParticipants = null;
                }
            }
        }, (error) => {
            console.error('Error loading sessions:', error);
            currentSessionInfo.innerHTML = '<p>Error loading session</p>';
        });
    
    // Load session history
    loadSessionHistory();
}

function updateCurrentSessionInfo(session) {
    console.log('Updating session info:', session);
    
    try {
        const startTime = session.startTime ? new Date(session.startTime.toDate()) : new Date();
        const joined = session.joinedContacts || 0;
        const required = session.requiredContacts || 100;
        
        currentSessionInfo.innerHTML = `
            <p><strong>Started:</strong> ${startTime.toLocaleString()}</p>
            <p><strong>Required Contacts:</strong> ${required}</p>
            <p><strong>Joined:</strong> ${joined}</p>
            <p><strong>Remaining:</strong> ${required - joined}</p>
            <p><strong>Progress:</strong> ${Math.round((joined / required) * 100)}%</p>
        `;
    } catch (error) {
        console.error('Error updating session info:', error);
        currentSessionInfo.innerHTML = '<p>Error loading session details</p>';
    }
}

function loadParticipants(sessionId) {
    console.log('Loading participants for session:', sessionId);
    
    if (unsubscribeParticipants) {
        unsubscribeParticipants();
    }
    
    unsubscribeParticipants = db.collection('sessions').doc(sessionId)
        .collection('participants')
        .orderBy('joinedAt', 'desc')
        .onSnapshot((snapshot) => {
            console.log('Participants snapshot:', snapshot.size, 'documents');
            
            participantsBody.innerHTML = '';
            let count = 0;
            
            if (snapshot.empty) {
                participantsBody.innerHTML = '<tr><td colspan="4">No participants yet</td></tr>';
                participantCount.textContent = '(0)';
                return;
            }
            
            snapshot.forEach((doc) => {
                const participant = doc.data();
                const joinedAt = participant.joinedAt ? new Date(participant.joinedAt.toDate()) : new Date();
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${participant.name || 'N/A'}</td>
                    <td>${participant.phone || 'N/A'}</td>
                    <td>${joinedAt.toLocaleTimeString()}</td>
                    <td>${participant.ipAddress || 'N/A'}</td>
                `;
                participantsBody.appendChild(row);
                count++;
            });
            
            participantCount.textContent = `(${count})`;
            
        }, (error) => {
            console.error('Error loading participants:', error);
            participantsBody.innerHTML = '<tr><td colspan="4">Error loading participants</td></tr>';
        });
}

function loadSessionHistory() {
    console.log('Loading session history...');
    
    if (unsubscribeHistory) {
        unsubscribeHistory();
    }
    
    unsubscribeHistory = db.collection('sessions')
        .orderBy('startTime', 'desc')
        .limit(10)
        .onSnapshot((snapshot) => {
            console.log('History snapshot:', snapshot.size, 'documents');
            
            historyBody.innerHTML = '';
            
            if (snapshot.empty) {
                historyBody.innerHTML = '<tr><td colspan="5">No session history</td></tr>';
                return;
            }
            
            snapshot.forEach((doc) => {
                const session = doc.data();
                const startTime = session.startTime ? new Date(session.startTime.toDate()) : new Date();
                const endTime = session.endTime ? new Date(session.endTime.toDate()) : null;
                const joined = session.joinedContacts || 0;
                const required = session.requiredContacts || 100;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${startTime.toLocaleString()}</td>
                    <td>${endTime ? endTime.toLocaleString() : 'Active'}</td>
                    <td>${required}</td>
                    <td>${joined}</td>
                    <td>
                        <span class="status ${session.isActive ? 'active' : 'ended'}">
                            ${session.isActive ? 'Active' : 'Ended'}
                        </span>
                    </td>
                `;
                historyBody.appendChild(row);
            });
            
        }, (error) => {
            console.error('Error loading history:', error);
            historyBody.innerHTML = '<tr><td colspan="5">Error loading history</td></tr>';
        });
}

async function startSession() {
    const contacts = parseInt(requiredContacts.value);
    
    if (!contacts || contacts < 1) {
        alert('Please enter a valid number of required contacts');
        return;
    }
    
    try {
        console.log('Starting new session with', contacts, 'contacts required');
        
        // Check if there's already an active session
        const activeSessions = await db.collection('sessions')
            .where('isActive', '==', true)
            .get();
        
        if (!activeSessions.empty) {
            alert('There is already an active session');
            return;
        }
        
        // Create new session
        await db.collection('sessions').add({
            startTime: firebase.firestore.FieldValue.serverTimestamp(),
            requiredContacts: contacts,
            joinedContacts: 0,
            isActive: true,
            createdBy: auth.currentUser.uid,
            createdByEmail: auth.currentUser.email
        });
        
        console.log('Session created successfully');
        alert('Session started successfully!');
    } catch (error) {
        console.error('Error starting session:', error);
        alert('Error starting session. Please try again.');
    }
}

async function endSession() {
    if (!currentSessionRef) {
        alert('No active session to end');
        return;
    }
    
    if (confirm('Are you sure you want to end the current session?')) {
        try {
            console.log('Ending session:', currentSessionRef.id);
            
            await currentSessionRef.update({
                isActive: false,
                endTime: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('Session ended successfully');
            alert('Session ended successfully!');
        } catch (error) {
            console.error('Error ending session:', error);
            alert('Error ending session. Please try again.');
        }
    }
}

// Add status styling
document.addEventListener('DOMContentLoaded', () => {
    // Add CSS for status badges
    const style = document.createElement('style');
    style.textContent = `
        .status {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        .status.active {
            background: #4caf50;
            color: white;
        }
        .status.ended {
            background: #ff5252;
            color: white;
        }
    `;
    document.head.appendChild(style);
    
    // Initialize admin panel
    initAdmin();
});