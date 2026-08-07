export type Tab = "translate" | "phrasebook" | "trip" | "emergency";
export type TranslationMode = "readChinese" | "speakChinese";

export type SavedPhrase = {
  id: string;
  source: string;
  translation: string;
  pronunciation: string;
  category: string;
  isNew?: boolean;
  isFavorite?: boolean;
};

export type TranslationResult = {
  source: string;
  translation: string;
  pronunciation: string;
  context: string;
  language: string;
  mode: TranslationMode;
  uncertainSegments?: string[];
  suggestedReply?: string;
  model?: string;
};

export type TranslationApiResponse = {
  detected_language: string;
  source_text: string;
  translated_text: string;
  romanization: string;
  context: string;
  uncertain_segments?: string[];
  suggested_reply?: string;
  model?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: string;
};

export type TranslationHistoryItem = TranslationResult & {
  id: string;
  createdAt: string;
};

export type TripItem = {
  id: string;
  label: string;
  done: boolean;
};

export type UsefulLink = {
  id: string;
  title: string;
  url: string;
  category: string;
};

export type Expense = {
  id: string;
  amount: number;
  currency: string;
  category: string;
  note: string;
  date: string;
};

export type SavedAddress = {
  id: string;
  label: string;
  category: string;
  englishAddress: string;
  localAddress: string;
  mapUrl?: string;
};

export type StoredImage = {
  id: string;
  title: string;
  category: string;
  dataUrl: string;
  createdAt: string;
};

export type PersonalProfile = {
  name: string;
  studentId: string;
  passportId: string;
};

export type MedicalInfo = {
  allergies: string;
  medications: string;
  bloodType: string;
  emergencyContact: string;
};

export type EmergencyDetails = {
  accommodation: string;
  university: string;
  embassy: string;
  insurance: string;
  localEmergency: string;
};
