import { initialWall, parseWall, type Wall } from "./model.ts";

export const STORAGE_KEY = "thewall:data";
type StoragePort = Pick<Storage, "getItem" | "setItem">;

export function readWall(storage: StoragePort): {
  wall: Wall;
  blocked: boolean;
  message: string;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return {
      wall: raw === null ? initialWall() : parseWall(raw),
      blocked: false,
      message: "",
    };
  } catch {
    return {
      wall: initialWall(),
      blocked: true,
      message:
        "No se pueden leer los datos guardados. Se han conservado intactos; esta sesion no se guardara.",
    };
  }
}

export function writeWall(storage: StoragePort, wall: Wall): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(wall));
    return true;
  } catch {
    return false;
  }
}
