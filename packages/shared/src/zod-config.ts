import { z } from "zod";

// Zod checks whether eval works (new Function) the first time it parses an
// object, to compile a faster parser. Browsers report that check as a
// Content-Security-Policy violation, and nothing here parses enough for the
// compiled parser to matter
z.config({ jitless: true });
