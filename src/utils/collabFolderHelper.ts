import { CustomFolder, RestaurantSpot } from '../types';

export interface CollabFolderInvitePayload {
  version: string;
  creatorName?: string;
  folder: CustomFolder;
  spots: RestaurantSpot[];
  createdAt: string;
}

/**
 * Encodes a CustomFolder and its member spots into a URL-safe Base64 string for invitations
 */
export function generateCollabFolderInviteUrl(
  folder: CustomFolder,
  spotsInFolder: RestaurantSpot[],
  creatorName: string = '友達'
): string {
  try {
    const payload: CollabFolderInvitePayload = {
      version: '1.0',
      creatorName,
      folder: {
        ...folder,
        isShared: true,
        sharedMemberNames: Array.from(new Set([...(folder.sharedMemberNames || []), creatorName])),
      },
      spots: spotsInFolder.map((s) => ({
        ...s,
        folders: Array.from(new Set([...(s.folders || []), folder.name])),
      })),
      createdAt: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(payload);
    // Encode to UTF-8 Base64 string
    const encoded = btoa(encodeURIComponent(jsonString));

    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?collabFolder=${encoded}`;
  } catch (err) {
    console.error('Failed to generate collab folder URL:', err);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?collabFolderName=${encodeURIComponent(folder.name)}`;
  }
}

/**
 * Parses the URL query search string for ?collabFolder=... invitation payload
 */
export function parseCollabFolderInviteUrl(
  urlSearch: string
): CollabFolderInvitePayload | null {
  try {
    const params = new URLSearchParams(urlSearch);
    const encodedPayload = params.get('collabFolder');

    if (!encodedPayload) return null;

    const decodedJson = decodeURIComponent(atob(encodedPayload));
    const payload: CollabFolderInvitePayload = JSON.parse(decodedJson);

    if (payload && payload.folder && Array.isArray(payload.spots)) {
      return payload;
    }
  } catch (err) {
    console.error('Failed to parse collab folder URL payload:', err);
  }
  return null;
}
