import ReactDOM from 'react-dom/client';
import zhCN from 'antd/locale/zh_CN';
import { ConfigProvider } from 'antd';
import { Popup } from './Popup';
import './index.css';

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <ConfigProvider locale={zhCN}>
    <Popup />
  </ConfigProvider>,
);
