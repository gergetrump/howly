variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

variable "domain_name" {
  type        = string
  description = "Public site hostname, such as howly.example.com."
}

variable "acme_email" {
  type        = string
  description = "Email Let's Encrypt uses for the certificate."
}

variable "sender_email" {
  type        = string
  default     = "yourhowlyteam@gmail.com"
  description = "Howly sender address. Confirm the SES verification email sent to this inbox after applying."
}

variable "github_repository" {
  type    = string
  default = "gergetrump/howly"
}

variable "repository_url" {
  type    = string
  default = "https://github.com/gergetrump/howly.git"
}

variable "git_ref" {
  type    = string
  default = "main"
}

variable "instance_type" {
  type    = string
  default = "t4g.small"
}

variable "create_github_oidc_provider" {
  type        = bool
  default     = true
  description = "Set false when this AWS account already has the GitHub Actions OIDC provider."
}

variable "reviewer_email" {
  type = string
}

variable "reviewer_password" {
  type      = string
  sensitive = true
}
