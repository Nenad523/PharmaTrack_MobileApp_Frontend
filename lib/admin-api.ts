import { apiUrl } from "./api";
import { authHeader } from "./auth";
import type {
  ActiveIngredient,
  City,
  DutyEntry,
  DutyPayload,
  MedicationDetails,
  MedicationDose,
  MedicationPayload,
  MedicationSearchResult,
  PharmacyDetails,
  PharmacyPayload,
  PharmacySearchResult,
  ScheduleExceptionEntry,
  ScheduleExceptionPayload,
  WorkingHoursEntry,
  WorkingHoursPayload,
} from "./admin-types";

async function responseMessage(res: Response): Promise<string> {
  try {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const data = (await res.json()) as {
        error?: { message?: string | string[] };
        message?: string | string[];
      };
      const msg = data.error?.message ?? data.message;
      if (Array.isArray(msg)) return msg.join(", ");
      return msg || "Zahtjev nije uspio.";
    }
    return (await res.text()) || "Zahtjev nije uspio.";
  } catch {
    return "Zahtjev nije uspio.";
  }
}

async function adminRequest<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const headers = new Headers(await authHeader());
  if (options.json !== undefined) headers.set("Content-Type", "application/json");

  const res = await fetch(apiUrl(path), {
    ...options,
    method,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  if (!res.ok) throw new Error(await responseMessage(res));
  return res.json() as Promise<T>;
}

// ─── Medications ─────────────────────────────────────────────────────────────

export async function searchMedications(query: string): Promise<MedicationSearchResult[]> {
  const res = await fetch(apiUrl(`/api/v1/medication/search?name=${encodeURIComponent(query)}`));
  if (!res.ok) throw new Error(await responseMessage(res));
  const data = (await res.json()) as { data?: MedicationSearchResult[] };
  return Array.isArray(data.data) ? data.data : [];
}

export async function getMedicationDetails(id: number): Promise<MedicationDetails> {
  const res = await fetch(apiUrl(`/api/v1/medication/${id}`));
  if (!res.ok) throw new Error(await responseMessage(res));
  const data = (await res.json()) as { data: MedicationDetails };
  return {
    ...data.data,
    activeIngredients: Array.isArray(data.data.activeIngredients)
      ? data.data.activeIngredients
      : [],
  };
}

export async function getMedicationDoses(id: number): Promise<MedicationDose[]> {
  const res = await fetch(apiUrl(`/api/v1/medication/${id}/doses`));
  if (!res.ok) throw new Error(await responseMessage(res));
  const data = (await res.json()) as { data?: MedicationDose[] };
  return Array.isArray(data.data) ? data.data : [];
}

export async function getIngredients(): Promise<ActiveIngredient[]> {
  const data = await adminRequest<{ data?: ActiveIngredient[] }>("/api/v1/admin/ingredients");
  return Array.isArray(data.data) ? data.data : [];
}

export async function createMedication(payload: MedicationPayload) {
  return adminRequest<{ success: boolean; id: number }>("/api/v1/admin/medications", {
    method: "POST",
    json: payload,
  });
}

export async function updateMedication(id: number, payload: MedicationPayload) {
  return adminRequest<{ success: boolean }>(`/api/v1/admin/medications/${id}`, {
    method: "PUT",
    json: payload,
  });
}

export async function deleteMedication(id: number) {
  return adminRequest<{ success: boolean }>(`/api/v1/admin/medications/${id}`, {
    method: "DELETE",
  });
}

export async function createIngredient(name: string) {
  return adminRequest<{ success: boolean; id: number }>("/api/v1/admin/ingredients", {
    method: "POST",
    json: { name },
  });
}

export async function linkIngredients(medicationId: number, ingredientIds: number[]) {
  return adminRequest<{ success: boolean }>(
    `/api/v1/admin/medications/${medicationId}/ingredients`,
    { method: "POST", json: { ingredientIds } }
  );
}

export async function unlinkIngredient(medicationId: number, ingredientId: number) {
  return adminRequest<{ success: boolean }>(
    `/api/v1/admin/medications/${medicationId}/ingredients/${ingredientId}`,
    { method: "DELETE" }
  );
}

export async function createDoses(medicationId: number, strengths: string[]) {
  return adminRequest<{ success: boolean }>(
    `/api/v1/admin/medications/${medicationId}/doses`,
    { method: "POST", json: { strengths } }
  );
}

export async function deleteDose(medicationId: number, doseId: number) {
  return adminRequest<{ success: boolean }>(
    `/api/v1/admin/medications/${medicationId}/doses/${doseId}`,
    { method: "DELETE" }
  );
}

export async function uploadMedicationImage(medicationName: string, imageUri: string) {
  const headers = await authHeader();
  const formData = new FormData();
  formData.append("medicationName", medicationName);
  const filename = imageUri.split("/").pop() ?? "image.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  formData.append("file", { uri: imageUri, name: filename, type: mimeType } as unknown as Blob);

  const res = await fetch(apiUrl("/api/v1/upload/medication-image"), {
    method: "POST",
    headers: headers as Record<string, string>,
    body: formData,
  });

  if (!res.ok) throw new Error(await responseMessage(res));
  return res.json() as Promise<{ medicationId: number; medicationName: string; imageUrl: string }>;
}

// ─── Pharmacies ──────────────────────────────────────────────────────────────

export async function searchPharmacies(name: string): Promise<PharmacySearchResult[]> {
  const data = await adminRequest<{ data: PharmacySearchResult[] }>(
    `/api/v1/admin/pharmacies?name=${encodeURIComponent(name)}`
  );
  return Array.isArray(data.data) ? data.data : [];
}

export async function getPharmacyById(id: number): Promise<PharmacyDetails> {
  const data = await adminRequest<{ data: PharmacyDetails }>(`/api/v1/admin/pharmacies/${id}`);
  return data.data;
}

export async function createPharmacy(payload: PharmacyPayload) {
  return adminRequest<{ success: boolean; id: number }>("/api/v1/admin/pharmacies", {
    method: "POST",
    json: payload,
  });
}

export async function updatePharmacy(id: number, payload: Partial<PharmacyPayload>) {
  return adminRequest<{ success: boolean }>(`/api/v1/admin/pharmacies/${id}`, {
    method: "PUT",
    json: payload,
  });
}

export async function deletePharmacy(id: number) {
  return adminRequest<{ success: boolean }>(`/api/v1/admin/pharmacies/${id}`, {
    method: "DELETE",
  });
}

export async function getWorkingHours(pharmacyId: number): Promise<WorkingHoursEntry[]> {
  const data = await adminRequest<{ data: WorkingHoursEntry[] }>(
    `/api/v1/admin/pharmacies/${pharmacyId}/working-hours`
  );
  return Array.isArray(data.data) ? data.data : [];
}

export async function createWorkingHours(pharmacyId: number, payload: WorkingHoursPayload) {
  return adminRequest<{ success: boolean; id: number }>(
    `/api/v1/admin/pharmacies/${pharmacyId}/working-hours`,
    { method: "POST", json: payload }
  );
}

export async function updateWorkingHours(
  pharmacyId: number,
  whId: number,
  payload: Partial<WorkingHoursPayload>
) {
  return adminRequest<{ success: boolean }>(
    `/api/v1/admin/pharmacies/${pharmacyId}/working-hours/${whId}`,
    { method: "PUT", json: payload }
  );
}

export async function deleteWorkingHours(pharmacyId: number, whId: number) {
  return adminRequest<{ success: boolean }>(
    `/api/v1/admin/pharmacies/${pharmacyId}/working-hours/${whId}`,
    { method: "DELETE" }
  );
}

export async function getDutySchedules(pharmacyId: number): Promise<DutyEntry[]> {
  const data = await adminRequest<{ data: DutyEntry[] }>(
    `/api/v1/admin/pharmacies/${pharmacyId}/duty`
  );
  return Array.isArray(data.data) ? data.data : [];
}

export async function createDuty(pharmacyId: number, payload: DutyPayload) {
  return adminRequest<{ success: boolean; id: number }>(
    `/api/v1/admin/pharmacies/${pharmacyId}/duty`,
    { method: "POST", json: payload }
  );
}

export async function deleteDuty(pharmacyId: number, dutyId: number) {
  return adminRequest<{ success: boolean }>(
    `/api/v1/admin/pharmacies/${pharmacyId}/duty/${dutyId}`,
    { method: "DELETE" }
  );
}

export async function getScheduleExceptions(pharmacyId: number): Promise<ScheduleExceptionEntry[]> {
  const data = await adminRequest<{ data: ScheduleExceptionEntry[] }>(
    `/api/v1/admin/pharmacies/${pharmacyId}/schedule-exceptions`
  );
  return Array.isArray(data.data) ? data.data : [];
}

export async function createScheduleException(pharmacyId: number, payload: ScheduleExceptionPayload) {
  return adminRequest<{ success: boolean; id: number }>(
    `/api/v1/admin/pharmacies/${pharmacyId}/schedule-exceptions`,
    { method: "POST", json: payload }
  );
}

export async function updateScheduleException(
  pharmacyId: number,
  exId: number,
  payload: Partial<ScheduleExceptionPayload>
) {
  return adminRequest<{ success: boolean }>(
    `/api/v1/admin/pharmacies/${pharmacyId}/schedule-exceptions/${exId}`,
    { method: "PUT", json: payload }
  );
}

export async function deleteScheduleException(pharmacyId: number, exId: number) {
  return adminRequest<{ success: boolean }>(
    `/api/v1/admin/pharmacies/${pharmacyId}/schedule-exceptions/${exId}`,
    { method: "DELETE" }
  );
}

export async function getCities(): Promise<City[]> {
  const res = await fetch(apiUrl("/api/v1/cities"));
  if (!res.ok) throw new Error("Greška pri dohvatanju gradova.");
  const data = (await res.json()) as { data?: City[] } | City[];
  if (Array.isArray(data)) return data;
  return Array.isArray((data as { data?: City[] }).data) ? (data as { data: City[] }).data : [];
}
