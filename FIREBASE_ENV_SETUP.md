# Firebase Environment Variables Setup

## Create Your .env File

Create a file named `.env` in your project root (same folder as `package.json`) with the following content:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyDLXsg8i8CJOPq0Hdd_pDmlungKdPNGpHY
VITE_FIREBASE_AUTH_DOMAIN=taxicab-1316a.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=taxicab-1316a
VITE_FIREBASE_STORAGE_BUCKET=taxicab-1316a.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=672160530326
VITE_FIREBASE_APP_ID=1:672160530326:web:96e7fe01f97288ec0b67b7
VITE_FIREBASE_MEASUREMENT_ID=G-WTBWJ6GL5H

# Firebase VAPID Key for Web Push Notifications
# Get it from: https://console.firebase.google.com/project/taxicab-1316a/settings/cloudmessaging
# Scroll to "Web Push certificates" → Copy the Key pair value
# Your VAPID Key (from Firebase Console):
VITE_FIREBASE_VAPID_KEY=BKMCgX0n-Y28wqvuPTUdK2HpH0VQXfKahxLc4UTiUz_1-s-Xl970Y1LqAB_22e9EInzr8xLzUcQPR97qJjphiig
```

## ✅ VAPID Key (You Have This!)

Your VAPID Key: `BKMCgX0n-Y28wqvuPTUdK2HpH0VQXfKahxLc4UTiUz_1-s-Xl970Y1LqAB_22e9EInzr8xLzUcQPR97qJjphiig`

This key is already included in the `.env` file template above. Just make sure it's in your actual `.env` file.

## Still Need This Value:

### FCM Server Key (for Supabase)

### 2. FCM Server Key (for Supabase)
**Same page**: https://console.firebase.google.com/project/taxicab-1316a/settings/cloudmessaging

1. Scroll to **Cloud Messaging API (Legacy)**
2. Copy the **Server key**
3. Set it in Supabase (see below)

## Set FCM Server Key in Supabase

**Via Dashboard**:
1. Go to: https://supabase.com/dashboard/project/dxfyoaabkckllpequaog/settings/functions
2. Click **Secrets** tab
3. Add new secret:
   - Name: `FCM_SERVER_KEY`
   - Value: Your FCM Server Key (from step 2 above)

**Or via CLI**:
```bash
supabase secrets set FCM_SERVER_KEY=AAAA...your_server_key
```

## After Setup

1. **Restart your dev server**: `npm run dev`
2. **Check browser console** for:
   - "✅ Push notification service initialized"
   - "✅ FCM token updated in database"
3. **Grant notification permission** when prompted
4. **Test** by creating a ride

## Quick Links

- **Get VAPID Key**: https://console.firebase.google.com/project/taxicab-1316a/settings/cloudmessaging
- **Set Supabase Secret**: https://supabase.com/dashboard/project/dxfyoaabkckllpequaog/settings/functions


