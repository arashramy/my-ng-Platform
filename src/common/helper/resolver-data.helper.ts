import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';

@Injectable()
export class ResolveHelper {
  exec(api: Observable<AxiosResponse<any, any>>) {
    return new Promise((resolve, reject) => {
      try {
        api.subscribe((response) => {
          resolve(response.data);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}
