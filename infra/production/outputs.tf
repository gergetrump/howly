output "app_url" {
  value = "https://${local.app_host}"
}

output "api_url" {
  value = "https://${local.api_host}"
}

output "nameservers" {
  value = aws_route53_zone.public.name_servers
}

output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "ecs_service_name" {
  value = aws_ecs_service.api.name
}

output "restore_document_name" {
  value = aws_ssm_document.restore_standby.name
}
