import { useState, useEffect, useMemo } from 'react';
import { Input, Radio, Tooltip, List, Dropdown, MenuProps } from 'antd';
import VirtualList from 'rc-virtual-list';
import { copyToClipboard } from './util';
import './Popup.less';

interface Bookmark {
  id: string;
  title: string;
  url?: string;
}

interface Tab {
  id?: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
  windowId?: number;
}

enum MenuKey {
  SwitchTab = '2',
  OpenNewTab = '3',
  CopyUrl = '4',
  CloseTab = '5',
}

const items: NonNullable<MenuProps['items']> = [
  {
    key: MenuKey.SwitchTab,
    label: '切换到该页签',
    extra: '←',
  },
  {
    key: MenuKey.OpenNewTab,
    label: '打开新标签页',
    extra: 'Enter',
  },
  {
    key: MenuKey.CloseTab,
    label: '关闭标签页',
    extra: '→',
    danger: true,
  },
  {
    key: MenuKey.CopyUrl,
    label: '复制url',
    extra: 'C',
  },
];

function ShortCut({ desc, short }: { short: string; desc: string }) {
  return (
    <>
      <span className="shortcut-key">{short}</span>
      <span>{desc}</span>
    </>
  );
}

export const Popup = () => {
  const [searchValue, setSearchValue] = useState<string>();
  const [windowType, setWindowType] = useState<'current' | 'all'>('current');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [currentWindowTabs, setCurrentWindowTabs] = useState<Tab[]>([]);
  const [allTabs, setAllTabs] = useState<Tab[]>([]);

  console.log({ bookmarks, currentWindowTabs, allTabs });

  const getData = () => {
    // 获取当前窗口的标签页
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      setCurrentWindowTabs(tabs);
    });
    // 获取所有窗口的标签页
    chrome.tabs.query({}, (tabs) => {
      setAllTabs(tabs);
    });
    // 获取书签
    const ret: Bookmark[] = [];

    const traverse = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
      nodes.forEach((node) => {
        if (Array.isArray(node.children)) {
          traverse(node.children);
        } else {
          ret.push({ id: node.id, title: node.title, url: node.url });
        }
      });
    };

    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      traverse(bookmarkTreeNodes);
      setBookmarks(ret);
    });
  };

  useEffect(() => {
    getData();
  }, []);

  const keyword = useMemo(() => {
    return searchValue?.trim();
  }, [searchValue]);

  const computedBookmarks = useMemo(() => {
    if (!keyword) return bookmarks;
    return bookmarks.filter((item) => item.title.includes(keyword));
  }, [keyword, bookmarks]);

  const openUrl = (url: string) => {
    if (!url) return;
    chrome.tabs.create({ url });
  };

  const switchToTab = (tab: Tab) => {
    chrome.tabs.update(tab.id!, { active: true });
    chrome.windows.update(tab.windowId!, { focused: true });
  };

  const closeTab = (tab: Tab) => {
    chrome.tabs.remove(tab.id!, () => {
      // TODO:重新获取数据
      getData();
    });
  };

  const handleMenuClick = (key: string, item: Tab) => {
    switch (key) {
      case MenuKey.SwitchTab:
        switchToTab(item);
        break;
      case MenuKey.OpenNewTab:
        openUrl(item.url!);
        break;
      case MenuKey.CopyUrl:
        copyToClipboard(item.url!);
        break;
      case MenuKey.CloseTab:
        closeTab(item);
        break;
      default:
        break;
    }
  };

  return (
    <div className="container">
      <Input
        placeholder="搜索书签和标签页"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        suffix={
          <Tooltip title="刷新">
            <img onClick={() => getData()} width={16} height={16} src="/icons/refresh.svg" />
          </Tooltip>
        }
      />
      <div className="shortcuts-tips">
        快捷键：
        <ShortCut short="↑↓" desc="导航" />
        <ShortCut short="Enter" desc="打开新标签页" />
        <ShortCut short="左键" desc="切换到已打开的tab" />
        <ShortCut short="右键" desc="关闭标签页" />
        <ShortCut short="C" desc="复制链接" />
      </div>
      <Radio.Group
        options={[
          { label: '在当前窗口搜索', value: 'current' },
          { label: '在所有窗口搜索', value: 'all' },
        ]}
        value={windowType}
        onChange={(e) => setWindowType(e.target.value)}
      />
      <div className="group-title">已打开的标签页({currentWindowTabs.length}个)</div>
      <List>
        <VirtualList data={currentWindowTabs} height={400} itemHeight={47} itemKey="id">
          {(item: Tab) => (
            <List.Item key={item.id}>
              <div className="list-item">
                <img width={16} height={16} src={item.favIconUrl} />
                <div className="list-item-title" onClick={() => openUrl(item.url!)}>
                  {item.title}
                </div>
                <Dropdown
                  menu={{ items, onClick: (menuInfo) => handleMenuClick(menuInfo.key, item) }}
                >
                  <a onClick={(e) => e.preventDefault()}>操作</a>
                </Dropdown>
              </div>
            </List.Item>
          )}
        </VirtualList>
      </List>
    </div>
  );
};

export default Popup;
