# How to Get Your Supabase API Key

## On the API Settings Page:

1. **Scroll down** on the API Settings page
2. Look for the section called **"Project API keys"** or **"API Keys"**
3. You'll see two keys:
   - **`anon` `public`** - This is the one you need! ✅
   - **`service_role` `secret`** - Don't use this one (it's for server-side only)

4. **Copy the `anon` `public` key** (it's a long string starting with `eyJ...`)

## Update Your .env File

Once you have the key, update your `.env` file:

```env
VITE_SUPABASE_URL=https://aansdoyoyqlszftneazr.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key-here
VITE_SUPABASE_PROJECT_ID=aansdoyoyqlszftneazr
```

Replace `your-anon-public-key-here` with the actual key you copied.

## If You Can't Find the Keys Section

The API keys are usually shown in a table or card format. Look for:
- A section titled "Project API keys" or "API Keys"
- Two rows: one for `anon` and one for `service_role`
- The `anon` key will be labeled as `public`
- There should be a "Copy" or "Reveal" button next to it

## After Getting the Key

1. Update your `.env` file
2. Run the migrations (see SETUP_INSTRUCTIONS.md)
3. Create the storage bucket
4. Restart your dev server

