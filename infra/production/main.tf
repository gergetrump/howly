# International design for Howly. Do not apply this during the demo.
# terraform validate is enough. terraform plan requires
# -var confirm_production_apply=apply-production
# and creates NAT gateways, a load balancer, Fargate, and three database instances.
#
# The API service is fixed at one task because the streak job runs in that process.
# MongoDB is a three-member replica set, one node per availability zone.
# The second region is a warm standby: DNS failover is defined, and its task count
# stays at 0 until a snapshot is restored there. A single voter in that region
# could not elect a primary if this region disappeared.

resource "terraform_data" "apply_guard" {
  lifecycle {
    precondition {
      condition     = var.standby_region != var.aws_region
      error_message = "standby_region must be a different region from aws_region."
    }

    precondition {
      condition     = var.confirm_production_apply == "apply-production"
      error_message = "This stack is the unapplied production design. Pass -var confirm_production_apply=apply-production to plan or apply it."
    }
  }
}

data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  azs         = slice(data.aws_availability_zones.available.names, 0, 3)
  api_host    = "api.${var.domain_name}"
  app_host    = "app.${var.domain_name}"
  mongo_hosts = [for index in range(3) : "mongo-${index}.howly.internal:27017"]
  mongo_uri   = "mongodb://${join(",", local.mongo_hosts)}/howly?replicaSet=howly"
}

resource "aws_route53_zone" "public" {
  name = var.domain_name
}

resource "aws_route53_zone" "internal" {
  name = "howly.internal"

  vpc {
    vpc_id = aws_vpc.this.id
  }
}

module "ses" {
  source      = "../modules/ses"
  domain_name = var.domain_name
}

resource "aws_route53_record" "ses_verification" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [module.ses.verification_token]
}

resource "aws_route53_record" "ses_dkim" {
  count = 3

  zone_id = aws_route53_zone.public.zone_id
  name    = "${module.ses.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${module.ses.dkim_tokens[count.index]}.dkim.amazonses.com"]
}
