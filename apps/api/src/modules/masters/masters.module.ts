import { Module } from "@nestjs/common";
import { AuditModule } from "../audit";
import { CatalogsService } from "./application/catalogs.service";
import { ChartOfAccountsService } from "./application/chart-of-accounts.service";
import { TreasuryAccountsService } from "./application/treasury-accounts.service";
import { ChartOfAccountsExcelReader } from "./infrastructure/chart-of-accounts.excel-reader";
import { MastersRepository } from "./infrastructure/masters.repository";
import { PaymentMethodsController, VoucherTypesController } from "./presentation/catalogs.controller";
import { ChartOfAccountsController } from "./presentation/chart-of-accounts.controller";
import { TreasuryAccountsController } from "./presentation/treasury-accounts.controller";

@Module({
  imports: [AuditModule],
  controllers: [ChartOfAccountsController, PaymentMethodsController, VoucherTypesController, TreasuryAccountsController],
  providers: [MastersRepository, ChartOfAccountsExcelReader, ChartOfAccountsService, CatalogsService, TreasuryAccountsService],
})
export class MastersModule {}
