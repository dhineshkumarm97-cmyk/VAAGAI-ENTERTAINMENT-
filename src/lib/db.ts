import Dexie, { type Table } from 'dexie';

export interface LocalFile {
  id: string; // The UUID
  blob: Blob;
  name: string;
  type: string;
  createdAt: number;
}

export class MyDatabase extends Dexie {
  files!: Table<LocalFile>;

  constructor() {
    super('VaagaiLocalDB');
    this.version(1).stores({
      files: 'id, name, type, createdAt'
    });
  }
}

export const localDB = new MyDatabase();

export const saveLocalFile = async (file: File | Blob, name: string): Promise<string> => {
  const id = crypto.randomUUID();
  await localDB.files.add({
    id,
    blob: file,
    name,
    type: file.type,
    createdAt: Date.now()
  });
  return `local-file://${id}`;
};

export const getLocalFileUrl = async (localUrl: string): Promise<string | null> => {
  if (!localUrl.startsWith('local-file://')) return null;
  const id = localUrl.replace('local-file://', '');
  const file = await localDB.files.get(id);
  if (!file) return null;
  return URL.createObjectURL(file.blob);
};

export const clearAllLocalFiles = async () => {
  await localDB.files.clear();
};
