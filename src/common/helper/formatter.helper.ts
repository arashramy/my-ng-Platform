import { Calendar } from '../constant/app.constant';
import moment from 'moment-jalaali';

export const _priceFormat = (price: number, lang = 'en') => {
  if (lang === 'fa') {
    return `${new Intl.NumberFormat('fa-IR').format(price)} ریال`;
  } else {
    return `${new Intl.NumberFormat('en-US').format(price)} $`;
  }
};

export const _concatName = (firstName: string, lastName: string) => {
  return firstName?.concat(' ', lastName || '');
};

export const _formatDate = (
  date: Date,
  showTime = false,
  calendar = Calendar.jalali
) => {
  let format;
  if (calendar == Calendar.jalali) {
    format = 'jYYYY/jM/jD';
  } else {
    format = 'YYYY/jM/jD';
  }
  if (showTime) {
    format += ' HH:mm';
  }
  return moment(date).format(format);
};
