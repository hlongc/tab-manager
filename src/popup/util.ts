import { message } from 'antd';

export const copyToClipboard = (text: string) => {
  // 创建临时文本区域
  const textArea = document.createElement('textarea');
  textArea.value = text;

  // 将文本区域添加到文档中
  document.body.appendChild(textArea);

  // 选择文本
  textArea.select();

  try {
    // 执行复制命令
    document.execCommand('copy');
    message.success('复制成功');
  } catch (err) {
    message.error('复制失败');
  } finally {
    // 移除临时文本区域
    document.body.removeChild(textArea);
  }
};

const isMacOS = navigator.platform.includes('Mac');

export const getShortCut = (key: string): `⌘ + ${string}` | `Ctrl + ${string}` => {
  return isMacOS ? (`⌘ + ${key}` as const) : (`Ctrl + ${key}` as const);
};
