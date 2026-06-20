"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  LoaderCircle,
  Pencil,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  TeamUser,
  TeamUserRole,
} from "@/services/team-users.service";
import { updateTeamUserRoleAction } from "./team-users.actions";

const roleOptions: Array<{ label: string; value: TeamUserRole }> = [
  { label: "Admin", value: "admin" },
  { label: "Gerente", value: "gerente" },
  { label: "Atendimento", value: "atendimento" },
  { label: "Leitura", value: "leitura" },
];

const selectClassName =
  "h-9 rounded-md border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60";

export function TeamUsersTable({
  canEdit,
  currentUserId,
  users,
}: {
  canEdit: boolean;
  currentUserId: string | null;
  users: TeamUser[];
}) {
  const router = useRouter();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<TeamUserRole>("leitura");
  const [feedback, setFeedback] = useState<{
    message: string;
    status: "error" | "success";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEditing(user: TeamUser) {
    setFeedback(null);
    setEditingUserId(user.id);
    setSelectedRole(user.role);
  }

  function cancelEditing() {
    setEditingUserId(null);
    setFeedback(null);
  }

  function saveRole(userId: string) {
    setFeedback(null);

    startTransition(async () => {
      const result = await updateTeamUserRoleAction({
        role: selectedRole,
        userId,
      });

      setFeedback({
        message: result.message,
        status: result.success ? "success" : "error",
      });

      if (result.success) {
        setEditingUserId(null);
        router.refresh();
      }
    });
  }

  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-primary" aria-hidden="true" />
          <h3 className="text-base font-bold">Equipe vinculada</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Usuários internos cadastrados para este salão.
        </p>
      </div>

      {!canEdit ? (
        <div
          className="mx-4 mt-4 flex items-start gap-2 rounded-md border border-warning/25 bg-warning-soft px-3 py-2.5 text-sm text-warning sm:mx-5"
          role="status"
        >
          <ShieldAlert
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <p>Somente administradores podem alterar funções.</p>
        </div>
      ) : null}

      {feedback ? (
        <p
          aria-live="polite"
          className={`mx-4 mt-4 rounded-md border px-3 py-2.5 text-sm sm:mx-5 ${
            feedback.status === "success"
              ? "border-success/20 bg-success-soft text-success"
              : "border-destructive/20 bg-destructive/10 text-destructive"
          }`}
          role={feedback.status === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/35 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold">Nome</th>
              <th className="px-5 py-3 font-semibold">E-mail</th>
              <th className="px-5 py-3 font-semibold">Função</th>
              <th className="px-5 py-3 font-semibold">Criado em</th>
              <th className="px-5 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <TeamUserTableRow
                canEdit={canEdit}
                currentUserId={currentUserId}
                editing={editingUserId === user.id}
                isPending={isPending}
                key={user.id}
                onCancel={cancelEditing}
                onEdit={startEditing}
                onRoleChange={setSelectedRole}
                onSave={saveRole}
                selectedRole={selectedRole}
                user={user}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y md:hidden">
        {users.map((user) => (
          <TeamUserMobileCard
            canEdit={canEdit}
            currentUserId={currentUserId}
            editing={editingUserId === user.id}
            isPending={isPending}
            key={user.id}
            onCancel={cancelEditing}
            onEdit={startEditing}
            onRoleChange={setSelectedRole}
            onSave={saveRole}
            selectedRole={selectedRole}
            user={user}
          />
        ))}
      </div>
    </section>
  );
}

type TeamUserItemProps = {
  canEdit: boolean;
  currentUserId: string | null;
  editing: boolean;
  isPending: boolean;
  onCancel: () => void;
  onEdit: (user: TeamUser) => void;
  onRoleChange: (role: TeamUserRole) => void;
  onSave: (userId: string) => void;
  selectedRole: TeamUserRole;
  user: TeamUser;
};

function TeamUserTableRow(props: TeamUserItemProps) {
  const { user } = props;

  return (
    <tr>
      <td className="px-5 py-4 font-semibold">
        {user.name}
        {props.currentUserId === user.id ? (
          <span className="ml-2 text-xs font-medium text-primary">(Você)</span>
        ) : null}
      </td>
      <td className="px-5 py-4 text-muted-foreground">{user.email}</td>
      <td className="px-5 py-4">
        <RoleControl {...props} />
      </td>
      <td className="px-5 py-4 text-muted-foreground">
        {formatCreatedAt(user.created_at)}
      </td>
      <td className="px-5 py-4">
        <div className="flex justify-end">
          <RoleActions {...props} />
        </div>
      </td>
    </tr>
  );
}

function TeamUserMobileCard(props: TeamUserItemProps) {
  const { user } = props;

  return (
    <article className="space-y-4 p-4">
      <div>
        <p className="font-semibold">
          {user.name}
          {props.currentUserId === user.id ? (
            <span className="ml-2 text-xs font-medium text-primary">
              (Você)
            </span>
          ) : null}
        </p>
        <p className="mt-1 break-all text-sm text-muted-foreground">
          {user.email}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Função</p>
          <div className="mt-1.5">
            <RoleControl {...props} />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">
            Criado em
          </p>
          <p className="mt-2 text-sm">{formatCreatedAt(user.created_at)}</p>
        </div>
      </div>
      {props.canEdit ? (
        <div className="flex justify-end border-t pt-3">
          <RoleActions {...props} />
        </div>
      ) : null}
    </article>
  );
}

function RoleControl({
  editing,
  isPending,
  onRoleChange,
  selectedRole,
  user,
}: TeamUserItemProps) {
  if (!editing) {
    return <RoleBadge role={user.role} />;
  }

  return (
    <select
      aria-label={`Função de ${user.name}`}
      className={selectClassName}
      disabled={isPending}
      onChange={(event) => onRoleChange(event.target.value as TeamUserRole)}
      value={selectedRole}
    >
      {roleOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function RoleActions({
  canEdit,
  editing,
  isPending,
  onCancel,
  onEdit,
  onSave,
  user,
}: TeamUserItemProps) {
  if (!canEdit) {
    return <span className="text-xs text-muted-foreground">Somente leitura</span>;
  }

  if (!editing) {
    return (
      <Button
        aria-label={`Editar função de ${user.name}`}
        disabled={isPending}
        onClick={() => onEdit(user)}
        size="sm"
        type="button"
        variant="outline"
      >
        <Pencil className="size-3.5" aria-hidden="true" />
        Editar função
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        disabled={isPending}
        onClick={() => onSave(user.id)}
        size="sm"
        type="button"
      >
        {isPending ? (
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Check className="size-3.5" aria-hidden="true" />
        )}
        Salvar
      </Button>
      <Button
        disabled={isPending}
        onClick={onCancel}
        size="sm"
        type="button"
        variant="ghost"
      >
        <X className="size-3.5" aria-hidden="true" />
        Cancelar
      </Button>
    </div>
  );
}

function RoleBadge({ role }: { role: TeamUserRole }) {
  const tone = {
    admin: "border-success/20 bg-success-soft text-success",
    atendimento: "border-warning/20 bg-warning-soft text-warning",
    gerente: "border-info/20 bg-info-soft text-info",
    leitura: "border-border bg-muted text-muted-foreground",
  }[role];

  return (
    <span
      className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {getRoleLabel(role)}
    </span>
  );
}

function getRoleLabel(role: TeamUserRole): string {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}
