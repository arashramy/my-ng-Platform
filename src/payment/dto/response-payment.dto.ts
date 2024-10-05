export class VerifyResponseDto {
  code?: number;
  message: string;
  card_hash?: string | undefined;
  card_pan?: string | undefined;
  ref_id?: string | undefined;
  fee_type?: string | undefined;
  card_number?: string | undefined;
  fee?: string | undefined;
  status: number;
}

export class VerifyDto {
  verifyResponse: VerifyResponseDto;
  orders: any[];
}
