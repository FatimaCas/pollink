import { useCallback, useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { useSnackbar } from "@/src/core/feedback/SnackbarProvider";
import { messageOf } from "@/src/core/utils/formatters";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { JoinRequestRepository } from "@/src/features/requests/domain/repositories/JoinRequestRepository";
import { cleanLabels, draftError, isOpen, isOwnedBy, Project, ProjectDraft } from "../../domain/entities/Project";
import { ProjectRepository } from "../../domain/repositories/ProjectRepository";

type LabelField = "jobs" | "skills";

const ALREADY_THERE: Record<LabelField, string> = {
  jobs: "Esa carrera ya está en la lista.",
  skills: "Ese conocimiento ya está en la lista.",
};

const draftOf = (project: Project): ProjectDraft => ({
  title: project.title,
  description: project.description,
  jobs: project.jobs,
  skills: project.skills,
});

// La ficha de un proyecto (C4): «Progreso» e «Info. básica». La info básica es
// un borrador que solo el creador edita y guarda de una vez, mientras el
// proyecto siga abierto.
export function useProjectInfoViewModel(projectId: string) {
  const projects = useInject<ProjectRepository>(TOKENS.ProjectRepo);
  const requests = useInject<JoinRequestRepository>(TOKENS.JoinRequestRepo);
  const { user } = useSession();
  const show = useSnackbar();
  const userId = user?.userId ?? null;

  const [project, setProject] = useState<Project | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [draft, setDraft] = useState<ProjectDraft>({ title: "", description: "", jobs: [], skills: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await projects.getProject(projectId);
        if (cancelled) return;
        if (!found) {
          setProject(null);
          setError("Este proyecto ya no existe.");
          return;
        }
        // El aviso de solicitudes es del creador y no es crítico.
        const pending = isOwnedBy(found, userId) ? await requests.pendingCount(projectId).catch(() => 0) : 0;
        if (cancelled) return;
        setProject(found);
        setDraft(draftOf(found));
        setPendingRequests(pending);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(messageOf(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projects, requests, projectId, userId, version]);

  const isOwner = project !== null && isOwnedBy(project, userId);
  const canEdit = isOwner && project !== null && isOpen(project);
  const dirty =
    project !== null &&
    (draft.title !== project.title ||
      draft.description !== project.description ||
      draft.jobs.join("\n") !== project.jobs.join("\n") ||
      draft.skills.join("\n") !== project.skills.join("\n"));

  const setTitle = (title: string) => setDraft((d) => ({ ...d, title }));
  const setDescription = (description: string) => setDraft((d) => ({ ...d, description }));

  // Agrega una carrera o un conocimiento al borrador. Devuelve el porqué si no
  // entró o null.
  const addLabel = (field: LabelField, raw: string): string | null => {
    if (raw.trim() === "") return null;
    const next = cleanLabels([...draft[field], raw]);
    if (next.length === draft[field].length) return ALREADY_THERE[field];
    setDraft((d) => ({ ...d, [field]: next }));
    return null;
  };
  const removeLabel = (field: LabelField, index: number) =>
    setDraft((d) => ({ ...d, [field]: d[field].filter((_, i) => i !== index) }));

  const discard = () => {
    if (project) setDraft(draftOf(project));
    setSaveError(null);
  };

  // Guarda la info básica. `true` si se guardó.
  const save = async () => {
    if (!project || !canEdit || saving) return false;
    const invalid = draftError(draft);
    if (invalid) {
      setSaveError(invalid);
      return false;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await projects.updateBasicInfo({ projectId, draft });
      setProject(updated);
      setDraft(draftOf(updated));
      show("Guardamos los cambios del proyecto.");
      return true;
    } catch (e) {
      setSaveError(messageOf(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    project,
    pendingRequests,
    loading,
    error,
    reload,
    isOwner,
    canEdit,
    draft,
    dirty,
    saving,
    saveError,
    setTitle,
    setDescription,
    addLabel,
    removeLabel,
    discard,
    save,
  };
}
