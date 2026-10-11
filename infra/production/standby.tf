data "aws_availability_zones" "standby" {
  provider = aws.standby
  state    = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

resource "aws_vpc" "standby" {
  provider = aws.standby

  cidr_block           = "10.50.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
}

resource "aws_internet_gateway" "standby" {
  provider = aws.standby
  vpc_id   = aws_vpc.standby.id
}

resource "aws_subnet" "standby_public" {
  provider = aws.standby
  count    = 2

  vpc_id                  = aws_vpc.standby.id
  cidr_block              = cidrsubnet("10.50.0.0/16", 8, count.index)
  availability_zone       = data.aws_availability_zones.standby.names[count.index]
  map_public_ip_on_launch = false
}

resource "aws_subnet" "standby_private" {
  provider = aws.standby
  count    = 2

  vpc_id            = aws_vpc.standby.id
  cidr_block        = cidrsubnet("10.50.0.0/16", 8, count.index + 10)
  availability_zone = data.aws_availability_zones.standby.names[count.index]
}

resource "aws_eip" "standby_nat" {
  provider = aws.standby
  count    = 2
  domain   = "vpc"
}

resource "aws_nat_gateway" "standby" {
  provider = aws.standby
  count    = 2

  allocation_id = aws_eip.standby_nat[count.index].id
  subnet_id     = aws_subnet.standby_public[count.index].id
}

resource "aws_route_table" "standby_public" {
  provider = aws.standby
  vpc_id   = aws_vpc.standby.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.standby.id
  }
}

resource "aws_route_table_association" "standby_public" {
  provider = aws.standby
  count    = 2

  subnet_id      = aws_subnet.standby_public[count.index].id
  route_table_id = aws_route_table.standby_public.id
}

resource "aws_route_table" "standby_private" {
  provider = aws.standby
  count    = 2
  vpc_id   = aws_vpc.standby.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.standby[count.index].id
  }

  route {
    cidr_block                = aws_vpc.this.cidr_block
    vpc_peering_connection_id = aws_vpc_peering_connection.standby.id
  }

  depends_on = [aws_vpc_peering_connection_accepter.standby]
}

resource "aws_route_table_association" "standby_private" {
  provider = aws.standby
  count    = 2

  subnet_id      = aws_subnet.standby_private[count.index].id
  route_table_id = aws_route_table.standby_private[count.index].id
}

resource "aws_security_group" "standby_alb" {
  provider = aws.standby
  name     = "howly-standby-alb"
  vpc_id   = aws_vpc.standby.id
}

resource "aws_security_group" "standby_api" {
  provider = aws.standby
  name     = "howly-standby-api"
  vpc_id   = aws_vpc.standby.id
}

resource "aws_security_group" "mongo_standby" {
  provider = aws.standby
  name     = "howly-standby-mongo"
  vpc_id   = aws_vpc.standby.id
}

resource "aws_vpc_security_group_ingress_rule" "standby_alb_http" {
  provider          = aws.standby
  security_group_id = aws_security_group.standby_alb.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "standby_alb_https" {
  provider          = aws.standby
  security_group_id = aws_security_group.standby_alb.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "standby_alb_to_api" {
  provider                     = aws.standby
  security_group_id            = aws_security_group.standby_alb.id
  referenced_security_group_id = aws_security_group.standby_api.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000
}

resource "aws_vpc_security_group_ingress_rule" "standby_api_from_alb" {
  provider                     = aws.standby
  security_group_id            = aws_security_group.standby_api.id
  referenced_security_group_id = aws_security_group.standby_alb.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000
}

resource "aws_vpc_security_group_egress_rule" "standby_api_to_mongo" {
  provider                     = aws.standby
  security_group_id            = aws_security_group.standby_api.id
  referenced_security_group_id = aws_security_group.mongo_standby.id
  ip_protocol                  = "tcp"
  from_port                    = 27017
  to_port                      = 27017
}

resource "aws_vpc_security_group_egress_rule" "standby_api_https" {
  provider          = aws.standby
  security_group_id = aws_security_group.standby_api.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_ingress_rule" "standby_mongo_from_api" {
  provider                     = aws.standby
  security_group_id            = aws_security_group.mongo_standby.id
  referenced_security_group_id = aws_security_group.standby_api.id
  ip_protocol                  = "tcp"
  from_port                    = 27017
  to_port                      = 27017
}

resource "aws_vpc_security_group_ingress_rule" "standby_mongo_from_frankfurt" {
  provider = aws.standby
  for_each = toset(local.primary_private_cidrs)

  security_group_id = aws_security_group.mongo_standby.id
  cidr_ipv4         = each.value
  ip_protocol       = "tcp"
  from_port         = 27017
  to_port           = 27017
}

resource "aws_vpc_security_group_egress_rule" "standby_mongo_to_frankfurt" {
  provider = aws.standby
  for_each = toset(local.primary_private_cidrs)

  security_group_id = aws_security_group.mongo_standby.id
  cidr_ipv4         = each.value
  ip_protocol       = "tcp"
  from_port         = 27017
  to_port           = 27017
}

resource "aws_vpc_security_group_egress_rule" "standby_mongo_https" {
  provider          = aws.standby
  security_group_id = aws_security_group.mongo_standby.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_lb" "standby" {
  provider = aws.standby

  name                       = "howly-api"
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.standby_alb.id]
  subnets                    = aws_subnet.standby_public[*].id
  drop_invalid_header_fields = true
  desync_mitigation_mode     = "defensive"
  enable_deletion_protection = true

  access_logs {
    bucket  = aws_s3_bucket.logs_standby.id
    prefix  = "alb"
    enabled = true
  }

  depends_on = [aws_s3_bucket_policy.logs_standby]
}

resource "aws_lb_target_group" "standby" {
  provider = aws.standby

  name        = "howly-api"
  port        = 3000
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.standby.id

  health_check {
    path = "/api/health"
  }
}

resource "aws_acm_certificate" "standby" {
  provider = aws.standby

  domain_name       = local.api_host
  validation_method = "DNS"
}

resource "aws_route53_record" "standby_cert" {
  for_each = {
    for dvo in aws_acm_certificate.standby.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = aws_route53_zone.public.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "standby" {
  provider = aws.standby

  certificate_arn         = aws_acm_certificate.standby.arn
  validation_record_fqdns = [for record in aws_route53_record.standby_cert : record.fqdn]
}

resource "aws_lb_listener" "standby" {
  provider = aws.standby

  load_balancer_arn = aws_lb.standby.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate_validation.standby.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.standby.arn
  }
}

resource "aws_lb_listener" "standby_http" {
  provider = aws.standby

  load_balancer_arn = aws_lb.standby.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_cloudwatch_log_group" "standby" {
  provider = aws.standby

  name              = "/howly/api"
  retention_in_days = 90
  kms_key_id        = module.kms_standby.arn
}

resource "aws_cloudwatch_log_group" "exec_standby" {
  provider = aws.standby

  name              = "/howly/ecs-exec"
  retention_in_days = 90
  kms_key_id        = module.kms_standby.arn
}

resource "aws_ecs_cluster" "standby" {
  provider = aws.standby
  name     = "howly"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"

      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.exec_standby.name
      }
    }
  }
}

resource "aws_ecs_task_definition" "standby" {
  provider = aws.standby

  family                   = "howly-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.execution_standby.arn
  task_role_arn            = aws_iam_role.task.arn

  volume {
    name = "tmp"
  }

  container_definitions = jsonencode([{
    name                   = "api"
    image                  = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.standby_region}.amazonaws.com/howly-api:${var.api_image_tag}"
    essential              = true
    readonlyRootFilesystem = true
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    mountPoints = local.api_tmp_mount
    healthCheck = local.api_health_check
    environment = local.api_environment
    secrets = [
      { name = "JWT_SECRET", valueFrom = replace(aws_secretsmanager_secret.jwt.arn, var.aws_region, var.standby_region) },
      { name = "MONGO_URI", valueFrom = aws_secretsmanager_secret.standby_mongo_uri.arn },
      { name = "MONGO_CA_CERT", valueFrom = "${replace(aws_secretsmanager_secret.mongo_tls.arn, var.aws_region, var.standby_region)}:ca::" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.standby.name
        awslogs-region        = var.standby_region
        awslogs-stream-prefix = "api"
      }
    }
  }])
}

resource "aws_ecs_service" "standby" {
  provider = aws.standby

  name                               = "howly-api"
  cluster                            = aws_ecs_cluster.standby.id
  task_definition                    = aws_ecs_task_definition.standby.arn
  desired_count                      = var.standby_desired_count
  launch_type                        = "FARGATE"
  enable_execute_command             = true
  availability_zone_rebalancing      = "ENABLED"
  health_check_grace_period_seconds  = 60
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = aws_subnet.standby_private[*].id
    security_groups  = [aws_security_group.standby_api.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.standby.arn
    container_name   = "api"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.standby]
}

resource "aws_route53_record" "api_standby" {
  count = var.enable_region_failover ? 1 : 0

  zone_id        = aws_route53_zone.public.zone_id
  name           = local.api_host
  type           = "A"
  set_identifier = "standby"

  failover_routing_policy {
    type = "SECONDARY"
  }

  alias {
    name                   = aws_lb.standby.dns_name
    zone_id                = aws_lb.standby.zone_id
    evaluate_target_health = true
  }
}
