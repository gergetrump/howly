output "nameservers" {
  description = "Name servers already set on the registered domain."
  value       = data.aws_route53_zone.public.name_servers
}

output "site_url" {
  value = "https://${var.domain_name}"
}

output "instance_id" {
  description = "GitHub Actions variable AWS_INSTANCE_ID."
  value       = aws_instance.app.id
}

output "deploy_role_arn" {
  description = "GitHub Actions variable AWS_DEPLOY_ROLE_ARN."
  value       = module.github_oidc.deploy_role_arn
}

output "aws_region" {
  description = "GitHub Actions variable AWS_REGION."
  value       = var.aws_region
}
