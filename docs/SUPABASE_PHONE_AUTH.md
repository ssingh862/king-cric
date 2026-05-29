# Fix: "Unsupported phone provider" on login

This error comes from **Supabase**, not the app. It means **Phone auth is on** but **no SMS gateway is connected** to send OTPs.

## Quick fix (5 minutes) — Twilio (works for +91 India)

### 1. Create Twilio account

1. Go to [twilio.com/try-twilio](https://www.twilio.com/try-twilio) and sign up.
2. In Twilio Console, note:
   - **Account SID**
   - **Auth Token**

### 2. Create a Verify service (recommended)

1. Twilio Console → **Verify** → **Services** → **Create**
2. Copy the **Service SID** (starts with `VA...`)

### 3. Configure Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project **local-cricket**
2. **Authentication** → **Providers** → **Phone**
3. Turn **Enable Phone provider** ON
4. Under **SMS provider**, choose **Twilio Verify** (or **Twilio**)
5. Fill in:
   - Account SID
   - Auth Token
   - Message Service SID / Verify Service SID
6. Click **Save**

### 4. Test without spending SMS (optional)

In the same **Phone** settings page, look for **Test phone numbers** (or use Twilio trial verified numbers only).

Add a test entry, for example:

| Phone        | OTP    |
|-------------|--------|
| +919067876459 | 123456 |

Then in the app use that number and OTP `123456`.

> Trial Twilio accounts can only SMS **verified** numbers. Add `+919067876459` in Twilio → Phone Numbers → Verified Caller IDs.

---

## Alternative: Twilio Programmable SMS (not Verify)

Use provider **Twilio** and a **Messaging Service SID** (starts with `MG...`) from Twilio → Messaging → Services.

---

## Checklist

- [ ] Phone provider **enabled** in Supabase
- [ ] Twilio credentials **saved** (not empty)
- [ ] For trial: your number **verified** in Twilio
- [ ] `.env` has correct `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Restart app: `npx expo start -c`

---

## Still failing?

| Error | Cause |
|-------|--------|
| Unsupported phone provider | No SMS provider configured |
| Error sending sms | Wrong Twilio SID/token |
| Invalid phone number | Use format `+919067876459` (app adds +91 automatically) |
| Signups not allowed | Enable **Sign ups** under Auth → Providers → Phone |
