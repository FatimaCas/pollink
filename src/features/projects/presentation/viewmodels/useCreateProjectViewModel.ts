import { useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { useSnackbar } from "@/src/core/feedback/SnackbarProvider";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { cleanEmails, looksLikeEmail } from "@/src/features/invitations/domain/entities/ProjectInvitation";
import { InvitationRepository } from "@/src/features/invitations/domain/repositories/InvitationRepository";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { cleanLabels, draftError, Project } from "../../domain/entities/Project";
import { ProjectRepository } from "../../domain/repositories/ProjectRepository";

type ListField = "jobs" | "skills" | "emails";

const ALREADY_THERE: Record<ListField, string> = {
  jobs: "Esa carrera ya está en la lista.",
  skills: "Ese conocimiento ya está en la lista.",
  emails: "Ese correo ya está en la lista.",
};

// Crear un proyecto (C2): nombre, descripción, carreras, conocimientos y
// correos a invitar. Roble no tiene transacciones, así que el orden importa:
// 1. Se validan TODOS los correos antes de escribir nada.
// 2. Proyecto → invitaciones → el creador como miembro `owner`.
// 3. Si algo falla después de crear el proyecto, se deshace lo escrito.
export function useCreateProjectViewModel() {
  const projects = useInject<ProjectRepository>(TOKENS.ProjectRepo);
  const invitations = useInject<InvitationRepository>(TOKENS.InvitationRepo);
  const members = useInject<MembersRepository>(TOKENS.MembersRepo);
  const { currentUser, ensureLoggedIn } = useSession();
  const show = useSnackbar();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lists, setLists] = useState<Record<ListField, string[]>>({ jobs: [], skills: [], emails: [] });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Agrega un valor a una lista. Devuelve el porqué si no se pudo (la caja
  // conserva lo escrito) o null si entró (la caja se limpia).
  const add = (field: ListField, raw: string): string | null => {
    const value = raw.trim();
    if (value === "") return null;
    if (field === "emails" && !looksLikeEmail(value)) return `«${value}» no parece un correo.`;
    if (field === "emails" && value.toLowerCase() === currentUser()?.email.toLowerCase()) {
      return "No puedes invitarte: ya eres el creador del proyecto.";
    }
    const current = lists[field];
    const next = field === "emails" ? cleanEmails([...current, value]) : cleanLabels([...current, value]);
    if (next.length === current.length) return ALREADY_THERE[field];
    setLists((l) => ({ ...l, [field]: next }));
    return null;
  };

  const remove = (field: ListField, index: number) =>
    setLists((l) => ({ ...l, [field]: l[field].filter((_, i) => i !== index) }));

  // Crea el proyecto. Devuelve el proyecto creado o null (el porqué queda en
  // `error`). Sin cuenta, manda al login.
  const submit = async (): Promise<Project | null> => {
    if (submitting) return null;
    if (!ensureLoggedIn()) return null;
    const me = currentUser();
    if (!me) return null;
    const draft = { title, description, jobs: lists.jobs, skills: lists.skills };
    const invalid = draftError(draft);
    if (invalid) {
      setError(invalid);
      return null;
    }
    setError(null);
    setSubmitting(true);
    try {
      // 1. Nada se escribe hasta tener la cuenta de cada correo.
      const { found, missing } = await invitations.findAccounts(lists.emails);
      if (missing.length > 0) {
        setError(
          `No hay una cuenta con ${missing.length === 1 ? "el correo" : "los correos"} ${missing.join(", ")}. ` +
            "Quítalos o corrígelos: el proyecto no se creó.",
        );
        return null;
      }
      if (found.some((f) => f.userId === me.userId)) {
        setError("No puedes invitarte: ya eres el creador del proyecto.");
        return null;
      }

      // 2. El proyecto, sus invitaciones y su creador.
      const project = await projects.createProject({ draft, ownerId: me.userId });
      try {
        await invitations.invite({ projectId: project.id, invitees: found });
        await members.addMember({ projectId: project.id, userId: me.userId, role: "owner" });
      } catch (e) {
        // 3. Deshacer. Si deshacer también falla, lo que quede se ve como un
        // proyecto sin miembros; no se tapa el error original.
        await invitations.deleteForProject(project.id).catch(() => undefined);
        await projects.deleteProject(project.id).catch(() => undefined);
        throw e;
      }

      show(
        found.length === 0
          ? `Creaste «${project.title}».`
          : `Creaste «${project.title}» e invitaste a ${found.length} ${found.length === 1 ? "persona" : "personas"}.`,
      );
      return { ...project, memberCount: 1 };
    } catch (e) {
      setError(`No se pudo crear el proyecto. ${messageOf(e)}`);
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    title,
    description,
    jobs: lists.jobs,
    skills: lists.skills,
    emails: lists.emails,
    error,
    submitting,
    setTitle,
    setDescription,
    add,
    remove,
    submit,
  };
}
