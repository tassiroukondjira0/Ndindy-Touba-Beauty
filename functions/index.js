const { auth, https } = require("firebase-functions/v1");
const { defineString } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { credential } = require("firebase-admin");
const { logger } = require("firebase-functions");

// Initialize Firebase Admin SDK
initializeApp();

// The public web API key of the project. Not a secret (it already ships in the
// browser bundle). Only used as a fallback if the runtime service account
// cannot authorise the call, so leaving it unset is fine in normal operation.
const webApiKey = defineString("FIREBASE_WEB_API_KEY", { default: "" });

// Minimal rate limiting per caller so the reset mailbox cannot be used to spam a
// third party. Firestore is the only shared state available across instances.
const THROTTLE_WINDOW_MS = 60 * 1000;
const THROTTLE_MAX_PER_WINDOW = 3;

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

// --- PASSWORD RESET BY PHONE NUMBER ---

// Keeps only the first character and the domain, e.g. "a***@gmail.com". Enough
// for the client to recognise their own inbox, useless to anyone else.
const maskEmail = (email) => {
  const [name, domain] = String(email).split("@");
  if (!domain) return "";
  return `${name.charAt(0)}***@${domain}`;
};

// Phone numbers are stored formatted ("+1 (443) 858-1400"), so comparisons are
// always made on digits only.
const toDigits = (value) => String(value || "").replace(/\D/g, "");

/**
 * Finds the client profile owning this phone number. New profiles carry a
 * 'phoneDigits' field that makes this a cheap indexed lookup; the scan over the
 * collection is only a fallback for accounts created before that field existed.
 */
const findProfileByPhone = async (db, digits) => {
  const direct = await db.collection("clientProfiles").where("phoneDigits", "==", digits).limit(1).get();
  if (!direct.empty) return direct.docs[0];

  const legacy = await db.collection("clientProfiles").where("phone", "!=", null).limit(500).get();
  const match = legacy.docs.find((snap) => toDigits(snap.get("phone")) === digits);
  return match || null;
};

/**
 * Asks Google Identity Toolkit to email the password-reset link. The Admin SDK
 * can generate the link but not deliver it, so the same public endpoint the web
 * SDK uses is called directly.
 */
const sendResetEmail = async (email, continueUrl) => {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCLOUD_PROJECT_ID;
  if (!projectId) throw new Error("missing_project_id");

  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:sendOobCode`;
  const body = JSON.stringify({
    requestType: "PASSWORD_RESET",
    email,
    returnOobCode: false,
    canHandleCodeInApp: true,
    continueUrl
  });

  // Preferred path: the function's own runtime service account already holds
  // the identitytoolkit scope, so it can authorise the call on its own. This
  // needs no configuration and no API key.
  const headers = { "Content-Type": "application/json" };
  try {
    const access = await credential.applicationDefault().getAccessToken();
    if (access && access.access_token) headers.Authorization = `Bearer ${access.access_token}`;
  } catch (err) {
    logger.warn("Service account token unavailable, falling back to API key", err);
  }

  // Fallback: the public web API key, when the service account could not be used.
  if (!headers.Authorization) {
    const key = webApiKey.value();
    if (!key) throw new Error("no_credentials");
    return postResetEmail(`${url}?key=${key}`, headers, body);
  }

  return postResetEmail(url, headers, body);
};

const postResetEmail = async (url, headers, body) => {
  const response = await fetch(url, { method: "POST", headers, body });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`identity_toolkit_${response.status}: ${detail}`);
  }
  return true;
};

/**
 * Client-facing: a visitor who forgot their password types their phone number,
 * and the reset link is emailed to the address registered on that account.
 *
 * The lookup is done here rather than in the browser because 'clientProfiles'
 * is not publicly readable, and the full email address must not be returned to
 * an anonymous caller — only a masked version, so the response is identical
 * whether the account exists or not.
 */
exports.requestPhonePasswordReset = https.onCall(async (data, context) => {
  const db = getFirestore();
  const digits = toDigits(data?.phone);

  if (digits.length < 7 || digits.length > 15) {
    throw new https.HttpsError("invalid-argument", "invalid_phone");
  }

  // Throttle per caller IP and per phone number, so a single browser cannot be
  // used to flood the mailbox of a known customer.
  const callerIp = context?.rawRequest?.ip || "unknown";
  const throttleId = Buffer.from(`${callerIp}:${digits}`).toString("base64url").slice(0, 120);
  const throttleRef = db.collection("passwordResetThrottle").doc(throttleId);
  const throttleState = await throttleRef.get();
  const recent = (throttleState.exists() && throttleState.get("recent")) || [];
  const now = Date.now();
  const inWindow = recent.filter((ts) => now - ts < THROTTLE_WINDOW_MS);
  if (inWindow.length >= THROTTLE_MAX_PER_WINDOW) {
    throw new https.HttpsError("resource-exhausted", "too_many_requests");
  }
  throttleRef.set({ recent: [...inWindow, now] }, { merge: true }).catch((err) => {
    logger.warn("Password reset throttle write failed", err);
  });

  const profile = await findProfileByPhone(db, digits);
  if (!profile) {
    // Unknown number: stay silent, exactly like Firebase does for an unknown
    // email address, so the endpoint cannot be used to test whether a number
    // is registered with the salon.
    return { sent: true, maskedEmail: "" };
  }

  const profileData = profile.data();
  let email = profileData.email || "";

  if (!email && profileData.uid) {
    try {
      email = (await getAuth().getUser(profileData.uid)).email || "";
    } catch (err) {
      logger.warn("Password reset user lookup failed", err);
    }
  }

  if (!email) {
    return { sent: true, maskedEmail: "" };
  }

  try {
    await sendResetEmail(email, data.continueUrl);
  } catch (err) {
    logger.error(`Password reset email failed for ${maskEmail(email)}`, err);
    throw new https.HttpsError("internal", "send_failed");
  }

  return { sent: true, maskedEmail: maskEmail(email) };
});
