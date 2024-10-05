export const AUDIT_DECORATOR_KEY = Symbol('AUDIT_DECORATOR');

export function Audit(): ClassDecorator {
  return Reflect.metadata(AUDIT_DECORATOR_KEY, {});
}

export function getAudit(entity: any): any {
  return Reflect.getMetadata(AUDIT_DECORATOR_KEY, entity);
}
