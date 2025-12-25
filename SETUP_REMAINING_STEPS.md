# Remaining Firebase Setup Steps

## ✅ What You Have Now

You've provided your Firebase Web App configuration:
- ✅ API Key: `AIzaSyDLXsg8i8CJOPq0Hdd_pDmlungKdPNGpHY`
- ✅ Auth Domain: `taxicab-1316a.firebaseapp.com`
- ✅ Project ID: `taxicab-1316a`
- ✅ Storage Bucket: `taxicab-1316a.firebasestorage.app`
- ✅ Sender ID: `672160530326`
- ✅ App ID: `1:672160530326:web:96e7fe01f97288ec0b67b7`
- ✅ Measurement ID: `G-WTBWJ6GL5H`

## 🔍 What You Still Need

### 1. VAPID Key (2 minutes)

**Direct Link**: https://console.firebase.google.com/project/taxicab-1316a/settings/cloudmessaging

1. Scroll down to **Web configuration** section
2. Find **Web Push certificates**
3. If you see "No key pair", click **Generate key pair**
4. Copy the **Key pair** value (it will look like: `BElGi...`)

### 2. FCM Server Key (3 minutes)

**Same Page**: https://console.firebase.google.com/project/taxicab-1316a/settings/cloudmessaging

1. Scroll down to **Cloud Messaging API (Legacy)** section
2. Look for **Server key**
3. Copy the value (it will look like: `AAAA...`)

**If Server key is missing:**
- Go to: https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=taxicab-1316a
- Click **Enable**
- Wait 30 seconds, then refresh the Firebase Console page

## 📝 Create Your .env File

Create a file named `.env` in your project root (same folder as `package.json`) with this content:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyDLXsg8i8CJOPq0Hdd_pDmlungKdPNGpHY
VITE_FIREBASE_AUTH_DOMAIN=taxicab-1316a.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=taxicab-1316a
VITE_FIREBASE_STORAGE_BUCKET=taxicab-1316a.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=672160530326
VITE_FIREBASE_APP_ID=1:672160530326:web:96e7fe01f97288ec0b67b7
VITE_FIREBASE_MEASUREMENT_ID=G-WTBWJ6GL5H

# Replace YOUR_VAPID_KEY_HERE with the actual VAPID key from Firebase Console
VITE_FIREBASE_VAPID_KEY=YOUR_VAPID_KEY_HERE
```

**Important**: Replace `YOUR_VAPID_KEY_HERE` with the actual VAPID key you copied!

## 🔐 Set Supabase Secret

After you get the FCM Server Key, set it in Supabase:

**Option 1: Via Dashboard** (Easiest)
1. Go to: https://supabase.com/dashboard/project/dxfyoaabkckllpequaog/settings/functions
2. Click **Secrets** tab
3. Click **Add new secret**
4. Name: `FCM_SERVER_KEY`
5. Value: Paste your FCM Server Key
6. Click **Save**

**Option 2: Via CLI**
```bash
supabase secrets set FCM_SERVER_KEY=AAAA...your_server_key_here
```

## ✅ Final Checklist

- [ ] VAPID Key copied from Firebase Console
- [ ] FCM Server Key copied from Firebase Console
- [ ] `.env` file created with all values (replace VAPID_KEY placeholder)
- [ ] FCM_SERVER_KEY secret set in Supabase Dashboard
- [ ] Restart dev server: `npm run dev`
- [ ] Check browser console for "✅ Push notification service initialized"

## 🧪 Test It

1. **Start your dev server**: `npm run dev`
2. **Open browser console** (F12)
3. **Login to the app**
4. **Look for these messages**:
   - "✅ Push notification service initialized"
   - "✅ FCM token updated in database"
5. **Grant notification permission** when prompted
6. **Create a test ride** and check if notifications work

## 🆘 Quick Links

- **Get VAPID Key**: https://console.firebase.google.com/project/taxicab-1316a/settings/cloudmessaging
- **Get FCM Server Key**: Same page, scroll to "Cloud Messaging API (Legacy)"
- **Enable FCM API** (if needed): https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=taxicab-1316a
- **Set Supabase Secret**: https://supabase.com/dashboard/project/dxfyoaabkckllpequaog/settings/functions


