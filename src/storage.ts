import type { StudioProject } from "./types";
const key = "batidao-studio-projects-v2";
export function listProjects(): StudioProject[] { try { return JSON.parse(localStorage.getItem(key) ?? "[]") as StudioProject[]; } catch { return []; } }
export function saveProject(project: StudioProject) { const projects = listProjects().filter(item => item.id !== project.id); localStorage.setItem(key, JSON.stringify([project, ...projects])); }
export function deleteProject(id: string) { localStorage.setItem(key, JSON.stringify(listProjects().filter(item => item.id !== id))); }
