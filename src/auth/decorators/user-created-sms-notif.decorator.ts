import { EventsConstant } from '../../common/constant/events.constant';

export function UserCreatedSmsNotif(
  target: any,
  propertyName: string,
  propertyDescriptor: PropertyDescriptor
) {
  const original = propertyDescriptor.value;
  propertyDescriptor.value = new Proxy(original, {
    async apply(target, thisArg, argArray) {
      const result = await target.apply(thisArg, argArray);
      if (result?.id) {
        thisArg.eventEmitter.emit(EventsConstant.CREATE_USER_SMS, {
          firstName: result?.firstName,
          lastName: result?.lastName,
          mobile: result?.mobile,
          password: argArray?.[0]?.password || result?.mobile,
          email: result?.email
        });
      }
      return result;
    }
  });
  return propertyDescriptor;
}
