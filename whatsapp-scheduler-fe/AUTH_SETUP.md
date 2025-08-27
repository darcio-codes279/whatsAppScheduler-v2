# Authentication Setup Guide

This guide will help you set up email/password authentication with Supabase for the WhatsApp Scheduler application.

## Prerequisites

- A Supabase account (free tier available)
- Node.js and npm installed
- The WhatsApp Scheduler frontend application

## Step 1: Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `whatsapp-scheduler`
   - Database Password: Choose a strong password
   - Region: Select the closest region to your users
5. Click "Create new project"
6. Wait for the project to be set up (usually takes 1-2 minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **Anon public key** (under "Project API keys")

## Step 3: Configure Environment Variables

1. In your frontend project root, copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Step 4: Set Up Database Schema

The authentication system requires a `profiles` table to store additional user information.

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Paste and run the following SQL:

```sql
-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Create function to handle user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'firstName',
    new.raw_user_meta_data->>'lastName'
  );
  return new;
end;
$$;

-- Create trigger to automatically create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create function to handle profile updates
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Create trigger to automatically update updated_at
create trigger handle_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
```

## Step 5: Configure Authentication Settings

1. In your Supabase dashboard, go to **Authentication** > **Settings**
2. Configure the following settings:

### Site URL
- Set to your frontend URL: `http://localhost:3000` (for development)
- For production, use your actual domain

### Redirect URLs
Add the following URLs:
- `http://localhost:3000/auth/reset-password` (for development)
- `https://yourdomain.com/auth/reset-password` (for production)

### Email Templates (Optional)
You can customize the email templates for:
- Confirm signup
- Reset password
- Magic link

## Step 6: Test the Authentication

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
3. You should be redirected to the login page
4. Click "Sign up" to create a new account
5. Fill in the form and submit
6. Check your email for the confirmation link
7. After confirming, you should be able to sign in

## Features Included

### Authentication Pages
- **Login** (`/auth/login`): Email/password sign in
- **Signup** (`/auth/signup`): User registration with first name, last name, email, and password
- **Reset Password** (`/auth/reset-password`): Password reset functionality

### Protected Routes
- All main application routes are protected and require authentication
- Automatic redirect to login page for unauthenticated users

### User Profile Management
- View and edit profile information
- Update first name and last name
- Sign out functionality
- User avatar display (with fallback to initials)

### Security Features
- Row Level Security (RLS) enabled
- Secure password handling
- JWT-based authentication
- Automatic session management

## Customization

### Styling
The authentication pages use the same design system as the rest of the application:
- Consistent with the green theme
- Responsive design
- Modern UI components

### Additional Fields
To add more user profile fields:
1. Add columns to the `profiles` table in Supabase
2. Update the `UserProfile` interface in `contexts/auth-context.tsx`
3. Modify the `UserProfile` component to include the new fields

### Email Customization
In Supabase dashboard > Authentication > Email Templates, you can:
- Customize email content
- Add your branding
- Modify the styling

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check that your environment variables are correctly set
   - Ensure you're using the anon public key, not the service role key

2. **"User not found" after signup**
   - Check if email confirmation is required
   - Look for the confirmation email in spam folder

3. **Profile not created automatically**
   - Verify the trigger function was created correctly
   - Check the Supabase logs for any errors

4. **RLS policy errors**
   - Ensure RLS policies are correctly set up
   - Check that the user is authenticated when accessing profiles

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Next.js with Supabase](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)

## Production Deployment

Before deploying to production:

1. Update environment variables with production Supabase URL
2. Configure production redirect URLs in Supabase
3. Set up proper email delivery (Supabase uses SendGrid by default)
4. Consider enabling additional security features like 2FA
5. Set up monitoring and logging

## Security Best Practices

1. **Never expose service role keys** - Only use anon public keys in frontend
2. **Use HTTPS in production** - Required for secure authentication
3. **Implement proper error handling** - Don't expose sensitive information
4. **Regular security updates** - Keep dependencies updated
5. **Monitor authentication logs** - Watch for suspicious activity

Your WhatsApp Scheduler application now has a complete authentication system integrated with Supabase!