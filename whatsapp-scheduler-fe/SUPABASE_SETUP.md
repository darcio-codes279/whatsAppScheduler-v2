# Supabase Database Setup Guide

This guide will help you set up Supabase as the database backend for your WhatsApp Scheduler application.

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Fill in your project details:
   - **Name**: WhatsApp Scheduler
   - **Database Password**: Choose a strong password
   - **Region**: Choose the region closest to your users
5. Click "Create new project"
6. Wait for the project to be set up (this may take a few minutes)

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## 3. Configure Environment Variables

1. Open the `.env.local` file in your project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4. Set Up Database Tables

Run the following SQL commands in your Supabase SQL Editor (Dashboard → SQL Editor):

### Create the profiles table

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
```

### Create the scheduled_messages table

```sql
-- Create scheduled_messages table
create table public.scheduled_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  recipient_number text not null,
  recipient_name text,
  message_content text not null,
  scheduled_date date not null,
  scheduled_time time not null,
  status text default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled')),
  sent_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.scheduled_messages enable row level security;

-- Create policies
create policy "Users can view own messages" on public.scheduled_messages
  for select using (auth.uid() = user_id);

create policy "Users can insert own messages" on public.scheduled_messages
  for insert with check (auth.uid() = user_id);

create policy "Users can update own messages" on public.scheduled_messages
  for update using (auth.uid() = user_id);

create policy "Users can delete own messages" on public.scheduled_messages
  for delete using (auth.uid() = user_id);
```

### Create function to handle profile creation

```sql
-- Function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
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
$$ language plpgsql security definer;

-- Trigger to call the function when a new user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Create function to update timestamps

```sql
-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers to update updated_at on profiles
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Triggers to update updated_at on scheduled_messages
create trigger handle_scheduled_messages_updated_at
  before update on public.scheduled_messages
  for each row execute procedure public.handle_updated_at();
```

## 5. Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Site URL**, add your development and production URLs:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/auth/callback` (for development)
   - `https://yourdomain.com/auth/callback` (for production)

## 6. Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/auth/signup`
3. Create a new account
4. Check your Supabase dashboard to see if:
   - The user was created in **Authentication** → **Users**
   - A profile was created in **Database** → **profiles** table

## 7. Optional: Set Up Email Templates

1. Go to **Authentication** → **Email Templates**
2. Customize the email templates for:
   - Confirm signup
   - Reset password
   - Magic link

## Troubleshooting

### Common Issues:

1. **"Invalid API key"**: Make sure you're using the `anon` key, not the `service_role` key
2. **CORS errors**: Ensure your site URL is correctly configured in Supabase settings
3. **RLS policies**: If you can't access data, check that your Row Level Security policies are correctly set up
4. **Environment variables**: Make sure your `.env.local` file is in the project root and the variables are correctly named

### Useful Resources:

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Next.js with Supabase](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Next Steps

Once your Supabase database is set up:

1. Test user registration and login
2. Test creating and managing scheduled messages
3. Set up your production environment with the same database structure
4. Consider setting up database backups and monitoring

Your WhatsApp Scheduler application is now connected to Supabase and ready to use!