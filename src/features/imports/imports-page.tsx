import { PageShell } from "@/components/layout/page-shell";
import { ImportWorkflow } from "./components/import-workflow";

export function ImportsPage() {
  return (
    <PageShell title="Importação AVEC">
      <ImportWorkflow />
    </PageShell>
  );
}
