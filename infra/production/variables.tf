variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

variable "standby_region" {
  type    = string
  default = "eu-west-1"
}

variable "domain_name" {
  type        = string
  description = "Apex domain. The site is served at app.<domain> and the API at api.<domain>."
  default     = "example.com"
}

variable "api_image_tag" {
  type        = string
  default     = "bootstrap"
  description = "Tag in the howly-api repository. bootstrap is rejected at plan time because Actions does not publish it."
}

variable "mongo_image_digest" {
  type        = string
  default     = ""
  description = "sha256 digest of the mongo:7 image after it has been mirrored into the howly-mongo repository. Members pull that digest from ECR."
}

variable "jwt_secret" {
  type        = string
  default     = ""
  sensitive   = true
  description = "At least 32 characters. Stored with a write-only secret argument so the value is not kept in state."
}

variable "enable_region_failover" {
  type        = bool
  default     = false
  description = "Publish the Ireland API address and start the Ireland streak schedules. Leave false until howly-restore-standby has promoted the delayed member. The document does not change DNS."
}

variable "failover_max_lag_seconds" {
  type        = number
  default     = 4500
  description = "howly-restore-standby refuses to promote when Ireland is further behind than this. 4500 is the one-hour delay plus 15 minutes."

  validation {
    condition     = var.failover_max_lag_seconds >= 3600
    error_message = "failover_max_lag_seconds must be at least the configured 3600 second delay."
  }
}

variable "standby_restore_confirmed" {
  type        = string
  default     = ""
  description = "Set to restored after the Ireland connection string is in Secrets Manager."
}

variable "mongo_instance_type" {
  type        = string
  default     = "r7g.large"
  description = "Memory-optimized EC2 size for each MongoDB replica member."
}

variable "mongo_termination_protection" {
  type        = bool
  default     = true
  description = "Blocks instance termination. Set false for the apply that replaces a member, then set it back."
}

variable "standby_desired_count" {
  type        = number
  default     = 0
  description = "Keep at 0. Raise to at least 1 only after standby_restore_confirmed=restored."
}

variable "confirm_production_apply" {
  type        = string
  default     = ""
  description = "Set to apply-production to plan or apply this stack."
}

variable "alarm_email" {
  type        = string
  default     = ""
  description = "Optional address subscribed to the ops topics. The topic and budget exist either way."
}

variable "monthly_budget_usd" {
  type        = number
  default     = 400
  description = "Account budget notification threshold for this design. Five NAT gateways and four database hosts are the bulk of it."
}

variable "github_repository" {
  type        = string
  default     = "gergetrump/howly"
  description = "GitHub repository allowed to deploy production, as owner/name. Trust is limited to the main branch."
}

variable "create_github_oidc_provider" {
  type        = bool
  default     = false
  description = "Set true only when this account does not already have the GitHub Actions OIDC provider from the minimal stack."
}
