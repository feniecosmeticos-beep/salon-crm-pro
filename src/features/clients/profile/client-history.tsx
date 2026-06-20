import { Scissors } from "lucide-react";
import type { ClientAppointmentItem } from "@/services/client-profile.service";
import { formatCurrency, formatDate } from "./client-profile-formatters";
import {
  ClientProfileEmptyState,
  ClientProfileSectionHeader,
} from "./client-profile-section";

export function ClientHistory({
  appointments,
}: {
  appointments: ClientAppointmentItem[];
}) {
  return (
    <section className="surface-card overflow-hidden">
      <ClientProfileSectionHeader
        count={appointments.length}
        description="Serviços realizados, profissionais e valores."
        title="Histórico de serviços"
      />
      {appointments.length === 0 ? (
        <ClientProfileEmptyState
          description="Os atendimentos aparecerão aqui após a importação do histórico."
          icon={Scissors}
          title="Nenhum atendimento encontrado"
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="bg-muted/55 text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-4 py-3">Serviço</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Profissional</th>
                  <th className="px-5 py-3 text-right">Valor total</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr className="border-t" key={appointment.id}>
                    <td className="px-5 py-4">
                      {formatDate(appointment.appointment_date)}
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {appointment.serviceName ?? "Serviço não informado"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {appointment.serviceCategory ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {appointment.professionalName ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      {formatCurrency(appointment.total_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y md:hidden">
            {appointments.map((appointment) => (
              <article className="p-4" key={appointment.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">
                      {appointment.serviceName ?? "Serviço não informado"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {appointment.professionalName ??
                        "Profissional não informado"}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold">
                    {formatCurrency(appointment.total_value)}
                  </p>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {formatDate(appointment.appointment_date)} ·{" "}
                  {appointment.serviceCategory ?? "Sem categoria"}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
