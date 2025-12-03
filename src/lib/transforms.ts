import { IFile } from "./types";
import { File as FileModel } from "./models";

export function transformFile(file: FileModel): IFile {
  return {
    url: file.url,
    source_type: file.source_type as "real" | "generated",
  };
}
