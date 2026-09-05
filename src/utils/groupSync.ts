import { RestaurantSpot, CustomFolder } from '../types';

const GROUP_CODE_KEY = 'gourmet_share_group_code';
const USER_NAME_KEY = 'gourmet_share_user_name';

export function getGroupCodeFromUrlOrStorage(): string {
  if (typeof window === 'undefined') return 'our-gourmet-group';

  const params = new URLSearchParams(window.location.search);
  const groupInUrl = params.get('group') || params.get('collabFolder');

  if (groupInUrl && groupInUrl.trim()) {
    const cleanCode = groupInUrl.trim();
    localStorage.setItem(GROUP_CODE_KEY, cleanCode);
    return cleanCode;
  }

  const stored = localStorage.getItem(GROUP_CODE_KEY);
  if (stored && stored.trim()) {
    return stored.trim();
  }

  const defaultCode = 'our-gourmet-group';
  localStorage.setItem(GROUP_CODE_KEY, defaultCode);
  return defaultCode;
}

export function setGroupCode(code: string): void {
  if (!code || !code.trim()) return;
  localStorage.setItem(GROUP_CODE_KEY, code.trim());
}

export function getUserName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_NAME_KEY);
}

export function setUserName(name: string): void {
  if (!name || !name.trim()) return;
  localStorage.setItem(USER_NAME_KEY, name.trim());
}

export interface FetchGroupDataResult {
  groupCode: string;
  spots: RestaurantSpot[];
  folders: CustomFolder[];
  members: string[];
  updatedAt: number;
}

export async function fetchGroupCloudData(groupCode: string): Promise<FetchGroupDataResult | null> {
  try {
    const res = await fetch(`/api/group/data?groupCode=${encodeURIComponent(groupCode)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (e) {
    console.warn('Failed to fetch group cloud data:', e);
    return null;
  }
}

export async function syncGroupCloudData(
  groupCode: string,
  spots: RestaurantSpot[],
  folders: CustomFolder[],
  memberName?: string
): Promise<FetchGroupDataResult | null> {
  try {
    const res = await fetch('/api/group/data/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupCode,
        spots,
        folders,
        memberName,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (e) {
    console.warn('Failed to sync group cloud data:', e);
    return null;
  }
}

export async function deleteSpotFromCloudGroup(groupCode: string, spotId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/group/spot/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupCode, spotId }),
    });
    return res.ok;
  } catch (e) {
    console.warn('Failed to delete spot from cloud group:', e);
    return false;
  }
}
