# Durrani ERP – GitHub Pages + Firebase

Files: index.html, cloud.js, firebase-config.js, firestore.rules

## 1. Firebase (one time)
1. console.firebase.google.com > Add project.
2. Build > Authentication > Get started > enable **Email/Password**.
3. Build > Firestore Database > Create database (production mode).
4. Firestore > Rules tab > paste `firestore.rules` > Publish.
5. Project settings > Your apps > Web (</>) > register app > copy the config into `firebase-config.js`.
6. Authentication > Settings > Authorized domains > add `YOURNAME.github.io`.

## 2. First admin (one time)
1. Authentication > Users > Add user (your email + password). Copy its **User UID**.
2. Firestore > Start collection `users` > Document ID = that UID, fields:
   `email` (string), `name` (string), `role` = `admin` (string), `active` = true (boolean).

## 3. GitHub Pages
1. Create a repo, upload the 4 files (+ this README) to the root.
2. Settings > Pages > Deploy from branch `main` / root.
3. Open https://YOURNAME.github.io/REPO/ and sign in.

On first login the app uploads your existing data to Firestore. Add more users in **Settings > Login users**.

## Notes
- Data is saved to the cloud ~1 second after each change; other users' changes appear automatically.
- If two people edit at the same moment, the last save wins.
- "Remove" revokes access; delete the login itself in Firebase > Authentication if wanted.
- The Firebase apiKey is public by design; Firestore rules protect the data.
