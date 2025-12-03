import { IFile, IModel, IGame, IFilePair, IGameResult } from "./types";
import {
  File as FileModel,
  Model as ModelModel,
  Game as GameModel,
  FilePair as FilePairModel,
  GameResult as GameResultModel,
} from "./models";

export function transformFile(file: FileModel): IFile {
  return {
    url: file.url,
    source_type: file.source_type as "real" | "generated",
  };
}

export function transformModel(model: ModelModel): IModel {
  return {
    name: model.name,
  };
}

export function transformGame(game: GameModel): IGame {
  return {
    id: game.id,
  };
}

export function transformFilePair(filePair: FilePairModel): IFilePair {
  return {
    real_file_id: filePair.real_file_id,
    generated_file_id: filePair.generated_file_id,
    real_vote_count: filePair.real_vote_count,
    generated_vote_count: filePair.generated_vote_count,
    game_id: filePair.game_id,
  };
}

export function transformGameResult(gameResult: GameResultModel): IGameResult {
  return {
    score: gameResult.score,
    game_id: gameResult.game_id,
  };
}
