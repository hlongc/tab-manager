import { RonnieTabStats, SortType } from '../common';

// 使用 chrome.storage.local 存储标签页访问统计
export const TAB_STATS_KEY = 'ronnieTabManagerStats';
export const TAB_CONFIG_KEY = 'ronnieTabManagerConfig';

export async function getConfigCache() {
  const result = (await chrome.storage.local.get())[TAB_CONFIG_KEY] as unknown as {
    sortType?: SortType;
    isMixed?: boolean;
    windowType?: 'current' | 'all';
  };
  return result || {};
}

export async function setConfigCache(config: {
  sortType?: SortType;
  isMixed?: boolean;
  windowType?: 'current' | 'all';
}) {
  await chrome.storage.local.set({ [TAB_CONFIG_KEY]: config });
}

// 初始化或获取访问统计数据
export async function getTabStats(): Promise<Record<number, RonnieTabStats>> {
  const result = (await chrome.storage.local.get())[TAB_STATS_KEY] as unknown as Record<
    number,
    RonnieTabStats
  >;
  return result || {};
}

// 更新标签页访问统计
async function updateTabStats(tabId: number, isDel = false) {
  if (!tabId) return;

  const stats = await getTabStats();
  const tab = await chrome.tabs.get(tabId);
  if (isDel) {
    delete stats[tabId];
  } else {
    const now = Date.now();

    stats[tabId] = {
      lastAccessed: now,
      accessCount: (stats[tabId]?.accessCount || 0) + 1,
      title: tab.title || '',
      url: tab.url || '',
    };

    // 清理超过30天的记录
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    Object.entries(stats).forEach(([tabId, stat]) => {
      if (stat.lastAccessed < thirtyDaysAgo) {
        delete stats[+tabId];
      }
    });
  }

  await chrome.storage.local.set({ [TAB_STATS_KEY]: stats });
}

// 监听标签页激活事件
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateTabStats(activeInfo.tabId);
});

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    await updateTabStats(tabId);
  }
});

// 关闭标签页以后删除缓存
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await updateTabStats(tabId, true);
});
