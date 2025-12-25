# Firebase Configuration - Complete Setup

## ✅ Your Current Configuration

You have the following Firebase configuration values:

### Web App Configuration
- **API Key**: `AIzaSyDLXsg8i8CJOPq0Hdd_pDmlungKdPNGpHY`
- **Auth Domain**: `taxicab-1316a.firebaseapp.com`
- **Project ID**: `taxicab-1316a`
- **Storage Bucket**: `taxicab-1316a.firebasestorage.app`
- **Messaging Sender ID**: `672160530326`
- **App ID**: `1:672160530326:web:96e7fe01f97288ec0b67b7`
- **Measurement ID**: `G-WTBWJ6GL5H`

### Web Push Certificate (VAPID Key)
- **VAPID Key**: `BKMCgX0n-Y28wqvuPTUdK2HpH0VQXfKahxLc4UTiUz_1-s-Xl970Y1LqAB_22e9EInzr8xLzUcQPR97qJjphiig`
  - Date added: 19 Dec 2025
  - Status: Active

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

# Firebase VAPID Key for Web Push Notifications
VITE_FIREBASE_VAPID_KEY=BKMCgX0n-Y28wqvuPTUdK2HpH0VQXfKahxLc4UTiUz_1-s-Xl970Y1LqAB_22e9EInzr8xLzUcQPR97qJjphiig

# Supabase Configuration (if not already set)
VITE_SUPABASE_URL=https://dxfyoaabkckllpequaog.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 🔐 Next Steps

### 1. Verify .env File
- Make sure your `.env` file is in the project root
- Restart your dev server after creating/updating `.env`
- The `.env` file is gitignored (won't be committed)

### 2. Set FCM Server Key in Supabase (Optional)
If you want to send push notifications from Supabase Edge Functions:

1. Get FCM Server Key from Firebase Console:
   - Go to: https://console.firebase.google.com/project/taxicab-1316a/settings/cloudmessaging
   - Scroll to **Cloud Messaging API (Legacy)**
   - Copy the **Server key**

2. Set it in Supabase:
   - Dashboard: https://supabase.com/dashboard/project/dxfyoaabkckllpequaog/settings/functions
   - Click **Secrets** tab
   - Add secret: `FCM_SERVER_KEY` = your server key

   Or via CLI:
   ```bash
   supabase secrets set FCM_SERVER_KEY=your_server_key_here
   ```

### 3. Test the Configuration

After setting up:

1. **Restart dev server**: `npm run dev`
2. **Check browser console** for:
   - ✅ "Push notification service initialized"
   - ✅ "FCM token updated in database"
3. **Grant notification permission** when browser prompts
4. **Test notifications** by creating a ride

## 🔍 Troubleshooting

### "Firebase not configured" Error
- Check that all environment variables are set in `.env`
- Make sure `.env` file is in the project root
- Restart dev server after creating/updating `.env`

### Push Notifications Not Working
- Check browser console for errors
- Verify notification permission is granted
- Check that VAPID key is correct (no extra spaces)
- Ensure Firebase Cloud Messaging API is enabled in Google Cloud Console

### VAPID Key Format
Your VAPID key should look like:
```
BKMCgX0n-Y28wqvuPTUdK2HpH0VQXfKahxLc4UTiUz_1-s-Xl970Y1LqAB_22e9EInzr8xLzUcQPR97qJjphiig
```
- No quotes needed
- No spaces
- Copy exactly as shown in Firebase Console

## 📚 Quick Links

- **Firebase Console**: https://console.firebase.google.com/project/taxicab-1316a
- **Cloud Messaging Settings**: https://console.firebase.google.com/project/taxicab-1316a/settings/cloudmessaging
- **Supabase Dashboard**: https://supabase.com/dashboard/project/dxfyoaabkckllpequaog


