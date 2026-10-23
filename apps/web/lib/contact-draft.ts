import type { ContactTopic } from "@repo/shared";

// The contact form's draft, kept in this browser until the API confirms the
// message is stored, so nothing typed is lost to a reload, a closed tab or a
// failed send. Per viewer only, and the form works the same without storage

export type ContactFields = {
  name: string;
  email: string;
  topic: ContactTopic | "";
  message: string;
};

export type ContactDraft = {
  fields: ContactFields;
  /** When typing started, for the API's too-fast check. Survives reloads */
  startedAt: number | null;
  /** Sent with every attempt, so a retry can't store the message twice */
  key: string;
};

const STORAGE_KEY = "contact-draft:v1";

export const emptyFields: ContactFields = {
  name: "",
  email: "",
  topic: "",
  message: "",
};

export function newDraft(): ContactDraft {
  return { fields: emptyFields, startedAt: null, key: newKey() };
}

// crypto.randomUUID only exists on secure origins, and npm run dev:lan serves
// plain http to phones
export function newKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const isString = (value: unknown): value is string => typeof value === "string";

export function readDraft(): ContactDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<ContactDraft> | null;
    const fields = saved?.fields;
    if (
      !fields ||
      ![fields.name, fields.email, fields.topic, fields.message].every(
        isString,
      ) ||
      !isString(saved.key)
    ) {
      return null;
    }
    return {
      fields,
      startedAt: typeof saved.startedAt === "number" ? saved.startedAt : null,
      key: saved.key,
    };
  } catch {
    return null;
  }
}

export function writeDraft(draft: ContactDraft) {
  try {
    const { name, email, topic, message } = draft.fields;
    if (name || email || topic || message) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // private mode or storage blocked: the form still works, just no draft
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // as above
  }
}
