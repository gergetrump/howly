output "app_url" {
  value = "https://${local.app_host}"
}

output "api_url" {
  value = "https://${local.api_host}"
}

output "mongo_uri" {
  value     = local.mongo_uri
  sensitive = true
}

output "nameservers" {
  value = aws_route53_zone.public.name_servers
}
