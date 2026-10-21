import type { Skill, SiteSection } from "@repo/shared";
import { Reveal } from "@/components/ui/reveal";
import { SectionShell } from "./section-shell";

function SkillCard({ skill }: { skill: Skill }) {
  return (
    <div className="h-full rounded-xl bg-white/[0.03] p-6 ring-1 ring-white/10 ring-inset">
      <h4 className="text-h3 font-semibold">{skill.name}</h4>
      {skill.category && (
        <p className="mt-1 text-sm text-white/55">{skill.category}</p>
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
