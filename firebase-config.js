// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD8tNwfojswPM2vf2RQeG84_0t-ViTdDGU",
  authDomain: "vcf-contact-gain.firebaseapp.com",
  projectId: "vcf-contact-gain",
  storageBucket: "vcf-contact-gain.firebasestorage.app",
  messagingSenderId: "696356039456",
  appId: "1:696356039456:web:6d91e5ec36819a4dfd0545"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();