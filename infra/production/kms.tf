module "kms_primary" {
  source = "../modules/kms"
  name   = "howly-production"
}

module "kms_standby" {
  source = "../modules/kms"
  name   = "howly-production"

  providers = {
    aws = aws.standby
  }
}
