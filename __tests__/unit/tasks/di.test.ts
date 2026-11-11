import { createLocalContainer } from "@/src/core/di/localContainer";
import { TOKENS } from "@/src/core/di/tokens";
import { MembersRepository } from "@/src/features/members/domain/repositories/MembersRepository";
import { TaskRepository } from "@/src/features/tasks/domain/repositories/TaskRepository";

// `tasks` depende de `members` (escribe los contadores de las estancias): los
// contenedores registran `members` primero. Esto vigila ese orden.
test("el contenedor local resuelve los repositorios de D", () => {
  const c = createLocalContainer();
  expect(c.resolve<MembersRepository>(TOKENS.MembersRepo).addMember).toBeInstanceOf(Function);
  expect(c.resolve<TaskRepository>(TOKENS.TaskRepo).reserveTask).toBeInstanceOf(Function);
});
