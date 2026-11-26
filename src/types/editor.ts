export type Dialog =
  | "versions"
  | "assets"
  | "alarms"
  | "communication"
  | "element"
  | "projects"
  | "project"
  | "offlineDraft"
  | "screen"
  | "variable"
  | "help"
  | "check"
  | "pizero"
  | "wizard"
  | null;
export type Notice = { text: string; error?: boolean };
export type ProjectRow = {
  id: string;
  name: string;
  revision: number;
  updated_at: string;
};
export type MenuItems = Record<
  string,
  {
    label: string;
    fn: () => void;
    shortcut?: string;
    disabled?: boolean;
    category?: string;
  }[]
>;
