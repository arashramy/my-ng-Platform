import 'reflect-metadata';
import { CoreEntity } from '../../base/entities/CoreEntity';
import {
  Equal,
  ILike,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Not
} from 'typeorm';
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata';
import { Role, User } from '../../base/entities/User';
import * as express from 'express';
import moment from 'moment';
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata';
import { JwtPayload } from '../../auth/dto/JwtPayload';
import { AppConstant } from '../constant/app.constant';
import { ForbiddenException } from '@nestjs/common';
import { isDate } from 'class-validator';

export const RELATIONS_KEY = Symbol('RELATIONS');

export interface RelationOption {
  name: string;
  filtersBy?: string[];
  relations?: string[];
  query?: string | ((cp: any) => any);
}

export function Relation(options: {
  findAll?: Array<string | RelationOption>;
  get?: Array<string | RelationOption>;
  autoComplete?: Array<string | RelationOption>;
  customSelect?: any[];
  customFilter?: any;
  customSort?: any;
}): ClassDecorator {
  return Reflect.metadata(RELATIONS_KEY, options);
}

export const DEFAULT_SORT_KEY = Symbol('default_sort');

export function DefaultSort(
  dir: 'ASC' | 'DESC',
  priority = 0
): PropertyDecorator {
  return Reflect.metadata(DEFAULT_SORT_KEY, { dir: dir, priority: priority });
}

export const GLOBAL_FILTER_KEY = Symbol('global_filter');

export function GlobalFilter(options: {
  where?: (param: string) => any;
}): PropertyDecorator {
  return Reflect.metadata(GLOBAL_FILTER_KEY, options);
}

export const ORGANIZATION_UNIT_FILTER = Symbol('organization_unit_filter');

export function OrganizationUnitFilter(
  relationFieldName?: string
): PropertyDecorator {
  return Reflect.metadata(ORGANIZATION_UNIT_FILTER, {
    field: relationFieldName
  });
}

export const FISCAL_YEAR_FILTER = Symbol('fiscal_year_filter');

export function FiscalYearFilter(
  relationFieldName?: string
): PropertyDecorator {
  return Reflect.metadata(FISCAL_YEAR_FILTER, { field: relationFieldName });
}

export function newInstance<T extends CoreEntity>(type: { new (): T }): T {
  return new type();
}

export function groupBy(collection, property) {
  return collection.reduce(
    (groups, item) => ({
      ...groups,
      [item[property]]: [...(groups[item[property]] || []), item]
    }),
    {}
  );
}

export function getOrganizationIds(user: User | JwtPayload) {
  if (user instanceof User) {
    return user?.accessOrganizationUnits?.map((ou) => ou.id) || [];
  } else {
    return user?.accessOrganizationUnits || [];
  }
}

export function getFiscalYearsIds(user: User | JwtPayload) {
  if (user instanceof User) {
    return user?.accessFiscalYears.map((ou) => ou.id) || [];
  } else {
    return user?.accessFiscalYears || [];
  }
}

export function createQueryWithoutPaging(
  entity: any,
  params: any,
  type: 'findAll' | 'get' | 'autoComplete',
  current: User | JwtPayload,
  req: express.Request
) {
  let relationOptions: any = Reflect.getMetadata(RELATIONS_KEY, entity);
  relationOptions = relationOptions || {};
  let relations: any[];
  if (type == 'get') {
    relations = relationOptions[type] || [];
    return entity.findOne({ where: { id: params }, relations: relations });
  } else {
    relations = relationOptions[type] || [];
  }

  if (req) {
    let headerQuery = addHeaderParamToQuery(entity, params, req, current);
    Object.assign(params, headerQuery);
  }
  let sortMetaData = createSortQuery(entity, params, relationOptions);
  let query = entity.createQueryBuilder('q');

  let selects = createSelectQuery(
    entity,
    params,
    relationOptions,
    sortMetaData
  );
  if (selects && selects.length) {
    query.select(selects);
  }

  if (params['audit'] && params['audit'] == 'true') {
    query.leftJoinAndSelect('q.createdBy', 'c');
    query.leftJoinAndSelect('q.updatedBy', 'u');
  }

  let additionalRelations = [];
  let where: any[] = [];
  let targetObject = newInstance(entity);

  for (let param of Object.keys(params)) {
    let keys: string[] = param.split('.');
    if (!param.startsWith('createdBy') && !param.startsWith('updatedBy')) {
      if (
        relationOptions &&
        relationOptions?.customFilter &&
        (relationOptions?.customFilter[keys[0]] ||
          relationOptions?.customFilter[param])
      ) {
        if (relationOptions?.customFilter[param]) {
          let tempQuery = relationOptions?.customFilter[param](params[param]);
          if (tempQuery) {
            where.push(tempQuery);
          }
        } else if (relationOptions?.customFilter[keys[0]]) {
          let tempQuery = relationOptions?.customFilter[keys[0]](params[param]);
          if (tempQuery) {
            where.push(tempQuery);
          }
        }
      } else {
        let column: ColumnMetadata | RelationMetadata = entity
          .getRepository()
          .metadata.columns.find(
            (col) =>
              col.propertyName.toLowerCase() == keys[0].toLowerCase() ||
              col.databaseName.toLowerCase() == keys[0].toLowerCase()
          );
        if (!column) {
          column = entity
            .getRepository()
            .metadata.relations.find(
              (col) => col.propertyPath.toLowerCase() == keys[0].toLowerCase()
            );
        }
        if (column) {
          let value = params[param];

          if (
            (value != undefined && value != '' && value !== 'Invalid date') ||
            ['isnull', 'notnull'].includes(keys[keys.length - 1])
          ) {
            if (column instanceof ColumnMetadata) {
              if (column.relationMetadata) {
                let relPolicy = relations.find(
                  (r) => r == keys[0] || r.name == keys[0]
                );
                if (!relPolicy) {
                  additionalRelations.push(keys[0]);
                }
                if (keys.length == 3) {
                  where.push({
                    [keys[0]]: prepareCondition(keys[1], keys[2], value)
                  });
                } else if (keys.length == 2) {
                  if (
                    [
                      'contains',
                      'equals',
                      'gte',
                      'lte',
                      'in',
                      'startsWith',
                      'isnull',
                      'notnull',
                      'not'
                    ].includes(keys[1])
                  ) {
                    where.push({
                      [keys[0]]: prepareCondition('id', keys[1], value)
                    });
                  } else
                    where.push({
                      [keys[0]]: prepareCondition(keys[1], 'equals', value)
                    });
                } else {
                  where.push({
                    [keys[0]]: prepareCondition('id', 'equals', value)
                  });
                }
              } else {
                if (keys.length == 2) {
                  where.push([
                    prepareCondition(
                      column.propertyName,
                      keys[1],
                      params[param]
                    )
                  ]);
                } else {
                  where.push(
                    prepareCondition(
                      column.propertyName,
                      'equals',
                      params[param]
                    )
                  );
                }
              }
            } else {
              let relPolicy = relations.find(
                (r) => r == keys[0] || r.name == keys[0]
              );
              if (!relPolicy) {
                additionalRelations.push(keys[0]);
              }
              if (keys.length == 3) {
                where.push(
                  prepareConditionRelation(
                    `${keys[0]}.${keys[1]}`,
                    keys[2],
                    value
                  )
                );
              } else if (keys.length == 2) {
                if (
                  [
                    'contains',
                    'equals',
                    'gte',
                    'lte',
                    'in',
                    'startsWith',
                    'isnull',
                    'notnull',
                    'not'
                  ].includes(keys[1])
                ) {
                  where.push(
                    prepareConditionRelation(`${keys[0]}.id`, keys[1], value)
                  );
                } else
                  where.push(
                    prepareConditionRelation(
                      `${keys[0]}.${keys[1]}`,
                      'equals',
                      value
                    )
                  );
              } else {
                where.push(
                  prepareConditionRelation(`${keys[0]}.id`, 'equals', value)
                );
              }
            }
          }
        }
      }
    }
  }
  addAuditFilterToQuery(params, query);
  let { relation, filters } = addGlobalFilterToQuery(
    params.global || params['global.contains'],
    entity,
    relations
  );

  for (let rel of [...relations, ...additionalRelations, ...relation]) {
    if (typeof rel == 'string') {
      query.leftJoinAndSelect(`q.${rel}`, rel);
    } else {
      query.leftJoinAndSelect(`q.${rel.name}`, rel.name);
      for (let emrel of rel.relations || []) {
        query.leftJoinAndSelect(`${rel.name}.${emrel}`, `${rel.name}_${emrel}`);
      }
    }
  }
  if (filters.length > 0) {
    query.andWhere(filters);
  }
  for (let w of where) {
    if (w) query.andWhere(w);
  }
  for (let s of sortMetaData) {
    query.addOrderBy(`${s.entity ? s.entity : 'q'}.${s.property}`, s.dir);
  }
  return query;
}

export function addGlobalFilterToQuery(
  keyword: string,
  entity: any,
  relations: any
) {
  let globalFilters: any[] = [];
  let additionalRelations: string[] = [];
  if (keyword) {
    let targetObject = newInstance(entity);
    for (let column of entity.getRepository().metadata.columns) {
      let filter: any = Reflect.getMetadata(
        GLOBAL_FILTER_KEY,
        targetObject,
        column.propertyName
      );
      if (filter) {
        if (column.relationMetadata) {
          let relPolicy = relations.find(
            (r) => r == column.propertyName || r.name == column.propertyName
          );
          if (!relPolicy) {
            additionalRelations.push(column.propertyName);
          }
          let relationObj = newInstance(
            column.relationMetadata.inverseEntityMetadata.target
          );
          for (let col of column.relationMetadata.inverseEntityMetadata.target.getRepository()
            .metadata.columns) {
            let filter: any = Reflect.getMetadata(
              GLOBAL_FILTER_KEY,
              relationObj,
              col.propertyName
            );
            if (filter) {
              if (!col.relationMetadata) {
                let cnd = filter.where(keyword);
                if (cnd) {
                  if (cnd == 'string') {
                    globalFilters.push({ [column.propertyName]: cnd });
                  } else {
                    globalFilters.push({
                      [column.propertyName]: { [col.propertyName]: cnd }
                    });
                  }
                }
              }
            }
          }
        } else {
          let cnd = filter.where(keyword);
          if (cnd) {
            if (cnd == 'string') {
              globalFilters.push(cnd);
            } else {
              globalFilters.push({ [column.propertyName]: cnd });
            }
          }
        }
      }
    }
  }
  return {
    relation: additionalRelations,
    filters: globalFilters
  };
}

export function addAuditFilterToQuery(params: any, query: any) {
  if (params['audit']) {
    let createdByConditions = auditConditionFilter(params, 'createdBy');
    if (createdByConditions) {
      query.andWhere(createdByConditions);
    }
    let updatedByConditions = auditConditionFilter(params, 'updatedBy');
    if (updatedByConditions) {
      query.andWhere(updatedByConditions);
    }
  }
}

export function auditConditionFilter(params: any, field: string) {
  let userInstance = newInstance(User);
  for (let param of Object.keys(params)) {
    if (param.startsWith(field)) {
      let auditFilter = [];
      for (let column of User.getRepository().metadata.columns) {
        let filter: any = Reflect.getMetadata(
          GLOBAL_FILTER_KEY,
          userInstance,
          column.propertyName
        );
        if (filter) {
          if (!column.relationMetadata) {
            let cnd = filter.where(params[param]);
            if (cnd) {
              if (cnd == 'string') {
                auditFilter.push({ createdBy: cnd });
              } else {
                auditFilter.push({
                  createdBy: { [column.propertyName]: cnd }
                });
              }
            }
          }
        }
      }
      return auditFilter;
    }
  }
  return null;
}

export function addHeaderParamToQuery(
  entity: any,
  params: any,
  req: any,
  current: any
) {
  let out: any = {};
  let instance = newInstance(entity);
  for (let column of entity.getRepository().metadata.columns) {
    let orgQuery = addOrganizationUnitHeaderToQuery(
      instance,
      params,
      column,
      req,
      current
    );
    if (orgQuery) {
      Object.assign(out, orgQuery);
    }
    let fiscalYearQuery = addFiscalYearHeaderToQuery(
      instance,
      params,
      column,
      req,
      current
    );
    if (fiscalYearQuery) {
      Object.assign(out, fiscalYearQuery);
    }
  }
  for (let column of entity.getRepository().metadata.relations) {
    let orgQuery = addOrganizationUnitHeaderToQuery(
      instance,
      params,
      column,
      req,
      current
    );
    if (orgQuery) {
      Object.assign(out, orgQuery);
    }
    let fiscalYearQuery = addFiscalYearHeaderToQuery(
      instance,
      params,
      column,
      req,
      current
    );
    if (fiscalYearQuery) {
      Object.assign(out, fiscalYearQuery);
    }
  }
  return out;
}

export function addOrganizationUnitHeaderToQuery(
  instance: any,
  params: any,
  column: any,
  req: any,
  current: any
) {
  let metadata = Reflect.getMetadata(
    ORGANIZATION_UNIT_FILTER,
    instance,
    column.propertyName
  );
  if (metadata) {
    let columnName = column.propertyName;
    if (metadata.field) {
      columnName += `.${metadata.field}`;
    }
    let paramExist = Object.keys(params)
      .filter(
        (k) => k.startsWith(column.propertyName) || k.startsWith(columnName)
      )
      .filter((key) => {
        if (current?.roles.includes(Role.Admin)) {
          return true;
        }
        let value = params[key];
        if (value) {
          if (Array.isArray(value)) {
            if (
              value.filter((x) => !getOrganizationIds(current)?.includes(+x))
                .length > 0
            ) {
              throw new ForbiddenException('Access denied');
            }
          } else {
            if (getOrganizationIds(current).indexOf(+value) < 0) {
              throw new ForbiddenException('Access denied');
            }
          }
        }
        return true;
      });
    if (paramExist?.length) {
      return {};
    }
    let orgUnitValue = +req.header(AppConstant.ORG_UNIT_HEADER_NAME);
    if (orgUnitValue) {
      if (
        current?.roles.includes(Role.Admin) ||
        getOrganizationIds(current).indexOf(orgUnitValue) >= 0
      )
        return { [`${columnName}.equals`]: orgUnitValue };
      else return { [`${columnName}.equals`]: -1 };
    } else if (current && !current.roles.includes(Role.Admin)) {
      if (getOrganizationIds(current).length > 0) {
        return { [`${columnName}.in`]: getOrganizationIds(current).join(',') };
      } else {
        return { [`${columnName}.equals`]: -1 };
      }
    }
  }
}

export function addFiscalYearHeaderToQuery(
  instance: any,
  params: any,
  column: any,
  req: any,
  current: any
) {
  let metadata = Reflect.getMetadata(
    FISCAL_YEAR_FILTER,
    instance,
    column.propertyName
  );
  if (metadata) {
    let columnName = column.propertyName;
    if (metadata.field) {
      columnName += `.${metadata.field}`;
    }
    let paramExist = Object.keys(params)
      .filter(
        (k) => k.startsWith(column.propertyName) || k.startsWith(columnName)
      )
      .filter((key) => {
        if (current?.roles.includes(Role.Admin)) {
          return true;
        }
        let value = params[key];
        if (value) {
          if (Array.isArray(value)) {
            if (
              value.filter((x) => !getFiscalYearsIds(current)?.includes(+x))
                .length > 0
            ) {
              throw new ForbiddenException('Access denied');
            }
          } else {
            if (getFiscalYearsIds(current).indexOf(+value) < 0) {
              throw new ForbiddenException('Access denied');
            }
          }
        }
        return true;
      });
    if (paramExist?.length) {
      return {};
    }
    let yearValue = +req.header(AppConstant.FISCAL_YEAR_HEADER_NAME);
    if (yearValue) {
      if (
        current?.roles.includes(Role.Admin) ||
        getFiscalYearsIds(current).indexOf(yearValue) > -1
      )
        return { [`${columnName}.equals`]: yearValue };
      else return { [`${columnName}.equals`]: -1 };
    } else if (current && !current?.roles.includes(Role.Admin)) {
      if (getFiscalYearsIds(current).length > 0) {
        return { [`${columnName}.in`]: getFiscalYearsIds(current).join(',') };
      } else {
        return { [`${columnName}.equals`]: -1 };
      }
    }
  }
}

export function createSelectQuery(
  entity: any,
  params: any,
  relationOptions: any,
  sortMetaData: any[] = []
) {
  let selects = [];
  if (params.select) {
    for (let s of params.select.split(',')) {
      let column: ColumnMetadata | RelationMetadata = entity
        .getRepository()
        .metadata.columns.find(
          (col) => col.propertyName.toLowerCase() == s.toLowerCase()
        );
      if (column) {
        selects.push(`q.${s}`);
      }
    }
    for (let s of sortMetaData) {
      let column: ColumnMetadata | RelationMetadata = entity
        .getRepository()
        .metadata.columns.find(
          (col) => col.propertyName.toLowerCase() == s.property
        );
      if (column) {
        let property = `${s.entity ? s.entity : 'q'}.${s.property}`;
        if (!selects.includes(property)) selects.push(property);
      }
    }
  }
  if (relationOptions.customSelect) {
    for (let select of relationOptions.customSelect) {
      selects.push(`${select.select} as ${select.alias}`);
    }
  }
  return selects;
}

export function createSortQuery(
  entity: any,
  params: any,
  relationOptions: any
) {
  let sortMetaData: any[] = [];
  if (params.sortField) {
    if (
      relationOptions &&
      relationOptions?.customSort &&
      relationOptions?.customSort[params.sortField]
    ) {
      let sortBy = relationOptions?.customSort[params.sortField](
        params.sortOrder == 1 ? 'ASC' : 'DESC'
      );
      if (sortBy) {
        sortMetaData.push({
          property: params.sortField,
          dir: params.sortOrder == 1 ? 'ASC' : 'DESC',
          entity: '',
          priority: 0
        });
      }
    } else {
      let sortColumn = entity
        .getRepository()
        .metadata.columns.find(
          (col) =>
            col.propertyName.toLowerCase() == params.sortField.toLowerCase()
        );
      if (sortColumn.relationMetadata) {
        sortMetaData.push({
          property: 'id',
          dir: params.sortOrder == 1 ? 'ASC' : 'DESC',
          entity: sortColumn.propertyName,
          priority: 0
        });
      } else {
        sortMetaData.push({
          property: sortColumn.propertyName,
          dir: params.sortOrder == 1 ? 'ASC' : 'DESC',
          entity: '',
          priority: 0
        });
      }
    }
  } else {
    let targetObject = newInstance(entity);
    for (let column of entity.getRepository().metadata.columns) {
      let defaultSort: any = Reflect.getMetadata(
        DEFAULT_SORT_KEY,
        targetObject,
        column.propertyName
      );
      if (defaultSort) {
        if (column.relationMetadata) {
          sortMetaData.push({
            property: 'id',
            dir: defaultSort.dir || 'ASC',
            entity: column.propertyName,
            priority: defaultSort.priority || 0
          });
        } else {
          sortMetaData.push({
            property: column.propertyName,
            dir: defaultSort.dir || 'ASC',
            entity: '',
            priority: defaultSort.priority || 0
          });
        }
      }
    }
  }
  return sortMetaData.sort((a, b) => (a.priority > b.priority ? 1 : -1));
}

export function createQueryForEntity(
  entity: any,
  params: any,
  type: 'findAll' | 'get' | 'autoComplete',
  current: User | JwtPayload,
  req: express.Request,
  pagingType: 'take' | 'offset' = 'take'
) {
  let query = createQueryWithoutPaging(entity, params, type, current, req);
  if (type != 'get') {
    if (pagingType == 'take') {
      query.skip(params.offset || 0);
      query.take(params.limit || 50);
    } else {
      query.offset(params.offset || 0);
      query.limit(params.limit || 50);
    }
  }
  return query;
}

export function prepareCondition(key: string, condition: string, value: any) {
  switch (condition) {
    case 'contains':
      return { [key]: ILike(`%${value}%`) };
    case 'equals':
      return { [key]: Equal(value) };
    case 'gte':
      if (checkIsDateTime(value)) {
        value = moment(
          `${value} 00:00`,
          AppConstant.SUBMIT_TIME_FORMAT
        ).toDate();
      } else {
        value = getValue(value);
      }
      return { [key]: MoreThanOrEqual(value) };
    case 'gt':
      if (checkIsDateTime(value)) {
        value = moment(
          `${value} 00:00`,
          AppConstant.SUBMIT_TIME_FORMAT
        ).toDate();
      } else {
        value = getValue(value);
      }
      return { [key]: MoreThan(value) };
    case 'lte':
      if (checkIsDateTime(value)) {
        value = moment(`${value} 00:00`, AppConstant.SUBMIT_TIME_FORMAT)
          .add(1, 'day')
          .toDate();
      } else {
        value = getValue(value);
      }
      return { [key]: LessThanOrEqual(value) };
    case 'lt':
      if (checkIsDateTime(value)) {
        value = moment(`${value} 00:00`, AppConstant.SUBMIT_TIME_FORMAT)
          .add(1, 'day')
          .toDate();
      } else {
        value = getValue(value);
      }
      return { [key]: LessThan(value) };
    case 'in':
      return { [key]: In(value.split(',')) };
    case 'startsWith':
      return { [key]: ILike(`${value}%`) };
    case 'isnull':
      return { [key]: IsNull() };
    case 'notnull':
      return { [key]: Not(IsNull()) };
    case 'not':
      return { [key]: Not(value) };
  }
}

export function prepareConditionRelation(
  key: string,
  condition: string,
  value: any
) {
  switch (condition) {
    case 'contains':
      return `${key} LIKE '%${value}%'`;
    case 'equals':
      return `${key} = ${getValue(value)}`;
    case 'gte':
      if (checkIsDateTime(value)) {
        value = moment(`${value} 00:00`, AppConstant.SUBMIT_TIME_FORMAT).format(
          AppConstant.DATETIME_FORMAT
        );
      } else {
        value = getValue(value);
      }
      return `${key} >= ${getValue(value)}`;
    case 'gt':
      if (checkIsDateTime(value)) {
        value = moment(`${value} 00:00`, AppConstant.SUBMIT_TIME_FORMAT).format(
          AppConstant.DATETIME_FORMAT
        );
      } else {
        value = getValue(value);
      }
      return `${key} > ${getValue(value)}`;
    case 'lte':
      if (checkIsDateTime(value)) {
        value = moment(`${value} 00:00`, AppConstant.SUBMIT_TIME_FORMAT)
          .add(1, 'day')
          .format(AppConstant.DATETIME_FORMAT);
      } else {
        value = getValue(value);
      }
      return `${key} <= ${getValue(value)}`;
    case 'in':
      return `${key} IN (${value.split(',')})`;
    case 'startsWith':
      return `${key}  LIKE '${value}%'`;
    case 'isnull':
      return `${key} IS NULL`;
    case 'notnull':
      return `${key} IS NOT NULL`;
    case 'not':
      return `${key} NOT ${getValue(value)}`;
  }
}

export function getValue(value: any) {
  let now = moment();
  if (value == '(now)' || value == '(current_datetime)') {
    return now.toDate();
  } else if (value == '(current_date)') {
    return now.format('YYYY-MM-DD');
  } else if (value == '(tomorrow_date)') {
    return now.add(1, 'day').format('YYYY-MM-DD');
  } else if (value == '(tomorrow_datetime)') {
    return now.add(1, 'day').toDate();
  } else if (value == '(yesterday_date)') {
    return now.add(-1, 'day').format('YYYY-MM-DD');
  } else if (value == '(yesterday_datetime)') {
    return now.add(-1, 'day').toDate();
  }
  return value;
}

export function checkIsDateTime(value: any) {
  return moment(value, AppConstant.DATE_FORMAT, true).isValid();
}

//6104337622679932
