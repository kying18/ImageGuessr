import {
  IFile,
  IModel,
  IGame,
  IFilePair,
  IGameResult,
  IFilePairWithFiles,
  IGameWithDetails,
} from "./types";
import {
  File as FileModel,
  Model as ModelModel,
  Game as GameModel,
  FilePair as FilePairModel,
  GameResult as GameResultModel,
  FilePairWithFiles as FilePairWithFilesModel,
  GameWithDetails as GameWithDetailsModel,
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
    date: game.date,
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
    points_scored: gameResult.points_scored,
    accuracy: gameResult.accuracy,
    game_id: gameResult.game_id,
  };
}

export function transformFilePairWithFiles(
  filePair: FilePairWithFilesModel
): IFilePairWithFiles {
  return {
    real_file_id: filePair.real_file_id,
    generated_file_id: filePair.generated_file_id,
    real_vote_count: filePair.real_vote_count,
    generated_vote_count: filePair.generated_vote_count,
    game_id: filePair.game_id,
    real_file: transformFile(filePair.real_file),
    generated_file: transformFile(filePair.generated_file),
  };
}

export function transformGameWithDetails(
  game: GameWithDetailsModel
): IGameWithDetails {
  return {
    id: game.id,
    date: game.date,
    file_pairs: game.file_pairs.map(transformFilePairWithFiles),
    game_results: game.game_results.map(transformGameResult),
  };
}
