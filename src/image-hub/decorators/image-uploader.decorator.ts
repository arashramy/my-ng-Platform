import { EventsConstant } from '../../common/constant/events.constant';

export function ImageUploader() {
  return function (
    target: any,
    propertyName: string,
    propertyDescriptor: PropertyDescriptor
  ) {
    const originalMethod = propertyDescriptor.value;

    propertyDescriptor.value = async function (...params) {
      const result = await originalMethod.apply(this, params);
      if (result?.profile) {
        this.eventEmitter.emit(EventsConstant.IMAGE_HUB_UPLOADER, {
          data: result,
          mode: 'INSERT'
        });
      }
      return result;
    };

    return propertyDescriptor;
  };
}
