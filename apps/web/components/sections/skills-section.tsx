import type { Skill, SiteSection } from "@repo/shared";
import { Reveal } from "@/components/ui/reveal";
import { hasSiteIcon, SiteIcon } from "@/components/ui/site-icon";
import { SectionShell } from "./section-shell";

// a built-in icon and an upload sit in the same frame at the same size
const iconFrame =
  "grid size-11 shrink-0 place-items-center rounded-md bg-white/[0.05] ring-1 ring-white/10 ring-inset";

function SkillCard({ skill }: { skill: Skill }) {
  const heading = (
    <div>
      <h4 className="text-h3 font-semibold">{skill.name}</h4>
      {skill.category && (
        <p className="mt-1 text-sm text-white/55">{skill.category}</p>
      )}
    </div>
  );
  return (
    <div className="h-full rounded-xl bg-white/[0.03] p-6 ring-1 ring-white/10 ring-inset">
      {hasSiteIcon(skill.iconKey, skill.icon) ? (
        <div className="flex items-center gap-4">
          <span className={iconFrame}>
            <SiteIcon
              iconKey={skill.iconKey}
              media={skill.icon}
              className="size-6"
              sizes="24px"
            />
          </span>
          {heading}
        </div>
      ) : (
        heading
      )}
      {skill.description && (
        <p className="mt-3 text-white/75">{skill.description}</p>
      )}
    </div>
  );
}

/**
 * Core skills (Luau, Roblox systems) lead. Secondary ones, like TypeScript for
 * roblox-ts and tooling, follow in a quieter list
 */
export function SkillsSection({
  section,
}: {
  section: Extract<SiteSection, { type: "skills" }>;
}) {
  const primary = section.skills.filter((skill) => skill.tier === "PRIMARY");
  const secondary = section.skills.filter(
    (skill) => skill.tier === "SECONDARY",
  );

  return (
    <SectionShell section={section}>
      {primary.length > 0 && (
        <div className="space-y-5">
          <h3 className="text-eyebrow font-semibold text-white/60 uppercase">
            Core
          </h3>
          <Reveal
            as="ul"
            stagger
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {primary.map((skill) => (
              <li key={skill.id}>
                <SkillCard skill={skill} />
              </li>
            ))}
          </Reveal>
        </div>
      )}
      {secondary.length > 0 && (
        <div className="space-y-5">
          <h3 className="text-eyebrow font-semibold text-white/60 uppercase">
            Also
          </h3>
          <Reveal as="ul" stagger className="flex flex-wrap gap-3">
            {secondary.map((skill) => (
              <li
                key={skill.id}
                className="rounded-full bg-white/[0.04] px-4 py-2 ring-1 ring-white/12 ring-inset"
              >
                {hasSiteIcon(skill.iconKey, skill.icon) && (
                  <SiteIcon
                    iconKey={skill.iconKey}
                    media={skill.icon}
                    className="mr-2 inline-block size-4 align-[-0.125em]"
                    sizes="16px"
                  />
                )}
                <span className="font-medium">{skill.name}</span>
                {skill.description && (
                  <span className="text-white/60"> · {skill.description}</span>
                )}
              </li>
            ))}
          </Reveal>
        </div>
      )}
    </SectionShell>
  );
}
