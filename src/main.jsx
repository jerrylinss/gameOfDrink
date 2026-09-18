import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#ff8a1f",
          colorSuccess: "#7dffb3",
          colorError: "#ff5c5c",
          colorText: "#ffe8c8",
          colorTextSecondary: "rgba(255, 232, 200, 0.55)",
          colorBgElevated: "rgba(18, 10, 6, 0.96)",
          colorBorder: "rgba(255, 179, 71, 0.28)",
          borderRadius: 12,
          fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
        },
        components: {
          Switch: {
            colorPrimary: "#ff8a1f",
            handleBg: "#ffe8c8",
          },
          Message: {
            contentBg: "rgba(10, 6, 4, 0.92)",
            colorText: "#ffe8c8",
          },
          Popover: {
            colorBgElevated: "rgba(18, 10, 6, 0.96)",
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
