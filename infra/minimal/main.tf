data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-kernel-*-arm64"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}

resource "aws_vpc" "this" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.this.id
  cidr_block              = "10.20.0.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "app" {
  name        = "howly-minimal"
  description = "Public HTTP and HTTPS for the Howly site"
  vpc_id      = aws_vpc.this.id

  ingress {
    description = "HTTP for certificates and redirects"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "instance" {
  name = "howly-minimal-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "parameters" {
  name = "howly-read-parameters"
  role = aws_iam_role.instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters"]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/howly/*"
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.${var.aws_region}.amazonaws.com"
          }
        }
      },
      {
        Effect   = "Allow"
        Action   = ["ses:GetAccount"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "app" {
  name = "howly-minimal-instance"
  role = aws_iam_role.instance.name
}

resource "random_password" "jwt" {
  length  = 48
  special = false
}

locals {
  parameter_prefix      = "/howly"
  public_url            = "https://${var.domain_name}"
  ses_production_access = data.external.ses_account.result.production_access == "true"
  smtp_username         = local.ses_production_access ? aws_iam_access_key.ses_smtp.id : "unset"
  smtp_password         = local.ses_production_access ? sensitive(data.external.ses_smtp_password.result.password) : "unset"
}

resource "aws_ssm_parameter" "public_url" {
  name  = "${local.parameter_prefix}/public_url"
  type  = "SecureString"
  value = local.public_url
}

resource "aws_ssm_parameter" "site_address" {
  name  = "${local.parameter_prefix}/site_address"
  type  = "SecureString"
  value = var.domain_name
}

resource "aws_ssm_parameter" "acme_email" {
  name  = "${local.parameter_prefix}/acme_email"
  type  = "SecureString"
  value = var.acme_email
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "${local.parameter_prefix}/jwt_secret"
  type  = "SecureString"
  value = random_password.jwt.result
}

resource "aws_iam_user" "ses_smtp" {
  name = "howly-ses-smtp"
}

resource "aws_iam_user_policy" "ses_smtp" {
  name = "howly-ses-send"
  user = aws_iam_user.ses_smtp.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ses:SendRawEmail"]
      Resource = "*"
    }]
  })
}

resource "aws_iam_access_key" "ses_smtp" {
  user = aws_iam_user.ses_smtp.name
}

data "external" "ses_smtp_password" {
  program = ["python3", "${path.module}/ses_smtp_password.py"]

  query = {
    secret = aws_iam_access_key.ses_smtp.secret
    region = var.aws_region
  }
}

data "external" "ses_account" {
  program = ["python3", "${path.module}/ses_account_status.py"]

  query = {
    region = var.aws_region
  }
}

resource "aws_ssm_parameter" "smtp_username" {
  name  = "${local.parameter_prefix}/smtp_username"
  type  = "SecureString"
  value = local.smtp_username
}

resource "aws_ssm_parameter" "smtp_password" {
  name  = "${local.parameter_prefix}/smtp_password"
  type  = "SecureString"
  value = local.smtp_password
}

resource "aws_ssm_parameter" "smtp_from" {
  name  = "${local.parameter_prefix}/smtp_from"
  type  = "SecureString"
  value = "Howly <${var.sender_email}>"
}

resource "aws_ses_email_identity" "sender" {
  email = var.sender_email
}

resource "aws_ssm_parameter" "reviewer_email" {
  name  = "${local.parameter_prefix}/reviewer_email"
  type  = "SecureString"
  value = var.reviewer_email
}

resource "aws_ssm_parameter" "reviewer_password" {
  name  = "${local.parameter_prefix}/reviewer_password"
  type  = "SecureString"
  value = var.reviewer_password
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.app.name

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/user-data.sh.tftpl", {
    repo_url         = var.repository_url
    git_ref          = var.git_ref
    aws_region       = var.aws_region
    parameter_prefix = local.parameter_prefix
  })

  depends_on = [
    aws_ssm_parameter.public_url,
    aws_ssm_parameter.site_address,
    aws_ssm_parameter.acme_email,
    aws_ssm_parameter.jwt_secret,
    aws_ssm_parameter.smtp_username,
    aws_ssm_parameter.smtp_password,
    aws_ssm_parameter.smtp_from,
    aws_ssm_parameter.reviewer_email,
    aws_ssm_parameter.reviewer_password,
  ]

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

resource "aws_eip" "app" {
  domain   = "vpc"
  instance = aws_instance.app.id
}

data "aws_route53_zone" "public" {
  name         = var.domain_name
  private_zone = false
}

resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.public.zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}

module "ses" {
  source      = "../modules/ses"
  domain_name = var.domain_name
}

resource "aws_route53_record" "ses_verification" {
  zone_id = data.aws_route53_zone.public.zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [module.ses.verification_token]
}

resource "aws_route53_record" "ses_dkim" {
  count = 3

  zone_id = data.aws_route53_zone.public.zone_id
  name    = "${module.ses.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${module.ses.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_route53_record" "spf" {
  zone_id = data.aws_route53_zone.public.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com -all"]
}

module "github_oidc" {
  source = "../modules/github_oidc"

  github_repository    = var.github_repository
  create_oidc_provider = var.create_github_oidc_provider
  instance_arn         = aws_instance.app.arn
}
