import type { LanguageModel } from 'ai';
import type { AIProviderConfig } from '../config/schema';

export interface RegisteredProvider {
  name: string;
  config: AIProviderConfig;
  model: LanguageModel;
}
