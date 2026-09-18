export type ThemeId = "amber" | "night";
export type PageId = "home" | "timer" | "dice";
export type GameId = Exclude<PageId, "home">;
export type TimerMode = "stopwatch" | "countdown";

export type ThemeProps = {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
};

export type HomeProps = ThemeProps & {
  onOpen: (id: GameId) => void;
};

export type GameScreenProps = ThemeProps & {
  onBack: () => void;
};
