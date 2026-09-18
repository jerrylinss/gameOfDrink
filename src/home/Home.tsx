import type { ReactNode } from "react";
import { RightOutlined } from "@ant-design/icons";
import AppHeader from "../shared/AppHeader";
import { playClick } from "../shared/audio";
import type { GameId, HomeProps } from "../shared/types";
import DiceIcon from "../dice/DiceIcon";
import WineGlassIcon from "../timer/WineGlassIcon";
import "./Home.css";

const GAMES: { id: GameId; title: string; desc: string; icon: ReactNode }[] = [
  {
    id: "timer",
    title: "倒计时",
    desc: "正计时 / 倒计时，点停即显",
    icon: <WineGlassIcon size={30} />,
  },
  {
    id: "dice",
    title: "摇色子",
    desc: "自选个数，摇完可锁定",
    icon: <DiceIcon size={30} />,
  },
];

export default function Home({ theme, setTheme, onOpen }: HomeProps) {
  return (
    <div className="app">
      <AppHeader theme={theme} setTheme={setTheme} />
      <h1 className="home-title">小游戏</h1>
      <div className="home-list">
        {GAMES.map((game) => (
          <button
            key={game.id}
            type="button"
            className="game-card"
            onClick={() => {
              playClick();
              onOpen(game.id);
            }}
          >
            <span className="game-card-icon">{game.icon}</span>
            <span className="game-card-text">
              <span className="game-card-name">{game.title}</span>
              <span className="game-card-desc">{game.desc}</span>
            </span>
            <RightOutlined className="game-card-arrow" />
          </button>
        ))}
      </div>
    </div>
  );
}
