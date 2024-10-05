export interface ReceptionQueueDto {
  start?: Date;
  end?: Date;
  user?: number;
  services: Array<{ service: number; qty: number }>;
}
