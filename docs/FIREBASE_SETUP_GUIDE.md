# Firebase Setup Guide for Push Notifications

## What You Have
- ✅ Project ID: `taxicab-1316a`
- ✅ Sender ID: `672160530326`

## What You Need

### 1. Firebase Web App Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **taxicab-1316a**
3. Click the **gear icon** (⚙️) next to "Project Overview"
4. Select **Project Settings**
5. Scroll down to **Your apps** section
6. If you don't have a Web app yet:
   - Click **Add app** → Select **Web** (</> icon)
   - Register app with a nickname (e.g., "BMTOA PWA")
   - **Don't** check "Also set up Firebase Hosting"
   - Click **Register app**

7. You'll see your **Firebase configuration object**. Copy these values:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",                    // ← You need this
  authDomain: "taxicab-1316a.firebaseapp.com",  // ← You need this
  projectId: "taxicab-1316a",          // ✅ You have this
  storageBucket: "taxicab-1316a.appspot.com",   // ← You need this
  messagingSenderId: "672160530326",    // ✅ You have this
  appId: "1:672160530326:web:...",      // ← You need this
  measurementId: "G-..."                // ← Optional but recommended
};
```

### 2. VAPID Key (Required for Web Push)

1. In Firebase Console, go to **Project Settings**
2. Click on **Cloud Messaging** tab
3. Scroll down to **Web configuration** section
4. Under **Web Push certificates**, you'll see:
   - **Key pair** - Click **Generate key pair** if you don't have one
   - Copy the **Key pair** value (this is your VAPID key)

**Note**: The VAPID key looks like: `BEl...` (a long string)

### 3. FCM Server Key (For Edge Functions)

1. In Firebase Console, go to **Project Settings**
2. Click on **Cloud Messaging** tab
3. Scroll down to **Cloud Messaging API (Legacy)** section
4. You'll see **Server key** - Copy this value

**Note**: If you don't see the Server key:
- You may need to enable the **Legacy Cloud Messaging API**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Select your project: **taxicab-1316a**
- Go to **APIs & Services** → **Library**
- Search for "Firebase Cloud Messaging API"
- Click **Enable**

## Complete Environment Variables

Once you have all the values, add them to your `.env` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSy...your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=taxicab-1316a.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=taxicab-1316a
VITE_FIREBASE_STORAGE_BUCKET=taxicab-1316a.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=672160530326
VITE_FIREBASE_APP_ID=1:672160530326:web:...your_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=G-...your_measurement_id_here
VITE_FIREBASE_VAPID_KEY=BEl...your_vapid_key_here
```

## Set Supabase Secret

Set the FCM Server Key as a Supabase secret:

```bash
supabase secrets set FCM_SERVER_KEY=your_fcm_server_key_here
```

Or via Supabase Dashboard:
1. Go to **Project Settings** → **Edge Functions**
2. Click **Secrets**
3. Add new secret:
   - **Name**: `FCM_SERVER_KEY`
   - **Value**: Your FCM Server Key

## Quick Checklist

- [ ] Firebase Web App created
- [ ] API Key copied
- [ ] Auth Domain copied
- [ ] Storage Bucket copied
- [ ] App ID copied
- [ ] Measurement ID copied (optional)
- [ ] VAPID Key generated and copied
- [ ] FCM Server Key copied
- [ ] All values added to `.env` file
- [ ] FCM_SERVER_KEY set in Supabase secrets
- [ ] Firebase Cloud Messaging API enabled in Google Cloud Console

## Testing

After setup, test the configuration:

1. **Check Firebase initialization**:
   - Open browser console
   - Look for Firebase initialization messages
   - Should see: "✅ Push notification service initialized"

2. **Check FCM token**:
   - After login, check browser console
   - Should see: "✅ FCM token updated in database"

3. **Test notification**:
   - Create a test ride
   - Check if drivers receive notifications
   - Check edge function logs in Supabase Dashboard

## Troubleshooting

### "Firebase not configured" warning
- Check all environment variables are set
- Restart dev server after adding `.env` variables
- Check variable names start with `VITE_`

### "No FCM token" in logs
- Check browser notification permissions
- Check Firebase configuration is correct
- Check VAPID key is set correctly

### "FCM_SERVER_KEY not configured"
- Set the secret in Supabase Dashboard
- Wait a few minutes for secret to propagate
- Redeploy edge functions if needed

### Edge functions can't send notifications
- Check FCM_SERVER_KEY is set correctly
- Check edge function logs for errors
- Verify FCM Server Key is valid (not expired)

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Setup Guide](https://firebase.google.com/docs/cloud-messaging/js/client)
- [VAPID Key Explanation](https://developers.google.com/web/fundamentals/push-notifications/web-push-protocol)


