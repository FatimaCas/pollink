import { guardRoble, Row, toStringList } from "@/src/core/roble/guard";
import { ProfileFailure } from "../../domain/ProfileFailure";
import { ProfileUpdate } from "../../domain/entities/ProfileUpdate";
import { emptyProfile, UserProfile } from "../../domain/entities/UserProfile";
import { ProfileRepository } from "../../domain/repositories/ProfileRepository";
import { ProfileDataSource } from "../datasources/ProfileDataSource";
import { careerToJson, parseCareer } from "./careerCodec";

// Perfil: decide y traduce, no habla. Convierte filas en `UserProfile` y las
// excepciones de Roble en `ProfileFailure`.
export class ProfileRepositoryImpl implements ProfileRepository {
  constructor(private readonly source: ProfileDataSource) {}

  getMyProfile() {
    return this.guard(async () => {
      const userId = this.requireUserId();
      return this.toProfile(userId, await this.source.readRowOf(userId));
    });
  }

  getProfileOf(userId: string) {
    return this.guard(async () => {
      if (!userId) return emptyProfile("");
      return this.toProfile(userId, await this.source.readRowOf(userId));
    });
  }

  ensureMyProfile(name: string) {
    return this.guard(async () => {
      const userId = this.requireUserId();
      const trimmed = name.trim();
      if (!trimmed) return;
      if (await this.source.readRowOf(userId)) return;
      await this.source.createRow({
        name: trimmed,
        career: careerToJson({ program: "", institution: "" }),
        skills: JSON.stringify([]),
        profilePicture: "",
        description: "",
      });
    });
  }

  updateMyProfile(update: ProfileUpdate) {
    return this.guard(async () => {
      const userId = this.requireUserId();
      const own = await this.source.readRowOf(userId);
      if (!own?._id) throw new ProfileFailure("No se encontró tu perfil.");
      const fields = {
        career: careerToJson(update.career),
        description: update.bio.trim(),
        // Roble rechaza la lista nativa en jsonb: va como texto JSON.
        skills: JSON.stringify(update.skills.map((s) => s.trim()).filter(Boolean)),
      };
      await this.source.updateRow(String(own._id), fields);
      return this.toProfile(userId, { ...own, ...fields });
    });
  }

  getNamesOf(userIds: string[]) {
    return this.guard(async () => {
      const ids = [...new Set(userIds.filter(Boolean))];
      if (ids.length === 0) return {};
      const names: Record<string, string> = {};
      for (const row of await this.source.readRowsOf(ids)) {
        const name = String(row.name ?? "").trim();
        if (row._owner && name) names[String(row._owner)] = name;
      }
      return names;
    });
  }

  private requireUserId(): string {
    const userId = this.source.currentUserId();
    if (!userId) throw new ProfileFailure("Inicia sesión para ver tu perfil.", "NO_SESSION");
    return userId;
  }

  private toProfile(userId: string, row: Row | null): UserProfile {
    if (!row) return emptyProfile(userId);
    return {
      userId,
      name: String(row.name ?? "").trim(),
      career: parseCareer(row.career),
      bio: String(row.description ?? ""),
      skills: toStringList(row.skills),
    };
  }

  private guard<T>(action: () => Promise<T>) {
    return guardRoble(action, (message) => new ProfileFailure(message));
  }
}
