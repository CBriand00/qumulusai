import { registerModule } from "./intelligenceEngine";
import { hiringService, workforceService, retentionService, performanceService, financialService, complianceService } from "./services";

let registered = false;

export function ensureModulesRegistered() {
  if (registered) return;
  registerModule(hiringService);
  registerModule(workforceService);
  registerModule(retentionService);
  registerModule(performanceService);
  registerModule(financialService);
  registerModule(complianceService);
  registered = true;
}

export { hiringService, workforceService, retentionService, performanceService, financialService, complianceService };
