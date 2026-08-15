import { OperatingStatus } from '../types';

export interface CheckStoreStatusResponse {
  operatingStatus: OperatingStatus;
  statusCheckNote: string;
  confidence?: 'high' | 'medium' | 'low';
  checkedAt: string;
  error?: string;
}

export async function checkStoreOperatingStatus(params: {
  name: string;
  area?: string;
  mapUrl?: string;
  tabelogUrl?: string;
}): Promise<CheckStoreStatusResponse> {
  try {
    const response = await fetch('/api/spots/check-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '店舗状態の確認に失敗しました');
    }

    return data;
  } catch (err: any) {
    console.warn('Status check API failed, returning unknown fallback:', err);
    return {
      operatingStatus: 'unknown',
      statusCheckNote: '通信エラーのため判定できませんでした',
      checkedAt: new Date().toISOString(),
      error: err.message,
    };
  }
}

export function getOperatingStatusBadge(status?: OperatingStatus): {
  label: string;
  bg: string;
  text: string;
  border: string;
  isAlert: boolean;
} {
  switch (status) {
    case 'permanently_closed':
      return {
        label: '閉店・閉業',
        bg: 'bg-red-500',
        text: 'text-white',
        border: 'border-red-600',
        isAlert: true,
      };
    case 'temporarily_closed':
      return {
        label: '休業中',
        bg: 'bg-amber-500',
        text: 'text-white',
        border: 'border-amber-600',
        isAlert: true,
      };
    case 'moved':
      return {
        label: '移転済',
        bg: 'bg-indigo-600',
        text: 'text-white',
        border: 'border-indigo-700',
        isAlert: true,
      };
    case 'open':
      return {
        label: '営業中',
        bg: 'bg-emerald-50 text-emerald-700',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        isAlert: false,
      };
    default:
      return {
        label: '未確認',
        bg: 'bg-stone-100 text-stone-600',
        text: 'text-stone-600',
        border: 'border-stone-200',
        isAlert: false,
      };
  }
}
