export interface RacePlayerPosition {
  userId: string;
  position: number;
}

// Ответ GetRaceState: снимок общей комнаты гонки
export interface RaceSnapshot {
  sizeX: number;
  sizeY: number;
  myPosition: number;
  players: RacePlayerPosition[];
}
