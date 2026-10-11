variable "name" {
  type        = string
  description = "KMS alias, without the alias/ prefix. Aliases are regional, so both regions may use the same name."
}
