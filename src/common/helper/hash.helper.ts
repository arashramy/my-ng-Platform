import * as bcrypt from 'bcryptjs';

const saltRounds = 10;

export class HashHelper {
  static hash(token: string) {
    const salt = bcrypt.genSaltSync(saltRounds);
    return bcrypt.hash(token, salt);
  }

  static match(hashed: string, plain: string) {
    return bcrypt.compare(plain, hashed);
  }
}
