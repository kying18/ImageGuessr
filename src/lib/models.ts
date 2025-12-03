export interface Model {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface File {
  id: string;
  url: string;
  source_type: "real" | "generated";
  source_id: string | null;
  prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface FilePair {
  id: string;
  real_file_id: string;
  generated_file_id: string;
  real_vote_count: number;
  generated_vote_count: number;
  game_id: string;
  created_at: string;
  updated_at: string;
}

export interface GameResult {
  id: string;
  score: number;
  game_id: string;
  created_at: string;
  updated_at: string;
}
