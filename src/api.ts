export interface Chip {
  value: number;
  count: number;
}

export interface MaletteInput {
  name: string;
  chips: Chip[];
}

export interface Malette {
  id: number;
  name: string;
  chips: Chip[];
  created_at: string;
  updated_at: string;
}

export interface StructureInput {
  malette_id: number;
  players: number;
  total_duration_minutes: number;
}

export interface BlindLevel {
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: boolean;
}

export interface TournamentStructure {
  chips_per_player: Chip[];
  starting_stack: number;
  total_chips: number;
  level_duration_minutes: number;
  number_of_levels: number;
  levels: BlindLevel[];
}

export interface Structure {
  id: number;
  malette_id: number;
  players: number;
  total_duration_minutes: number;
  result: TournamentStructure;
  created_at: string;
  updated_at: string;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const msg =
      parsed && typeof parsed === "object" && "error" in parsed &&
        typeof (parsed as { error?: unknown }).error === "string"
        ? (parsed as { error: string }).error
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, parsed);
  }
  return parsed as T;
}

// ---- Malettes ----

export function listMalettes(): Promise<Malette[]> {
  return request<Malette[]>("/malettes");
}

export function getMalette(id: number): Promise<Malette> {
  return request<Malette>(`/malettes/${id}`);
}

export function createMalette(input: MaletteInput): Promise<Malette> {
  return request<Malette>("/malettes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMalette(
  id: number,
  input: MaletteInput,
): Promise<Malette> {
  return request<Malette>(`/malettes/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteMalette(id: number): Promise<void> {
  return request<void>(`/malettes/${id}`, { method: "DELETE" });
}

// ---- Structures ----

export function listStructures(maletteId?: number): Promise<Structure[]> {
  const qs = maletteId !== undefined ? `?malette_id=${maletteId}` : "";
  return request<Structure[]>(`/structures${qs}`);
}

export function getStructure(id: number): Promise<Structure> {
  return request<Structure>(`/structures/${id}`);
}

export function createStructure(input: StructureInput): Promise<Structure> {
  return request<Structure>("/structures", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateStructure(
  id: number,
  input: StructureInput,
): Promise<Structure> {
  return request<Structure>(`/structures/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteStructure(id: number): Promise<void> {
  return request<void>(`/structures/${id}`, { method: "DELETE" });
}
