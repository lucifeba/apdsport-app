import fs from 'node:fs';

const file = new URL('../wrangler.jsonc', import.meta.url);
let config = fs.readFileSync(file, 'utf8');
config = config.replace('"DRY_RUN": "true"', '"DRY_RUN": "false"');

if (!config.includes('GOOGLE_INBOX_FOLDER_ID')) {
  config = config.replace(
    '"GOOGLE_DRAFTS_FOLDER_ID": "1iwBrmrThuFcLEwwywSQhH7LDou_xSi-Y",',
    '"GOOGLE_DRAFTS_FOLDER_ID": "1iwBrmrThuFcLEwwywSQhH7LDou_xSi-Y",\n    "GOOGLE_INBOX_FOLDER_ID": "1jSGuzrjACaNloa7vP79oae7qe4BOjgjF",\n    "GMAIL_QUERY": "label:\\"APD/Entrada Cliente\\"",',
  );
}

if (!config.includes('SLACK_ALERT_CHANNEL_ID')) {
  config = config.replace(
    '"SLACK_CHANNEL_ID": "C0BGS1D8YJW",',
    '"SLACK_CHANNEL_ID": "C0BGS1D8YJW",\n    "SLACK_ALERT_CHANNEL_ID": "C0BGS1CTRJN",',
  );
}

fs.writeFileSync(file, config);
console.log('Production configuration patch applied');
