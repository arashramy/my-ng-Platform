export interface GamaResponseDTO<T> {
  success: boolean;
  message?: string;
  errors?: string[];
  body?: T;
}

export interface GamaPatternDTO {
  pattern?: string;
  destination?: string;
  tokens?: { name?: string; value?: string }[];
  expire?: number;
  username?: string;
  password?: string;
}

export interface GamaSendSmsDTO {
  source?: string;
  destination?: string;
  message?: string;
  expire?: number;
  delay?: number;
  username?: string;
  password?: string;
}

export interface GamaBaseConfigDTO {
  url?: string;
  username?: string;
  password?: string;
  number?: string;
  verifyToken?: string;
}

export interface GamaSendRequestDTO {
  expired?: number;
  message: string;
  subject?: string;
  source?: string;
  destination: string;
}

export interface GamaApiResponseDTO {
  status?: boolean;
  ref?: string | string[];
}
