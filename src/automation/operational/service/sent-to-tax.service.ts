import { HttpService } from '@nestjs/axios';
import { Process, Processor } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { firstValueFrom } from 'rxjs';
import {
  invoiceDTOs,
  invoiceDetailsDto,
  invoiceSettlementMethodType,
  invoiceSubjectType,
  invoiceTaxType,
  personType
} from '../dto/sent-to-tax.dto';
import { SaleOrder, SentToTaxStatus } from '../entities/SaleOrder';
import { In } from 'typeorm';
import { AppConstant } from '../../../common/constant/app.constant';
import moment from 'moment';

@Processor('sent-to-tax')
export class SentToTaxServiceProcessor {
  constructor(
    private http: HttpService,
    private configService: ConfigService
  ) {}

  @Process()
  async SentToTax({
    data: { data, token }
  }: Job<{ data: SaleOrder[]; token: string }>) {
    let results: invoiceDTOs[] = [];

    const [result, selectedOrders] = this.prepareDataPakok(data);
    results = result;
    console.log('selectedOrders : ', selectedOrders);

    console.log('result is sssss', results[0]?.invoiceDetails);

    try {
      console.log('start');
      const response = await firstValueFrom(
        this.http.post(
          `${this.configService.get(
            'PAKOK_BASE_URL'
          )}/CreateNormalSaleInvoicesWithOutTransaction`,
          { invoiceDTOs: results },
          {
            headers: {
              Authorization: `Bearer ${token.trim()}`
            }
          }
        )
      );

      console.log('theqqqqqresponse is', response);

      const successIds = [
        ...response?.data?.map((el) =>
          el?.messageCode === 0 ? +el?.valueID : null
        )
      ]?.filter((e) => e !== null);
      const faildIds = [
        ...response?.data?.map((el) =>
          el?.messageCode === 1 || el?.messageCode === -1 ? +el?.valueID : null
        )
      ]?.filter((e) => e !== null);

      if (successIds?.length > 0) {
        await SaleOrder.createQueryBuilder()
          .update()
          .where({ id: In(successIds) })
          .orWhere({
            receptionSaleOrder: In(successIds),
            id: In(selectedOrders)
          })
          .set({ sentToTaxStatus: SentToTaxStatus.Sent, taxErrors: '' })
          .execute();
        await SaleOrder.update(
          {
            receptionSaleOrder: In(successIds),
            sentToTaxStatus: SentToTaxStatus.Sending
          },
          {
            sentToTaxStatus: SentToTaxStatus.Failed,
            taxErrors:
              'این فاکتور دارای کالایی با یکی از ویژگی های زیر میباشد و ارسال نشده است (ارسال به مالیات غیرفعال - تعداد صفر - قابل پرداخت صفر)'
          }
        );
      }

      if (faildIds?.length > 0) {
        response?.data?.map(async (el) => {
          if (el?.messageCode === 1 || el?.messageCode === -1) {
            await SaleOrder.createQueryBuilder()
              .update()
              .where({ id: +el?.valueID })
              .orWhere({
                receptionSaleOrder: +el?.valueID
              })
              .set({
                sentToTaxStatus: SentToTaxStatus.Failed,
                taxErrors: el?.message
              })
              .execute();
          }
          return el;
        });
      }
    } catch (error) {
      console.log('SentToTax :',error);
      console.log('SentToTax data :',error?.data || error?.response?.data);
    }
  }

  prepareDataPakok(data: SaleOrder[]) {
    const results: invoiceDTOs[] = [];
    let selectedOrders = [];
    for (let index = 0; index < data.length; index++) {
      const e = data[index];
      const invoiceDetails: invoiceDetailsDto[] = [];
      e.items?.map((el) => {
        console.log('order id : ', e.id);
        console.log('mustSentToTax', el.product.mustSentToTax);
        if (
          el.amount !== 0 &&
          el.quantity !== 0 &&
          el.amount * el.quantity > el.discount &&
          !!el.product.mustSentToTax
        ) {
          const findIndex = invoiceDetails.findIndex(
            (element) => +element.externalID === el.product.id
          );
          if (findIndex >= 0) {
            invoiceDetails[findIndex].value += el.quantity;
            // invoiceDetails[findIndex].tax += el.tax;
            invoiceDetails[findIndex].discountAmount += el.discount;
            selectedOrders.push(el.saleOrderId);
          } else {
            invoiceDetails.push({
              externalID: `${el?.product?.id}`,
              externaProductName: el.product.title,
              externaProductTaxID: el?.product?.uniqueTaxCode,
              externaProductCode: el?.product?.uniqueTaxCode,
              externaTaxRate: el?.tax,
              externaLegalAmountRate: 0,
              externaOtherTaxRate: 0,
              productDescription: el.product.description || el?.product?.title,
              value: el.quantity,
              unitAmount: el.product.manualPrice
                ? el.amount
                : el?.price || el.product?.price,
              discountAmount: el.discount,
              taxRate: el.tax,
              otherTaxRate: 0,
              legalAmountRate: 0
            });
            selectedOrders.push(el.saleOrderId);
          }
        }
      });
      console.log(
        'submitAt',
        moment(e.submitAt).format(AppConstant.DATE_FORMAT)
      );
      results.push({
        personExternalID: `${e.user?.id}`,
        personTypeID: e.user.isLegal ? personType.Legal : personType.Genuine,
        economicCode: !!e?.user?.isLegal
          ? e?.user?.companyNationCode
          : !e?.user?.isLegal && e?.user?.personalTaxCode && e?.user?.nationCode
          ? e?.user?.personalTaxCode
          : '',
        name: e.user.isLegal ? '' : e.user.firstName,
        lastName: !e.user.isLegal ? e.user.lastName : e.user.companyName,
        nationalCode: !!e?.user?.isLegal
          ? e?.user?.companyNationCode
          : !e?.user?.isLegal && e?.user?.personalTaxCode && e?.user?.nationCode
          ? e?.user?.nationCode
          : '',
        invoiceDate: moment(e.submitAt).format(AppConstant.DATE_FORMAT),
        invoiceSubjectID: invoiceSubjectType.Sale,
        invoiceSettlementMethodID: invoiceSettlementMethodType.Cash,
        cashPaymentAmount: 0,
        loanPaymentAmount: 0,
        invoiceTaxTypeID:
          (e?.user?.isLegal && e?.user?.companyNationCode) ||
          (!e?.user?.isLegal && e?.user?.personalTaxCode && e?.user?.nationCode)
            ? invoiceTaxType.WithCustomer
            : invoiceTaxType.WithoutCustomer,
        invoiceExternalID: e.id ? `${e.id}` : null,
        invoiceDetails: invoiceDetails
      });
    }
    return [results, [...new Set(selectedOrders)]];
  }
}
