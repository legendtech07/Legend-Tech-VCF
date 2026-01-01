// DOM Elements
const loader = document.getElementById('loader');
const mainContent = document.querySelector('.container');
const sessionStatus = document.getElementById('sessionStatus');
const contactForm = document.getElementById('contactForm');
const downloadSection = document.getElementById('downloadSection');
const participantsList = document.getElementById('participantsList');
const progressContainer = document.getElementById('progressContainer');
const participants = document.getElementById('participants');
const participantForm = document.getElementById('participantForm');
const downloadBtn = document.getElementById('downloadBtn');
const successModal = document.getElementById('successModal');
const closeModal = document.querySelector('.close-modal');
const okBtn = document.querySelector('.btn-ok');

// Firebase references
let currentSessionRef;
let participantsRef;

// Session data
let currentSession = null;
let sessionParticipants = [];

// Initialize
async function init() {
    // Show loader for minimum 1.5 seconds
    setTimeout(() => {
        loader.classList.add('hidden');
        mainContent.classList.remove('hidden');
    }, 1500);

    // Listen for active sessions
    db.collection('sessions').where('isActive', '==', true)
        .onSnapshot((snapshot) => {
            if (!snapshot.empty) {
                const sessionDoc = snapshot.docs[0];
                currentSession = { id: sessionDoc.id, ...sessionDoc.data() };
                currentSessionRef = db.collection('sessions').doc(currentSession.id);
                participantsRef = currentSessionRef.collection('participants');
                
                updateSessionUI(currentSession);
                listenToParticipants();
            } else {
                handleNoActiveSession();
            }
        });

    // Form submission
    participantForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addParticipant();
    });

    // Download button
    downloadBtn.addEventListener('click', downloadVCF);

    // Modal close
    closeModal.addEventListener('click', () => {
        successModal.classList.add('hidden');
    });

    okBtn.addEventListener('click', () => {
        successModal.classList.add('hidden');
    });
}

function updateSessionUI(session) {
    // Update status
    sessionStatus.innerHTML = `
        <h2>Active Session</h2>
        <p>Session started at ${new Date(session.startTime.toDate()).toLocaleTimeString()}</p>
        <p>Goal: ${session.requiredContacts} contacts needed</p>
    `;
    
    // Show relevant sections
    contactForm.classList.remove('hidden');
    progressContainer.classList.remove('hidden');
    
    // Update progress
    updateProgress(session.joinedContacts || 0, session.requiredContacts);
}

function handleNoActiveSession() {
    sessionStatus.innerHTML = `
        <h2>No Active Session</h2>
        <p>Wait for admin to start a session</p>
    `;
    contactForm.classList.add('hidden');
    downloadSection.classList.add('hidden');
    participantsList.classList.add('hidden');
    progressContainer.classList.add('hidden');
}

async function addParticipant() {
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (!name || !phone) {
        alert('Please fill in all fields');
        return;
    }

    try {
        // Check if phone already exists in this session
        const existing = await participantsRef.where('phone', '==', phone).get();
        if (!existing.empty) {
            alert('This phone number is already registered in this session');
            return;
        }

        // Add participant
        await participantsRef.add({
            name: name,
            phone: phone,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
            ipAddress: await getIPAddress()
        });

        // Update session count
        await currentSessionRef.update({
            joinedContacts: firebase.firestore.FieldValue.increment(1)
        });

        // Clear form and show success
        participantForm.reset();
        successModal.classList.remove('hidden');
    } catch (error) {
        console.error('Error adding participant:', error);
        alert('Error adding participant. Please try again.');
    }
}

function listenToParticipants() {
    participantsRef.orderBy('joinedAt', 'desc')
        .onSnapshot((snapshot) => {
            sessionParticipants = [];
            participants.innerHTML = '';
            
            snapshot.forEach(doc => {
                const participant = { id: doc.id, ...doc.data() };
                sessionParticipants.push(participant);
                
                // Add to UI
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${participant.name}</span>
                    <span>${participant.phone}</span>
                `;
                participants.appendChild(li);
            });

            // Update count
            const joinedElement = document.getElementById('joinedContacts');
            if (joinedElement) {
                joinedElement.textContent = sessionParticipants.length;
            }

            // Show participants list if there are any
            if (sessionParticipants.length > 0) {
                participantsList.classList.remove('hidden');
            }

            // Check if session is complete
            if (currentSession && sessionParticipants.length >= currentSession.requiredContacts) {
                showDownloadSection();
            }
        });
}

function updateProgress(current, total) {
    const progressFill = document.getElementById('progressFill');
    const neededElement = document.getElementById('neededContacts');
    const joinedElement = document.getElementById('joinedContacts');
    
    if (neededElement) neededElement.textContent = total;
    if (joinedElement) joinedElement.textContent = current;
    
    const percentage = Math.min((current / total) * 100, 100);
    if (progressFill) progressFill.style.width = `${percentage}%`;
}

function showDownloadSection() {
    contactForm.classList.add('hidden');
    downloadSection.classList.remove('hidden');
    participantsList.classList.remove('hidden');
    
    const countElement = document.querySelector('.participants-count span');
    if (countElement) {
        countElement.textContent = sessionParticipants.length;
    }
}

function downloadVCF() {
    let vcfContent = '';
    
    sessionParticipants.forEach((participant, index) => {
        vcfContent += `BEGIN:VCARD
VERSION:3.0
FN:${participant.name}
TEL;TYPE=CELL:${participant.phone}
END:VCARD\n`;
    });

    const blob = new Blob([vcfContent], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legend-tech-contacts-${new Date().toISOString().split('T')[0]}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'unknown';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);