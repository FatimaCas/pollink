import { useEffect, useState } from "react";

import { useInject } from "@/src/core/di/DIProvider";
import { TOKENS } from "@/src/core/di/tokens";
import { useSnackbar } from "@/src/core/feedback/SnackbarProvider";
import { messageOf } from "@/src/core/utils/formatters";
import { cleanLabels } from "@/src/features/projects/domain/entities/Project";
import { ProfileRepository } from "../../domain/repositories/ProfileRepository";

// Editar el propio perfil (B2): carrera, institución, «Sobre ti» y habilidades.
// Carga el perfil una vez para llenar el formulario y no lo vuelve a pisar.
export function useEditProfileViewModel() {
  const repo = useInject<ProfileRepository>(TOKENS.ProfileRepo);
  const show = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [program, setProgram] = useState("");
  const [institution, setInstitution] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mine = await repo.getMyProfile();
        if (cancelled) return;
        setProgram(mine.career.program);
        setInstitution(mine.career.institution);
        setBio(mine.bio);
        setSkills(mine.skills);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) setLoadError(messageOf(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, version]);

  const reload = () => {
    setLoading(true);
    setVersion((v) => v + 1);
  };

  // Agrega una habilidad. Devuelve el porqué si no se pudo (la caja conserva lo
  // escrito) o null si entró (la caja se limpia).
  const addSkill = (raw: string): string | null => {
    if (raw.trim() === "") return null;
    const next = cleanLabels([...skills, raw]);
    if (next.length === skills.length) return "Esa habilidad ya está en la lista.";
    setSkills(next);
    return null;
  };

  const removeSkill = (index: number) => setSkills((s) => s.filter((_, i) => i !== index));

  // Guarda. Devuelve true si quedó guardado (la pantalla vuelve atrás).
  const save = async (): Promise<boolean> => {
    if (saving || loading || loadError) return false;
    setError(null);
    setSaving(true);
    try {
      await repo.updateMyProfile({ career: { program, institution }, bio, skills });
      show("Perfil actualizado");
      return true;
    } catch (e) {
      setError(messageOf(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Nada escrito: guardar sería lo mismo que omitir (el onboarding lo usa).
  const isEmpty = [program, institution, bio].every((t) => t.trim() === "") && skills.length === 0;

  return {
    loading,
    loadError,
    isEmpty,
    reload,
    program,
    setProgram,
    institution,
    setInstitution,
    bio,
    setBio,
    skills,
    addSkill,
    removeSkill,
    error,
    saving,
    save,
  };
}
