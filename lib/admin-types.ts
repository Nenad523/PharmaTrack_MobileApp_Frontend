export type AdminNoticeType = {
  type: "success" | "error" | "info";
  message: string;
};

export type ActiveIngredient = {
  id: number;
  name: string;
};

export type MedicationDose = {
  id: number;
  strength: string;
};

export type MedicationSearchResult = {
  id: number;
  name: string;
  description: string | null;
  img_url?: string | null;
};

export type MedicationDetails = MedicationSearchResult & {
  activeIngredients: ActiveIngredient[];
};

export type MedicationPayload = {
  name: string;
  description?: string;
};

// ─── Pharmacy types ──────────────────────────────────────────────────────────

export type PharmacySearchResult = {
  id: number;
  name: string;
  address: string;
};

export type PharmacyDetails = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city_id: number;
};

export type PharmacyPayload = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city_id: number;
};

export type WorkingHoursEntry = {
  id: number;
  day_of_week: string;
  open_time: string;
  close_time: string;
};

export type WorkingHoursPayload = {
  day_of_week: string;
  open_time: string;
  close_time: string;
};

export type DutyEntry = {
  id: number;
  start_datetime: string;
  end_datetime: string;
};

export type DutyPayload = {
  start_datetime: string;
  end_datetime: string;
};

export type ScheduleExceptionEntry = {
  id: number;
  exception_date: string;
  name: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  reason: string;
};

export type ScheduleExceptionPayload = {
  exception_date: string;
  name: string;
  open_time?: string;
  close_time?: string;
  is_closed: boolean;
  reason: string;
};

export type City = {
  id: number;
  name: string;
};
