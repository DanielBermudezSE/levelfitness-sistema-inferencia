import { Module } from "@medusajs/framework/utils"
import ExpertModuleService from "./service"

export const EXPERT_MODULE = "expert"

export default Module(EXPERT_MODULE, {
  service: ExpertModuleService,
})
