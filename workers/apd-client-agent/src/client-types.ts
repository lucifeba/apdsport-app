export interface AgentEnv {
  DB: D1Database;
  AI: any;
  DRY_RUN?: string;
  GOOGLE_USER?: string;
  GOOGLE_DRAFTS_FOLDER_ID?: string;
  GOOGLE_INBOX_FOLDER_ID?: string;
  GMAIL_QUERY?: string;
  SLACK_CHANNEL_ID?: string;
  SLACK_ALERT_CHANNEL_ID?: string;
  NOTION_DATA_SOURCE_ID?: string;
  NOTION_VERSION?: string;
  AI_MODEL?: string;
  MAX_ITEMS_PER_RUN?: string;
  MAX_SOURCE_CHARS?: string;
  LOOKBACK_MINUTES?: string;
  MAX_AI_CALLS_PER_DAY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  SLACK_BOT_TOKEN?: string;
  SLACK_SIGNING_SECRET?: string;
  NOTION_TOKEN?: string;
  ADMIN_TOKEN?: string;
}
export type Decision='APROBADO'|'REVISAR'|'POSPUESTO'|'DESCARTADO';
export type Source={sourceType:'GMAIL'|'DRIVE';id:string;revision:string;modifiedAt:string;title:string;text:string;mimeType:string;clientSeed:string;metadata:Record<string,unknown>};
export type Analysis={material_type:string;objective:string;summary:string;changes:string[];improved:string[];worsened:string[];maintained:string[];red_flags:string[];pending_questions:string[];hypotheses:string[];training:string[];nutrition_fueling:string[];recovery:string[];metrics:string[];reply_message:string;priority_score_0_100:number;review_points:string[];minutes_saved:number};