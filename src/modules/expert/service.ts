import { MedusaService } from "@medusajs/framework/utils"
import {
  ExpertVariable,
  ExpertVariableOption,
  ExpertHypothesis,
  ExpertRule,
  ExpertRuleCondition,
  ExpertConsultation,
  ExpertConsultationResult,
} from "./models/expert"

class ExpertModuleService extends MedusaService({
  ExpertVariable,
  ExpertVariableOption,
  ExpertHypothesis,
  ExpertRule,
  ExpertRuleCondition,
  ExpertConsultation,
  ExpertConsultationResult,
}) {}

export default ExpertModuleService
