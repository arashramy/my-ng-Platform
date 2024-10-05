export abstract class RemoveDeviceAdapterService {
  public abstract saveFingerPrint<T, E extends object>(
    config: any,
    payload: E
  ): Promise<T>;
  public abstract saveCardNumber<T, E extends object>(
    config: any,
    payload: E
  ): Promise<T>;
  public abstract sendResult<T, E extends object>(
    config: any,
    payload: E
  ): Promise<T>;
  public abstract saveFace<T, E extends object>(
    config: any,
    payload: E
  ): Promise<T>;
  public abstract saveFace<T, E extends object>(
    config: any,
    payload: E
  ): Promise<T>;

  public abstract openGate<T, E extends object>(
    config: any,
    payload: E
  ): Promise<T>;

  public abstract print<T, E extends object>(
    config: any,
    payload: E
  ): Promise<T>;
}
