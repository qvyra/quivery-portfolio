import type { LinkType } from "@repo/shared";
import {
  BookOpen,
  ExternalLink,
  FolderGit2,
  Gamepad2,
  Globe,
  MessagesSquare,
  Package,
  CirclePlay,
  Store,
} from "lucide-react";
import { GithubIcon } from "./icons";

const icons = {
  repository: FolderGit2,
  package: Package,
  devforum: MessagesSquare,
  "creator-store": Store,
  "roblox-game": Gamepad2,
  documentation: BookOpen,
  website: Globe,
  video: CirclePlay,
  other: ExternalLink,
} satisfies Record<LinkType, unknown>;

/** Icon for a project link. GitHub repos get the GitHub mark */
export function LinkIcon({ type, url }: { type: LinkType; url: string }) {
  if (type === "repository" && new URL(url).hostname === "github.com") {
    return <GithubIcon />;
  }
  const Icon = icons[type];
  return <Icon aria-hidden="true" />;
}
