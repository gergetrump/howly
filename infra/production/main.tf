# International design for Howly. Do not apply this during the demo.
# Validate with: terraform init -backend=false && terraform validate
# A plan needs -backend-config from infra/bootstrap,
# -var confirm_production_apply=apply-production, a real api_image_tag,
# a jwt_secret of at least 32 characters, and the sha256 mongo_image_digest
# of the mongo:7 image mirrored into ECR.
#
# Frankfurt runs two API tasks. Streak jobs are separate scheduled tasks with a
# MongoDB lease, so a retry cannot apply the same period twice.
# The database is a replica set: three voting members in Frankfurt and one
# hidden, non-voting, delayed member in Ireland. Daily backups cover a bad
# write that the delayed member would copy an hour later.
# A person starts howly-restore-standby. On the default path it stops Frankfurt
# schedules, stops streak tasks already running, and scales the Frankfurt API
# to zero. It refuses the promotion when Ireland is past failover_max_lag_seconds.
# allowUnfencedPromotion=true skips that fence when Frankfurt cannot be reached.
# DNS stays on Frankfurt until apply. enable_region_failover keeps the Frankfurt
# API at zero and its streak schedules disabled.

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

    precondition {
      condition     = var.api_image_tag != "bootstrap" && length(var.api_image_tag) > 0
      error_message = "Set api_image_tag to an image that has been pushed to the howly-api repository. bootstrap is not a built image."
    }

    precondition {
      condition     = length(var.jwt_secret) >= 32
      error_message = "Set jwt_secret to at least 32 characters."
    }

    precondition {
      condition     = can(regex("^sha256:[0-9a-f]{64}$", var.mongo_image_digest))
      error_message = "Set mongo_image_digest to the sha256 digest of the mongo:7 image mirrored into the howly-mongo repository."
    }

    precondition {
      condition     = var.standby_desired_count == 0 || var.standby_restore_confirmed == "restored"
      error_message = "Keep standby_desired_count at 0 until howly-restore-standby has stored the Ireland connection string. Then pass -var standby_restore_confirmed=restored."
    }

    precondition {
      condition     = !var.enable_region_failover || (var.standby_desired_count >= 1 && var.standby_restore_confirmed == "restored")
      error_message = "enable_region_failover publishes the Ireland API address. Raise standby_desired_count only after the restore document has run."
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
  azs                   = slice(data.aws_availability_zones.available.names, 0, 3)
  api_host              = "api.${var.domain_name}"
  app_host              = "app.${var.domain_name}"
  mongo_hosts           = [for index in range(3) : "mongo-${index}.howly.internal:27017"]
  primary_private_cidrs = [for index in range(3) : cidrsubnet("10.40.0.0/16", 8, index + 10)]
  standby_private_cidrs = [for index in range(2) : cidrsubnet("10.50.0.0/16", 8, index + 10)]
  api_environment = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3000" },
    { name = "TRUST_PROXY", value = "true" },
    { name = "RUN_SCHEDULERS", value = "false" },
    { name = "APP_TIMEZONE", value = "Europe/Berlin" },
    { name = "SERVER_BASE_URL", value = "https://${local.api_host}" },
    { name = "FRONTEND_BASE_URL", value = "https://${local.app_host}" },
    { name = "DISABLE_EMAIL_SENDING", value = "false" },
    { name = "SMTP_HOST", value = "email-smtp.${var.aws_region}.amazonaws.com" },
    { name = "SMTP_PORT", value = "587" },
  ]
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

resource "aws_ses_domain_mail_from" "this" {
  domain           = var.domain_name
  mail_from_domain = "mail.${var.domain_name}"

  depends_on = [module.ses]
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

resource "aws_route53_record" "ses_mail_from_mx" {
  zone_id = aws_route53_zone.public.zone_id
  name    = aws_ses_domain_mail_from.this.mail_from_domain
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

resource "aws_route53_record" "ses_mail_from_spf" {
  zone_id = aws_route53_zone.public.zone_id
  name    = aws_ses_domain_mail_from.this.mail_from_domain
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com -all"]
}

resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.public.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=quarantine; adkim=s; aspf=r; rua=mailto:dmarc@${var.domain_name}"]
}
