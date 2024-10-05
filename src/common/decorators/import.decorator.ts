import {EntityManager} from "typeorm";
import * as ExcelJS from "exceljs";

export interface ColumnProperties {
  transform?: (value: any, type?: ExcelJS.ValueType, em?: EntityManager) => Promise<any>;
  validator?: (value: any, type?: ExcelJS.ValueType, em?: EntityManager) => Promise<boolean>;
  validatorMessage?: string;
  type?: 'text' | 'number' | 'User';
  priority: number;
  sample?: string;
}

export interface ImportOptions<T> {
  columns?: { [K in keyof T | string]?: ColumnProperties };
  validator?: (value: any, em?: EntityManager) => Promise<boolean>;
  validatorMessage?: string;
  prepareModel?: (value: any, em?: EntityManager) => Promise<any>;
}

export const IMPORT_DECORATOR_KEY = Symbol('IMPORT_DECORATOR');

export function Import<T>(options?: ImportOptions<T>): ClassDecorator {
  return Reflect.metadata(IMPORT_DECORATOR_KEY, options);
}

export function getImportOptions<T>(entity: T): ImportOptions<T> {
  return (
      Reflect.getMetadata(IMPORT_DECORATOR_KEY, entity) || {
        columns: {}
      }
  );
}
