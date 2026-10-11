variable "name" {
  type = string
}

variable "scope" {
  type        = string
  description = "CLOUDFRONT or REGIONAL. A CloudFront web ACL has to be created in us-east-1."
}

variable "allow_large_bodies" {
  type        = bool
  default     = false
  description = "Count the common rule set body-size check so story and profile uploads are not blocked."
}
