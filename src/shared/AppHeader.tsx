import { useEffect, useState, type ReactNode } from "react";
import { Button, Popover } from "antd";
import { LeftOutlined, SettingOutlined } from "@ant-design/icons";
import { playClick } from "./audio";
import { THEME_OPTIONS } from "./theme";
import type { ThemeId } from "./types";

type AppHeaderProps = {
  title?: string;
  icon?: ReactNode;
  onBack?: () => void;
  extraSettings?: ReactNode;
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

export default function AppHeader({
  title,
  icon,
  onBack,
  extraSettings,
  theme,
  setTheme,
  onOpenChange,
  children,
}: AppHeaderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  const settingsContent = (
    <div className="settings-pop">
      <div className="settings-title">设置</div>
      <div className="settings-label">主题</div>
      <div className="theme-picks">
        {THEME_OPTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`theme-chip${theme === item.id ? " active" : ""}`}
            aria-pressed={theme === item.id}
            onClick={() => {
              playClick();
              setTheme(item.id);
            }}
          >
            <span className={`theme-dot theme-dot-${item.id}`} />
            {item.label}
          </button>
        ))}
      </div>
      {extraSettings}
    </div>
  );

  return (
    <header className="header">
      <div className="top-bar">
        <div className="brand">
          {onBack ? (
            <Button
              className="nav-btn"
              icon={<LeftOutlined />}
              onClick={() => {
                playClick();
                onBack();
              }}
              aria-label="返回"
            />
          ) : null}
          {icon}
          {title}
        </div>
        <Popover
          content={settingsContent}
          trigger="click"
          placement="bottomRight"
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            onOpenChange?.(next);
          }}
          arrow={false}
          overlayClassName="settings-overlay"
          getPopupContainer={() => document.body}
          zIndex={30}
          transitionName=""
        >
          <Button
            className={`settings-btn${open ? " open" : ""}`}
            icon={<SettingOutlined />}
            onClick={() => playClick()}
            aria-label="设置"
          />
        </Popover>
      </div>
      {children}
    </header>
  );
}
