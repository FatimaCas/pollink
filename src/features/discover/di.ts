import { DummyData } from "@/src/core/data/dummyData";
import { Container } from "@/src/core/di/container";
import { TOKENS } from "@/src/core/di/tokens";
import { RobleClient } from "@/src/core/roble/RobleClient";
import { TABLES } from "@/src/core/roble/tables";
import { DiscoverInMemoryDataSource } from "./data/datasources/DiscoverInMemoryDataSource";
import { DiscoverRemoteDataSource } from "./data/datasources/DiscoverRemoteDataSource";
import { DiscoverRepositoryImpl } from "./data/repositories/DiscoverRepositoryImpl";

// Las dependencias de la feature `discover` (responsable: A).

export function registerDiscover(c: Container, client: RobleClient): void {
  c.register(TOKENS.DiscoverRepo, new DiscoverRepositoryImpl(new DiscoverRemoteDataSource(client)));
}

// Siembra unos proyectos de demostración para trabajar la UI sin servidor.
export function registerDiscoverLocal(c: Container, data: DummyData): void {
  const projects = data.table(TABLES.project);
  if (projects.length === 0) {
    const seed = [
      ["p_1", "u_ana", "Fresitas", "Restaurante de fresas con crema", ["Gastronomía", "Administración"], ["Postres", "Costos"], "open", 60, "2026-10-05"],
      ["p_2", "u_beto", "IA Asistan", "Asistente personal de inteligencia artificial", ["Ing. Sistemas", "Diseño"], ["Python", "UX"], "open", 25, "2026-10-08"],
      ["p_3", "u_carla", "EcoRutas", "Rutas de reciclaje para el campus", ["Ing. Ambiental", "Ing. Sistemas"], ["Mapas", "Python"], "closed", 100, "2026-09-20"],
      ["p_4", "u_ana", "Huerta urbana", "Cultivos en terrazas de la universidad", ["Biología"], ["Compostaje"], "open", 0, "2026-10-12"],
    ] as const;
    for (const [id, owner, title, description, jobs, skills, status, progress, createdAt] of seed) {
      // `jobs` y `skills` viajan como texto JSON, igual que en Roble.
      projects.push({
        _id: id, _owner: owner, title, description, imageUrl: "", jobs: JSON.stringify(jobs), skills: JSON.stringify(skills),
        status, total_tasks: 0, progress, createdAt: `${createdAt}T12:00:00.000Z`,
      });
      data.table(TABLES.projectMember).push({
        _id: `m_${id}`, project_id: id, user_id: owner, role: { name: "owner" }, status: "active", joinedAt: `${createdAt}T12:00:00.000Z`,
      });
    }
  }
  c.register(TOKENS.DiscoverRepo, new DiscoverRepositoryImpl(new DiscoverInMemoryDataSource(data)));
}
