import { Package } from "lucide-react";
import type { ProductSale } from "@/types/database";
import {
  formatCurrency,
  formatDate,
  formatQuantity,
} from "./client-profile-formatters";
import {
  ClientProfileEmptyState,
  ClientProfileSectionHeader,
} from "./client-profile-section";

export function ClientProducts({
  productSales,
}: {
  productSales: ProductSale[];
}) {
  return (
    <section className="surface-card overflow-hidden">
      <ClientProfileSectionHeader
        count={productSales.length}
        description="Produtos indicados e adquiridos para manutenção."
        title="Produtos comprados"
      />
      {productSales.length === 0 ? (
        <ClientProfileEmptyState
          description="Este cliente ainda não comprou produtos. Pode ser uma oportunidade de home care."
          icon={Package}
          title="Nenhum produto comprado"
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-muted/55 text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Marca</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Quantidade</th>
                  <th className="px-5 py-3 text-right">Valor total</th>
                </tr>
              </thead>
              <tbody>
                {productSales.map((sale) => (
                  <tr className="border-t" key={sale.id}>
                    <td className="px-5 py-4">{formatDate(sale.sale_date)}</td>
                    <td className="px-4 py-4 font-semibold">
                      {sale.product_name}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {sale.brand ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {sale.category ?? "—"}
                    </td>
                    <td className="px-4 py-4">
                      {formatQuantity(sale.quantity)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      {formatCurrency(sale.total_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y md:hidden">
            {productSales.map((sale) => (
              <article className="p-4" key={sale.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{sale.product_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sale.brand ?? "Marca não informada"} ·{" "}
                      {formatQuantity(sale.quantity)} un.
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold">
                    {formatCurrency(sale.total_value)}
                  </p>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {formatDate(sale.sale_date)} ·{" "}
                  {sale.category ?? "Sem categoria"}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
