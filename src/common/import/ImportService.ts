import { BadRequestException, Injectable } from '@nestjs/common';
import { CoreEntity } from '../../base/entities/CoreEntity';
import {
  ColumnProperties,
  getImportOptions
} from '../decorators/import.decorator';
import * as ExcelJS from 'exceljs';
import { DataSource } from 'typeorm';

@Injectable()
export class ImportService {
  constructor(private ds: DataSource) {}

  async import(
    stream: Buffer,
    classRef: (new () => CoreEntity) & typeof CoreEntity
  ) {
    return this.ds.manager.transaction(async (entityManager) => {
      let options = getImportOptions(classRef);
      if (!options) {
        throw new BadRequestException('Not found config');
      }
      let keys = Object.keys(options.columns).sort((a, b) =>
        options.columns[a].priority > options.columns[b].priority ? 1 : -1
      );
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(stream);
      const sheet: ExcelJS.Worksheet = workbook.getWorksheet(1);
      let errors: any[] = [];
      let index = 1;
      let insertResults = [];
      for (let row of sheet.getRows(1, Math.min(sheet.rowCount, 1000))) {
        let model: any = {};
        let i = 1;
        let valid = true;
        for (let key of keys) {
          let cell: ExcelJS.Cell = row.getCell(i);
          let columnConfig: ColumnProperties = options.columns[key];
          if (columnConfig.validator) {
            let validation = await columnConfig.validator(
              cell.value,
              cell.effectiveType,
              entityManager
            );
            if (!validation) {
              errors.push({ id: index, value: columnConfig.validatorMessage });
              valid = false;
              break;
            }
          }
          if (columnConfig.transform) {
            model[key] = await columnConfig.transform(
              cell.value,
              cell.effectiveType,
              entityManager
            );
          } else {
            model[key] = cell.value;
          }
          i++;
        }
        if (valid) {
          if (options.validator) {
            let validation = await options.validator(model, entityManager);
            if (!validation) {
              errors.push({ id: index, value: options.validatorMessage });
              valid = false;
            }
          }
          if (valid) {
            if (options.prepareModel) {
              try {
                let result = await options.prepareModel(model, entityManager);
                if (result) {
                  let insertResult = await classRef.save(result);
                  if (insertResult?.id) {
                    insertResults.push({ id: insertResult?.id });
                  }
                }
              } catch (e) {
                console.log(e);
                errors.push({ id: index, value: e.message });
              }
            } else {
              let insertResult = await classRef.save(model);
              if (insertResult?.id) {
                insertResults.push({ id: insertResult?.id });
              }
            }
          }
        }
        index++;
      }
      return {
        inserts: insertResults,
        errors: errors
      };
    });
  }

  async importSample(
    classRef: (new () => CoreEntity) & typeof CoreEntity
  ): Promise<Buffer> {
    let options = getImportOptions(classRef);
    if (!options) {
      throw new BadRequestException('Not found config');
    }
    let keys = Object.keys(options.columns).sort((a, b) =>
      options.columns[a].priority > options.columns[b].priority ? 1 : -1
    );
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('example', {
      views: [{ rightToLeft: true }]
    });
    let row = [];
    for (let key of keys) {
      row.push(options.columns[key].sample || key);
    }
    sheet.addRow(row);
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }
}
