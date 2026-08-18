# Trackly — Job Application Tracker

A clean GitHub Pages web app for tracking job applications with private email/password accounts.

## Features

- Create an account with email and password
- Log in and log out
- Private Firestore records separated by Firebase user ID
- Add, edit and delete applications
- Track Pending, Interview, Accepted and Rejected statuses
- Search and filter applications
- Export records as CSV
- Responsive phone and desktop layout
- No application records or personal job data included in the repository

## Before publishing

This app uses the existing Firebase project configuration in `firebase-config.js`. Firebase web configuration is visible in browser-based applications. Privacy depends on deploying the included `firestore.rules` and enabling only the authentication methods you want.

1. Open the Firebase Console.
2. Go to **Authentication → Sign-in method**.
3. Enable **Email/Password**.
4. Go to **Firestore Database → Rules**.
5. Replace the rules with the contents of `firestore.rules` and publish them.
6. Under **Authentication → Settings → Authorized domains**, add your GitHub Pages domain if Firebase does not add it automatically.

## GitHub Pages

1. Create a new public GitHub repository, for example `job-application-tracker`.
2. Upload all files from this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. GitHub will provide a URL similar to `https://YOUR-USERNAME.github.io/job-application-tracker/`.

## Security model

Every application is stored at:

```text
users/{authenticated-user-id}/applications/{application-id}
```

The supplied Firestore rules allow a signed-in user to access only documents under their own user ID and deny all other database access.
