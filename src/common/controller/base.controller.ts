import 'reflect-metadata';
import {
  BadRequestException,
  Body,
  Delete,
  ForbiddenException,
  Get,
  Header,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseFilePipe,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationError
} from '@nestjs/common';
import { CoreEntity } from '../../base/entities/CoreEntity';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role, User } from '../../base/entities/User';
import { UpdateResult } from 'typeorm/query-builder/result/UpdateResult';
import { AccessTokenGuard } from '../../auth/guard/access-token.guard';
import {
  createQueryForEntity,
  createQueryWithoutPaging,
  newInstance
} from '../decorators/mvc.decorator';
import { JwtPayload } from '../../auth/dto/JwtPayload';
import { PermissionAction, PermissionKey } from '../constant/auth.constant';
import { validate } from '@nestjs/class-validator';
import { iterate } from 'iterare';
import { ExcelService } from '../export/ExcelService';
import { getExportOptions } from '../decorators/export.decorator';
import { Express, Response } from 'express';
import { REQUEST } from '@nestjs/core';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from '../import/ImportService';

export const common_permissions = [Role.Admin, PermissionAction.FULL];

export const hasAnyPermissions = (
  user: JwtPayload | User,
  permissions: string[]
): boolean => {
  return permissions.some((permission) =>
    (user?.permissions as string[])?.includes(permission)
  );
};

@UseGuards(AccessTokenGuard)
export abstract class ReadController<T extends CoreEntity> {
  @Inject(ExcelService)
  excelService: ExcelService;
  @Inject(REQUEST)
  req: any;

  protected constructor(
    protected classRef: (new () => CoreEntity) & typeof CoreEntity,
    protected key: PermissionKey
  ) {}

  @Get()
  async findAll(@Query() params: any, @CurrentUser() current: User) {
    if (
      !hasAnyPermissions(current, [
        ...common_permissions,
        this.key,
        `${this.key}_${PermissionAction.READ}`,
        ...this.additionalPermissions()
      ])
    ) {
      throw new ForbiddenException('Access denied');
    }
    if (!params.limit) {
      params.limit = 50;
    }
    return this.postFetchAll(
      await createQueryForEntity(
        this.classRef,
        this.prepareParams(params, current),
        'findAll',
        current,
        this.req,
        this.findAllPaging()
      ).getMany()
    );
  }

  @Get('/export')
  @Header('Content-Type', 'text/xlsx')
  async export(
    @Query() params: any,
    @Res() res: Response,
    @CurrentUser() current: User
  ) {
    if (
      !hasAnyPermissions(current, [
        ...common_permissions,
        this.key,
        `${this.key}_${PermissionAction.EXPORT}`
      ])
    ) {
      throw new ForbiddenException('Access denied');
    }
    params.audit = true;
    const options = getExportOptions(this.classRef);

    if (options.defaultSelect && options.defaultSelect.length !== 0) {
      let select = params.select?.split(',') || [];
      if (select.length !== 0) {
        options.defaultSelect.forEach((value) => {
          if (!select.includes(value)) {
            select.push(value);
          }
        });
        params.select = select.join(',');
      } else {
        select = [...options.defaultSelect];
        params.select = select.join(',');
      }
    }

    console.log('paramsss', params);

    const query = createQueryWithoutPaging(
      this.classRef,
      await this.prepareParamsExcel(params, current),
      'findAll',
      current,
      this.req
    );

    let columns: string[] = params.select?.split(',') || [];
    if (!columns.length) {
      columns = this.classRef
        .getRepository()
        .metadata.columns.map((c) => c.propertyName);
    }
    console.log('paramsss', params);

    const file = await this.excelService.export(
      options,
      columns,
      await query.getCount(),
      query
    );
    res.download(file?.name);
  }

  @Get('/query')
  @UseGuards(AccessTokenGuard)
  async query(@Query() params: any, @CurrentUser() current: User) {
    return createQueryForEntity(
      this.classRef,
      { limit: 50, ...this.prepareParams(params, current) },
      'autoComplete',
      current,
      this.req,
      this.queryPaging()
    ).getMany();
  }

  @Get('/page')
  async findPage(@Query() params: any, @CurrentUser() current: User) {
    console.log("ooooo");
    if (
      !hasAnyPermissions(current, [
        ...common_permissions,
        this.key,
        `${this.key}_${PermissionAction.READ}`,
        ...this.additionalPermissions()
      ])
    ) {
      throw new ForbiddenException('Access denied');
    }
    if (!params.limit) {
      params.limit = 10;
    }
    const query = createQueryForEntity(
      this.classRef,
      this.prepareParams(params, current),
      'findAll',
      current,
      this.req,
      this.findAllPaging()
    );
    const result = await query.getManyAndCount();
    return {
      total: result[1],
      content: await this.postFetchAll(result[0])
    };
  }

  @Get('/findOwnPage')
  async findOwnPage(@Query() params: any, @CurrentUser() current: User) {
    if (!params.limit) {
      params.limit = 10;
    }

    params = await this.prepareOwnParams(params, current);

    const query = createQueryForEntity(
      this.classRef,
      this.prepareParams(params, current),
      'findAll',
      null,
      params?.withoutDefaultParam ? undefined : this.req,
      this.findAllPaging()
    );

    console.log('own', params);
    const result = await query.getManyAndCount();
    return {
      total: result[1],
      content: await this.postFetchAll(result[0])
    };
  }

  @Get('/count')
  getRowsCount(@CurrentUser() current: User, @Query() params: any) {
    return createQueryWithoutPaging(
      this.classRef,
      this.prepareParams(params, current),
      'findAll',
      current,
      this.req
    ).getCount();
  }

  @Get('/:id')
  async get(@Param('id') id: number, @CurrentUser() current: User) {
    if (
      !hasAnyPermissions(current, [
        ...common_permissions,
        this.key,
        `${this.key}_${PermissionAction.READ}`,
        ...this.additionalPermissions()
      ])
    ) {
      throw new ForbiddenException('Access denied');
    }
    const model = await createQueryForEntity(
      this.classRef,
      id,
      'get',
      current,
      this.req
    );
    if (model) {
      return model;
    }
    throw new BadRequestException('Not found model');
  }

  async prepareOwnParams(params: any, current: User) {
    params = { ...params, createdBy: current.id };
    return params;
  }

  async postFetchAll(result: T[]) {
    return result;
  }

  prepareParams(params: any, current: User) {
    return params;
  }

  prepareParamsExcel(params: any, current: User) {
    return params;
  }

  findAllPaging(): 'take' | 'offset' {
    return 'take';
  }

  queryPaging(): 'take' | 'offset' {
    return 'take';
  }

  abstract additionalPermissions(): string[];
}

@UseGuards(AccessTokenGuard)
export abstract class BaseController<
  T extends CoreEntity
> extends ReadController<T> {
  protected constructor(
    protected classRef: (new () => CoreEntity) & typeof CoreEntity,
    protected key: PermissionKey
  ) {
    super(classRef, key);
  }

  @Post()
  async create(@Body() model: T, @CurrentUser() current: User) {
    if (
      !hasAnyPermissions(current, [
        ...common_permissions,
        this.key,
        `${this.key}_${PermissionAction.CREATE}`,
        ...this.additionalPostPermissions()
      ])
    ) {
      throw new ForbiddenException('Access denied');
    }
    const entity = await this.prepareCreate(model, current);
    const validate = await this.validate(entity);
    if (validate) {
      throw new BadRequestException(validate);
    }
    try {
      const saved: any = await this.classRef.save(entity);
      return this.postCreate(saved, current);
    } catch (e) {
      throw new InternalServerErrorException(e.message);
    }
  }

  @Put('/:id')
  async edit(
    @Param('id') id: number,
    @Body() model: T,
    @CurrentUser() current: User
  ) {
    if (
      !hasAnyPermissions(current, [
        ...common_permissions,
        this.key,
        `${this.key}_${PermissionAction.UPDATE}`,
        ...this.additionalPostPermissions()
      ])
    ) {
      throw new ForbiddenException('Access denied');
    }
    const oldModel: any = await this.classRef.findOneBy({ id: id });
    if (!oldModel) {
      throw new BadRequestException('Not found model');
    }
    const entity = await this.prepareEdit(model, oldModel, current);
    const validate = await this.validate(entity);
    if (validate) {
      throw new BadRequestException(validate);
    }
    try {
      const saved: any = await this.classRef.save(entity);
      return this.postEdit(model, saved, current);
    } catch (e) {
      throw new InternalServerErrorException(e.message);
    }
  }

  @Post('/deletes')
  async deleteAll(@Body() ids: number[], @CurrentUser() current: User) {
    if (
      !hasAnyPermissions(current, [
        ...common_permissions,
        this.key,
        `${this.key}_${PermissionAction.DELETE}`
      ])
    ) {
      throw new ForbiddenException('Access denied');
    }
    try {
      await this.prepareDelete(ids, current);
      let results = await this.classRef.findByIds(ids);
      for (const res of results) {
        res.deletedAt = new Date();
        res.deletedBy = current;
      }
      results = await this.classRef.save(results);
      return await this.postDelete(ids, results, current);
    } catch (e) {
      throw e;
    }
  }

  @Delete('/:id')
  async delete(@Param('id') id: number, @CurrentUser() current: User) {
    if (
      !hasAnyPermissions(current, [
        ...common_permissions,
        this.key,
        `${this.key}_${PermissionAction.DELETE}`,
        ...this.additionalPostPermissions()
      ])
    ) {
      throw new ForbiddenException('Access denied');
    }
    try {
      await this.prepareDelete(id, current);
      let result = await this.classRef.findOneById(id);
      result.deletedAt = new Date();
      result.deletedBy = current;
      result = await this.classRef.save(result);
      return await this.postDelete(id, result, current);
    } catch (e) {
      throw e;
    }
  }

  @Inject(ImportService)
  importService: ImportService;

  @Post('/import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(
    @UploadedFile(new ParseFilePipe()) file: Express.Multer.File
  ) {
    return this.importService.import(file.buffer, this.classRef);
  }

  @Get('/import-example')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  @Header('Content-Disposition', 'attachment; filename="import-sample.xlsx"')
  async downloadImportExampleFile(
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    const file = await this.importService.importSample(this.classRef);
    return new StreamableFile(file);
  }

  async prepareCreate(model: T, current: User): Promise<T> {
    const entity: any = newInstance(this.classRef);
    for (const key of Object.keys(model)) {
      entity[key] = model[key];
    }
    entity.createdBy = current;
    return entity;
  }

  async validate(entity: T) {
    const errors = await validate(entity);
    if (errors.length > 0) {
      throw await this.createExceptionFactory(errors);
    }
    return null;
  }

  async postCreate(model: T, current: User): Promise<T> {
    return model;
  }

  async prepareEdit(model: T, entity: T, current: User): Promise<T> {
    for (const key of Object.keys(model)) {
      entity[key] = model[key];
    }
    console.log(entity);
    console.log(current);
    entity.updatedBy = current;
    return entity;
  }

  async postEdit(model: T, entity: T, current: User): Promise<T> {
    return entity;
  }

  async prepareDelete(id: number[] | number, current: User) {}

  async postDelete(id: number[] | number, results: any, current: User) {
    if (results) {
      return true;
    }
    throw new NotFoundException('Not found model');
  }

  public createExceptionFactory(validationErrors: ValidationError[] = []) {
    const errors = this.flattenValidationErrors(validationErrors);
    return new BadRequestException(errors);
  }

  protected flattenValidationErrors(
    validationErrors: ValidationError[]
  ): string[] {
    return iterate(validationErrors)
      .map((error) => this.mapChildrenToValidationErrors(error))
      .flatten()
      .filter((item) => !!item.constraints)
      .map((item) => Object.values(item.constraints))
      .flatten()
      .toArray();
  }

  protected mapChildrenToValidationErrors(
    error: ValidationError,
    parentPath?: string
  ): ValidationError[] {
    if (!(error.children && error.children.length)) {
      return [error];
    }
    const validationErrors = [];
    parentPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    for (const item of error.children) {
      if (item.children && item.children.length) {
        validationErrors.push(
          ...this.mapChildrenToValidationErrors(item, parentPath)
        );
      }
      validationErrors.push(
        this.prependConstraintsWithParentProp(parentPath, item)
      );
    }
    return validationErrors;
  }

  protected prependConstraintsWithParentProp(
    parentPath: string,
    error: ValidationError
  ): ValidationError {
    const constraints = {};
    for (const key in error.constraints) {
      constraints[key] = `${parentPath}.${error.constraints[key]}`;
    }
    return {
      ...error,
      constraints
    };
  }

  additionalPostPermissions(): string[] {
    return [];
  }
}
