# Firebase Quick Setup Checklist

## What You Have ✅
- Project ID: `taxicab-1316a`
- Sender ID: `672160530326`

## What You Need to Get 🔍

### Step 1: Get Web App Configuration (5 minutes)

1. Go to: https://console.firebase.google.com/project/taxicab-1316a/settings/general
2. Scroll to **Your apps** section
3. If no Web app exists, click **Add app** → **Web** (</>)
4. Copy these values from the config object:

```
apiKey: "AIza..."                    ← NEED THIS
authDomain: "taxicab-1316a.firebaseapp.com"  ← NEED THIS  
storageBucket: "taxicab-1316a.appspot.com"   ← NEED THIS
appId: "1:672160530326:web:..."      ← NEED THIS
measurementId: "G-..."               ← NEED THIS (optional)
```

### Step 2: Get VAPID Key (2 minutes)

1. Go to: https://console.firebase.google.com/project/taxicab-1316a/settings/cloudmessaging
2. Scroll to **Web configuration** → **Web Push certificates**
3. Click **Generate key pair** (if not exists)
4. Copy the **Key pair** value

```
VAPID Key: "BEl..."  ← NEED THIS
```

### Step 3: Get FCM Server Key (3 minutes)

1. Go to: https://console.firebase.google.com/project/taxicab-1316a/settings/cloudmessaging
2. Scroll to **Cloud Messaging API (Legacy)**
3. Copy the **Server key**

**If Server key is missing:**
- Go to: https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=taxicab-1316a
- Click **Enable**
- Return to Firebase Console and refresh

```
FCM Server Key: "AAAA..."  ← NEED THIS
```

## Add to .env File

Create/update `.env` in your project root:

```env
VITE_FIREBASE_API_KEY=AIza...paste_your_api_key
VITE_FIREBASE_AUTH_DOMAIN=taxicab-1316a.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=taxicab-1316a
VITE_FIREBASE_STORAGE_BUCKET=taxicab-1316a.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=672160530326
VITE_FIREBASE_APP_ID=1:672160530326:web:...paste_your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-...paste_your_measurement_id
VITE_FIREBASE_VAPID_KEY=BEl...paste_your_vapid_key
```

## Set Supabase Secret

**Option 1: Via CLI**
```bash
supabase secrets set FCM_SERVER_KEY=AAAA...your_server_key
```

**Option 2: Via Dashboard**
1. Go to: https://supabase.com/dashboard/project/dxfyoaabkckllpequaog/settings/functions
2. Click **Secrets** tab
3. Add new secret:
   - Name: `FCM_SERVER_KEY`
   - Value: Your FCM Server Key

## Quick Links

- **Firebase Console**: https://console.firebase.google.com/project/taxicab-1316a
- **Project Settings**: https://console.firebase.google.com/project/taxicab-1316a/settings/general
- **Cloud Messaging**: https://console.firebase.google.com/project/taxicab-1316a/settings/cloudmessaging
- **Google Cloud APIs**: https://console.cloud.google.com/apis/library?project=taxicab-1316a
- **Supabase Secrets**: https://supabase.com/dashboard/project/dxfyoaabkckllpequaog/settings/functions

## After Setup

1. Restart your dev server: `npm run dev`
2. Check browser console for Firebase initialization
3. Test by creating a ride and checking notifications


