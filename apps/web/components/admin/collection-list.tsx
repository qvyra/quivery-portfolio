"use client";

import { adminCollectionSchema, type AdminCollection } from "@repo/shared";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { adminFetch } from "./api";
import { collections } from "./fields";
import { IconButton, move } from "./form";
import { statusOf, type AdminChange, type AdminItem } from "./items";
import { deployNotice, useNotice } from "./shell";

export function CollectionList() {
  const params = useParams<{ collection: string }>();
  const parsed = adminCollectionSchema.safeParse(params.collection);
  if (!parsed.success) return <p>No such collection.</p>;
  return <List key={parsed.data} collection={parsed.data} />;
}

function List({ collection }: { collection: AdminCollection }) {
  const config = collections[collection];
  const notify = useNotice();
  const [items, setItems] = useState<AdminItem[] | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    adminFetch<AdminItem[]>(`/collections/${collection}`)
      .then(setItems)
      .catch((e: Error) => {
        setItems([]);
        notify(e.message, "error");
      });
  }, [collection, notify]);

  const base = `/collections/${collection}`;

  // shown at once, rolled back if the API refuses
  async function reorder(next: AdminItem[]) {
    const previous = items;
    setItems(next);
    try {
      setItems(
        await adminFetch<AdminItem[]>(`${base}/reorder`, {
          method: "POST",
          body: { ids: next.map((i) => i.id) },
        }),
      );
      notify("Order saved. The site updates in a moment.");
    } catch (e) {
      setItems(previous);
      notify((e as Error).message, "error");
    }
  }

  async function act(
    item: AdminItem,
    action: "publish" | "unpublish" | "discard" | "visibility" | "delete",
  ) {
    const previous = items;
    if (action === "visibility") {
      setItems(
        (all) =>
          all?.map((i) =>
            i.id === item.id ? { ...i, visible: !i.visible } : i,
          ) ?? null,
      );
    }
    if (action === "delete") {
      if (
        !window.confirm(
          `Delete "${config.label(item.content)}"? This can't be undone.`,
        )
      )
        return;
      setItems((all) => all?.filter((i) => i.id !== item.id) ?? null);
    }
    try {
      const change = await adminFetch<AdminChange>(
        action === "visibility"
          ? `${base}/${item.id}/visibility`
          : action === "delete"
            ? `${base}/${item.id}`
            : `${base}/${item.id}/${action}`,
        action === "visibility"
          ? { method: "PUT", body: { visible: !item.visible } }
          : { method: action === "delete" ? "DELETE" : "POST" },
      );
      if (change.item) {
        setItems(
          (all) =>
            all?.map((i) => (i.id === item.id ? change.item! : i)) ?? null,
        );
      }
      const messages = {
        publish: "Published. The site updates in a moment.",
        unpublish: "Taken off the site.",
        discard: "Unpublished changes discarded.",
        visibility: item.visible
          ? "Hidden from the site."
          : "Shown on the site.",
        delete: "Deleted.",
      };
      notify(messages[action]);
      const deploy = deployNotice(change.deploy);
      if (deploy) notify(deploy, change.deploy === "started" ? "ok" : "error");
    } catch (e) {
      setItems(previous);
      notify((e as Error).message, "error");
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h2 font-semibold">{config.title}</h1>
        <Link
          href={`/admin/content/${collection}/new`}
          className="btn btn-primary btn-sm"
        >
          <Plus aria-hidden="true" /> New {config.singular}
        </Link>
      </div>
      {items === null && <p className="text-white/60">Loading…</p>}
      {items?.length === 0 && (
        <p className="text-white/60">Nothing here yet.</p>
      )}
      <ol className="space-y-2">
        {items?.map((item, index) => (
          <li
            key={item.id}
            draggable
            onDragStart={() => setDragging(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragging !== null && dragging !== index && items) {
                const next = [...items];
                const [moved] = next.splice(dragging, 1);
                next.splice(index, 0, moved!);
                void reorder(next);
              }
              setDragging(null);
            }}
            className={`flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10 ring-inset ${dragging === index ? "opacity-50" : ""} ${item.visible ? "" : "opacity-70"}`}
          >
            <GripVertical
              className="size-4 shrink-0 cursor-grab text-white/40"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/admin/content/${collection}/${item.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {config.label(item.draft ?? item.content) || "Untitled"}
              </Link>
              <p className="text-sm text-white/60">
                {statusOf(item)}
                {!item.visible && " · Hidden"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              <IconButton
                label="Move up"
                disabled={index === 0}
                onClick={() => void reorder(move(items, index, -1))}
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton
                label="Move down"
                disabled={index === items.length - 1}
                onClick={() => void reorder(move(items, index, 1))}
              >
                <ArrowDown className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton
                label={item.visible ? "Hide from the site" : "Show on the site"}
                onClick={() => void act(item, "visibility")}
              >
                {item.visible ? (
                  <Eye className="size-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="size-4" aria-hidden="true" />
                )}
              </IconButton>
              {(item.publishStatus === "DRAFT" || item.draft) && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void act(item, "publish")}
                >
                  Publish
                </button>
              )}
              {item.draft && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void act(item, "discard")}
                >
                  Discard changes
                </button>
              )}
              {item.publishStatus === "PUBLISHED" && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void act(item, "unpublish")}
                >
                  Unpublish
                </button>
              )}
              <IconButton
                label={`Delete ${config.singular}`}
                onClick={() => void act(item, "delete")}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </IconButton>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
