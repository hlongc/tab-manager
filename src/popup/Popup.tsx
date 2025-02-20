import { useState, useEffect, useMemo, useRef } from 'react';
import { Input, Radio, Tooltip, List, Dropdown, MenuProps, InputRef, Form } from 'antd';
import { useMemoizedFn } from 'ahooks';
import { copyToClipboard, getShortCut } from './util';
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
  const [isMixed, setIsMixed] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [currentWindowTabs, setCurrentWindowTabs] = useState<Tab[]>([]);
  const [allTabs, setAllTabs] = useState<Tab[]>([]);
  const inputRef = useRef<InputRef>(null);
  const [selectIndex, setSelectIndex] = useState<number>(-1);

  const tabItems: NonNullable<MenuProps['items']> = useMemo(() => {
    return [
      {
        key: MenuKey.SwitchTab,
        label: '切换到该页签',
        extra: getShortCut('←', isMixed),
      },
      {
        key: MenuKey.OpenNewTab,
        label: '打开新标签页',
        extra: getShortCut('Enter', isMixed),
      },
      {
        key: MenuKey.CloseTab,
        label: '关闭标签页',
        extra: getShortCut('→', isMixed),
        danger: true,
      },
      {
        key: MenuKey.CopyUrl,
        label: '复制url',
        extra: getShortCut('C', isMixed),
      },
    ];
  }, [isMixed]);

  const bookmarkItems: NonNullable<MenuProps['items']> = useMemo(() => {
    return [
      {
        key: MenuKey.SwitchTab,
        label: '切换到该页签',
        extra: getShortCut('←', isMixed),
      },
      {
        key: MenuKey.OpenNewTab,
        label: '打开新标签页',
        extra: getShortCut('Enter', isMixed),
      },
      {
        key: MenuKey.CopyUrl,
        label: '复制url',
        extra: getShortCut('C', isMixed),
      },
    ];
  }, [isMixed]);

  // 滚动到目标元素
  useEffect(() => {
    const el = document.querySelector(`.list-item-${selectIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectIndex]);

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

  const handleKeyDown = useMemoizedFn((e: KeyboardEvent) => {
    const computedTabsCount = computedTabs.length;
    const computedBookmarksCount = computedBookmarks.length;
    const itemCount = computedTabsCount + computedBookmarksCount;

    const allItems = [...computedTabs, ...computedBookmarks];
    // 检查是否按下了 Command(macOS) 或 Ctrl(Windows/Linux)
    const isModifierKeyPressed = navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey;
    /** 如果快捷键是组合键，并且没有按下组合键，则不执行操作 */
    const shouldPrevent = isMixed && !isModifierKeyPressed;
    // 打开、关闭、复制、切换操作都改成组合键触发，避免在输入框中按下←、→、c、Enter误触
    switch (e.key.toLowerCase()) {
      case 'arrowup':
        e.preventDefault();
        setSelectIndex(selectIndex <= 0 ? itemCount - 1 : selectIndex - 1);
        break;
      case 'arrowdown':
        e.preventDefault();
        setSelectIndex((selectIndex + 1) % itemCount);
        break;
      case 'arrowleft':
        if (shouldPrevent) return;
        e.preventDefault();
        if (selectIndex >= 0 && selectIndex < computedTabsCount) {
          // 优先切换到已存在的标签页
          switchToTab(computedTabs[selectIndex]);
        } else {
          openUrl(computedBookmarks[selectIndex - computedTabsCount].url!);
        }
        break;
      case 'arrowright':
        if (shouldPrevent) return;
        e.preventDefault();
        if (selectIndex >= 0 && selectIndex < computedTabsCount) {
          closeTab(computedTabs[selectIndex]);
          // TODO: 关闭以后要重新设置索引
        }
        break;
      case 'enter':
        if (shouldPrevent) return;
        e.preventDefault();
        if (selectIndex >= 0 && selectIndex < itemCount) {
          openUrl(allItems[selectIndex].url!);
        }
        break;
      case 'c':
        if (shouldPrevent) return;
        e.preventDefault();
        if (selectIndex >= 0 && selectIndex < itemCount) {
          copyToClipboard(allItems[selectIndex].url!);
        }
        break;
    }
  });

  useEffect(() => {
    inputRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMixed]);

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
    return bookmarks.filter((item) => item.title.includes(keyword) || item.url?.includes(keyword));
  }, [keyword, bookmarks]);

  const computedTabs = useMemo(() => {
    const tabs = windowType === 'current' ? currentWindowTabs : allTabs;
    if (!keyword) return tabs;
    return tabs.filter((item) => item.title?.includes(keyword) || item.url?.includes(keyword));
  }, [keyword, currentWindowTabs, allTabs, windowType]);

  // 根据搜索结果设置tab和bookmark默认选中索引
  useEffect(() => {
    setSelectIndex(0);
  }, [computedTabs, computedBookmarks]);

  const handleMenuClick = (type: 'tab' | 'bookmark', key: string, item: Tab | Bookmark) => {
    switch (key) {
      case MenuKey.SwitchTab:
        if (type === 'tab') {
          switchToTab(item as Tab);
        }
        break;
      case MenuKey.OpenNewTab:
        openUrl(item.url!);
        break;
      case MenuKey.CopyUrl:
        copyToClipboard(item.url!);
        break;
      case MenuKey.CloseTab:
        if (type === 'tab') {
          closeTab(item as Tab);
        }
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
        ref={inputRef}
        onChange={(e) => setSearchValue(e.target.value)}
        suffix={
          <Tooltip title="刷新">
            <img
              style={{ cursor: 'pointer' }}
              onClick={() => getData()}
              width={16}
              height={16}
              src="/icons/refresh.svg"
            />
          </Tooltip>
        }
      />

      <div className="shortcuts-tips">
        快捷键：
        <ShortCut short="↑↓" desc="导航" />
        <ShortCut short={getShortCut('Enter', isMixed)} desc="打开新标签页" />
        <ShortCut short={getShortCut('←', isMixed)} desc="切换到已打开的tab" />
        <ShortCut short={getShortCut('→', isMixed)} desc="关闭标签页" />
        <ShortCut short={getShortCut('C', isMixed)} desc="复制链接" />
      </div>
      <Form.Item label="快捷键使用" style={{ marginBottom: 0 }} colon>
        <Radio.Group
          options={[
            { label: '组合键', value: true },
            { label: '单键', value: false },
          ]}
          value={isMixed}
          onChange={(e) => setIsMixed(e.target.value)}
          size="small"
        />
      </Form.Item>
      <Form.Item label="搜索源" style={{ marginBottom: 0 }} colon>
        <Radio.Group
          options={[
            { label: '当前窗口', value: 'current' },
            { label: '所有窗口', value: 'all' },
          ]}
          value={windowType}
          onChange={(e) => setWindowType(e.target.value)}
          size="small"
        />
      </Form.Item>
      <div className="list-container">
        {computedTabs.length > 0 && (
          <>
            <div className="group-title">已打开的标签页({computedTabs.length}个)</div>
            <List
              itemLayout="horizontal"
              dataSource={computedTabs}
              renderItem={(item, index) => (
                <List.Item
                  key={item.id}
                  className={`list-item-${index} ${index === selectIndex ? 'selected' : ''}`}
                >
                  <div className="list-item">
                    <img width={16} height={16} src={item.favIconUrl} />
                    <div className="list-item-title" onClick={() => openUrl(item.url!)}>
                      {item.title}
                    </div>
                    <Dropdown
                      menu={{
                        items: tabItems,
                        onClick: (menuInfo) => handleMenuClick('tab', menuInfo.key, item),
                      }}
                    >
                      <a onClick={(e) => e.preventDefault()}>操作</a>
                    </Dropdown>
                  </div>
                </List.Item>
              )}
            ></List>
          </>
        )}
        {computedBookmarks.length > 0 && (
          <>
            <div className="group-title">收藏的书签({computedBookmarks.length}个)</div>
            <List
              itemLayout="horizontal"
              dataSource={computedBookmarks}
              renderItem={(item, index) => (
                <List.Item
                  key={item.id}
                  className={`list-item-${computedTabs.length + index} ${
                    selectIndex - computedTabs.length === index ? 'selected' : ''
                  }`}
                >
                  <div className="list-item">
                    <img
                      width={16}
                      height={16}
                      src={`https://www.google.com/s2/favicons?domain=${new URL(item.url!).hostname}`}
                    />
                    <div className="list-item-title" onClick={() => openUrl(item.url!)}>
                      {item.title}
                    </div>
                    <Dropdown
                      menu={{
                        items: bookmarkItems,
                        onClick: (menuInfo) => handleMenuClick('bookmark', menuInfo.key, item),
                      }}
                    >
                      <a onClick={(e) => e.preventDefault()}>操作</a>
                    </Dropdown>
                  </div>
                </List.Item>
              )}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Popup;
