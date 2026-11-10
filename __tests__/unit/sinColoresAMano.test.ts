import fs from "fs";
import path from "path";

// Los colores salen de `useTheme()` (CONVENTIONS §4 y docs/design-tokens.md):
// un `#hex` o `rgb(` en un componente no sigue al modo oscuro ni al rebranding.
function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

test("los componentes compartidos no escriben colores a mano", () => {
  const root = path.join(__dirname, "../../src/core/components");
  const offenders = sources(root).filter((file) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(fs.readFileSync(file, "utf8")));
  expect(offenders.map((f) => path.relative(process.cwd(), f))).toEqual([]);
});
