export type PriceRange = '〜1000円' | '1000〜3000円' | '3000〜5000円' | '5000円〜';

export type Scene = 'デート' | '女子会' | '飲み会' | '一人飯' | '接待' | '記念日';

export type VisitStatusFilter = 'all' | 'unvisited' | 'visited';

export type OperatingStatus =
  | 'open' // 通常営業中
  | 'permanently_closed' // 閉店
  | 'temporarily_closed' // 一時休業
  | 'moved' // 移転
  | 'unknown'; // 不明

export interface CustomFolder {
  id: string;
  name: string;
  color: string; // Tailwind color key e.g. 'rose', 'amber', 'indigo', 'emerald', 'purple', 'sky'
  icon?: string;
  description?: string;
  createdAt: string;
  isShared?: boolean; // 👥 共同編集フォルダフラグ
  shareCode?: string; // 共同編集招待コード
  sharedMemberNames?: string[]; // 共同編集メンバーリスト
}

export interface RestaurantSpot {
  id: string;
  name: string;
  area: string;
  genres: string[];
  priceRange: PriceRange;
  scenes: Scene[];
  recommender: string;
  comment: string;
  mapUrl?: string;
  tabelogUrl?: string;
  imageUrl?: string;
  createdAt: string; // ISO string
  isFavorite: boolean;
  isVisited: boolean; // 「行きたい (false)」または「行った (true)」
  visitedAt?: string; // 訪問日（任意）
  myMemo?: string; // 実際に行ったときの自分の感想・公開用メモ（任意）
  highlightDish?: string; // 例: "濃厚トリュフパスタ", "いちごタルト"
  
  // 新機能: プライベート・公開制御
  privateMemo?: string; // 🔒 自分専用非公開メモ（予算実績、同行者、個人的な備忘録など）
  isPrivateOnly?: boolean; // 🔒 リスト共有時に除外するプライベート店舗

  // 新機能: タグ・フォルダ管理
  folders?: string[]; // 所属するフォルダ名またはID (例: ["デート候補", "2次会サク飲み"])

  // 新機能: 営業・閉店ステータス管理
  operatingStatus?: OperatingStatus;
  statusCheckNote?: string; // 例: "2024年10月に〇〇へ移転"、"通常営業中"
  lastStatusCheckedAt?: string; // 営業状態確認日時 (ISO)

  // 新機能: アカウント不要リアクションスタンプ
  reactions?: Record<string, number>; // 例: { '❤️': 3, '😋': 2, '🥂': 1, '🔥': 4 }
  userReactions?: string[]; // 自分が押したリアクションスタンプのキー配列
}

export type MainTab = 'list' | 'discover';

export type SwipeDirection = 'left' | 'right' | 'up';

export interface UserPreferenceScores {
  genres: Record<string, number>;
  scenes: Record<string, number>;
  priceRanges: Record<string, number>;
  areas: Record<string, number>;
  swipedSpotIds: Record<string, 'liked' | 'disliked' | 'superliked'>;
  totalSwipedCount: number;
}

export interface LinkCandidate {
  id: string;
  title: string;
  address?: string;
  googleMapsUrl: string;
  tabelogUrl?: string;
  description?: string;
  sourceType: 'ai_grounded' | 'ai_generated' | 'fallback_search';
  confidence: 'high' | 'medium' | 'low';
}

export type SortOption = 'newest' | 'oldest' | 'priceAsc' | 'priceDesc';

export type CardDisplayMode = 'card' | 'list'; // 'card' = 大カード写真重視, 'list' = コンパクトリスト

export interface FilterState {
  searchQuery: string;
  areas: string[];
  genres: string[];
  priceRanges: PriceRange[];
  scenes: Scene[];
  folders?: string[]; // フォルダでの絞り込み
  operatingStatuses?: OperatingStatus[]; // 営業状態での絞り込み
  favoritesOnly: boolean;
  unvisitedOnly: boolean; // 「未訪問の店舗のみ表示」トグルスイッチ用
  visitStatus: VisitStatusFilter; // 'all' | 'unvisited' ('行きたい/未訪問') | 'visited' ('行った/訪問済み')
  sortBy: SortOption;
}

export interface AppBackupData {
  version: string;
  exportedAt: string;
  appName: string;
  spots: RestaurantSpot[];
  folders: CustomFolder[];
  totalSpots: number;
}

export const PRICE_ORDER: Record<PriceRange, number> = {
  '〜1000円': 1,
  '1000〜3000円': 2,
  '3000〜5000円': 3,
  '5000円〜': 4,
};

export const COMMON_AREAS = [
  '渋谷',
  '表参道',
  '新宿',
  '高田馬場',
  '恵比寿',
  '中目黒',
  '下北沢',
  '銀座',
  '吉祥寺',
  '池袋',
  '六本木',
  '横浜',
];

export const COMMON_GENRES = [
  'カフェ',
  '居酒屋',
  'イタリアン',
  'ラーメン',
  '韓国料理',
  'スイーツ',
  'ビストロ',
  '焼肉',
  '和食',
  '中華',
  'その他',
];

export const ALL_SCENES: Scene[] = [
  'デート',
  '女子会',
  '飲み会',
  '一人飯',
  '接待',
  '記念日',
];

export const ALL_PRICE_RANGES: PriceRange[] = [
  '〜1000円',
  '1000〜3000円',
  '3000〜5000円',
  '5000円〜',
];
