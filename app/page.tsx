import { existsSync } from "node:fs";
import { join } from "node:path";
import manifest from "../corpus/manifest.json";
import { FireLens } from "../components/firelens";

export const dynamic = "force-static";

export default function Page() {
  const available = manifest.filter(source => existsSync(join(process.cwd(), "corpus", source.raw_file)))
    .map(source => source.source_id);
  return <FireLens available={available} />;
}
