# Personal Gemini Journal

A production-grade, private AI-powered reflective journaling web application. Built with **Firebase Authentication**, **Cloud Firestore**, and the **Gemini API** via the `@google/genai` SDK, configured with Google Cloud Secret Manager runtime retrieval and full-stack Express + Vite architecture on Google Cloud Run.

---

## Architecture Overview

1. **Client Tier**: React 19 + Tailwind CSS + Lucide Icons. Features multi-turn reflective dialogue, starter prompts, and an interactive session review drawer.
2. **Backend Proxy & AI Gateway**: Express server handling `/api/chat` and `/api/summarize`. Keeps the Gemini API key strictly server-side. Implements a resilient model fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`).
3. **Secret Management**: Retrieves the `GEMINI_API_KEY` dynamically at runtime using `@google-cloud/secret-manager`, eliminating hardcoded secrets in source code.
4. **Database & Isolation**: Cloud Firestore storing entries strictly under `/users/{uid}/journals/{entryId}` with owner-bound rules in `firestore.rules`.
5. **Authentication**: Firebase Authentication (Email/Password & Google Sign-In) with zero custom password storage.

---

## Threat Model Summary (The 5 Threat Zones)

| Threat Zone | Identified Risk | Applied Mitigation |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Injection attacks, payload overflow, malicious prompt poisoning | Strict JSON schema parsing, 8,000-character truncation, defensive null-safe payload ingestion, sanitized prompt framing. |
| **2. Planning & Reasoning** | System instruction bypass, jailbreaks, prompt hijacking | Hardened system instructions treating user conversational inputs as plain data subjects for reflection, not operational commands. |
| **3. Tool Execution** | Privilege escalation, arbitrary code execution, SSRF | Server-only endpoints without dynamic code evaluation (`eval`), no unconstrained external fetches. |
| **4. Memory & State** | Cross-user data leakage, unauthorized reads/writes in Firestore | Owner-bound Firestore security rules (`request.auth.uid == userId`) prohibiting cross-user access, strict undefined-stripping prior to DB writes. |
| **5. Inter-System Communication** | Credential exfiltration, API key exposure in client bundles | Server-side proxying; dynamic runtime retrieval from Google Cloud Secret Manager; zero API keys exposed to browser bundle. |

---

## Step-by-Step Deployment & Configuration Guide

### 1. Environment & Prerequisites

1. Install the [Google Cloud CLI (`gcloud`)](https://cloud.google.com/sdk/docs/install) and [Firebase CLI](https://firebase.google.com/docs/cli).
2. Set your active Google Cloud project:
   ```bash
   gcloud config set project personal-gemini-journal-b0379
   export PROJECT_ID=$(gcloud config get-value project)
   export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
   export REGION="us-central1"
   ```
3. Enable required Google Cloud APIs:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     cloudbuild.googleapis.com \
     artifactregistry.googleapis.com
   ```

---

### 2. Secret Manager Setup (Zero-Hardcoding Hygiene)

Create and populate the `GEMINI_API_KEY` secret in Google Cloud Secret Manager:

```bash
# 1. Create the secret container
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add your Gemini API key as a secret version
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Grant the Cloud Run compute service account permission to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 3. Database Security Configuration (Cloud Firestore)

Deploy the owner-scoped security rules in `firestore.rules`, ensuring user data isolation for both reflective journals and habit tracking:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Scoped user journal entries
      match /journals/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Scoped user daily habits & streaks
      match /habits/{habitId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy the rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

### 4. Cloud Run Deployment Flow

Deploy the full-stack container to Google Cloud Run:

```bash
# Build and deploy directly from source
gcloud run deploy personal-gemini-journal \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars="NODE_ENV=production,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GEMINI_SECRET_NAME=GEMINI_API_KEY"
```

---

### 5. Mandatory Campaign Labeling

Apply the mandatory resource label to register the service for challenge verification:

```bash
gcloud run services update personal-gemini-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

---

## Interactive Functional Stability & Walkthrough Test Cases

The application includes end-to-end interactive workflows. Every user interaction and process has a verified walkthrough test scenario:

### Test Case 1: Firebase Authentication & User Scoping
1. **Trigger**: Click **Sign In** in the top navigation bar or the security banner.
2. **Action**: Choose **Google Sign-In** or provide email and password (`Create Account` / `Sign In`).
3. **Verification**:
   - Modal closes, displaying a green confirmation toast.
   - User identity badge appears in the header with a live status indicator.
   - Header subtitle updates to show the authenticated UID prefix: `Scoped /users/<uid_prefix>...`.
   - Existing journals and habits for this UID load automatically from Firestore.

### Test Case 2: Multi-Turn Journaling with Gemini
1. **Trigger**: Click on a suggested prompt chip (e.g., *"What gave me energy today?"*) or type a message into the textarea.
2. **Action**: Press **Enter** or click the send button.
3. **Verification**:
   - User message bubble renders with a timestamp.
   - Thinking indicator displays *"Gemini is reflecting with you..."*.
   - AI response streams in with empathetic, thoughtful follow-up questions.
   - Conversation history persists across turns in memory.

### Test Case 3: AI Reflection Summary & Habit Commitment Extraction
1. **Trigger**: Click **Review & Save Reflection** above the chat input after sharing a message containing a commitment (e.g., *"I'm going to start meditating for 10 minutes every morning and reading before sleep"*).
2. **Action**: The system calls `/api/summarize` which uses Gemini with fallback resilience.
3. **Verification**:
   - Session review modal opens with generated title, reflective narrative summary, mood badge, key insights, and action items.
   - **Detected Habit Commitments** section appears, displaying identified habits (e.g., *"Morning Meditation (10 min)"*, *"Read before bed"*).
   - Click **Track as Daily Habit** on a detected commitment: button transforms into green *"Tracked!"* state, and the habit is immediately saved to `/users/{uid}/habits/{habitId}`.
   - Click **Confirm & Save to Journal**: Entry is persisted to `/users/{uid}/journals/{entryId}` and added to past journals.

### Test Case 4: Daily Habit Tracker & 7-Day Streak
1. **Trigger**: Click the **Habits** tab in the main navigation.
2. **Action**: View the Habits dashboard.
3. **Verification**:
   - Active habits, 7-day streak grid, and quick-add preset buttons are visible.
   - Add a manual habit by typing a title (e.g., *"Morning Run"*), selecting a category, and clicking **Add Habit**.
   - The habit appears in the active list.
   - Click the checkbox for **Today**: The box checks with a smooth check icon, today's completion count increments, and the streak updates in real time.
   - Unchecking toggles completion off and recalculates the streak.
   - Click the delete (trash) button: Habit is removed from `/users/{uid}/habits/{habitId}` and UI updates.

### Test Case 5: AI Suggested Habits in Habits Dashboard
1. **Trigger**: If journal reflections previously extracted habit commitments, they appear under **Suggested Habits from Recent Reflections**.
2. **Action**: Click **+ Add to Daily Habits** or dismiss via the **X** button.
3. **Verification**:
   - Accepting persists the habit to Firestore with source tagged as `"journal_suggestion"` and displays a toast notification.
   - Dismissing removes the suggestion card from the pending list.

---

## Local Development & Testing

```bash
# 1. Install dependencies
npm install

# 2. Run the full-stack dev server (Express + Vite on port 3000)
npm run dev

# 3. Build for production
npm run build

# 4. Start production bundle
npm start
```
#   P e r s o n a l - G e m i n i - J o u r n a l  
 