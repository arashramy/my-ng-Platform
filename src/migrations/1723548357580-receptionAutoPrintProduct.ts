import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReceptionAutoPrintProduct1723548357580
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "_product" ADD "reception_auto_print" boolean NOT NULL DEFAULT false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
