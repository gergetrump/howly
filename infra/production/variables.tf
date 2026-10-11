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
  type    = string
  default = "bootstrap"
}

variable "mongo_instance_type" {
  type        = string
  default     = "r7g.large"
  description = "Memory-optimized EC2 size for each MongoDB replica member."
}

variable "standby_desired_count" {
  type        = number
  default     = 0
  description = "Keep at 0. Raise to 1 only after a snapshot restore in the standby region."
}

variable "confirm_production_apply" {
  type        = string
  default     = ""
  description = "Set to apply-production to plan or apply this stack."
}
