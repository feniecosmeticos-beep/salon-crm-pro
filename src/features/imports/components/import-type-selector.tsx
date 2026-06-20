import type { AvecImportType } from "@/features/imports/types/avec-import.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImportTypeOption = {
  label: string;
  value: AvecImportType;
};

const IMPORT_TYPE_OPTIONS: ImportTypeOption[] = [
  { label: "Clientes", value: "clients" },
  { label: "Clientes atendidos", value: "attended_clients" },
  { label: "Serviços realizados", value: "appointments" },
  { label: "Tabela de serviços", value: "services" },
  { label: "Produtos vendidos", value: "product_sales" },
];

type ImportTypeSelectorProps = {
  selectedType: AvecImportType | null;
  onChange: (type: AvecImportType) => void;
};

export function ImportTypeSelector({
  selectedType,
  onChange,
}: ImportTypeSelectorProps) {
  return (
    <section className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Tipo de arquivo</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {IMPORT_TYPE_OPTIONS.map((option) => {
          const isSelected = selectedType === option.value;

          return (
            <Button
              key={option.value}
              type="button"
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "h-11 justify-start px-3 text-left text-sm",
                isSelected && "shadow-sm"
              )}
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
            >
              <span className="truncate">{option.label}</span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}

export { IMPORT_TYPE_OPTIONS };
