interface Env {
  DB: D1Database;
  AI: any;
  DRY_RUN: string;
  GOOGLE_USER: string;
  GOOGLE_DRAFTS_FOLDER_ID: string;
  GOOGLE_INBOX_FOLDER_ID?: string;
  GMAIL_QUERY?: string;
  SLACK_CHANNEL_ID: string;
  SLACK_ALERT_CHANNEL_ID?: string;
  NOTION_DATA_SOURCE_ID: string;
  NOTION_VERSION: string;
  AI_MODEL: string;
  MAX_ITEMS_PER_RUN: string;
  MAX_SOURCE_CHARS: string;
  LOOKBACK_MINUTES: string;
  MAX_AI