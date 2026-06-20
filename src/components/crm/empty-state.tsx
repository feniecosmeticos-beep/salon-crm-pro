import Link from "next/link";
import { DatabaseZap, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CrmEmptyState({
  description = "Importe os relatórios do AVEC para começar a visualizar sua carteira de clientes.",
  showImportAction = true,
  title = "Sua inteligência comercial começa com os dados",
}: {
  description?: string;
  showImportAction?: boolean;
  title?: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <DatabaseZap className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {showImportAction ? (
        <Button asChild className="mt-5" size="sm">
          <Link href="/importacao">
            <Upload className="size-4" aria-hidden="true" />
            Ir para Importação AVEC
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
