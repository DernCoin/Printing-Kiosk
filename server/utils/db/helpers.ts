import type { Database } from 'bun:sqlite';

export interface DbHelpers {
  columnExists: (tableName: string, columnName: string) => boolean;
  tableExists: (tableName: string) => boolean;
}

export function createDbHelpers(db: Database): DbHelpers {
  const columnExists = (tableName: string, columnName: string): boolean => {
    try {
      const result = db.prepare(`PRAGMA table_info(${tableName})`).all();
      return result.some((col: any) => col.name === columnName);
    } catch {
      return false;
    }
  };

  const tableExists = (tableName: string): boolean => {
    return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
  };

  return { columnExists, tableExists };
}
