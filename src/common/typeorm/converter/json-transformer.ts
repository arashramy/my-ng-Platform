import { ValueTransformer } from 'typeorm';

export const jsonTransformer: ValueTransformer = {
  from: (dbValue) => {
    try {
      return JSON.parse(dbValue);
    } catch (error) {
      console.log(error);
      return null;
    }
  },
  to: (entityValue) => {
    try {
      return JSON.stringify(entityValue);
    } catch (error) {
      return null;
    }
  }
};
