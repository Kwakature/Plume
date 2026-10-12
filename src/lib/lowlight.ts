import { common, createLowlight } from "lowlight";

// Langages proposés dans le sélecteur d'un bloc de code.
// `value` est ce qui est stocké dans le document ; `grammar` est le nom du
// langage chez highlight.js (le HTML y est géré par la grammaire « xml »).
export const codeLanguages = [
  { value: "sql", label: "SQL", grammar: "sql" },
  { value: "bash", label: "Bash", grammar: "bash" },
  { value: "python", label: "Python", grammar: "python" },
  { value: "typescript", label: "TypeScript", grammar: "typescript" },
  { value: "javascript", label: "JavaScript", grammar: "javascript" },
  { value: "java", label: "Java", grammar: "java" },
  { value: "c", label: "C", grammar: "c" },
  { value: "html", label: "HTML", grammar: "xml" },
  { value: "css", label: "CSS", grammar: "css" },
  { value: "json", label: "JSON", grammar: "json" },
  { value: "yaml", label: "YAML", grammar: "yaml" },
  { value: "markdown", label: "Markdown", grammar: "markdown" },
] as const;

// On n'enregistre que ces langages (et pas les ~40 de `common`) : le bundle
// reste léger, et la détection automatique ne se trompe qu'entre eux.
export const lowlight = createLowlight();
for (const { grammar } of codeLanguages) {
  lowlight.register({ [grammar]: common[grammar] });
}
