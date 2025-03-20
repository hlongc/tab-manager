export interface RonnieTabStats {
  /** 最后访问时间 */
  lastAccessed: number;
  /** 访问次数 */
  accessCount: number;
  /** 标签页 url */
  url: string;
  /** 标签页标题 */
  title: string;
}

export enum SortType {
  /** 最近使用 */
  Recent = 'recent',
  /** 使用频率 */
  Frequency = 'frequency',
}
