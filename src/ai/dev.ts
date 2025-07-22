import { config } from 'dotenv';
config();

import '@/ai/flows/ai-assistant-chat.ts';
import '@/ai/flows/ai-health-summary.ts';
import '@/ai/flows/personalized-notifications.ts';
import '@/ai/flows/process-health-data-file.ts';
import '@/ai/schemas.ts';
