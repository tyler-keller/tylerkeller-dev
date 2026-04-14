# Privacy Policy

**Last updated: April 14, 2026**

## 1. Overview

This Privacy Policy describes how tylerkeller.dev ("the application") collects, uses, and stores information. This is a personal life-tracking application operated by Tyler Keller for personal use only.

## 2. Information Collected

The application collects the following types of data:

- **Health and fitness data** — including sleep data via Fitbit, weight, and workout activity
- **Location context** — geofence-triggered events (home, work, school) indicating general context, not precise GPS coordinates
- **Screen time data** — app usage via ActivityWatch
- **Voice recordings and journal entries** — evening audio recordings transcribed and summarized via AI
- **Progress photos** — images captured during morning routines

## 3. How Data Is Used

All collected data is used exclusively for:

- Personal life tracking, habit monitoring, and self-improvement
- Generating dashboard visualizations for personal review
- AI transcription and summarization of personal journal entries
- Creating action items in personal task management (Todoist)

Data is never used for advertising, profiling for third parties, or any commercial purpose.

## 4. Data Storage

All data is stored in a SQLite database on private infrastructure controlled solely by the operator. Media files (audio, photos) are stored on the same private server. No data is stored in third-party cloud storage beyond what is required by the integrations below.

## 5. Third-Party Services

The application shares limited data with third-party services only as necessary to operate:

| Service | Data Shared | Purpose |
|---------|-------------|---------|
| **Fitbit** | OAuth authorization; health/sleep data is read from Fitbit | Sleep and health tracking |
| **Groq** | Audio recordings | Transcription and journal summarization |
| **Todoist** | Extracted action items from journal summaries | Task creation |
| **ActivityWatch** | App and window usage events | Screen time tracking |

Each of these services has its own privacy policy governing data they receive.

## 6. Fitbit Data

This application requests access to Fitbit data including sleep logs and health metrics. This data is:

- Stored locally on private infrastructure
- Used only for personal health tracking and dashboard visualization
- Never shared with any party other than what Fitbit's own platform provides
- Accessible only to the operator via authenticated API access

## 7. Data Retention

Data is retained indefinitely for personal historical review. The operator may delete data at any time.

## 8. Security

Access to the application is protected by a secret API key. All endpoints (except `/version`) require authentication. The server is operated on private infrastructure with standard security practices.

## 9. Your Rights

As this application is operated for personal use only, no third-party users have accounts or data stored in this system. If you believe your data has been collected in error, contact tyler.c.keller@gmail.com.

## 10. Changes

This policy may be updated at any time. The "last updated" date at the top of this document reflects the most recent revision.

## 11. Contact

Tyler Keller
tyler.c.keller@gmail.com
