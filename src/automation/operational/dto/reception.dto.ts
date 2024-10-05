import { Operation } from '../../../common/interceptors/access-organization-fiscal-year.interceptor';
import { ReceptionServiceDto } from './reception-service.dto';

export class ReceptionDto extends Operation {
  id?: number;
  lockers?: number[];
  discount?: number;
  service?: ReceptionServiceDto;
  submitAt?: string;
  user?: number;
}
