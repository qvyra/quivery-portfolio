"use client";

import type { AdminCollection } from "@repo/shared";
import { adminContentSchemas } from "@repo/shared";
import type { DeployOutcome } from "./api";
import type { Errors } from "./form";

/** One item as the API's admin endpoints return it */
export type AdminItem = {
  id: string;
  publishStatus: "DRAFT" | "PUBLISHED";
  visible: boolean;
  sortOrder: number;
  updatedAt: string;
  content: Record<string, unknown>;
  draft: Record<string, unknown> | null;
};

export type AdminChange = { item: AdminItem | null; deploy?: DeployOutcome };

/** Checks content with the same strict schema the API uses */
export function validate(collection: AdminCollection, values: unknown): Errors {
  const result = adminContentSchemas[collection].safeParse(values);
  if (result.success) return {};
  const errors: Errors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    errors[path] ??= issue.message;
  }
  return errors;
}

/** The API's "path: message;path: message" validation text, by path */
export function apiErrors(message: string): Errors {
  const errors: Errors = {};
  for (const part of message.split(";")) {
    const at = part.indexOf(": ");
    if (at > 0) errors[part.slice(0, at)] ??= part.slice(at + 2);
  }
  return errors;
}

export function statusOf(item: AdminItem): string {
  if (item.publishStatus === "DRAFT") return "Draft";
  return item.draft ? "Published, with unpublished changes" : "Published";
}
