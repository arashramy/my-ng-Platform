import { Operation } from '../../../common/interceptors/access-organization-fiscal-year.interceptor';

export class RegisteredServiceDto extends Operation {
  id: number;
  user: number = null;
  contractor: number = null;
  service: number = null;
  discount?: number = 0;
  start?: string;
  end?: string;
  submitAt?: string;
  credit?: number;
}

export class ArchivedRegisteredServiceDto {
  id: number;
  returnBack: number;
  returnBackContractorIncomeType?: boolean;
}
