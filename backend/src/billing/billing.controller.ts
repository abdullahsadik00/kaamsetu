import { Body, Controller, Get, HttpCode, HttpStatus, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentAuth } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.js';
import type { AuthContext } from '../auth/token.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  BillingService,
  ConfirmCashSchema,
  CreateBillSchema,
  CreateQuotationSchema,
  ListBillsSchema,
  ListCashSchema,
  ListQuotationsSchema,
  PaymentSchema,
  PrefillSchema,
  ReasonSchema,
  UpdateInvoiceSchema,
} from './billing.service.js';
import type { CreateBill, CreateQuotation, ListBills, ListQuotations, PaymentInput, UpdateInvoice } from './billing.service.js';

const Id = new ZodValidationPipe(z.uuid());
const Reason = new ZodValidationPipe(ReasonSchema);

/** Bills, owner only (docs/06 §8, T4.10, D-034). Money is in paise. */
@Roles('OWNER')
@Controller('bills')
export class BillsController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext, @Query(new ZodValidationPipe(ListBillsSchema)) q: ListBills) {
    return this.billing.listBills(auth, q);
  }

  /** Lines for a bill from a completed job, not saved yet (Stitch 34). */
  @Get('prefill')
  prefill(@CurrentAuth() auth: AuthContext, @Query(new ZodValidationPipe(PrefillSchema)) q: { jobId: string }) {
    return this.billing.prefill(auth, q.jobId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentAuth() auth: AuthContext, @Body(new ZodValidationPipe(CreateBillSchema)) body: CreateBill) {
    return this.billing.createBill(auth, body);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.billing.get(auth, 'BILL', id);
  }

  /** Draft bills only. */
  @Patch(':id')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(UpdateInvoiceSchema)) body: UpdateInvoice,
  ) {
    return this.billing.update(auth, 'BILL', id, body);
  }

  @Post(':id/issue')
  @HttpCode(HttpStatus.OK)
  issue(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.billing.issue(auth, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string, @Body(Reason) body: { reason: string }) {
    return this.billing.cancel(auth, 'BILL', id, body.reason);
  }

  /** Returns the payment; the same idempotency key again returns the same one. */
  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  pay(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(PaymentSchema)) body: PaymentInput,
  ) {
    return this.billing.recordPayment(auth, id, body);
  }
}

/** Written quotations, owner only (D-020, T4.10). */
@Roles('OWNER')
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext, @Query(new ZodValidationPipe(ListQuotationsSchema)) q: ListQuotations) {
    return this.billing.listQuotations(auth, q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentAuth() auth: AuthContext, @Body(new ZodValidationPipe(CreateQuotationSchema)) body: CreateQuotation) {
    return this.billing.createQuotation(auth, body);
  }

  @Get(':id')
  get(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.billing.get(auth, 'QUOTATION', id);
  }

  @Patch(':id')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(UpdateInvoiceSchema)) body: UpdateInvoice,
  ) {
    return this.billing.update(auth, 'QUOTATION', id, body);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  send(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.billing.send(auth, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string, @Body(Reason) body: { reason: string }) {
    return this.billing.cancel(auth, 'QUOTATION', id, body.reason);
  }

  /** Returns the new draft bill. */
  @Post(':id/convert')
  @HttpCode(HttpStatus.CREATED)
  convert(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.billing.convert(auth, id);
  }
}

/** Payments, cash handed over by teams, balances and the Billing tab summary (T4.11). */
@Roles('OWNER')
@Controller()
export class PaymentsController {
  constructor(private readonly billing: BillingService) {}

  @Get('billing/summary')
  summary(@CurrentAuth() auth: AuthContext) {
    return this.billing.summary(auth);
  }

  @Post('payments/:id/void')
  @HttpCode(HttpStatus.OK)
  void(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string, @Body(Reason) body: { reason: string }) {
    return this.billing.voidPayment(auth, id, body.reason);
  }

  @Get('customers/:id/outstanding')
  outstanding(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string) {
    return this.billing.outstanding(auth, id);
  }

  @Get('cash-collections')
  cash(@CurrentAuth() auth: AuthContext, @Query(new ZodValidationPipe(ListCashSchema)) q: { status: 'WITH_TEAM' | 'CONFIRMED' | 'REJECTED' }) {
    return this.billing.listCash(auth, q.status);
  }

  @Post('cash-collections/:id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(
    @CurrentAuth() auth: AuthContext,
    @Param('id', Id) id: string,
    @Body(new ZodValidationPipe(ConfirmCashSchema)) body: { addToBill: boolean },
  ) {
    return this.billing.confirmCash(auth, id, body.addToBill);
  }

  @Post('cash-collections/:id/reject')
  @HttpCode(HttpStatus.OK)
  reject(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string, @Body(Reason) body: { reason: string }) {
    return this.billing.rejectCash(auth, id, body.reason);
  }
}

@Module({
  controllers: [BillsController, QuotationsController, PaymentsController],
  providers: [BillingService],
  // The owner home reuses the Billing tab summary (T4.12).
  exports: [BillingService],
})
export class BillingModule {}
