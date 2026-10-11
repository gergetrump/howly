module "waf_cloudfront" {
  source = "../modules/waf"
  name   = "howly-frontend"
  scope  = "CLOUDFRONT"

  providers = {
    aws = aws.use1
  }
}

module "waf_api" {
  source             = "../modules/waf"
  name               = "howly-api"
  scope              = "REGIONAL"
  allow_large_bodies = true
}

module "waf_standby" {
  source             = "../modules/waf"
  name               = "howly-api"
  scope              = "REGIONAL"
  allow_large_bodies = true

  providers = {
    aws = aws.standby
  }
}

resource "aws_wafv2_web_acl_association" "api" {
  resource_arn = aws_lb.api.arn
  web_acl_arn  = module.waf_api.arn
}

resource "aws_wafv2_web_acl_association" "standby" {
  provider = aws.standby

  resource_arn = aws_lb.standby.arn
  web_acl_arn  = module.waf_standby.arn
}
