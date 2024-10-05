import {Injectable} from '@nestjs/common';
import {DataSource} from 'typeorm';

@Injectable()
export class LimitedCreditService {

  constructor(private datasource: DataSource) {
  }
}
