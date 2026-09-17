const { auth } = require("firebase-functions/v1");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin SDK
initializeApp();

/**
 * Triggered automatically by Firebase Authentication whenever a new user is created.
 * Creates a corresponding user profile document in Firestore collection 'users'.
 */
exports.createProfileOnSignUp = auth.user().onCreate(async (user) => {
  const db = getFirestore();
  
  try {
    await db.collection("users").doc(user.uid).set({
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      createdAt: new Date(),
      status: "active",
      role: "client"
    }, { merge: true });

    console.log(`[Firebase Cloud Function] Profile successfully created for user: ${user.uid} (${user.email})`);
  } catch (error) {
    console.error(`[Firebase Cloud Function] Error creating profile for user ${user.uid}:`, error);
    throw error;
  }
});
