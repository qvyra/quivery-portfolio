// Accessibility check: axe (WCAG 2.2 A and AA) on the homepage, a project page
// and the admin sign-in, at phone and desktop widths, with the phone menu open
// too. Runs against a started site:
//
//   SITE=http://localhost:3000 npm run test:a11y --workspace web
//
// needs Chromium once: npx playwright install chromium
import process from "node:process";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const site = (process.env.SITE ?? "http://localhost:3000").replace(/\/+$/, "");
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const viewports = {
  phone: { width: 390, height: 844 },
  desktop: { width: 1366, height: 900 },
};

// the first project the homepage links to, so no slug is hard-coded
async function projectPath(page) {
  await page.goto(`${site}/`);
  const href = await page
    .locator('a[href^="/projects/"]')
    .first()
    .getAttribute("href");
  if (!href) throw new Error("The homepage links to no project");
  return href;
}

// motion off, so reveal animations don't leave text mid-fade for the
// contrast check
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
let failures = 0;
try {
  for (const [name, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const paths = ["/", await projectPath(page), "/admin/login"];
    const checks = paths.map((path) => ({ path, label: path }));
    if (name === "phone") {
      checks.push({ path: "/", label: "/ (menu open)", menu: true });
    }

    for (const check of checks) {
      await page.goto(`${site}${check.path}`, { waitUntil: "networkidle" });
      if (check.menu) {
        await page.getByRole("button", { name: /open menu/i }).click();
        await page.getByRole("button", { name: /close menu/i }).waitFor();
      }
      const { violations } = await new AxeBuilder({ page })
        .withTags(tags)
        .analyze();
      const where = `${check.label} at ${name} width`;
      if (violations.length === 0) {
        console.log(`ok  ${where}`);
        continue;
      }
      failures += violations.length;
      console.log(`FAIL ${where}`);
      for (const violation of violations) {
        console.log(
          `  ${violation.impact}: ${violation.id}, ${violation.help}`,
        );
        for (const node of violation.nodes.slice(0, 5)) {
          console.log(`    ${node.target.join(" ")}`);
          if (node.failureSummary) {
            console.log(
              `      ${node.failureSummary.split("\n").join("\n      ")}`,
            );
          }
        }
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures > 0) {
  console.error(`\n${failures} accessibility problem(s)`);
  process.exit(1);
}
