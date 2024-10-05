import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as tmp from 'tmp';
import { Setting, SettingKey } from '../../base/entities/Setting';
import { AppConstant } from '../constant/app.constant';
import { SelectQueryBuilder } from 'typeorm';
import { ExportOptions } from '../decorators/export.decorator';
import moment from 'moment-jalaali';
import { Utils } from '../helper/utils.helper';
import { isDefined } from 'class-validator';
import * as fs from 'fs';

@Injectable()
export class ExcelService {
  _translates: any;
  takeRecord = 500;

  async export(
    options: ExportOptions<any>,
    columns: string[],
    total: number,
    query?: SelectQueryBuilder<any>,
    model?: any
  ) {
    let setting = await this.loadSetting();
    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;
    const sheet: ExcelJS.Worksheet = workbook.addWorksheet(
      this.translate(options.name || ''),
      { views: [{ rightToLeft: setting.dir == 'rtl' }] }
    );
    let cols = columns.map((c) => {
      let col = options.columns[c];
      return {
        name: this.translate(
          options.translateKey
            ? `${options.translateKey}.${col?.label || c}`
            : col?.label || c
        ),
        totalsRowLabel: col?.totalsRowLabel
          ? this.translate(
              options.translateKey
                ? `${options.translateKey}.${col?.totalsRowLabel}`
                : col?.totalsRowLabel
            )
          : '',
        filterButton: !!col?.filterButton,
        totalsRowFunction: col?.totalsRowFunction || 'none'
      };
    });
    let table: ExcelJS.Table = sheet.addTable({
      name: this.translate(options.name || ''),
      ref: 'A1',
      headerRow: options.headerRow || true,
      totalsRow: options.totalsRow || true,
      style: {
        theme: options.theme || 'TableStyleLight7',
        showRowStripes: true
      },
      columns: cols,
      rows: []
    });
    let takes = 0;
    let index = 0;
    while (takes < total) {
      let models = [];
      if (model) {
        models.push(...model);
      } else {
        models = await query.skip(takes).take(this.takeRecord).getMany();
      }
      // console.log("models",models)
      takes += models.length;
      for (let model of models) {
        let row = this.prepareRowValue(
          workbook,
          sheet,
          index,
          model,
          options,
          columns,
          setting.calendar
        );
        table.addRow(row[0] as any[]);
        if (row[1]) {
          sheet.getRow(index + 1).height = 40;
        }
        index++;
      }
    }

    this.AdjustColumnWidth(sheet);
    table.commit();
    const tmpobj = tmp.fileSync({
      mode: 0o644,
      prefix: 'report-',
      postfix: '.xlsx'
    });
    await workbook.xlsx.writeFile(tmpobj.name);
    return tmpobj;
  }

  prepareRowValue(
    workbook: ExcelJS.Workbook,
    sheet: ExcelJS.Worksheet,
    rowIndex: number,
    model: any,
    options: ExportOptions<any>,
    columns: any[],
    calendar: string
  ) {
    let row = [];
    let hasImage = false;
    let colIndex = 0;
    for (let col of columns) {
      let columnProperties = options?.columns[col];
      if (columnProperties) {
        let value: any = columnProperties.transform
          ? columnProperties.transform(model)
          : model[col];
        switch (columnProperties.type) {
          case 'image':
            try {
              if (value) {
                let ext = Utils.getFileExtension(value.name);
                let image: ExcelJS.Image;
                if (value.dataUrl) {
                  image = {
                    base64: value.dataUrl,
                    extension: ['jpeg', 'png', 'gif'].includes(ext)
                      ? ext
                      : 'jpeg'
                  };
                } else if (value.name) {
                  if (
                    fs.existsSync(`${process.env.MEDIA_PATH}/${value.name}`)
                  ) {
                    image = {
                      filename: `${process.env.MEDIA_PATH}/${value.name}`,
                      extension: ['jpeg', 'png', 'gif'].includes(ext)
                        ? ext
                        : 'jpeg'
                    };
                  }
                }
                if (image) {
                  let imageId = workbook.addImage(image);
                  if (imageId) {
                    sheet.addImage(imageId, {
                      tl: { row: rowIndex, col: colIndex },
                      ext: {
                        height: 50,
                        width: ((value.width || 50) * 50) / (value.height || 50)
                      },
                      editAs: 'absolute'
                    });
                    hasImage = true;
                  }
                }
              }
            } catch (e) {}
            row.push('');
            break;
          case 'date':
            row.push(
              this.getDateFormat(
                value,
                columnProperties.outputFormat
                  ? columnProperties.outputFormat
                  : calendar == 'gregorian'
                  ? 'YYYY-MM-DD'
                  : 'jYYYY-jMM-jDD',
                columnProperties.inputFormat
              )
            );
            break;
          case 'datetime':
            row.push(
              this.getDateFormat(
                value,
                columnProperties.outputFormat
                  ? columnProperties.outputFormat
                  : `${
                      calendar == 'gregorian' ? 'YYYY-MM-DD' : 'jYYYY-jMM-jDD'
                    } HH:mm:ss`,
                columnProperties.inputFormat
              )
            );
            break;
          case 'time':
            row.push(
              this.getDateFormat(
                value,
                columnProperties.outputFormat
                  ? columnProperties.outputFormat
                  : 'HH:mm:ss',
                columnProperties.inputFormat
              )
            );
            break;
          case 'array':
            row.push(value?.map((v) => this.translate(v)).join(', '));
            break;
          default:
            row.push(this.translate(value) || '');
        }
      } else {
        row.push(model[col] || '');
      }
      colIndex++;
    }
    return [row, hasImage];
  }

  getDateFormat(value: any, outputFormat: string, inputFormat?: string) {
    if (value) {
      let momentValue;
      if (inputFormat) {
        momentValue = moment(value, inputFormat);
      } else {
        momentValue = moment(value);
      }
      return momentValue.format(outputFormat);
    }
    return '';
  }

  async loadSetting() {
    let setting = await Setting.findByKey(SettingKey.SystemConfig);
    if (!setting) {
      setting = {
        lang: AppConstant.DEFAULT_LANGUAGE,
        calendar: AppConstant.DEFAULT_CALENDAR,
        dir: AppConstant.DEFAULT_DIR
      };
    }
    this._translates = require(`../../../client/assets/i18n/${
      setting.lang || AppConstant.DEFAULT_LANGUAGE
    }.json`);
    return setting;
  }

  AdjustColumnWidth(worksheet) {
    worksheet.columns.forEach((column) => {
      const lengths = column.values.map((v) => v.toString().length);
      const maxLength = Math.max(
        ...lengths.filter((v) => typeof v === 'number')
      );
      column.width = maxLength > 10 ? maxLength : 10;
    });
  }

  translate(key: string) {
    let result = this.getTranslateValue(this._translates, key);
    return result || key;
  }

  getTranslateValue(target: any, key: string): any {
    let keys = typeof key === 'string' ? key.split('.') : [key];
    key = '';
    do {
      key += keys.shift();
      if (
        isDefined(target) &&
        isDefined(target[key]) &&
        (typeof target[key] === 'object' || !keys.length)
      ) {
        target = target[key];
        key = '';
      } else if (!keys.length) {
        target = undefined;
      } else {
        key += '.';
      }
    } while (keys.length);

    return target;
  }
  
}
