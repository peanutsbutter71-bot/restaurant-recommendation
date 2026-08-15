import { RestaurantSpot, CustomFolder, AppBackupData } from '../types';

export const BACKUP_VERSION = '1.0.0';

export function createBackupPayload(
  spots: RestaurantSpot[],
  folders: CustomFolder[]
): AppBackupData {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'GourmetShare',
    spots,
    folders,
    totalSpots: spots.length,
  };
}

export function downloadJsonBackup(
  spots: RestaurantSpot[],
  folders: CustomFolder[]
) {
  const data = createBackupPayload(spots, folders);
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute(
    'download',
    `gourmet-share-backup-${dateStr}.json`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export async function parseBackupFile(
  file: File
): Promise<{ spots: RestaurantSpot[]; folders: CustomFolder[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Validate structure
        let loadedSpots: RestaurantSpot[] = [];
        let loadedFolders: CustomFolder[] = [];

        if (Array.isArray(parsed)) {
          // Legacy or simple spot array format
          loadedSpots = parsed;
        } else if (parsed && Array.isArray(parsed.spots)) {
          loadedSpots = parsed.spots;
          if (Array.isArray(parsed.folders)) {
            loadedFolders = parsed.folders;
          }
        } else {
          throw new Error('バックアップファイルの形式が正しくありません');
        }

        resolve({
          spots: loadedSpots,
          folders: loadedFolders,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'JSONファイルの読み込みに失敗しました'));
      }
    };
    reader.onerror = () => {
      reject(new Error('ファイルの読み込み中にエラーが発生しました'));
    };
    reader.readAsText(file);
  });
}
