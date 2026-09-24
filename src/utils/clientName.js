/**
 * Resolves the display name of a client, taken EXCLUSIVELY from the account
 * profile stored in the database: the Firestore `clientProfiles` document
 * (mirrored into the browser session cache), or the Firebase Auth display name
 * while the profile is being synchronised.
 *
 * No user name is ever hard-coded in the application.
 */
export const getClientDisplayName = (profile, fallback = '') => {
  if (!profile) return fallback;

  const fullName = (profile.fullName || '').trim();
  if (fullName) return fullName;

  const composed = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
  if (composed) return composed;

  const email = (profile.email || '').trim();
  if (email) return email.split('@')[0];

  return fallback;
};
