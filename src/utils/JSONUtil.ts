import { Abortable } from 'events';
import { OpenMode, PathLike, readFileSync, writeFileSync } from 'fs';
import { FileHandle, readFile, writeFile } from 'fs/promises';
import { dirname, isAbsolute, resolve } from 'path';

export type PathType = PathLike;
export type OptionsType =
  | ({
      encoding?: BufferEncoding;
      flag?: OpenMode | undefined;
    } & Abortable)
  | BufferEncoding;

export default class JSONUtil {
  private cleanPath(path: PathLike): PathLike {
    if (typeof path !== 'string') return path;
    if (isAbsolute(path)) return path;
    return resolve(dirname(stackTrace.getCaller(2)), path);
  }

  private cleanOptions(options?: OptionsType) {
    if (typeof options === 'object') options.encoding ??= 'utf-8';
    if (!options) options ??= { encoding: 'utf-8' };

    return options;
  }

  private cleanWriteData<T>(data?: T): string {
    if (data === null) return '{}';

    if (typeof data === 'object') return JSON.stringify(data, null, 2);
    if (typeof data === 'string') return data;

    try {
      return JSON.stringify(data);
    } catch {
      try {
        return (data as any).toString();
      } catch {
        try {
          return data as any;
        } catch {
          return '';
        }
      }
    }
  }

  private cleanReadData(data: string): string {
    return data.replace(/\/\/.*|\/\*\*(.|\n|\r|\r\n|\n\r)*\*\//g, '');
  }

  public async readFile<T>(path: PathType, options?: OptionsType): Promise<T | null> {
    path = this.cleanPath(path);
    options = this.cleanOptions(options);

    try {
      return JSON.parse(this.cleanReadData((await readFile(path, options as any)).toString()));
    } catch {
      return null;
    }
  }

  public readFileSync<T>(path: PathType, options?: OptionsType): T | null {
    path = this.cleanPath(path);
    options = this.cleanOptions(options);

    try {
      return JSON.parse(this.cleanReadData(readFileSync(path, options as any).toString()));
    } catch {
      return null;
    }
  }

  public async writeFile<T>(path: PathType, data: T, options?: OptionsType): Promise<boolean> {
    path = this.cleanPath(path);
    const string = this.cleanWriteData(data);
    options = this.cleanOptions(options);

    return await writeFile(path, string, options)
      .then(() => true)
      .catch(() => false);
  }

  public writeFileSync<T>(path: PathType, data: T, options?: OptionsType): boolean {
    path = this.cleanPath(path);
    const string = this.cleanWriteData(data);
    options = this.cleanOptions(options);

    try {
      writeFileSync(path, string, options as any);
      return true;
    } catch {
      return false;
    }
  }
}
