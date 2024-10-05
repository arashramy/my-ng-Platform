export const DeviceMessage = {
  FAILED_RCP: 'ساخت پذیرش با شکست مواجعه شد',
  UNPAIN_INSTALLMENT_LOAN: 'کاربر اقساط پرداخت نشده دارد',
  UNABLE_TO_REPEATBALE_RECEPTION: 'قابلیت پذیرش مکرر وجود ندارد',
  UNABLE_TO_RECEPTION: 'پذیرش امکان پذیر نمیباشد',
  NO_REGISTERED_SERVICE_EXIST: 'ثبت نامی ندارد',
  SELECT_YOUR_CONTRACTOR: 'پیمانکار خود را انتخاب کنید',
  INVALID_IP_ADDRESS_LOCKE: (title: string, ip: string) =>
    `ارتباط با کمدهای ${title} با آی پی ${ip}  برقرار نشد`,
  SELECT_YOUR_RGS: 'بیش از یک ثبت نام , مراجعه به پذیرش',
  NO_LOCKER_EXIST: 'کمدی وجود ندارد',
  LOCKER_OPEN: (lockerNumber: number) => `کمد ${lockerNumber} باز شد`,
  SUCCESSFUL_RCP_LOCKER: (lockerNumber: number[]) =>
    `کمد ${lockerNumber.join(',')} باز شد و پذیرش با موفقیت ثبت شد`,
  SELECT_YOUR_LOCKER: 'کمد خود را انتخاب کنید',
  NO_RECEPTION_EXIST: 'پذیرشی وجود ندارد',
  SETTLE_RECEPTION: 'پذیرش های خود را تسویه کنید',
  DO_EXIT: 'خروج با موفقیت زده شد',
  SUCCESSFUL_RCP: 'با موفقیت پذیرش انجام شد',
  NOT_SUPPORTED_SHOP_DEVICE: 'دستگاه مورد, فروشگاه رو ساپورت نمیکند',
  SHOP_DEVICE_OPENED_SUCCESSFULLY: 'مراجعه به قسمت فروشگاه برای سفارش',
  VIP_LOCKER_FILLED_ERROR: 'کمد وی آی پی شما پر میباشد , مراجعه به پذیرش',
  OPEN_GATE_SUCCESSFULL: 'گیت با موفقیت باز شد',
  NO_RECEPTION_EXIST_TO_OPEN_GATE: 'پذیرشی برای باز کردن درب گیت وجود ندارد',
  OPEN_SHOP_SUCCESSFULLY: 'فروشگاه باز شد , مراجعه به پذیرش',
  SHOP_OPEN_FAILED_ACCESS: 'فروشگاهی برای کالا ها وجود ندارد',
  NO_ENOUGHT_CREDIT_FOR_CHARGING_SERVICE: 'موجودی خدمت شارژی شما کافی نیست',
  NO_RGS_AND_MULTIPLE_CHARGING_SERVICE:
    'شما دارای چند خدمت شارژی میباشید, مراجعه به پذیرش',
  INVALID_TRAFFIC: 'تردد تکراری در زمان غیر مجاز',
  INVALID_CHARGING_SERVICE: 'خدمت شارژی, خدمت اصلی ندارد',
  INVALID_TAGPRODUCTPARENT_CHARGING_SERVICE: 'خدمت شارژی تگ محصولات ندارد',

  INSURANCE_INVALID: 'بیمه ندارد',
  INVALID_NATIONAL_CODE:
    'کدملی کاربر وارد نشده است لطفا پس از وارد کردن کدملی استعلام بیمه مجدد بگیرید',
  INVALID_INQURIE: 'لظفا ابتدا استعلام بگیرید',
  EXPIRED_INSURANCE:
    'بیمه کاربر منقضی شده است لطفا پس از تمدید بیمه مجدد استعلام بگیرید',
  INVALID_LOGOUT_UNFAIR: 'عدم خروج موفق به پذیرش مراجعه کنید',
  // INVALID_LOGOUT_UNFAIR_RECEPTION:'عدم خروج موفق به پذیرش مراجعه کنید'
};
