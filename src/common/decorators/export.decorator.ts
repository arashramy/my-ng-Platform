export interface ColumnProperties<T> {
  label?: string;
  filterButton?: boolean;
  totalsRowLabel?: string;
  totalsRowFunction?:
    | 'none'
    | 'average'
    | 'countNums'
    | 'count'
    | 'max'
    | 'min'
    | 'stdDev'
    | 'var'
    | 'sum'
    | 'custom';
  totalsRowFormula?: string;
  transform?: (obj: T) => any;
  type?: 'plain' | 'image' | 'date' | 'time' | 'datetime' | 'array';
  inputFormat?: string;
  outputFormat?: string;
}

export interface ExportOptions<T> {
  name?: string;
  translateKey?: string;
  columns?: { [K in keyof T | string]?: ColumnProperties<T> };
  headerRow?: boolean;
  totalsRow?: boolean;
  defaultSelect?: any[],
 theme?:
    | 'TableStyleDark1'
    | 'TableStyleDark10'
    | 'TableStyleDark11'
    | 'TableStyleDark2'
    | 'TableStyleDark3'
    | 'TableStyleDark4'
    | 'TableStyleDark5'
    | 'TableStyleDark6'
    | 'TableStyleDark7'
    | 'TableStyleDark8'
    | 'TableStyleDark9'
    | 'TableStyleLight1'
    | 'TableStyleLight10'
    | 'TableStyleLight11'
    | 'TableStyleLight12'
    | 'TableStyleLight13'
    | 'TableStyleLight14'
    | 'TableStyleLight15'
    | 'TableStyleLight16'
    | 'TableStyleLight17'
    | 'TableStyleLight18'
    | 'TableStyleLight19'
    | 'TableStyleLight2'
    | 'TableStyleLight20'
    | 'TableStyleLight21'
    | 'TableStyleLight3'
    | 'TableStyleLight4'
    | 'TableStyleLight5'
    | 'TableStyleLight6'
    | 'TableStyleLight7'
    | 'TableStyleLight8'
    | 'TableStyleLight9'
    | 'TableStyleMedium1'
    | 'TableStyleMedium10'
    | 'TableStyleMedium11'
    | 'TableStyleMedium12'
    | 'TableStyleMedium13'
    | 'TableStyleMedium14'
    | 'TableStyleMedium15'
    | 'TableStyleMedium16'
    | 'TableStyleMedium17'
    | 'TableStyleMedium18'
    | 'TableStyleMedium19'
    | 'TableStyleMedium2'
    | 'TableStyleMedium20'
    | 'TableStyleMedium21'
    | 'TableStyleMedium22'
    | 'TableStyleMedium23'
    | 'TableStyleMedium24'
    | 'TableStyleMedium25'
    | 'TableStyleMedium26'
    | 'TableStyleMedium27'
    | 'TableStyleMedium28'
    | 'TableStyleMedium3'
    | 'TableStyleMedium4'
    | 'TableStyleMedium5'
    | 'TableStyleMedium6'
    | 'TableStyleMedium7'
    | 'TableStyleMedium8'
    | 'TableStyleMedium9';
}

export const EXPORT_DECORATOR_KEY = Symbol('EXPORT_DECORATOR');

export function Export<T>(options?: ExportOptions<T>): ClassDecorator {
  return Reflect.metadata(EXPORT_DECORATOR_KEY, options);
}

export function getExportOptions<T>(entity: T): ExportOptions<T> {
  return (
    Reflect.getMetadata(EXPORT_DECORATOR_KEY, entity) || {
      columns: {},
      name: entity.constructor.name,
      theme: 'TableStyleLight7',
      translateKey: '',
      headerRow: true,
      totalsRow: true,
      defaultSelect: []
    }
  );
}
