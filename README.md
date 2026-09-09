# Shorts AI Engine

Build a full-stack web application called "AI Stack Engine".

IMPORTANT:

This is an MVP for an automated short-form content management and publishing system.

The initial goal is to manage content for ONLY:

1. YouTube Shorts

2. TikTok

Do NOT implement Instagram.

Do NOT add paid AI APIs.

Do NOT add paid automation services.

Do NOT create fake integrations or pretend an API is connected when it is not.

The application must be designed so external APIs can be added later through secure integrations.

TECH STACK:

- React

- TypeScript

- Tailwind CSS

- shadcn/ui

- Supabase for database, authentication and storage

- Supabase Edge Functions for future server-side integrations

- Responsive desktop-first interface

DESIGN:

Create a modern SaaS dashboard for an AI/content automation company.

Visual style:

- dark modern interface

- clean and professional

- subtle gradients

- minimal cards

- excellent spacing

- modern typography

- dashboard inspired by modern SaaS products

- avoid excessive animations

- responsive

BRAND:

Name: AI Stack Engine

Tagline: "Turn long-form content into a short-form content machine."

MAIN DASHBOARD:

Create a sidebar navigation with:

- Dashboard

- Sources

- Content

- Approval Queue

- Publishing Queue

- Analytics

- Affiliate Links

- Settings

Dashboard should show:

1. Total sources

2. Total content pieces

3. Awaiting approval

4. Scheduled posts

5. Published posts

6. Total views

7. Clicks

8. Affiliate conversions

Also show:

- Recent content

- Upcoming publications

- Platform distribution

- Content status overview

CONTENT WORKFLOW:

The application should support this workflow:

SOURCE

→ CONTENT/CLIP

→ REVIEW

→ APPROVED

→ SCHEDULED

→ PUBLISHED

→ ANALYTICS

SOURCE MANAGEMENT:

Create a Sources page.

Users should be able to add:

- Source name

- Source URL

- Source type

- Creator/channel name

- Permission/license status

- Notes

Source types:

- YouTube

- Podcast

- Live Stream

- Upload

- Other

Permission status:

- Confirmed permission

- Licensed

- Own content

- Unknown

- Not allowed

IMPORTANT:

The system must prominently warn users when a source has "Unknown" or "Not allowed" permission status.

CONTENT MANAGEMENT:

Create a Content page where users can create and manage short-form videos.

Each content item should have:

- Title

- Description

- Source

- Video file

- Thumbnail

- Duration

- Hook

- Caption

- Hashtags

- CTA

- Affiliate link

- Status

- Platforms

- Scheduled date/time

- Notes

Content statuses:

- Draft

- Processing

- Ready for Review

- Approved

- Rejected

- Scheduled

- Published

- Failed

PLATFORMS:

Each content item can be assigned to:

- YouTube Shorts

- TikTok

Do not implement Instagram.

APPROVAL QUEUE:

Create a dedicated Approval Queue.

Display each video as a review card.

The card should contain:

- video preview

- title

- description

- hook

- hashtags

- CTA

- affiliate link

- source

- permission status

- target platforms

Buttons:

[Approve]

[Reject]

[Edit]

When approving:

- change status to Approved

- record approval timestamp

- record approving user

When rejecting:

- change status to Rejected

- require a rejection reason

PUBLISHING QUEUE:

Create a publishing queue showing:

- video

- platform

- scheduled date/time

- status

- publication result

- error message

Statuses:

- Waiting

- Scheduled

- Publishing

- Published

- Failed

Create buttons:

- Schedule

- Publish Now

- Cancel

- Retry

IMPORTANT:

For now, publishing should be implemented as an abstraction/interface and mock workflow only.

DO NOT pretend YouTube or TikTok are connected.

Create clean service modules/interfaces so we can later connect:

YouTube Data API

TikTok Content Posting API

The UI should clearly show:

"Not connected"

for both platforms until OAuth credentials are configured.

DATABASE:

Use Supabase PostgreSQL.

Create proper relational tables for:

profiles

sources

content

content_platforms

approval_actions

publishing_jobs

platform_accounts

affiliate_links

analytics

automation_logs

Use UUID primary keys.

Include:

- created_at

- updated_at

where appropriate.

Create proper foreign keys and indexes.

AUTHENTICATION:

Implement Supabase authentication.

Support:

- email/password login

- logout

- protected dashboard routes

Each user's content and sources must be isolated using Row Level Security.

IMPORTANT:

Implement RLS policies correctly so one user cannot access another user's data.

STORAGE:

Create a Supabase Storage bucket for uploaded videos and thumbnails.

Do not expose private files publicly.

Use signed URLs where appropriate.

AFFILIATE LINKS:

Create an Affiliate Links page.

Fields:

- Program

- Company

- URL

- Tracking URL

- Description

- Active/Inactive

- Platform

- Notes

Examples of programs we may add later:

- ElevenLabs

- Webflow

- Thinkific

- Browse AI

Do not connect to any affiliate network API yet.

Allow content items to select an affiliate link.

ANALYTICS:

Create an Analytics page.

For now, create the database structure and UI for:

- Views

- Likes

- Comments

- Shares

- Subscribers/Follows

- Link clicks

- Conversions

- Revenue

Allow analytics records to be associated with:

- content

- platform

- date

Do not fabricate analytics data.

If there is no real data, display empty states.

AUTOMATION:

Create an Automation section in Settings.

Show future automation capabilities:

1. Automatic source processing

2. Automatic clip detection

3. AI content scoring

4. Automatic title generation

5. Automatic description generation

6. Automatic hashtag generation

7. Automatic affiliate CTA

8. Automatic publishing

9. Performance analysis

For each feature, show:

"Coming in future version"

Do not implement fake AI functionality.

SECURITY:

VERY IMPORTANT:

Never store API keys directly in frontend code.

Never expose secrets in client-side JavaScript.

Future API credentials must be stored using secure server-side environment variables / Supabase secrets.

Use OAuth for YouTube and TikTok when integrations are implemented.

Create placeholder Edge Function structure for future integrations, but do not connect to external APIs yet.

DEVELOPER EXPERIENCE:

Organize the code cleanly.

Create reusable components.

Create service abstractions such as:

platforms/

  youtube.ts

  tiktok.ts

The services should expose functions such as:

connect()

disconnect()

publishVideo()

scheduleVideo()

getAnalytics()

For now these functions can return a clear "integration not configured" response rather than fake success.

Also create a central configuration layer so API integrations can be added later without rewriting the application.

EMPTY STATES:

Every page must have useful empty states.

Examples:

"No content yet"

"Add your first source to start building your content pipeline."

"No platforms connected"

"Connect YouTube or TikTok when you're ready."

"No affiliate links"

"Add your first affiliate program."

ERROR HANDLING:

Implement clear user-friendly error messages.

Use toast notifications for successful actions and errors.

Do not silently fail.

INITIAL MVP PRIORITY:

Focus on making these parts fully functional:

1. Authentication

2. Dashboard

3. Sources CRUD

4. Content CRUD

5. Video upload

6. Approval Queue

7. Publishing Queue

8. Affiliate Links CRUD

9. Database + RLS

10. Clean architecture for future YouTube/TikTok integrations

Do not spend time implementing the future AI automation yet.

The application should be functional, polished and ready for the next development phase.

After implementation, provide a concise summary of:

- pages created

- database tables created

- authentication setup

- storage setup

- integrations that are placeholders

- anything that still requires configuration

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/90b07bdc-eb1f-40fc-95ea-113317d8f530).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
